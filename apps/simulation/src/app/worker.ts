import {
  accept,
  deliver,
  find,
  negotiate,
  pay,
  read,
  reject,
  request,
} from '@/app/functions/acp';
import { evaluateDocument } from '@/app/functions/evaluator/evaluate-document';
import { evaluatePhysical } from '@/app/functions/evaluator/evaluate-physical';
import { evaluatePoster } from '@/app/functions/evaluator/evaluate-poster';
import { harvestLemons } from '@/app/functions/harvest-lemons';
import { makeLemonade } from '@/app/functions/make-lemonade';
import { makePermit } from '@/app/functions/make-permit';
import { makePoster } from '@/app/functions/make-poster';
import { sellAdvice } from '@/app/functions/sell-advice';
import type { WorkerConfigs } from '@/lib/types';

export const workerConfigs: WorkerConfigs = {
  lemoWorker: {
    id: 'lemo_worker',
    name: "Lemo's Lemonade Crafting",
    description: 'Handles lemonade crafting.',
    functions: [makeLemonade, sellAdvice],
  },
  zestieWorker: {
    id: 'zestie_worker',
    name: "Zestie's Lemon Harvesting",
    description: 'Handles lemon harvesting.',
    functions: [harvestLemons],
  },
  pixieWorker: {
    id: 'pixie_worker',
    name: "Pixie's Digital Design Studio",
    description: 'Handles poster creation.',
    functions: [makePoster],
  },
  lexieWorker: {
    id: 'lexie_worker',
    name: "Lexie's Legal Services",
    description: 'Handles business permit creation.',
    functions: [makePermit],
  },
  evaluatorWorker: {
    id: 'evaluator_worker',
    name: 'Evaluator',
    description: 'Evaluates the quality of the work done by the agents',
    functions: [evaluatePoster, evaluateDocument, evaluatePhysical],
  },
  acpWorker: {
    id: 'acp_worker',
    name: 'ACP (Agent-Commerce-Protocol) Worker',
    description: 'Worker for agent-commerce related functions',
    functions: [find, request, negotiate, accept, reject, pay, deliver, read],
  },
} as const;
