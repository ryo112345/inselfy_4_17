"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useUnreadMessaging } from "@/features/messaging/unread-context";
import {
  fetchCandidateConversations,
  fetchCandidateConversationMessages,
  sendMessageAsCandidate,
  markReadAsCandidate,
} from "@/features/messaging/api";
import type { Conversation, Message } from "@/features/messaging/types";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import { useMessagingWebSocket } from "@/features/messaging/useWebSocket";
import { Sidebar } from "@/app/components/Sidebar";

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh: refreshUnread } = useUnreadMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchCandidateConversations({ limit: 50 });
      setConversations(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadConversations();
    }
  }, [authLoading, user, loadConversations]);

  const loadMessages = useCallback(
    async (convId: string) => {
      setLoadingMsgs(true);
      try {
        const data = await fetchCandidateConversationMessages(convId, {
          limit: 100,
        });
        setMessages(data.items ?? []);
        await markReadAsCandidate(convId);
        refreshUnread();
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch {
        // ignore
      } finally {
        setLoadingMsgs(false);
      }
    },
    [refreshUnread],
  );

  const handleSelectConv = useCallback(
    (conv: Conversation) => {
      setSelectedConv(conv);
      setMessages([]);
      loadMessages(conv.id);
    },
    [loadMessages],
  );

  const handleSend = useCallback(
    async (body: string) => {
      if (!selectedConv) return;
      const msg = await sendMessageAsCandidate(selectedConv.id, body);
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, lastMessageBody: body, lastMessageAt: msg.createdAt }
            : c,
        ),
      );
    },
    [selectedConv],
  );

  const handleBack = useCallback(() => {
    setSelectedConv(null);
    setMessages([]);
    loadConversations();
  }, [loadConversations]);

  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;

  useMessagingWebSocket({
    type: "candidate",
    enabled: !!user,
    onMessage: useCallback(
      (msg: { type: string; payload: unknown }) => {
        if (msg.type !== "new_message") return;
        const p = msg.payload as {
          conversation_id: string;
          message_id: string;
          sender_type: string;
          sender_id: string;
        };
        if (selectedConvRef.current?.id === p.conversation_id) {
          fetchCandidateConversationMessages(p.conversation_id, { limit: 100 })
            .then((data) => {
              setMessages(data.items ?? []);
              markReadAsCandidate(p.conversation_id);
            })
            .catch(() => {});
        }
        loadConversations();
        refreshUnread();
      },
      [loadConversations, refreshUnread],
    ),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden md:pl-[50px] bg-[#f6f7f5]">
      {user && <Sidebar username={user.username} displayName={user.name} />}

      <div className="mx-auto flex h-[calc(100vh-env(safe-area-inset-bottom,0px))] max-w-5xl flex-col md:flex-row md:pb-0 pb-[68px]">
        {/* Conversation list - hide on mobile when a conversation is selected */}
        <div
          className={`flex w-full flex-col border-r border-gray-200 bg-white md:w-80 md:flex ${
            selectedConv ? "hidden" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <h1 className="text-base font-semibold text-gray-900">
              メッセージ
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConv?.id ?? null}
                onSelect={handleSelectConv}
                nameKey="companyName"
              />
            )}
          </div>
        </div>

        {/* Message thread - show on mobile only when selected */}
        <div
          className={`flex-1 min-h-0 flex flex-col md:flex ${
            selectedConv ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConv && user ? (
            <MessageThread
              messages={messages}
              myId={user.id}
              mySenderType="candidate"
              counterpartName={selectedConv.companyName}
              onSend={handleSend}
              onBack={handleBack}
              loading={loadingMsgs}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="mb-3 h-12 w-12 text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-500">
                会話を選択してください
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
