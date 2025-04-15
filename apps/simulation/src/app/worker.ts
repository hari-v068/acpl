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
    name: 'Lemo Worker',
    description:
      'Handles lemonade business operations: creating lemonade products from lemons and generating revenue through selling business advice.',
    functions: [makeLemonade, sellAdvice],
  },
  zestieWorker: {
    id: 'zestie_worker',
    name: 'Zestie Worker',
    description:
      'Handles lemon production operations: harvesting fresh lemons from the farm and managing inventory to supply premium quality citrus to the marketplace.',
    functions: [harvestLemons],
  },
  pixieWorker: {
    id: 'pixie_worker',
    name: 'Pixie Worker',
    description:
      'Handles digital design operations: creating professional marketing posters based on client requirements and visual prompts for business promotion.',
    functions: [makePoster],
  },
  lexieWorker: {
    id: 'lexie_worker',
    name: 'Lexie Worker',
    description:
      'Handles business compliance operations: creating official business permits and legal documentation to ensure regulatory compliance for business operations.',
    functions: [makePermit],
  },
  evaluatorWorker: {
    id: 'evaluator_worker',
    name: 'Evaluator Worker',
    description:
      'Handles quality assessment of marketplace deliverables: evaluating digital content (posters), official documents (permits), and physical items (lemons, lemonade) against requirements.',
    functions: [evaluatePoster, evaluateDocument, evaluatePhysical],
  },
  acpWorker: {
    id: 'acp_worker',
    name: 'ACP (Agent-Commerce-Protocol) Worker',
    description: `Handles marketplace interactions between agents: finding providers, requesting services, negotiating deals, processing transactions, and coordinating deliveries.`,
    functions: [find, request, negotiate, accept, reject, pay, deliver, read],
  },
} as const;
