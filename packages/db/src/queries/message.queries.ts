import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { messages } from '../schema';
import { Message } from '../types';

export const messageQueries = {
  // Create a new message
  create: async (data: {
    id: string;
    chatId: string;
    authorId: string;
    message: string;
  }): Promise<Message> => {
    const [msg] = await db.insert(messages).values(data).returning();

    return msg;
  },

  // Get a message by ID
  getById: async (id: string) => {
    return await db.query.messages.findFirst({
      where: eq(messages.id, id),
      with: {
        chat: {
          with: {
            job: true,
            client: true,
            provider: true,
          },
        },
        author: true,
      },
    });
  },

  // Get messages by chat ID
  getByChatId: async (chatId: string) => {
    return await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      with: {
        chat: {
          with: {
            job: true,
            client: true,
            provider: true,
          },
        },
        author: true,
      },
      orderBy: desc(messages.createdAt),
    });
  },

  // Get messages by author ID
  getByAuthorId: async (authorId: string) => {
    return await db.query.messages.findMany({
      where: eq(messages.authorId, authorId),
      with: {
        chat: {
          with: {
            job: true,
            client: true,
            provider: true,
          },
        },
        author: true,
      },
      orderBy: desc(messages.createdAt),
    });
  },

  // Update message content
  updateMessage: async (
    id: string,
    message: string,
  ): Promise<Message | undefined> => {
    const [updated] = await db
      .update(messages)
      .set({ message })
      .where(eq(messages.id, id))
      .returning();
    return updated;
  },

  // Delete a message
  delete: async (id: string): Promise<Message | undefined> => {
    const [deleted] = await db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning();
    return deleted;
  },
};
