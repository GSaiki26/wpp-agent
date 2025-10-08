import amqp, { type Options } from "amqplib";
import type { Logger } from "pino";
import { NotConnectedError } from "../errors/amqp";
import { logger } from "../logger";
import type { AMQPSettings } from "../settings";

class AMQPService {
  settings: AMQPSettings;
  conn: amqp.ChannelModel | null = null;
  public channel: amqp.Channel | null = null;

  constructor(settings: AMQPSettings) {
    this.settings = settings;
  }

  async connect(): Promise<void> {
    logger.info(`Connecting to AMQP server...`);
    this.conn = await amqp.connect(this.settings.AMQP__URI);
    logger.info(`Connected to AMQP server.`);

    this.channel = await this.conn.createChannel();
    this.channel.assertExchange(
      this.settings.AMQP__EXCHANGE,
      this.settings.AMQP__EXCHANGE_TYPE,
      {
        durable: true,
      }
    );

    try {
      await this.declareQueues();
    } catch (err) {
      logger.error({ err }, "Error declaring queues.");
      throw err;
    }
  }

  async declareQueues(): Promise<void> {
    const queues = [
      this.settings.AMQP__MSG_SEND_QUEUE,
      this.settings.AMQP__CHAT_STATUS_QUEUE,
    ];

    const exchange = this.settings.AMQP__EXCHANGE;
    for (const queue of queues) {
      const logger_ = logger.child({ queue });
      logger_.info("Declaring queue...");

      const declareQueue = async (queue: string, options: Options.AssertQueue = {}) => {
        await this.channel!.assertQueue(queue!, { durable: true, ...options });
        await this.channel!.bindQueue(queue!, exchange, queue!);
      };

      const queueDLQ = `${queue}.dlq`;
      await declareQueue(queueDLQ!);
      await declareQueue(queue!, {
        deadLetterExchange: exchange,
        deadLetterRoutingKey: queueDLQ,
      });

      logger_.info("Queue declared.");
    }
  }

  async send(logger: Logger, queue: string, message: Buffer): Promise<void> {
    if (!this.conn || !this.channel) throw new NotConnectedError();
    logger = logger.child({ queue, msgSize: message.length });

    logger.info(`Sending message to queue...`);
    this.channel!.publish(this.settings.AMQP__EXCHANGE, queue, message, {
      persistent: true,
    });
    logger.info(`Message sent to queue.`);
  }
}

export default AMQPService;
