import { JobPhases } from '@acpl/types';

export const agentInstructions = {
  // Core flow for clients (buyers)
  clientFlow: {
    description: 'Flow for clients wanting to buy items/services',
    steps: [
      {
        phase: JobPhases.Enum.REQUEST,
        action: 'find',
        description: 'Search for providers offering what you need',
      },
      {
        phase: JobPhases.Enum.REQUEST,
        action: 'request',
        description:
          'Send your job request with desired terms (optionally specify an evaluator)',
      },
      {
        phase: JobPhases.Enum.NEGOTIATION,
        action: 'negotiate',
        description: 'Discuss and agree on terms with provider',
      },
      {
        phase: JobPhases.Enum.TRANSACTION,
        action: 'pay',
        description: 'Send payment once terms are agreed',
      },
      {
        phase: JobPhases.Enum.TRANSACTION,
        action: 'wait',
        description: 'Wait for provider to deliver',
      },
      {
        phase: JobPhases.Enum.EVALUATION,
        action: 'wait',
        description:
          'Wait for evaluator to assess the delivered item (if evaluator was specified)',
      },
    ],
  },

  // Core flow for providers (sellers)
  providerFlow: {
    description: 'Flow for providers offering items/services',
    steps: [
      {
        phase: JobPhases.Enum.REQUEST,
        action: 'accept/reject',
        description: 'Review and accept/reject incoming requests',
      },
      {
        phase: JobPhases.Enum.NEGOTIATION,
        action: 'negotiate',
        description: 'Discuss and agree on terms with client',
      },
      {
        phase: JobPhases.Enum.TRANSACTION,
        action: 'wait',
        description: 'Wait for client payment',
      },
      {
        phase: JobPhases.Enum.TRANSACTION,
        action: 'deliver',
        description: 'Deliver the item/service after payment',
      },
      {
        phase: JobPhases.Enum.EVALUATION,
        action: 'wait',
        description:
          'Wait for evaluator to assess the delivered item (if evaluator was specified)',
      },
    ],
  },

  // Core flow for evaluators
  evaluatorFlow: {
    description: 'Flow for evaluators assessing delivered items',
    steps: [
      {
        phase: JobPhases.Enum.REQUEST,
        action: 'accept/reject',
        description: 'Review and accept/reject incoming evaluation requests',
      },
      {
        phase: JobPhases.Enum.EVALUATION,
        action: 'evaluate',
        description: 'Assess the delivered item against requirements',
      },
    ],
  },

  // Active job handling
  activeJobFlow: {
    description: 'How to handle an existing job',
    steps: [
      {
        action: 'read',
        description:
          'Always read chat messages first to understand current state',
      },
      {
        action: 'respond',
        description: 'Respond based on current phase:',
        phases: {
          [JobPhases.Enum.REQUEST]: 'Accept/reject the request',
          [JobPhases.Enum.NEGOTIATION]:
            'Negotiate terms or agree to final terms',
          [JobPhases.Enum.TRANSACTION]:
            'Send payment (client) or deliver (provider)',
          [JobPhases.Enum.EVALUATION]:
            'Evaluate the deliverable item (evaluator only)',
        },
      },
    ],
  },

  // Important rules
  rules: [
    'Always read messages before taking any action',
    'Only the designated role can call certain functions',
    'Terms can only be changed through COUNTER actions',
    'Payment is only possible in TRANSACTION phase',
    'Agreement to terms must be explicit and final',
    'Evaluators can only evaluate in EVALUATION phase',
    'Evaluation must be completed before payment is released (if evaluator is involved)',
  ],
};
