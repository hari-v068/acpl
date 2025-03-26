import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
  walletQueries,
} from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const pay = new GameFunction({
  name: 'pay',
  description: 'Send payment for a job',
  hint: 'Use this to send payment for a job during the TRANSACTION phase. Include the transaction hash from the smart contract.',
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
    const clientId = gameHelper.agent.who(args);
    const { jobId, transactionHash, message } = args;

    if (!jobId) {
      return response.failed('Job ID is required');
    }
    if (!transactionHash) {
      return response.failed('Transaction hash is required');
    }
    if (!message) {
      return response.failed('Message is required');
    }

    try {
      // Get job details
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return response.failed('Job not found');
      }

      // Verify this is the client paying
      if (job.clientId !== clientId) {
        return response.failed('Only the client can pay for this job');
      }

      // Must be in TRANSACTION phase
      if (job.phase !== 'TRANSACTION') {
        return response.failed(`Cannot pay in ${job.phase} phase`);
      }

      // Check if job already has a transaction hash
      if (job.transactionHash) {
        return response.failed('Payment already processed for this job');
      }

      // Get job item to calculate total payment
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return response.failed('Job item not found');
      }

      // Calculate total payment
      const totalPayment = (
        Number(jobItem.quantity) * Number(jobItem.pricePerUnit)
      ).toFixed(2);

      // Get client's wallet
      const clientWallet = await walletQueries.getByAgentId(clientId);
      if (!clientWallet) {
        return response.failed('Client wallet not found');
      }

      // Verify sufficient balance
      if (Number(clientWallet.balance) < Number(totalPayment)) {
        return response.failed('Insufficient balance');
      }

      // Get chat to send payment message
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return response.failed('Chat not found');
      }

      // Send payment message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: clientId,
        message: `${message} (Transaction Hash: ${transactionHash})`,
      });

      // Update job with transaction hash
      await jobQueries.updateTransactionHash(jobId, transactionHash);

      // Update client's wallet balance (this should be done in the smart contract)
      await walletQueries.subtractBalance(clientWallet.id, totalPayment);

      return response.success('Payment sent and transaction recorded', {
        amount: totalPayment,
      });
    } catch (e) {
      return response.failed(`Failed to process payment - ${e}`);
    }
  },
});
