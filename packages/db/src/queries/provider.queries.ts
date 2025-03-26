import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { providers } from '../schema';
import { Provider } from '../types';

export const providerQueries = {
  // Create a new provider
  create: async (data: {
    id: string;
    agentId: string;
    description: string;
    catalog: { product: string; price: number }[];
  }): Promise<Provider> => {
    const [provider] = await db.insert(providers).values(data).returning();
    return provider;
  },

  // Get a single provider by ID with relations
  getById: async (id: string) => {
    return await db.query.providers.findFirst({
      where: eq(providers.id, id),
      with: {
        agent: true,
      },
    });
  },

  // Get provider by agent ID
  getByAgentId: async (agentId: string) => {
    return await db.query.providers.findFirst({
      where: eq(providers.agentId, agentId),
      with: {
        agent: true,
      },
    });
  },

  // Get all providers
  getAll: async () => {
    return await db.query.providers.findMany({
      with: {
        agent: true,
      },
    });
  },

  // Update provider
  update: async (
    id: string,
    data: Partial<{
      description: string;
      agentId: string;
      catalog: Array<{ product: string; price: number }>;
      totalApprovedJobs?: number;
      totalRejectedJobs?: number;
    }>,
  ): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set(data)
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Update provider catalog
  updateCatalog: async (
    id: string,
    catalog: { product: string; price: number }[],
  ): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set({ catalog })
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Add product to catalog
  addToCatalog: async (
    id: string,
    product: { product: string; price: number },
  ): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set({
        catalog: sql`${providers.catalog} || ${JSON.stringify([
          product,
        ])}::jsonb`,
      })
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Remove product from catalog
  removeFromCatalog: async (
    id: string,
    productName: string,
  ): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set({
        catalog: sql`(
          SELECT jsonb_agg(item)
          FROM jsonb_array_elements(${providers.catalog}) item
          WHERE (item->>'product') != ${productName}
        )`,
      })
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Increment approved jobs count
  incrementApprovedJobs: async (id: string): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set({
        totalApprovedJobs: sql`${providers.totalApprovedJobs} + 1`,
      })
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Increment rejected jobs count
  incrementRejectedJobs: async (id: string): Promise<Provider | undefined> => {
    const [updated] = await db
      .update(providers)
      .set({
        totalRejectedJobs: sql`${providers.totalRejectedJobs} + 1`,
      })
      .where(eq(providers.id, id))
      .returning();
    return updated;
  },

  // Get provider stats
  getStats: async (id: string) => {
    return await db.query.providers.findFirst({
      where: eq(providers.id, id),
      columns: {
        totalApprovedJobs: true,
        totalRejectedJobs: true,
      },
    });
  },

  // Delete a provider
  delete: async (id: string): Promise<Provider | undefined> => {
    const [deleted] = await db
      .delete(providers)
      .where(eq(providers.id, id))
      .returning();
    return deleted;
  },
};
