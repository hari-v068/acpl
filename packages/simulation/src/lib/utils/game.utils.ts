import { z } from 'zod';
import {
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus,
} from '@virtuals-protocol/game';

export const GameResponseSchema = z.object({
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type GameResponse = z.infer<typeof GameResponseSchema>;

export const response = {
  success: (message: string, metadata?: Record<string, unknown>) => {
    return new ExecutableGameFunctionResponse(
      ExecutableGameFunctionStatus.Done,
      JSON.stringify({ message, metadata }),
    );
  },
  failed: (message: string, metadata?: Record<string, unknown>) => {
    return new ExecutableGameFunctionResponse(
      ExecutableGameFunctionStatus.Failed,
      JSON.stringify({ message, metadata }),
    );
  },
};
