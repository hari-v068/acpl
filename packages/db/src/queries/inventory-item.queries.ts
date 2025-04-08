import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { inventoryItems } from '../schema';
import { InventoryItem } from '../types';

export const inventoryItemQueries = {
  // Create a new inventory item
  create: async (data: {
    id: string;
    agentId: string;
    itemId: string;
    quantity?: number;
  }): Promise<InventoryItem> => {
    const [item] = await db.insert(inventoryItems).values(data).returning();
    return item;
  },

  // Get a single inventory item by ID with relations
  getById: async (id: string) => {
    return await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, id),
      with: {
        agent: true,
        item: true,
        jobItems: true,
      },
    });
  },

  // Get inventory items by agent ID
  getByAgentId: async (agentId: string) => {
    return await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.agentId, agentId),
      with: {
        agent: true,
        item: true,
        jobItems: true,
      },
    });
  },

  // Get inventory item by agent and item ID
  getByAgentAndItemId: async (agentId: string, itemId: string) => {
    return await db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.agentId, agentId),
        eq(inventoryItems.itemId, itemId),
      ),
      with: {
        agent: true,
        item: true,
        jobItems: true,
      },
    });
  },

  // Update inventory item quantity
  updateQuantity: async (
    id: string,
    quantity: number,
  ): Promise<InventoryItem | undefined> => {
    const [updated] = await db
      .update(inventoryItems)
      .set({ quantity })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  },

  // Add to inventory item quantity
  addQuantity: async (
    id: string,
    amount: number,
  ): Promise<InventoryItem | undefined> => {
    const [updated] = await db
      .update(inventoryItems)
      .set({
        quantity: sql`${inventoryItems.quantity} + ${amount}`,
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  },

  // Subtract from inventory item quantity
  subtractQuantity: async (
    id: string,
    amount: number,
  ): Promise<InventoryItem | undefined> => {
    const [updated] = await db
      .update(inventoryItems)
      .set({
        quantity: sql`${inventoryItems.quantity} - ${amount}`,
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  },

  transferOwnership: async (id: string, agentId: string) => {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(inventoryItems)
        .set({ agentId })
        .where(eq(inventoryItems.id, id))
        .returning();
      return updated;
    });
  },

  // Delete an inventory item
  delete: async (id: string): Promise<InventoryItem | undefined> => {
    const [deleted] = await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .returning();
    return deleted;
  },
};
