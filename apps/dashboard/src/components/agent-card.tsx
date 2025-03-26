import { AgentActivity } from '@/components/agent-activity';
import { AgentState } from '@/components/agent-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { JsonViewer } from '@/components/ui/json-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogs } from '@/hooks/use-logs';
import type { Agent } from '@acpl/db/types';
import type { Log } from '@acpl/types';
import { AlertCircle, FileText, RefreshCw, Target } from 'lucide-react';
import { useMemo, useState } from 'react';

interface AgentCardProps {
  agent: Agent;
  connected: boolean;
}

export function AgentCard({ agent, connected }: AgentCardProps) {
  // Increased limit to 100 to retrieve more history
  const { logs, loading, error } = useLogs(connected, agent.id, 100);
  const [activeTab, setActiveTab] = useState('activity');

  // Only get latest logs of certain types for the state tab
  const latestLogs = useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        agentState: undefined,
        actionState: undefined,
      };
    }

    // Find the latest of each type we need for the state tab
    const latestByType: Record<string, Log> = {};

    for (const log of logs) {
      // Only track types we care about for the state tab
      if (log.type === 'AGENT_STATE' || log.type === 'ACTION_STATE') {
        const currentLatest = latestByType[log.type];

        if (
          !currentLatest ||
          new Date(log.timestamp).getTime() >
            new Date(currentLatest.timestamp).getTime()
        ) {
          latestByType[log.type] = log;
        }
      }
    }

    /* eslint-disable */
    return {
      agentState: latestByType['AGENT_STATE'] as any,
      actionState: latestByType['ACTION_STATE'] as any,
    };
  }, [logs]);

  // Handle loading state
  if (loading) {
    return (
      <Card className={'h-full flex flex-col overflow-hidden'}>
        <CardHeader className="pb-2">
          <div className="h-6 w-1/3 rounded-md bg-muted animate-pulse" />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded-md bg-muted animate-pulse" />
          <div className="h-20 rounded-md bg-muted animate-pulse mt-4" />
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>{agent.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Logs</AlertTitle>
            <AlertDescription>
              {error.message}
              <div className="mt-2">
                <Button
                  size="sm"
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={'h-full flex flex-col overflow-hidden'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>{agent.name}</CardTitle>

          <div className="flex items-center gap-2">
            {/* Goal with hover card */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0"
                >
                  <Target className="h-4 w-4" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="end" className="w-80 p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Agent Goal</h4>
                  <p className="text-sm">{agent.goal}</p>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* Character description with hover card */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="end" className="w-80 p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Character Description
                  </h4>
                  <div className="text-sm prose-sm max-w-none">
                    {agent.description}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </CardHeader>

      <CardContent className={'flex-1 overflow-auto pb-2'}>
        <Tabs
          defaultValue="activity"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="state">State</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4 pt-4">
            {/* Pass the full logs array instead of just latest by type */}
            <AgentActivity logs={logs} />
          </TabsContent>

          <TabsContent value="state" className="space-y-4 pt-4">
            {latestLogs.agentState && (
              <AgentState state={latestLogs.agentState.data} />
            )}

            {latestLogs.actionState && (
              <JsonViewer
                data={latestLogs.actionState.data}
                title="Current Action"
                maxHeight="8rem"
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
