import { z } from 'zod';

export const AgentStateSchema = z.object({
  agent: z.object({
    id: z.string(),
    name: z.string(),
    goal: z.string(),
    description: z.string(),
  }),

  wallet: z.object({
    id: z.string(),
    balance: z.string(),
    address: z.string(),
  }),

  inventory: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      metadata: z.record(z.unknown()),
      quantity: z.number(),
    }),
  ),

  jobs: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['client', 'provider', 'evaluator']),
      counterpartId: z.string(),
      phase: z.string(),
      budget: z.string().optional(),
      transactionHash: z.string().optional(),
      expiredAt: z.string().nullable(),

      item: z.object({
<<<<<<< HEAD
        id: z.string().optional(),
=======
>>>>>>> feat/evaluator
        name: z.string().optional(),
        quantity: z.number().optional(),
        pricePerUnit: z.string().optional(),
        requirements: z.string().optional(),
<<<<<<< HEAD
        inventoryItemId: z.string().optional(),
=======
>>>>>>> feat/evaluator
      }),
    }),
  ),

  chats: z.array(
    z.object({
      id: z.string(),
      jobId: z.string(),
      counterpartId: z.string(),
      createdAt: z.string(),
<<<<<<< HEAD
      messages: z
        .array(
          z.object({
            id: z.string(),
            authorId: z.string(),
            message: z.string(),
            createdAt: z.string(),
          }),
        )
        .optional(),
=======
      notification: z.object({
        type: z.enum(['NONE', 'UNREAD_MESSAGES']),
        message: z.string(),
      }),
      lastReadBy: z.string().optional(),
>>>>>>> feat/evaluator
    }),
  ),
});

export type AgentState = z.infer<typeof AgentStateSchema>;
