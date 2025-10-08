import { z } from "zod";

export const WppAttachmentSchema = z.object({
  filename: z.string().optional(),
  data: z.base64().readonly(),
  type: z.string().readonly(),

  caption: z.string().optional(),
  isViewOnce: z.boolean().default(false),

  sendAudioAsVoice: z.boolean().default(false),
  sendVideoAsGif: z.boolean().default(false),
  sendMediaAsSticker: z.boolean().default(false),
  sendMediaAsDocument: z.boolean().default(false),
  sendMediaAsHd: z.boolean().default(true),

  stickerName: z.string().optional(),
  stickerAuthor: z.string().optional(),
});

export const WppMessageSchema = z.object({
  id: z.string().readonly(),

  chatName: z.string().readonly(),
  chatId: z.string().readonly(),

  contactName: z.string().readonly().optional(),
  contactId: z.string().readonly(),

  body: z.string().readonly(),
  attachment: WppAttachmentSchema.optional(),

  timestamp: z.number().readonly(),
});

export const WppInMessageSchema = z.object({
  chatId: z.string().readonly(),
  body: z.string().readonly(),

  attachment: WppAttachmentSchema.optional(),

  simulateTyping: z.boolean().default(false),
  simulateTypingDelay: z
    .number()
    .min(0)
    .default(5 * 1000),
});

export type WppMessage = z.infer<typeof WppMessageSchema>;
export type WppInMessage = z.infer<typeof WppInMessageSchema>;
export type WppAttachment = z.infer<typeof WppAttachmentSchema>;
