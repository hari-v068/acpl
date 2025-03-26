'use client';

import { cn } from '@/lib/utils';
import type { Log } from '@acpl/types';
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Code,
  Coffee,
  Loader2,
  Navigation,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Define specific log types for better type safety
type FunctionExecutionLog = Extract<Log, { type: 'FUNCTION_EXECUTION' }>;
type FunctionStatusLog = Extract<Log, { type: 'FUNCTION_STATUS' }>;
type WorkerNavigationLog = Extract<Log, { type: 'WORKER_NAVIGATION' }>;
type NoActionsLog = Extract<Log, { type: 'NO_ACTIONS' }>;

interface AgentActivityProps {
  logs: Log[];
  className?: string;
}

/* eslint-disable */
type AgentActivityState =
  | { type: 'idle'; message: string }
  | { type: 'executing'; function: string; args: Record<string, any> }
  | { type: 'success'; function: string; result: Record<string, any> }
  | { type: 'failed'; function: string; result: Record<string, any> }
  | { type: 'navigating'; workerId: string }
  | { type: 'unknown' };

export function AgentActivity({ logs, className }: AgentActivityProps) {
  // Filter and sort logs to get activity-relevant entries
  const activityLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    return [...logs]
      .filter(
        (log) =>
          log.type === 'FUNCTION_EXECUTION' ||
          log.type === 'FUNCTION_STATUS' ||
          log.type === 'WORKER_NAVIGATION' ||
          log.type === 'NO_ACTIONS',
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [logs]);

  // Get latest logs by type for current activity display
  const currentLogs = useMemo(() => {
    const latestByType: Record<string, Log> = {};

    for (const log of activityLogs) {
      if (
        !latestByType[log.type] ||
        new Date(log.timestamp).getTime() >
          new Date(latestByType[log.type].timestamp).getTime()
      ) {
        latestByType[log.type] = log;
      }
    }

    return {
      functionExecution: latestByType['FUNCTION_EXECUTION'] as
        | FunctionExecutionLog
        | undefined,
      functionStatus: latestByType['FUNCTION_STATUS'] as
        | FunctionStatusLog
        | undefined,
      workerNavigation: latestByType['WORKER_NAVIGATION'] as
        | WorkerNavigationLog
        | undefined,
      noActions: latestByType['NO_ACTIONS'] as NoActionsLog | undefined,
    };
  }, [activityLogs]);

  const [activityState, setActivityState] = useState<AgentActivityState>({
    type: 'unknown',
  });
  const [showDetails, setShowDetails] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Trigger animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if we have any valid logs
    if (!currentLogs || !Object.values(currentLogs).some((log) => log)) {
      setActivityState({
        type: 'idle',
        message: 'No recent activity data available',
      });
      return;
    }

    const timestamps = {
      functionExecution: currentLogs.functionExecution
        ? new Date(currentLogs.functionExecution.timestamp).getTime()
        : 0,
      functionStatus: currentLogs.functionStatus
        ? new Date(currentLogs.functionStatus.timestamp).getTime()
        : 0,
      workerNavigation: currentLogs.workerNavigation
        ? new Date(currentLogs.workerNavigation.timestamp).getTime()
        : 0,
      noActions: currentLogs.noActions
        ? new Date(currentLogs.noActions.timestamp).getTime()
        : 0,
    };

    // Find which log type has the most recent timestamp
    const entries = Object.entries(timestamps);
    const [mostRecentType] = entries.reduce(
      (latest, current) => (current[1] > latest[1] ? current : latest),
      ['none', 0],
    );

    // Set state based on the most recent log type
    switch (mostRecentType) {
      case 'functionExecution':
        setActivityState({
          type: 'executing',
          function: currentLogs.functionExecution!.data.functionName,
          args: currentLogs.functionExecution!.data.args || {},
        });
        break;

      case 'functionStatus': {
        const status = currentLogs.functionStatus!.data.status;
        const functionName = currentLogs.functionExecution
          ? currentLogs.functionExecution.data.functionName
          : 'Unknown function';

        setActivityState({
          type: status === 'done' ? 'success' : 'failed',
          function: functionName,
          result: currentLogs.functionStatus!.data.result,
        });
        break;
      }

      case 'workerNavigation':
        setActivityState({
          type: 'navigating',
          workerId: currentLogs.workerNavigation!.data.workerId,
        });
        break;

      case 'noActions':
        setActivityState({
          type: 'idle',
          message: currentLogs.noActions!.data.message,
        });
        break;

      default:
        setActivityState({
          type: 'idle',
          message: 'Waiting for agent activity',
        });
    }
  }, [currentLogs]);

  const renderActivityIcon = () => {
    switch (activityState.type) {
      case 'idle':
        return <Coffee className="h-5 w-5 text-muted-foreground" />;
      case 'executing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'navigating':
        return <Navigation className="h-5 w-5 text-blue-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (activityState.type) {
      case 'executing':
        return 'border-primary/30 bg-primary/5';
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'failed':
        return 'border-destructive/30 bg-destructive/5';
      case 'navigating':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'idle':
      default:
        return 'border-muted';
    }
  };

  const renderActivityTitle = () => {
    switch (activityState.type) {
      case 'idle':
        return 'Agent is idle';
      case 'executing':
        return `Executing ${activityState.function}`;
      case 'success':
        return `Successfully executed ${activityState.function}`;
      case 'failed':
        return `Failed to execute ${activityState.function}`;
      case 'navigating':
        return `Navigating to ${activityState.workerId}`;
      default:
        return 'Unknown activity';
    }
  };

  const renderActivityDescription = () => {
    switch (activityState.type) {
      case 'idle':
        return 'The agent is currently not performing any actions.';
      case 'executing':
        return `Running function with ${
          Object.keys(activityState.args).length
        } arguments.`;
      case 'success':
        return 'The function completed successfully.';
      case 'failed':
        return 'The function encountered an error during execution.';
      case 'navigating':
        return (
          <div className="flex items-center gap-1">
            <span>Moving to</span>
            <code className="px-1 py-0.5 bg-muted rounded text-xs">
              {activityState.workerId}
            </code>
            <span>worker environment</span>
          </div>
        );
      default:
        return 'Waiting for activity data...';
    }
  };

  const renderDetailContent = () => {
    if (!showDetails) return null;

    switch (activityState.type) {
      case 'executing':
        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs font-mono overflow-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold">Function Arguments</span>
            </div>
            <pre className="p-2 bg-card rounded border">
              {JSON.stringify(activityState.args, null, 2)}
            </pre>
          </div>
        );
      case 'success':
      case 'failed':
        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs font-mono overflow-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold">Function Result</span>
            </div>
            <pre className="p-2 bg-card rounded border">
              {JSON.stringify(activityState.result, null, 2)}
            </pre>
          </div>
        );
      default:
        return null;
    }
  };

  if (!activityLogs.length) {
    return (
      <div className="rounded-lg border border-muted p-4 text-center">
        <p className="text-sm text-muted-foreground">
          No activity data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Activity - Same as before */}
      <div
        className={cn(
          'rounded-lg border p-4 transition-all duration-300 max-h-[24rem] overflow-y-auto',
          getStatusColor(),
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex-shrink-0 p-2 rounded-full',
              activityState.type === 'executing'
                ? 'bg-primary/10'
                : activityState.type === 'success'
                  ? 'bg-green-500/10'
                  : activityState.type === 'failed'
                    ? 'bg-destructive/10'
                    : activityState.type === 'navigating'
                      ? 'bg-blue-500/10'
                      : 'bg-muted',
            )}
          >
            {renderActivityIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium">{renderActivityTitle()}</h3>
            <div className="text-xs text-muted-foreground mt-1">
              {renderActivityDescription()}
            </div>
          </div>
        </div>

        {(activityState.type === 'executing' ||
          activityState.type === 'success' ||
          activityState.type === 'failed') && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              'mt-3 text-xs hover:underline focus:outline-none flex items-center gap-1 transition-colors',
              activityState.type === 'executing'
                ? 'text-primary'
                : activityState.type === 'success'
                  ? 'text-green-500'
                  : 'text-destructive',
            )}
          >
            {showDetails ? 'Hide details' : 'Show details'}
            <ArrowRight
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                showDetails ? 'rotate-90' : '',
              )}
            />
          </button>
        )}

        {renderDetailContent()}
      </div>

      {/* History Section - Updated with scrollable container */}
      {activityLogs.length > 1 && (
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Previous Activities</h3>

            {/* Add fixed height and scrollable container */}
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <div className="space-y-4">
                {activityLogs.slice(1).map((log, index) => (
                  <ActivityHistoryItem
                    key={`${log.timestamp}-${index}`}
                    log={log}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Update the ActivityHistoryItem component to use consistent padding
function ActivityHistoryItem({ log }: { log: Log }) {
  const [showDetails, setShowDetails] = useState(false);

  // Get display properties based on log type
  const getActivityDisplay = () => {
    switch (log.type) {
      case 'FUNCTION_EXECUTION':
        return {
          icon: <Code className="h-4 w-4 text-primary" />,
          title: `Executing ${log.data.functionName}`,
          description: `Running function with ${
            Object.keys(log.data.args || {}).length
          } arguments`,
          color: 'border-primary/30 bg-primary/5',
        };
      case 'FUNCTION_STATUS':
        const functionName =
          'functionName' in log.data ? log.data.functionName : 'function';
        return {
          icon:
            log.data.status === 'done' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            ),
          title: `${
            log.data.status === 'done' ? 'Completed' : 'Failed'
          } ${functionName}`,
          description:
            log.data.status === 'done'
              ? 'The function completed successfully'
              : 'The function encountered an error',
          color:
            log.data.status === 'done'
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-destructive/30 bg-destructive/5',
        };
      case 'WORKER_NAVIGATION':
        return {
          icon: <Navigation className="h-4 w-4 text-blue-500" />,
          title: `Navigating to ${log.data.workerId}`,
          description: 'Moving to a different worker environment',
          color: 'border-blue-500/30 bg-blue-500/5',
        };
      case 'NO_ACTIONS':
        return {
          icon: <Coffee className="h-4 w-4 text-muted-foreground" />,
          title: 'Agent is idle',
          description:
            log.data.message ||
            'The agent is currently not performing any actions',
          color: 'border-muted',
        };
      default:
        return {
          icon: <Activity className="h-4 w-4 text-muted-foreground" />,
          title: 'Unknown activity',
          description: 'Unrecognized activity type',
          color: 'border-muted',
        };
    }
  };

  const { icon, title, description, color } = getActivityDisplay();

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className={cn('rounded-lg border p-4', color, 'bg-opacity-80')}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-full',
            `bg-${color.split('-')[1]}/10`,
          )}
        >
          {icon}
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <h3 className="text-sm font-medium text-opacity-90">{title}</h3>
            <span className="text-xs text-muted-foreground/90">
              {formatTime(log.timestamp)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground/90 mt-1">
            {description}
          </div>
        </div>
      </div>

      {(log.type === 'FUNCTION_EXECUTION' ||
        log.type === 'FUNCTION_STATUS') && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-3 text-xs hover:underline focus:outline-none flex items-center gap-1 transition-colors opacity-90"
          >
            {showDetails ? 'Hide details' : 'Show details'}
            <ArrowRight
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                showDetails ? 'rotate-90' : '',
              )}
            />
          </button>

          {showDetails && (
            <div className="mt-4 p-3 bg-muted/40 rounded-md text-xs font-mono overflow-auto animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4 opacity-90" />
                <span className="font-semibold opacity-90">
                  {log.type === 'FUNCTION_EXECUTION' ? 'Arguments' : 'Result'}
                </span>
              </div>
              <pre className="p-2 bg-card/90 rounded border">
                {JSON.stringify(
                  log.type === 'FUNCTION_EXECUTION'
                    ? log.data.args
                    : log.data.result,
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
