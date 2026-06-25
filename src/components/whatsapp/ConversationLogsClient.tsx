'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MessageSquare,
  Send,
  User,
  Phone,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  ArrowLeft,
  Shield,
  FileText,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VOICE' | 'TEMPLATE' | 'INTERACTIVE';
  content: string;
  mediaUrl?: string | null;
  deliveryStatus: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  clientId: string;
  clientPhone: string;
  status: string;
  lastMessageAt: string | null;
  messageCount: number;
  optInStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  optInAt: string | null;
  optInMethod: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  messages: Message[];
}

interface Props {
  initialConversations: Conversation[];
}

export default function ConversationLogsClient({ initialConversations }: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Auto scroll to bottom when active conversation or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, activeConversation?.messages?.length]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(
    (c) =>
      c.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientPhone.includes(searchQuery)
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyText.trim() || isSending) return;

    const textToSend = replyText;
    setReplyText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeConversation.clientPhone,
          body: textToSend,
          conversationId: activeConversation.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      // Optimistically append the message
      const newMessage: Message = {
        id: data.messageId || Math.random().toString(),
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: textToSend,
        deliveryStatus: 'SENT',
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              lastMessageAt: newMessage.createdAt,
              messageCount: c.messageCount + 1,
              messages: [...c.messages, newMessage],
            };
          }
          return c;
        })
      );

      toast.success('Message sent!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send message.');
      // Restore text on failure
      setReplyText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateOptInStatus = async (status: 'PENDING' | 'CONFIRMED' | 'DECLINED') => {
    if (!activeConversation) return;

    try {
      const res = await fetch(`/api/whatsapp/conversation/${activeConversation.id}/opt-in`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optInStatus: status }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              optInStatus: status,
            };
          }
          return c;
        })
      );

      toast.success(`Opt-in status updated to ${status}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update opt-in status.');
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'READ':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'DELIVERED':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'SENT':
        return <Check className="w-3.5 h-3.5 text-slate-400" />;
      case 'FAILED':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex h-full shadow-sm">
      {/* Sidebar - Conversations list */}
      <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/settings?tab=whatsapp')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer p-0 h-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Settings
            </Button>
            <h1 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              WhatsApp Chats
            </h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400">No active conversations found</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const lastMsg = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full p-4 text-left flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors ${
                    activeId === c.id ? 'bg-slate-50 dark:bg-slate-950' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 font-extrabold text-sm shrink-0">
                    {c.client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {c.client.name}
                      </p>
                      <p className="text-[9px] text-slate-400 whitespace-nowrap">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.content : c.clientPhone}
                    </p>
                    {/* Badge */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        c.optInStatus === 'CONFIRMED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' :
                        c.optInStatus === 'DECLINED' ? 'bg-red-50 dark:bg-red-950/40 text-red-600' :
                        'bg-amber-50 dark:bg-amber-955/40 text-amber-600'
                      }`}>
                        {c.optInStatus}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950/40 ${!activeId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveId(null)}
                  className="md:hidden p-0 w-8 h-8 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {activeConversation.client.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-455 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {activeConversation.clientPhone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opt-in Compliance selector */}
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-500">Compliance:</span>
                <select
                  value={activeConversation.optInStatus}
                  onChange={(e) => handleUpdateOptInStatus(e.target.value as any)}
                  className="text-[10px] font-extrabold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 uppercase"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="DECLINED">DECLINED / STOPPED</option>
                </select>
              </div>
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-xs text-slate-500 font-medium">No messages in this chat yet</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">Send an invoice or a test text to start the conversation.</p>
                </div>
              ) : (
                activeConversation.messages.map((msg) => {
                  const isOutbound = msg.direction === 'OUTBOUND';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-3.5 ${
                        isOutbound
                          ? 'bg-emerald-500 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                      }`}>
                        {/* Media display */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                            {msg.messageType === 'IMAGE' ? (
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="max-h-48 object-cover w-full"
                              />
                            ) : (
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs">
                                <FileText className="w-5 h-5 shrink-0" />
                                <span className="truncate flex-1">Document Attachment</span>
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span className={`text-[8px] ${isOutbound ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOutbound && renderStatusIcon(msg.deliveryStatus)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Reply Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <Input
                placeholder={
                  activeConversation.optInStatus === 'DECLINED'
                    ? "Recipient has opted out. Send allowed only if they re-enable."
                    : "Type a WhatsApp message..."
                }
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={activeConversation.optInStatus === 'DECLINED' || isSending}
                className="text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
              <Button
                type="submit"
                disabled={!replyText.trim() || activeConversation.optInStatus === 'DECLINED' || isSending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-800 mb-3" />
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-300 uppercase tracking-wider">
              No chat selected
            </h3>
            <p className="text-xs text-slate-455 max-w-sm mt-1">
              Select a client conversation from the left sidebar to view messages, update opt-in compliance, or send custom text updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple loader helper
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
