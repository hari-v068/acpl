import { eq } from 'drizzle-orm';
import { db } from '../db';
import { agents } from '../schema';
import { Agent } from '../types';

export const agentQueries = {
  create: async (data: {
    id: string;
    name: string;
    goal: string;
    description: string;
  }): Promise<Agent> => {
    const [agent] = await db.insert(agents).values(data).returning();
    return agent;
  },

  getById: async (id: string) => {
    return await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: {
        wallet: true,
        inventory: true,
        ownedItems: true,
        clientJobs: true,
        providerJobs: true,
      },
    });
  },

  getByIds: async (ids: string[]) => {
    return await db.query.agents.findMany({
      where: (agent) =>
        ids.map((id) => eq(agent.id, id)).reduce((a, b) => a || b),
    });
  },

  getAll: async () => {
    return await db.query.agents.findMany();
  },

  update: async (
    id: string,
    data: Partial<Omit<Agent, 'id'>>,
  ): Promise<Agent | undefined> => {
    const [updated] = await db
      .update(agents)
      .set(data)
      .where(eq(agents.id, id))
      .returning();
    return updated;
  },

  findByName: async (name: string) => {
    return await db.query.agents.findMany({
      where: eq(agents.name, name),
    });
  },

  findByGoal: async (goal: string) => {
    return await db.query.agents.findMany({
      where: eq(agents.goal, goal),
    });
  },

  delete: async (id: string): Promise<Agent | undefined> => {
    const [deleted] = await db
      .delete(agents)
      .where(eq(agents.id, id))
      .returning();
    return deleted;
  },
};
