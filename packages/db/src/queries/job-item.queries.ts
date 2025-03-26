import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { jobItems } from '../schema';
import { JobItem } from '../types';

export const jobItemQueries = {
  // Create a new job item
  create: async (data: {
    id: string;
    jobId: string;
    inventoryItemId?: string;
    itemName: string;
    pricePerUnit: string;
    quantity: number;
    requirements: string;
  }): Promise<JobItem> => {
    const [jobItem] = await db.insert(jobItems).values(data).returning();
    return jobItem;
  },

  // Get a job item by ID
  getById: async (id: string) => {
    return await db.query.jobItems.findFirst({
      where: eq(jobItems.id, id),
      with: {
        job: true,
        inventoryItem: {
          with: {
            item: true,
          },
        },
      },
    });
  },

  // Get job items by job ID
  getByJobId: async (jobId: string) => {
    return await db.query.jobItems.findFirst({
      where: eq(jobItems.jobId, jobId),
      with: {
        job: true,
        inventoryItem: {
          with: {
            item: true,
          },
        },
      },
    });
  },

  // Get job items by inventory item ID
  getByInventoryItemId: async (inventoryItemId: string) => {
    return await db.query.jobItems.findMany({
      where: eq(jobItems.inventoryItemId, inventoryItemId),
      with: {
        job: true,
        inventoryItem: {
          with: {
            item: true,
          },
        },
      },
    });
  },

  // General update method
  update: async (
    id: string,
    data: Partial<Omit<JobItem, 'id'>>,
  ): Promise<JobItem | undefined> => {
    const [updated] = await db
      .update(jobItems)
      .set(data)
      .where(eq(jobItems.id, id))
      .returning();
    return updated;
  },

  // Update job item price per unit
  updatePricePerUnit: async (
    id: string,
    pricePerUnit: string,
  ): Promise<JobItem | undefined> => {
    const [updated] = await db
      .update(jobItems)
      .set({ pricePerUnit })
      .where(eq(jobItems.id, id))
      .returning();
    return updated;
  },

  // Update job item quantity
  updateQuantity: async (
    id: string,
    quantity: number,
  ): Promise<JobItem | undefined> => {
    const [updated] = await db
      .update(jobItems)
      .set({ quantity })
      .where(eq(jobItems.id, id))
      .returning();
    return updated;
  },

  // Update inventory item ID
  updateInventoryItemId: async (
    id: string,
    inventoryItemId: string,
  ): Promise<JobItem | undefined> => {
    const [updated] = await db
      .update(jobItems)
      .set({ inventoryItemId })
      .where(eq(jobItems.id, id))
      .returning();
    return updated;
  },

  // Calculate total price for a job item
  calculateTotalPrice: async (id: string): Promise<string> => {
    const [result] = await db
      .select({
        total: sql<string>`${jobItems.quantity} * ${jobItems.pricePerUnit}`,
      })
      .from(jobItems)
      .where(eq(jobItems.id, id));
    return result?.total ?? '0';
  },

  // Calculate total price for all items in a job
  calculateJobTotal: async (jobId: string): Promise<string> => {
    const [result] = await db
      .select({
        total: sql<string>`SUM(${jobItems.quantity} * ${jobItems.pricePerUnit})`,
      })
      .from(jobItems)
      .where(eq(jobItems.jobId, jobId))
      .groupBy(jobItems.jobId);
    return result?.total ?? '0';
  },

  // Delete a job item
  delete: async (id: string): Promise<JobItem | undefined> => {
    const [deleted] = await db
      .delete(jobItems)
      .where(eq(jobItems.id, id))
      .returning();
    return deleted;
  },

  // Optional: Add a specific method for updating requirements if needed
  updateRequirements: async (
    id: string,
    requirements: string,
  ): Promise<JobItem | undefined> => {
    const [updated] = await db
      .update(jobItems)
      .set({ requirements })
      .where(eq(jobItems.id, id))
      .returning();
    return updated;
  },
};
