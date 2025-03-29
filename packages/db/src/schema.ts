import { type ItemMetadata, JobPhases } from '@acpl/types';
import { relations } from 'drizzle-orm';
import {
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const jobPhaseEnum = pgEnum(
  'job_phase',
  Object.values(JobPhases.enum) as [string, ...string[]],
);

// TABLES
export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  goal: text('goal').notNull(),
  description: text('description').notNull(),
});

export const providers = pgTable(
  'providers',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .references(() => agents.id)
      .notNull(),
    description: text('description').notNull(),
    catalog: jsonb('catalog')
      .$type<{ product: string; price: number }[]>()
      .notNull(),
    totalApprovedJobs: integer('total_approved_jobs').default(0),
    totalRejectedJobs: integer('total_rejected_jobs').default(0),
  },
  (table) => [uniqueIndex('providers_agent_id_idx').on(table.agentId)],
);

export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .references(() => agents.id)
      .notNull(),
    address: text('address').notNull(),
    balance: decimal('balance', { precision: 20, scale: 2 })
      .notNull()
      .default('0'),
  },
  (table) => [uniqueIndex('wallets_agent_id_idx').on(table.agentId)],
);

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  agentId: text('agent_id')
    .references(() => agents.id)
    .notNull(),
  name: text('name').notNull(),
  metadata: jsonb('metadata').$type<ItemMetadata>().notNull(),
});

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .references(() => agents.id)
      .notNull(),
    itemId: text('item_id')
      .references(() => items.id)
      .notNull(),
    quantity: integer('quantity').notNull().default(0),
  },
  (table) => [
    uniqueIndex('inventory_items_agent_item_idx').on(
      table.agentId,
      table.itemId,
    ),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .references(() => agents.id)
      .notNull(),
    providerId: text('provider_id')
      .references(() => agents.id)
      .notNull(),
    budget: decimal('budget_amount', { precision: 20, scale: 2 }),
    phase: jobPhaseEnum('job_phase').notNull().default('REQUEST'),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    transactionHash: text('transaction_hash'),
    metadata: jsonb('metadata').$type<{
      agreement?: {
        [agentId: string]: {
          agreedAt: string;
          terms: {
            quantity: number;
            pricePerUnit: string;
            requirements: string;
          };
        };
      };
    }>(),
  },
  (table) => [
    index('idx_jobs_phase').on(table.phase),
    index('idx_jobs_client_id').on(table.clientId),
    index('idx_jobs_provider_id').on(table.providerId),
  ],
);

export const jobItems = pgTable(
  'job_items',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .references(() => jobs.id)
      .notNull(),
    inventoryItemId: text('inventory_item_id').references(
      () => inventoryItems.id,
    ),
    itemName: text('item_name').notNull(),
    quantity: integer('quantity').notNull(),
    pricePerUnit: decimal('price_per_unit', {
      precision: 20,
      scale: 2,
    }).notNull(),
    requirements: text('requirements').notNull(),
  },
  (table) => [
    index('idx_job_items_job_id').on(table.jobId),
    index('idx_job_items_inventory_item').on(table.inventoryItemId),
  ],
);

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .references(() => jobs.id)
      .notNull(),
    clientId: text('client_id')
      .references(() => agents.id)
      .notNull(),
    providerId: text('provider_id')
      .references(() => agents.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastReadBy: text('last_read_by').references(() => agents.id),
  },
  (table) => [
    index('idx_chats_job_id').on(table.jobId),
    index('idx_chats_agents').on(table.clientId, table.providerId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .references(() => chats.id)
      .notNull(),
    authorId: text('author_id')
      .references(() => agents.id)
      .notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_messages_chat_created').on(table.chatId, table.createdAt),
  ],
);

// Zod Schemas
export const insertAgentSchema = createInsertSchema(agents);
export const selectAgentSchema = createSelectSchema(agents);

export const insertProviderSchema = createInsertSchema(providers);
export const selectProviderSchema = createSelectSchema(providers);

export const insertWalletSchema = createInsertSchema(wallets);
export const selectWalletSchema = createSelectSchema(wallets);

export const insertItemSchema = createInsertSchema(items);
export const selectItemSchema = createSelectSchema(items);

export const insertInventoryItemSchema = createInsertSchema(inventoryItems);
export const selectInventoryItemSchema = createSelectSchema(inventoryItems);

export const insertJobSchema = createInsertSchema(jobs);
export const selectJobSchema = createSelectSchema(jobs);

export const insertJobItemSchema = createInsertSchema(jobItems);
export const selectJobItemSchema = createSelectSchema(jobItems);

export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);

export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

// Agent Relations
export const agentRelations = relations(agents, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [agents.id],
    references: [wallets.agentId],
  }),
  ownedItems: many(items),
  inventory: many(inventoryItems),
  clientJobs: many(jobs, { relationName: 'client' }),
  providerJobs: many(jobs, { relationName: 'provider' }),
  clientChats: many(chats, { relationName: 'client' }),
  providerChats: many(chats, { relationName: 'provider' }),
  messages: many(messages, { relationName: 'author' }),
}));

// Wallet Relations
export const walletRelations = relations(wallets, ({ one }) => ({
  agent: one(agents, {
    fields: [wallets.agentId],
    references: [agents.id],
  }),
}));

// Item Relations
export const itemRelations = relations(items, ({ one, many }) => ({
  owner: one(agents, {
    fields: [items.agentId],
    references: [agents.id],
  }),
  inventoryItems: many(inventoryItems),
}));

// Inventory Items Relations
export const inventoryItemRelations = relations(
  inventoryItems,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [inventoryItems.agentId],
      references: [agents.id],
    }),
    item: one(items, {
      fields: [inventoryItems.itemId],
      references: [items.id],
    }),
    jobItems: many(jobItems),
  }),
);

// Job Relations
export const jobRelations = relations(jobs, ({ one }) => ({
  client: one(agents, {
    fields: [jobs.clientId],
    references: [agents.id],
    relationName: 'client',
  }),
  provider: one(agents, {
    fields: [jobs.providerId],
    references: [agents.id],
    relationName: 'provider',
  }),
  jobItem: one(jobItems),
  chat: one(chats, {
    fields: [jobs.id],
    references: [chats.jobId],
  }),
}));

export const jobItemRelations = relations(jobItems, ({ one }) => ({
  job: one(jobs, {
    fields: [jobItems.jobId],
    references: [jobs.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [jobItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

// Chat Relations
export const chatRelations = relations(chats, ({ one, many }) => ({
  job: one(jobs, {
    fields: [chats.jobId],
    references: [jobs.id],
  }),
  client: one(agents, {
    fields: [chats.clientId],
    references: [agents.id],
  }),
  provider: one(agents, {
    fields: [chats.providerId],
    references: [agents.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  author: one(agents, {
    fields: [messages.authorId],
    references: [agents.id],
  }),
}));

// Provider Relations
export const providerRelations = relations(providers, ({ one }) => ({
  agent: one(agents, {
    fields: [providers.agentId],
    references: [agents.id],
  }),
}));
