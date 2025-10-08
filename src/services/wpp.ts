import type { Logger } from "pino";
import qrcode from "qrcode";
import {
  Client,
  LocalAuth,
  MessageMedia,
  type Chat,
  type Message,
} from "whatsapp-web.js";
import { logger } from "../logger";
import {
  WppAttachmentSchema,
  WppInMessageSchema,
  WppMessageSchema,
  type WppAttachment,
  type WppInMessage,
} from "../schemas/wpp";
import type { AMQPSettings, WppSettings } from "../settings";
import type AMQPService from "./amqp";

const TYPING_INTERVAL = 25 * 1000;

class WppService {
  settings: WppSettings;
  amqpSettings: AMQPSettings;
  public client: Client;

  constructor(settings: WppSettings, amqpSettings: AMQPSettings) {
    this.settings = settings;
    this.amqpSettings = amqpSettings;

    const auth = new LocalAuth({ dataPath: settings.WPP__STORAGE_LOCALPATH });
    this.client = new Client({
      authStrategy: auth,
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    this.client.on("qr", async (qrCode) => {
      logger.info("QR code received.");
      console.info(await qrcode.toString(qrCode));
    });
  }

  async defineHandleReceiveMessage(amqpSvc: AMQPService): Promise<void> {
    this.client.on("message", async (msg) => {
      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const logger_ = logger.child({
        chatId: msg.from,
        contactId: contact.id._serialized,
        id: msg.id.id,
      });
      logger_.info(
        {
          hasMedia: msg.hasMedia,
          chatName: chat.name,
          bodySize: Buffer.from(msg.body).length,
        },
        "Wpp message received."
      );

      // If a group, gets the sender number
      const parsedMsg = await WppMessageSchema.parseAsync({
        id: msg.id.id,
        chatId: msg.from,
        chatName: chat.name,
        contactId: contact.id._serialized,
        contactName: contact.name,
        body: msg.body,
        attachment: await this.getAttach(logger_, msg),
        timestamp: msg.timestamp,
      });

      await amqpSvc.send(
        logger_,
        this.amqpSettings.AMQP__MSG_RECEIVED_QUEUE,
        Buffer.from(JSON.stringify(parsedMsg))
      );
    });
  }

  private async getAttach(
    logger: Logger,
    msg: Message
  ): Promise<WppAttachment | undefined> {
    if (!msg.hasMedia) return undefined;

    logger.info("Message has media, downloading...");
    const media = await msg.downloadMedia();
    logger.info({ mediaSize: media?.filesize }, "Media downloaded.");
    return await WppAttachmentSchema.parseAsync({
      filename: media!.filename,
      data: media!.data,
      type: media!.mimetype,
    });
  }

  // async _simulateSeen(chat: Chat): Promise<void> {
  //   const seenChatDelay = Math.floor(Math.random() * 30) + 1;
  //   console.info(`Simulating seen in ${seenChatDelay} seconds...`);
  //   await new Promise((resolve) => setTimeout(resolve, seenChatDelay * 1000));
  //   await chat.sendSeen();
  // }

  async defineHandleSendMessage(amqpSvc: AMQPService): Promise<void> {
    amqpSvc.channel!.consume(this.amqpSettings.AMQP__MSG_SEND_QUEUE, async (msg) => {
      if (!msg) return;
      const logger_ = logger.child({ queue: this.amqpSettings.AMQP__MSG_SEND_QUEUE });
      logger_.info("AMQP: message received.");

      try {
        const parsedMsg = await WppInMessageSchema.parseAsync(msg.content.toString());
        const logger = logger_.child({
          to: parsedMsg.chatId,
          bodySize: msg.content.length,
        });
        await this.sendMsg(logger, parsedMsg);
      } catch (err) {
        logger.error({ err }, "Error handling message.");
        amqpSvc.channel!.nack(msg);
      }

      amqpSvc.channel!.ack(msg);
    });
  }

  private async sendMsg(logger: Logger, msg: WppInMessage): Promise<void> {
    logger.info("Processing message to send...");

    const chat = await this.client.getChatById(msg.chatId);
    if (msg.simulateTyping) await this.simulateTyping(chat, msg);

    const media = msg.attachment
      ? new MessageMedia(
          msg.attachment!.type,
          msg.attachment!.data,
          msg.attachment!.filename
        )
      : undefined;

    await this.client.sendMessage(chat.id._serialized, msg.body, {
      media,
      caption: msg.attachment?.caption,
      isViewOnce: msg.attachment?.isViewOnce,

      sendAudioAsVoice: msg.attachment?.sendAudioAsVoice,
      sendVideoAsGif: msg.attachment?.sendVideoAsGif,
      sendMediaAsSticker: msg.attachment?.sendMediaAsSticker,
      sendMediaAsDocument: msg.attachment?.sendMediaAsDocument,
      sendMediaAsHd: msg.attachment?.sendMediaAsHd,

      stickerName: msg.attachment?.stickerName,
      stickerAuthor: msg.attachment?.stickerAuthor,
    });
    logger.info("The message was sent successfully.");
  }

  async simulateTyping(chat: Chat, msg: WppInMessage): Promise<void> {
    await chat.sendStateTyping();
    const delay = msg.simulateTypingDelay;

    console.info(`Simulating typing for ${delay} ms...`);
    const interval = setInterval(async () => {
      await chat.sendStateTyping();
    }, TYPING_INTERVAL);

    await new Promise((resolve) => setTimeout(resolve, delay));
    clearInterval(interval);

    await chat.clearState();
  }
}

export default WppService;
