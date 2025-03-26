import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  title?: string;
  className?: string;
  maxHeight?: string;
}

/**
 * A component for displaying JSON data in a formatted way
 */
export function JsonViewer({
  data,
  title,
  className,
  maxHeight = 'auto',
}: JsonViewerProps) {
  return (
    <div className={cn('rounded-lg bg-muted p-4', className)}>
      {title && <h4 className="text-sm font-semibold mb-2">{title}</h4>}
      <pre className="text-xs overflow-auto" style={{ maxHeight }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
