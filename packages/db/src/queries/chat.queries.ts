import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { chats } from '../schema';
import { Chat } from '../types';

export const chatQueries = {
  create: async (data: {
    id: string;
    jobId: string;
    clientId: string;
    providerId: string;
    evaluatorId: string | null;
    summary?: string;
  }): Promise<Chat> => {
    const [chat] = await db.insert(chats).values(data).returning();
    return chat;
  },

  getById: async (id: string) => {
    return await db.query.chats.findFirst({
      where: eq(chats.id, id),
      with: {
        job: true,
        client: true,
        provider: true,
        messages: true,
      },
    });
  },

  getByJobId: async (jobId: string) => {
    return await db.query.chats.findFirst({
      where: eq(chats.jobId, jobId),
      with: {
        job: true,
        client: true,
        provider: true,
        messages: true,
      },
    });
  },

  getByClientId: async (clientId: string) => {
    return await db.query.chats.findMany({
      where: eq(chats.clientId, clientId),
      with: {
        job: true,
        client: true,
        provider: true,
        messages: true,
      },
    });
  },

  getByProviderId: async (providerId: string) => {
    return await db.query.chats.findMany({
      where: eq(chats.providerId, providerId),
      with: {
        job: true,
        client: true,
        provider: true,
        messages: true,
      },
    });
  },

  getBetweenAgents: async (
    clientId: string,
    providerId: string,
  ): Promise<Chat[]> => {
    return await db
      .select()
      .from(chats)
      .where(
        and(eq(chats.clientId, clientId), eq(chats.providerId, providerId)),
      )
      .orderBy(desc(chats.createdAt));
  },

  delete: async (id: string): Promise<Chat | undefined> => {
    const [deleted] = await db
      .delete(chats)
      .where(eq(chats.id, id))
      .returning();
    return deleted;
  },

  updateLastReadBy: async (chatId: string, agentId: string): Promise<Chat> => {
    const [updated] = await db
      .update(chats)
      .set({ lastReadBy: agentId })
      .where(eq(chats.id, chatId))
      .returning();
    return updated;
  },
};
