import type { Message } from "whatsapp-web.js";
import type { WppReceivedMessage } from "../schemas/wpp";

export async function createWppMessage(
  msg: Message,
  chatName: string
): Promise<WppReceivedMessage> {
  const attachment = msg.hasMedia ? await msg.downloadMedia() : null;

  return {
    chatName: chatName,
    from: msg.from,
    body: msg.body,
    attachment: attachment?.data || null,
    attachmentType: attachment?.mimetype || null,
    timestamp: msg.timestamp,
    context: [],
  };
}
