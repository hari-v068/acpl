'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ConnectionStateProps {
  isConnected: boolean;
  isLoading: boolean;
  connectionError: Error | null;
  dataError: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ConnectionState({
  isConnected,
  isLoading,
  connectionError,
  dataError,
  isEmpty = false,
  emptyMessage = 'No data available',
}: ConnectionStateProps) {
  // Handle connection error
  if (connectionError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Failed to connect to Firebase: {connectionError.message}
            <div className="mt-2">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle loading state
  if (!isConnected || isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-full flex flex-col space-y-6">
          {/* Toggle group skeleton */}
          <div className="w-full flex justify-center">
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
          </div>

          {/* Grid layout skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-5 w-1/3 rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-1/4 rounded-md bg-muted animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 rounded-md bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle data error
  if (dataError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {dataError.message}
            <div className="mt-2">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle empty state
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="rounded-lg border border-muted bg-muted/5 p-8 text-center max-w-md w-full">
          <div className="flex-shrink-0 p-3 rounded-full bg-muted/10 w-fit mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-medium mb-1.5">No Data Found</h2>
          <p className="text-sm text-muted-foreground mb-4">{emptyMessage}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
