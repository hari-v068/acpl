import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { wallets } from '../schema';
import { Wallet } from '../types';

export const walletQueries = {
  // Create a new wallet
  create: async (data: {
    id: string;
    agentId: string;
    address: string;
    balance?: string;
  }): Promise<Wallet> => {
    const [wallet] = await db.insert(wallets).values(data).returning();
    return wallet;
  },

  // Get a single wallet by ID with relations
  getById: async (id: string) => {
    return await db.query.wallets.findFirst({
      where: eq(wallets.id, id),
      with: {
        agent: true,
      },
    });
  },

  // Get wallet by agent ID
  getByAgentId: async (agentId: string) => {
    return await db.query.wallets.findFirst({
      where: eq(wallets.agentId, agentId),
      with: {
        agent: true,
      },
    });
  },

  // Update wallet balance
  updateBalance: async (
    id: string,
    balance: string,
  ): Promise<Wallet | undefined> => {
    const [updated] = await db
      .update(wallets)
      .set({ balance })
      .where(eq(wallets.id, id))
      .returning();
    return updated;
  },

  // Add to wallet balance
  addBalance: async (
    id: string,
    amount: string,
  ): Promise<Wallet | undefined> => {
    const [updated] = await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${amount}::numeric`,
      })
      .where(eq(wallets.id, id))
      .returning();
    return updated;
  },

  // Subtract from wallet balance
  subtractBalance: async (
    id: string,
    amount: string,
  ): Promise<Wallet | undefined> => {
    const [updated] = await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}::numeric`,
      })
      .where(eq(wallets.id, id))
      .returning();
    return updated;
  },

  // Delete a wallet
  delete: async (id: string): Promise<Wallet | undefined> => {
    const [deleted] = await db
      .delete(wallets)
      .where(eq(wallets.id, id))
      .returning();
    return deleted;
  },
};
