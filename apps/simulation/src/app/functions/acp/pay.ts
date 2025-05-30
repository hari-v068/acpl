import { gameHelper } from '@/lib/helpers/game.helper';
import { serviceHelper } from '@/lib/helpers/service.helper';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
  walletQueries,
} from '@acpl/db/queries';
import { JobPhases } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const PayArgsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  transactionHash: z.string().min(1, 'Transaction hash is required'),
  message: z.string().min(1, 'Message is required'),
});

type PayArgs = z.infer<typeof PayArgsSchema>;

export const pay = new GameFunction({
  name: 'pay',
  description: 'Send payment for a job',
  hint: `
    Use this function to send payment for a job during the TRANSACTION phase. Important notes:

    - Only the client can send payment
    - Can only be used in TRANSACTION phase
    - Must read all messages before paying
    - Requires sufficient wallet balance
    - Payment must be made before delivery
    - Include the transaction hash from the smart contract
    - Payment amount is calculated from job terms (quantity × price)

    The payment will be processed and the provider will be notified to proceed with delivery.
  `,
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to pay for',
    },
    {
      name: 'transactionHash',
      type: 'string',
      description: 'The transaction hash from the smart contract payment',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Message to the provider about the payment',
    },
  ] as const,
  executable: async (args, _logger) => {
    const clientId = gameHelper.function.who(args);

    const parseResult = PayArgsSchema.safeParse(args);
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { jobId, transactionHash, message } = parseResult.data;

    try {
      // Get job details first
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      // Verify this is the client paying
      if (job.clientId !== clientId) {
        return gameHelper.function.response.failed(
          'Only the client can pay for this job',
        );
      }

      // Must be in TRANSACTION phase
      if (job.phase !== JobPhases.Enum.TRANSACTION) {
        return gameHelper.function.response.failed(
          `Cannot pay in ${job.phase} phase`,
        );
      }

      // Check if job already has a transaction hash
      if (job.transactionHash) {
        return gameHelper.function.response.failed(
          'Payment already processed for this job',
        );
      }

      // Get job item to calculate total payment
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return gameHelper.function.response.failed('Job item not found');
      }

      // Calculate total payment
      const totalPayment = (
        Number(jobItem.quantity) * Number(jobItem.pricePerUnit)
      ).toFixed(2);

      // Get client's wallet
      const clientWallet = await walletQueries.getByAgentId(clientId);
      if (!clientWallet) {
        return gameHelper.function.response.failed('Client wallet not found');
      }

      // Verify sufficient balance
      if (Number(clientWallet.balance) < Number(totalPayment)) {
        return gameHelper.function.response.failed('Insufficient balance');
      }

      // Get chat to check messages
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return gameHelper.function.response.failed('Chat not found');
      }

      const hasUnreadMessages = serviceHelper.chat.hasUnreadMessages(
        chat,
        clientId,
      );
      if (hasUnreadMessages) {
        return gameHelper.function.response.failed(
          'You must read all messages before taking this action. Use the read function first.',
        );
      }

      // Send payment message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: clientId,
        message: message,
      });

      // Update job with transaction hash and escrow amount
      const updatedJob = await jobQueries.updateTransactionHash(
        job.id,
        transactionHash,
      );
      if (!updatedJob) {
        throw new Error('Failed to update job with transaction hash');
      }
      await jobQueries.updateEscrowAmount(job.id, totalPayment);

      // Update client's wallet balance
      await walletQueries.subtractBalance(clientWallet.id, totalPayment);

      return gameHelper.function.response.success(
        'Payment sent and transaction recorded',
        {
          amount: totalPayment,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to process payment - ${e}`,
      );
    }
  },
});
