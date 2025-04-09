import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { jobs } from '../schema';
import { Job } from '../types';

export const jobQueries = {
  // Create a new job
  create: async (data: {
    id: string;
    clientId: string;
    providerId: string;
<<<<<<< HEAD
=======
    evaluatorId?: string | null;
>>>>>>> feat/evaluator
    budget?: string;
    phase?: string;
    expiredAt?: Date;
  }): Promise<Job> => {
    const [job] = await db.insert(jobs).values(data).returning();
    return job;
  },

  // Get a single job by ID with relations
  getById: async (id: string) => {
    return await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        client: true,
        provider: true,
        jobItem: true,
        chat: true,
      },
    });
  },

  // Get jobs by client ID
  getByClientId: async (clientId: string) => {
    return await db.query.jobs.findMany({
      where: eq(jobs.clientId, clientId),
      with: {
        client: true,
        provider: true,
        jobItem: true,
        chat: true,
      },
    });
  },

  // Get jobs by provider ID
  getByProviderId: async (providerId: string) => {
    return await db.query.jobs.findMany({
      where: eq(jobs.providerId, providerId),
      with: {
        client: true,
        provider: true,
        jobItem: true,
        chat: true,
      },
    });
  },

  // Get jobs by phase
  getByPhase: async (phase: string) => {
    return await db.query.jobs.findMany({
      where: eq(jobs.phase, phase),
      with: {
        client: true,
        provider: true,
        jobItem: true,
        chat: true,
      },
    });
  },

  // Get active jobs between a client and provider
  getActiveJobsBetweenAgents: async (clientId: string, providerId: string) => {
    return await db.query.jobs.findMany({
      where: and(eq(jobs.clientId, clientId), eq(jobs.providerId, providerId)),
      with: {
        client: true,
        provider: true,
        jobItem: true,
        chat: true,
      },
    });
  },

  // Update job phase
  updatePhase: async (id: string, phase: string): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ phase })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

  // Update job budget
  updateBudget: async (
    id: string,
    budget: string,
  ): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ budget })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

  // Update job transaction hash
  updateTransactionHash: async (
    id: string,
    transactionHash: string,
  ): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ transactionHash })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

<<<<<<< HEAD
=======
  // Update job escrow amount
  updateEscrowAmount: async (
    id: string,
    escrowAmount: string,
  ): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ escrowAmount })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

>>>>>>> feat/evaluator
  // Update job expiry
  updateExpiry: async (
    id: string,
    expiredAt: Date,
  ): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ expiredAt })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

<<<<<<< HEAD
=======
  // Update job metadata
  updateMetadata: async (
    id: string,
    metadata: {
      acceptance?: {
        [agentId: string]: {
          acceptedAt: string;
          rejectedAt?: string;
        };
      };
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
    },
  ): Promise<Job | undefined> => {
    const [updated] = await db
      .update(jobs)
      .set({ metadata })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  },

>>>>>>> feat/evaluator
  // Delete a job
  delete: async (id: string): Promise<Job | undefined> => {
    const [deleted] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return deleted;
  },
};
