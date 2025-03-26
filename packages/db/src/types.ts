import type {
  insertAgentSchema,
  insertChatSchema,
  insertInventoryItemSchema,
  insertItemSchema,
  insertJobItemSchema,
  insertJobSchema,
  insertMessageSchema,
  insertProviderSchema,
  insertWalletSchema,
  selectAgentSchema,
  selectChatSchema,
  selectInventoryItemSchema,
  selectItemSchema,
  selectJobItemSchema,
  selectJobSchema,
  selectMessageSchema,
  selectProviderSchema,
  selectWalletSchema,
} from './schema';
import type { z } from 'zod';

export type Agent = z.infer<typeof selectAgentSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Provider = z.infer<typeof selectProviderSchema>;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type Wallet = z.infer<typeof selectWalletSchema>;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type Item = z.infer<typeof selectItemSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type InventoryItem = z.infer<typeof selectInventoryItemSchema>;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type Job = z.infer<typeof selectJobSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobItem = z.infer<typeof selectJobItemSchema>;
export type InsertJobItem = z.infer<typeof insertJobItemSchema>;

export type Chat = z.infer<typeof selectChatSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = z.infer<typeof selectMessageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
