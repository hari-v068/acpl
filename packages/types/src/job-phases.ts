import { z } from 'zod';

export const JobPhases = z.enum([
  'REQUEST',
  'NEGOTIATION',
  'TRANSACTION',
  'EVALUATION',
  'COMPLETE',
  'REJECTED',
]);

export type JobPhase = z.infer<typeof JobPhases>;
