/* eslint-disable */

'use client';

import { cn } from '@/lib/utils';
import type { AgentState, ItemMetadata } from '@acpl/types';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MessageSquare,
  Package,
  Send,
  Tag,
  User,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

interface AgentStateProps {
  state: AgentState | undefined;
}

export function AgentState({ state }: AgentStateProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    wallet: true,
    inventory: false,
    jobs: false,
    chats: false,
  });

  if (!state) {
    return (
      <div className="rounded-lg border border-muted p-4 h-full">
        <p className="text-sm text-muted-foreground">No state data available</p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Format the wallet balance
  const formatBalance = (balance: string | undefined) => {
    if (!balance) return '$0.00';
    try {
      const balanceNum = parseFloat(balance);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(balanceNum);
    } catch {
      return `$${balance}`; // Fallback format if parsing fails
    }
  };

  const truncateAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Get the item type from metadata if available
  const getItemType = (item: any) => {
    if (
      item?.metadata &&
      typeof item.metadata === 'object' &&
      'itemType' in item.metadata
    ) {
      return item.metadata.itemType;
    }
    return 'PHYSICAL'; // Default to physical if not specified
  };

  // Get appropriate icon color based on item type
  const getItemColor = (itemType: string) => {
    return itemType === 'DIGITAL' ? 'text-blue-500' : 'text-orange-500';
  };

  // Format date for better display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString; // Return as is if invalid
    }
  };

  return (
    <div className={'space-y-4 max-h-full overflow-auto'}>
      {/* Wallet Section */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 transition-all duration-300">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('wallet')}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-amber-500/10">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Wallet</h3>
              <p className="text-xs text-muted-foreground">
                {formatBalance(state.wallet.balance)}
              </p>
            </div>
          </div>
          <ArrowRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expandedSections.wallet ? 'rotate-90' : '',
            )}
          />
        </div>

        {expandedSections.wallet && (
          <div className="mt-3 pl-10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="rounded-md bg-muted p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono">
                    {truncateAddress(state.wallet.address)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(state.wallet.address);
                    }}
                    className="px-1 rounded hover:bg-muted-foreground/10"
                  >
                    {copiedAddress ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px bg-border my-2" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Balance</span>
                <span className="text-xs font-mono font-semibold text-amber-500">
                  {formatBalance(state.wallet.balance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Section */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 transition-all duration-300">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('inventory')}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-blue-500/10">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Inventory</h3>
              <p className="text-xs text-muted-foreground">
                {state.inventory?.length || 0} items
              </p>
            </div>
          </div>
          <ArrowRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expandedSections.inventory ? 'rotate-90' : '',
            )}
          />
        </div>

        {expandedSections.inventory && (
          <div className="mt-3 pl-10 animate-in fade-in slide-in-from-top-2 duration-300">
            {!state.inventory || state.inventory.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No items in inventory
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {state.inventory.map((item) => {
                  const itemType = getItemType(item);
                  const colorClass = getItemColor(itemType);

                  return (
                    <div
                      key={item.id}
                      className="rounded-md bg-muted p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className={cn('h-4 w-4', colorClass)} />
                          <span className="text-xs font-medium">
                            {item.name}
                            <span
                              className={cn(
                                'ml-1 text-xs font-normal px-1.5 py-0.5 rounded-full bg-muted-foreground/10',
                                colorClass,
                              )}
                            >
                              {itemType}
                            </span>
                          </span>
                        </div>
                        <span className="text-xs font-medium">
                          {item.quantity}x
                        </span>
                      </div>

                      {/* Description shown for all items */}
                      {item.metadata && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {(item.metadata as ItemMetadata).description}
                        </p>
                      )}

                      {/* URL shown for digital items */}
                      {itemType === 'DIGITAL' && item.metadata && (
                        <div className="mt-1 flex items-center text-xs">
                          <span className="text-muted-foreground mr-1">
                            URL:
                          </span>
                          <a
                            href={
                              (
                                item.metadata as ItemMetadata & {
                                  url: string;
                                }
                              ).url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate"
                          >
                            {
                              (item.metadata as ItemMetadata & { url: string })
                                .url
                            }
                          </a>
                        </div>
                      )}

                      {/* Origin shown for physical items */}
                      {itemType === 'PHYSICAL' &&
                        item.metadata &&
                        (item.metadata as any).origin && (
                          <div className="mt-1 flex items-center text-xs">
                            <span className="text-muted-foreground mr-1">
                              Origin:
                            </span>
                            <span className="text-muted-foreground">
                              {
                                (
                                  item.metadata as ItemMetadata & {
                                    origin?: string;
                                  }
                                ).origin
                              }
                            </span>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jobs Section */}
      <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 transition-all duration-300">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('jobs')}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-purple-500/10">
              <Briefcase className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Jobs</h3>
              <p className="text-xs text-muted-foreground">
                {state.jobs?.length || 0} active jobs
              </p>
            </div>
          </div>
          <ArrowRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expandedSections.jobs ? 'rotate-90' : '',
            )}
          />
        </div>

        {expandedSections.jobs && (
          <div className="mt-3 pl-10 animate-in fade-in slide-in-from-top-2 duration-300">
            {!state.jobs || state.jobs.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">No active jobs</p>
              </div>
            ) : (
              <div className="space-y-2">
                {state.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-md bg-muted p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-full text-xs font-medium',
                            job.role === 'client'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-green-500/10 text-green-500',
                          )}
                        >
                          {job.role.toUpperCase()}
                        </span>
                        <span className="text-xs font-medium">
                          {(job.item && job.item.name) || 'Unnamed Job'}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full',
                          'bg-muted-foreground/10',
                        )}
                      >
                        {job.phase || 'Unknown'}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2 text-xs">
                      {/* First row - Essential info */}
                      <div className="grid grid-cols-3 gap-x-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Counterpart:
                          </span>
                          <span className="font-mono">
                            {truncateAddress(job.counterpartId)}
                          </span>
                        </div>

                        {job.item.quantity && (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Quantity:
                            </span>
                            <span>{job.item.quantity}</span>
                          </div>
                        )}

                        {job.item.pricePerUnit && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Price:
                            </span>
                            <span className="font-mono">
                              {formatBalance(job.item.pricePerUnit)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Second row - Requirements and additional info */}
                      <div className="grid grid-cols-1 border-t border-border/50 pt-2">
                        {job.item.requirements && (
                          <div className="flex items-start gap-1">
                            <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground">
                              Requirements:
                            </span>
                            <span className="flex-1">
                              {job.item.requirements}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          {job.budget && (
                            <div className="flex items-center gap-1">
                              <Wallet className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Budget:
                              </span>
                              <span className="font-mono">
                                {formatBalance(job.budget)}
                              </span>
                            </div>
                          )}

                          {job.expiredAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Expires:
                              </span>
                              <span>{formatDate(job.expiredAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chats Section */}
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 transition-all duration-300">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('chats')}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-green-500/10">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Chats</h3>
              <p className="text-xs text-muted-foreground">
                {state.chats?.length || 0} conversations
              </p>
            </div>
          </div>
          <ArrowRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expandedSections.chats ? 'rotate-90' : '',
            )}
          />
        </div>

        {expandedSections.chats && (
          <div className="mt-3 pl-10 animate-in fade-in slide-in-from-top-2 duration-300">
            {!state.chats || state.chats.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No active conversations
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="rounded-md bg-muted p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium">
                          Chat with {truncateAddress(chat.counterpartId)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(chat.createdAt)}
                      </span>
                    </div>

                    {!chat.messages || chat.messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No messages in this conversation yet
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                        {chat.messages.map((message) => {
                          const isFromAgent =
                            message.authorId === state.agent?.id;
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                'flex text-xs p-2 rounded-lg max-w-[85%]',
                                isFromAgent
                                  ? 'bg-primary/10 ml-auto'
                                  : 'bg-muted-foreground/10 mr-auto',
                              )}
                            >
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Send
                                    className={cn(
                                      'h-3 w-3',
                                      isFromAgent
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      'text-[10px]',
                                      isFromAgent
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {isFromAgent ? 'Agent' : 'Counterpart'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    {formatDate(message.createdAt)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap break-words">
                                  {message.message}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
