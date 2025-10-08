import { logger } from "./logger";
import AMQPService from "./services/amqp";
import WppService from "./services/wpp";
import { amqpSettings, wppSettings } from "./settings";

async function main(): Promise<void> {
  logger.info("Starting WhatsApp client...");
  const wppSvc = new WppService(wppSettings, amqpSettings);
  const amqpSvc = new AMQPService(amqpSettings);
  await amqpSvc.connect();

  wppSvc.client.on("ready", async () => {
    logger.info("WhatsApp client is ready.");
    await wppSvc.defineHandleSendMessage(amqpSvc);
  });

  wppSvc.defineHandleReceiveMessage(amqpSvc);
  await wppSvc.client.initialize();
}

await main();
