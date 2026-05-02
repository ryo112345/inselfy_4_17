"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import {
  fetchCompanyConversations,
  fetchCompanyConversationMessages,
  sendMessageAsCompany,
  markReadAsCompany,
} from "@/features/messaging/api";
import type { Conversation, Message } from "@/features/messaging/types";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import { useMessagingWebSocket } from "@/features/messaging/useWebSocket";

export default function CompanyMessagesPage() {
  const { company, isLoading: authLoading } = useCompanyAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchCompanyConversations({ limit: 50 });
      setConversations(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && company) {
      loadConversations();
    }
  }, [authLoading, company, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await fetchCompanyConversationMessages(convId, {
        limit: 100,
      });
      setMessages(data.items ?? []);
      await markReadAsCompany(convId);
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
    setMessages([]);
    loadConversations();
  }, [loadConversations]);

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
      },
      [loadConversations],
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
    <div className="flex h-screen flex-col md:flex-row">
      {/* Conversation list */}
      <div
        className={`w-full border-r border-gray-200 bg-white md:w-80 md:block ${
          selectedConv ? "hidden" : "block"
        }`}
      >
        <div className="border-b border-gray-200 px-4 py-3">
          <h1 className="text-base font-semibold text-gray-900">
            メッセージ
          </h1>
        </div>
        {loadingConvs ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConv?.id ?? null}
            onSelect={handleSelectConv}
            nameKey="candidateName"
          />
        )}
      </div>

      {/* Message thread */}
      <div
        className={`flex-1 flex flex-col md:flex ${
          selectedConv ? "flex" : "hidden md:flex"
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
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#f6f7f5] text-center">
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
  );
}
