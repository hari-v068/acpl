import { z } from 'zod';
import { AgentStateSchema } from './agent-state';
import { ActionStateSchema } from './action-state';

const BaseLogSchema = z.object({
  agentId: z.string(),
  timestamp: z.string(),
});

export const ActionStateLogSchema = BaseLogSchema.extend({
  type: z.literal('ACTION_STATE'),
  data: ActionStateSchema,
});

export const FunctionLogSchema = BaseLogSchema.extend({
  type: z.literal('FUNCTION_EXECUTION'),
  data: z.object({
    functionName: z.string(),
    args: z.record(z.any()).optional(),
  }),
});

export const FunctionStatusLogSchema = BaseLogSchema.extend({
  type: z.literal('FUNCTION_STATUS'),
  data: z.object({
    status: z.enum(['done', 'failed']),
    result: z.record(z.any()),
    timestamp: z.number(),
  }),
});

export const WorkerNavigationLogSchema = BaseLogSchema.extend({
  type: z.literal('WORKER_NAVIGATION'),
  data: z.object({
    workerId: z.string(),
  }),
});

export const NoActionsLogSchema = BaseLogSchema.extend({
  type: z.literal('NO_ACTIONS'),
  data: z.object({
    message: z.literal('No actions to perform.'),
  }),
});

export const LogSchema = z.discriminatedUnion('type', [
  ActionStateLogSchema,
  FunctionLogSchema,
  FunctionStatusLogSchema,
  WorkerNavigationLogSchema,
  NoActionsLogSchema,
]);

export type Log = z.infer<typeof LogSchema>;
