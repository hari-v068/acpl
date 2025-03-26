import { eq } from 'drizzle-orm';
import { db } from '../db';
import { items } from '../schema';
import { Item } from '../types';
import { ItemMetadata } from '@acpl/types';

export const itemQueries = {
  // Create a new item
  create: async (data: {
    id: string;
    agentId: string;
    name: string;
    metadata: ItemMetadata;
  }): Promise<Item> => {
    const [item] = await db.insert(items).values(data).returning();
    return item;
  },

  // Get a single item by ID with relations
  getById: async (id: string) => {
    return await db.query.items.findFirst({
      where: eq(items.id, id),
      with: {
        owner: true,
        inventoryItems: true,
      },
    });
  },

  // Get items by agent ID
  getByAgentId: async (agentId: string) => {
    return await db.query.items.findMany({
      where: eq(items.agentId, agentId),
      with: {
        owner: true,
        inventoryItems: true,
      },
    });
  },

  // Get items by name
  getByName: async (name: string) => {
    return await db.query.items.findMany({
      where: eq(items.name, name),
      with: {
        owner: true,
        inventoryItems: true,
      },
    });
  },

  // Update an item
  update: async (
    id: string,
    data: Partial<{
      name: string;
      agentId: string;
      metadata: ItemMetadata;
    }>,
  ): Promise<Item | undefined> => {
    const [updated] = await db
      .update(items)
      .set(data)
      .where(eq(items.id, id))
      .returning();
    return updated;
  },

  // Update item metadata
  updateMetadata: async (
    id: string,
    metadata: ItemMetadata,
  ): Promise<Item | undefined> => {
    const [updated] = await db
      .update(items)
      .set({ metadata })
      .where(eq(items.id, id))
      .returning();
    return updated;
  },

  // Delete an item
  delete: async (id: string): Promise<Item | undefined> => {
    const [deleted] = await db
      .delete(items)
      .where(eq(items.id, id))
      .returning();
    return deleted;
  },
};
