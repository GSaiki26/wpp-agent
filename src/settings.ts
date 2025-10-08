import { z } from "zod";

const wppSchema = z.object({
  WPP__STORAGE: z.enum(["localpath"]).default("localpath"),
  WPP__STORAGE_LOCALPATH: z.string().default("./wpp-storage"),
});

const amqpSchema = z.object({
  AMQP__URI: z.string(),

  AMQP__EXCHANGE: z.string().default("wpp-agent"),
  AMQP__EXCHANGE_TYPE: z.enum(["direct", "topic", "headers", "fanout"]).default("topic"),

  AMQP__MSG_SEND_QUEUE: z.string().default("wpp-agent.msg.send"),

  AMQP__MSG_RECEIVED_QUEUE: z.string().default("*.msg.received"),

  AMQP__CHAT_STATUS_QUEUE: z.string().default("wpp-agent.chat.status"),
});

export type WppSettings = z.infer<typeof wppSchema>;
export type AMQPSettings = z.infer<typeof amqpSchema>;

export const wppSettings: WppSettings = wppSchema.parse(process.env);
export const amqpSettings: AMQPSettings = amqpSchema.parse(process.env);
