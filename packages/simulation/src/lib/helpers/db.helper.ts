import { gameHelper } from '@/lib/helpers/game.helper';
import type { AgentConfig } from '@/lib/types.ts';
import { db } from '@acpl/db/client';
import { agentQueries, providerQueries, walletQueries } from '@acpl/db/queries';
import { agents, chats, inventoryItems, jobs } from '@acpl/db/schema';
import type { AgentState } from '@acpl/types';
import { eq, or } from 'drizzle-orm/expressions';

export const dbHelper = {
  agent: {
    create: async (agentConfig: AgentConfig & { agentId: string }) => {
      // 1. Create agent
      return await db.transaction(async () => {
        const agent = await agentQueries.create({
          id: agentConfig.agentId,
          name: agentConfig.name,
          goal: agentConfig.goal,
          description: agentConfig.description,
        });

        // 2. Create wallet with ID pattern: wallet-<agent-id>
        const walletId = `wallet-${agentConfig.agentId}`;
        await walletQueries.create({
          id: walletId,
          agentId: agent.id,
          address: agentConfig.walletAddress,
          balance: '0', // Start with zero balance
        });

        // 3. Create provider profile with ID pattern: provider-<agent-id>
        const providerId = `provider-${agentConfig.agentId}`;
        agentConfig.agentId !== 'agent-evaluator' &&
          agentConfig.providerDescription &&
          (await providerQueries.create({
            id: providerId,
            agentId: agent.id,
            description: agentConfig.providerDescription,
            catalog: agentConfig.providerCatalog ?? [],
          }));

        const gameAgent = gameHelper.agent.create({
          ...agentConfig,
          agentId: agentConfig.agentId,
          workers: agentConfig.workers ?? [],
        });
        return gameAgent;
      });
    },

    getState: async (agentId: string): Promise<AgentState> => {
      // Get agent basic info
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
        with: {
          wallet: true,
        },
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Special case for evaluator - only return jobs in EVALUATION phase
      if (agentId === 'agent-evaluator') {
        const evaluationJobs = await db.query.jobs.findMany({
          where: eq(jobs.phase, 'EVALUATION'),
          with: {
            jobItem: true,
          },
        });

        return {
          agent: {
            id: agent.id,
            name: agent.name,
            goal: agent.goal,
            description: agent.description,
          },
          wallet: {
            id: agent.wallet.id,
            balance: agent.wallet.balance.toString(),
            address: agent.wallet.address,
          },
          inventory: [], // Evaluator doesn't need inventory
          jobs: evaluationJobs.map((job) => ({
            id: job.id,
            role: 'evaluator',
            counterpartId: job.providerId,
            phase: job.phase,
            budget: job.budget?.toString(),
            transactionHash: job.transactionHash ?? undefined,
            expiredAt: job.expiredAt?.toISOString() ?? null,
            item: {
              id: job.jobItem?.id,
              name: job.jobItem?.itemName,
              quantity: job.jobItem?.quantity,
              pricePerUnit: job.jobItem?.pricePerUnit?.toString(),
              inventoryItemId: job.jobItem?.inventoryItemId ?? undefined,
            },
          })),
          chats: [], // Evaluator doesn't need chat history
        };
      }

      // Regular agent state handling
      const inventory = await db.query.inventoryItems.findMany({
        where: eq(inventoryItems.agentId, agentId),
        with: {
          item: true,
        },
      });

      // Get all jobs where agent is either client or provider
      const agentJobs = await db.query.jobs.findMany({
        where: or(eq(jobs.clientId, agentId), eq(jobs.providerId, agentId)),
        with: {
          jobItem: true,
        },
      });

      // Get all chats with messages
      const agentChats = await db.query.chats.findMany({
        where: or(eq(chats.clientId, agentId), eq(chats.providerId, agentId)),
        with: {
          job: true,
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
        },
      });

      // Format the data according to AgentState type
      return {
        agent: {
          id: agent.id,
          name: agent.name,
          goal: agent.goal,
          description: agent.description,
        },
        wallet: {
          id: agent.wallet.id,
          balance: agent.wallet.balance.toString(),
          address: agent.wallet.address,
        },
        inventory: inventory.map((inv) => ({
          id: inv.id,
          name: inv.item.name,
          metadata: inv.item.metadata,
          quantity: inv.quantity,
        })),
        jobs: agentJobs.map((job) => ({
          id: job.id,
          role: job.clientId === agentId ? 'client' : 'provider',
          counterpartId:
            job.clientId === agentId ? job.providerId : job.clientId,
          phase: job.phase,
          budget: job.budget?.toString(),
          transactionHash: job.transactionHash ?? undefined,
          expiredAt: job.expiredAt?.toISOString() ?? null,
          item: {
            id: job.jobItem?.id,
            name: job.jobItem?.itemName,
            quantity: job.jobItem?.quantity,
            pricePerUnit: job.jobItem?.pricePerUnit?.toString(),
            requirements: job.jobItem?.requirements,
            inventoryItemId: job.jobItem?.inventoryItemId ?? undefined,
          },
        })),
        chats: agentChats.map((chat) => ({
          id: chat.id,
          jobId: chat.jobId,
          counterpartId:
            chat.clientId === agentId ? chat.providerId : chat.clientId,
          createdAt: chat.createdAt.toISOString(),
          ...(chat.job.phase !== 'COMPLETED' && {
            messages: chat.messages.map((msg) => ({
              id: msg.id,
              authorId: msg.authorId,
              message: msg.message,
              createdAt: msg.createdAt.toISOString(),
            })),
          }),
        })),
      };
    },
  },

  state: {},

  utils: {
    createAgentId: (name: string): string => {
      return `agent-${name.toLowerCase().replace(/ /g, '-')}`;
    },
  },
};
