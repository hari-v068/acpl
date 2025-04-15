import { ActionStateSchema, AgentStateSchema, type Log } from '@acpl/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Constants
export const LOG_FOLDER = 'logs';

// File operations
export async function ensureLogDirectory() {
  try {
    await fs.mkdir(LOG_FOLDER, { recursive: true });
  } catch (e) {
    throw new Error(`Failed to create log directory: ${e}`);
  }
}

export function getAgentLogFilePath(agentName: string): string {
  const sanitizedName = agentName.replace(/\s+/g, '_').toLocaleLowerCase();
  return path.join(LOG_FOLDER, `${sanitizedName}.log`);
}

export async function writeLogToFile(filePath: string, logEntry: string) {
  try {
    await fs.appendFile(filePath, logEntry);
  } catch (err) {
    console.error(`Failed to write to log file ${filePath}:`, err);
  }
}

export function getAgentStateLogFilePath(agentName: string): string {
  const sanitizedName = agentName.replace(/\s+/g, '_').toLocaleLowerCase();
  return path.join(LOG_FOLDER, `${sanitizedName}_state.json`);
}

export async function writeAgentStateToFile(filePath: string, state: unknown) {
  try {
    const stateJson = JSON.stringify(state, null, 2);
    await fs.writeFile(filePath, stateJson);
  } catch (err) {
    console.error(`Failed to write agent state to file ${filePath}:`, err);
  }
}

export function parseLog(message: string): Log | null {
  try {
    /* "Action State: {"data":123}."
       substring('Action State: '.length) -> {"data":123}.
       replace(/\.$/, '') -> {"data":123}
       1. Removes prefix to get JSON + period
       2. replace(/\.$/, '') removes trailing period ($ means end of string) */
    if (message.startsWith('Action State: ')) {
      const jsonStr = message
        .substring('Action State: '.length)
        .replace(/\.$/, '');
      const data = JSON.parse(jsonStr);
      return {
        type: 'ACTION_STATE',
        data: ActionStateSchema.parse(data),
      } as Log;
    }

    /* "Performing function sendMessage with args {"msg":"hi"}."
       match() returns: [
         "Performing function sendMessage with args {"msg":"hi"}.",  // full match
         "sendMessage",                                             // group 1 (\w+)
         "{"msg":"hi"}"                                            // group 2 (.*?)
       ]
       .*? means "any characters, non-greedy" (stops at first match) */
    const fnMatch = message.match(
      /^Performing function (\w+) with args (.*?)\.*$/,
    );
    if (fnMatch) {
      const [, functionName, argsStr] = fnMatch;
      return {
        type: 'FUNCTION_EXECUTION',
        data: {
          functionName,
          args: argsStr.trim() ? JSON.parse(argsStr) : {},
        },
      } as Log;
    }

    /* "Function status [done]: {"result":true}."
       match() returns: [
         "Function status [done]: {"result":true}.",  // full match
         "done",                                      // group 1 (done|failed)
         "{"result":true}"                           // group 2 (.*?)
       ] */
    const statusMatch = message.match(
      /^Function status \[(done|failed)\]: (.*?)\.*$/,
    );
    if (statusMatch) {
      const [, status, resultStr] = statusMatch;
      const result = JSON.parse(resultStr);
      return {
        type: 'FUNCTION_STATUS',
        data: { status, result, timestamp: result.timestamp },
      } as Log;
    }

    /* "Going to society_worker."
       match() returns: [
         "Going to society_worker.",  // full match
         "society_worker"            // group 1 (.*?)
       ] */
    const navMatch = message.match(/^Going to (.*?)\.*$/);
    if (navMatch) {
      const [, workerId] = navMatch;
      return {
        type: 'WORKER_NAVIGATION',
        data: { workerId },
      } as Log;
    }

    /* Simple exact string comparison
       message === "No actions to perform." */
    if (message === 'No actions to perform.') {
      return {
        type: 'NO_ACTIONS',
        data: { message },
      } as Log;
    }

    return null;
  } catch (e) {
    console.error('Failed to parse log:', e);
    return null;
  }
}
