"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import {
  fetchCompanyConversationMessages,
  fetchCompanyConversations,
  markReadAsCompany,
  sendMessageAsCompany,
  startConversation,
} from "@/features/messaging/api";
import { useCompanyUnreadMessaging } from "@/features/messaging/company-unread-context";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import type { Conversation, Message } from "@/features/messaging/types";
import { useMessagingWebSocket } from "@/features/messaging/useWebSocket";

export default function CompanyMessagesPage() {
  const { company, isLoading: authLoading } = useCompanyAuth();
  const { refresh: refreshUnread } = useCompanyUnreadMessaging();
  const searchParams = useSearchParams();
  const candidateIdParam = searchParams.get("candidateId");
  const candidateNameParam = searchParams.get("candidateName");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newConvCandidateId, setNewConvCandidateId] = useState<string | null>(null);
  const [newConvCandidateName, setNewConvCandidateName] = useState<string>("");
  const deepLinkHandledRef = useRef(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchCompanyConversations({ limit: 50 });
      setConversations(data.items ?? []);
      return data.items ?? [];
    } catch {
      return [];
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && company) {
      loadConversations().then((convs) => {
        if (candidateIdParam && !deepLinkHandledRef.current) {
          deepLinkHandledRef.current = true;
          const existing = convs.find((c) => c.candidateId === candidateIdParam);
          if (existing) {
            setSelectedConv(existing);
            loadMessages(existing.id);
          } else {
            setNewConvCandidateId(candidateIdParam);
            setNewConvCandidateName(candidateNameParam ?? "");
          }
        }
      });
    }
  }, [authLoading, company, loadConversations, candidateIdParam, candidateNameParam]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await fetchCompanyConversationMessages(convId, {
        limit: 100,
      });
      setMessages(data.items ?? []);
      await markReadAsCompany(convId);
      refreshUnread();
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    } catch {
      // ignore
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const handleSelectConv = useCallback(
    (conv: Conversation) => {
      setSelectedConv(conv);
      loadMessages(conv.id);
    },
    [loadMessages],
  );

  const handleSend = useCallback(
    async (body: string) => {
      if (!selectedConv) return;
      const msg = await sendMessageAsCompany(selectedConv.id, body);
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
    setNewConvCandidateId(null);
    setNewConvCandidateName("");
    setMessages([]);
    loadConversations();
  }, [loadConversations]);

  const handleSendNewConversation = useCallback(
    async (body: string) => {
      if (!newConvCandidateId) return;
      const conv = await startConversation({ candidateId: newConvCandidateId, body });
      setNewConvCandidateId(null);
      setNewConvCandidateName("");
      setSelectedConv(conv);
      await loadMessages(conv.id);
      await loadConversations();
    },
    [newConvCandidateId, loadMessages, loadConversations],
  );

  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;

  useMessagingWebSocket({
    type: "company",
    enabled: !!company,
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
          fetchCompanyConversationMessages(p.conversation_id, { limit: 100 })
            .then((data) => {
              setMessages(data.items ?? []);
              markReadAsCompany(p.conversation_id);
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
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex h-full max-w-5xl flex-col md:flex-row">
        {/* Conversation list - hide on mobile when a conversation is selected */}
        <div
          className={`flex w-full flex-col border-r border-gray-200 bg-white md:w-80 md:flex ${
            selectedConv || newConvCandidateId ? "hidden" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <h1 className="text-base font-semibold text-gray-900">メッセージ</h1>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConv?.id ?? null}
                onSelect={handleSelectConv}
                getDisplayName={(c) => c.candidateName}
              />
            )}
          </div>
        </div>

        {/* Message thread - show on mobile only when selected */}
        <div
          className={`flex-1 min-h-0 flex flex-col md:flex ${
            selectedConv || newConvCandidateId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConv && company ? (
            <MessageThread
              messages={messages}
              myId={company.id}
              mySenderType="company"
              counterpartName={selectedConv.candidateName}
              onSend={handleSend}
              onBack={handleBack}
              loading={loadingMsgs}
            />
          ) : newConvCandidateId && company ? (
            <MessageThread
              messages={[]}
              myId={company.id}
              mySenderType="company"
              counterpartName={newConvCandidateName}
              onSend={handleSendNewConversation}
              onBack={handleBack}
              loading={false}
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
              <p className="text-sm font-medium text-gray-500">会話を選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
