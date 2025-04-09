import { gameHelper } from '@/lib/helpers/game.helper';
import type { AgentConfig } from '@/lib/types.ts';
import { db } from '@acpl/db/client';
import { agentQueries, providerQueries, walletQueries } from '@acpl/db/queries';
import { agents, chats, inventoryItems, jobs } from '@acpl/db/schema';
import { Chat, Message } from '@acpl/db/types';
import type { AgentState } from '@acpl/types';
import { eq, or } from 'drizzle-orm/expressions';

export const serviceHelper = {
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
        if (agentConfig.providerDescription) {
          await providerQueries.create({
            id: providerId,
            agentId: agent.id,
            description: agentConfig.providerDescription,
            catalog: agentConfig.providerCatalog ?? [],
          });
        }

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

      // Regular agent state handling
      const inventory = await db.query.inventoryItems.findMany({
        where: eq(inventoryItems.agentId, agentId),
        with: {
          item: true,
        },
      });

      // Get all jobs where agent is either client, provider, or evaluator
      const agentJobs = await db.query.jobs.findMany({
        where: or(
          eq(jobs.clientId, agentId),
          eq(jobs.providerId, agentId),
          eq(jobs.evaluatorId, agentId),
        ),
        with: {
          jobItem: true,
        },
      });

      // Get all chats with messages
      const agentChats = await db.query.chats.findMany({
        where: or(
          eq(chats.clientId, agentId),
          eq(chats.providerId, agentId),
          eq(chats.evaluatorId, agentId),
        ),
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
          role:
            job.clientId === agentId
              ? 'client'
              : job.providerId === agentId
                ? 'provider'
                : 'evaluator',
          counterpartId:
            job.clientId === agentId
              ? job.providerId
              : job.providerId === agentId
                ? job.clientId
                : job.clientId,
          phase: job.phase,
          budget: job.budget?.toString(),
          transactionHash: job.transactionHash ?? undefined,
          expiredAt: job.expiredAt?.toISOString() ?? null,
          item: job.jobItem
            ? {
                name: job.jobItem.itemName,
                quantity: job.jobItem.quantity,
                pricePerUnit: job.jobItem.pricePerUnit?.toString(),
                requirements: job.jobItem.requirements,
              }
            : {},
        })),
        chats: await Promise.all(
          agentChats.map(async (chat) => {
            const hasUnreadMessage = serviceHelper.chat.hasUnreadMessages(
              chat,
              agentId,
            );

            return {
              id: chat.id,
              jobId: chat.jobId,
              counterpartId:
                chat.clientId === agentId ? chat.providerId : chat.clientId,
              createdAt: chat.createdAt.toISOString(),
              notification: hasUnreadMessage
                ? {
                    type: 'UNREAD_MESSAGES' as const,
                    message: 'You have messages waiting for your response',
                  }
                : {
                    type: 'NONE' as const,
                    message: '',
                  },
              lastReadBy: chat.lastReadBy ?? undefined,
            };
          }),
        ),
      };
    },

    createDbId: (name: string): string => {
      return `agent-${name.toLowerCase().replace(/ /g, '-')}`;
    },
  },

  chat: {
    hasUnreadMessages: (
      chat: Chat & { messages: Message[] },
      agentId: string,
    ): boolean => {
      return (
        chat.messages.length > 0 &&
        chat.messages[chat.messages.length - 1].authorId !== agentId &&
        chat.lastReadBy !== agentId
      );
    },
  },
};
