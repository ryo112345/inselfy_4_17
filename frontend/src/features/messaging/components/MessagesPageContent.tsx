"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useUnreadMessaging } from "@/features/messaging/unread-context";
import { useUnreadScout } from "@/features/scout/unread-context";
import {
  fetchCandidateConversations,
  fetchCandidateConversationMessages,
  sendMessageAsCandidate,
  markReadAsCandidate,
  startCandidateConversation,
} from "@/features/messaging/api";
import type { Conversation, Message } from "@/features/messaging/types";
import { getCounterpartName } from "@/features/messaging/types";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import { useMessagingWebSocket } from "@/features/messaging/useWebSocket";
import { Sidebar } from "@/app/components/Sidebar";
import { ScoutListView } from "@/features/scout/components/ScoutListView";

type ActiveTab = "company" | "personal" | "scout";

export function MessagesPageContent({ initialTab }: { initialTab: ActiveTab }) {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh: refreshUnread, unreadCount: unreadMessages } = useUnreadMessaging();
  const { hasUnread: hasUnreadScouts } = useUnreadScout();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialConvId = searchParams.get("conversation");
  const recipientId = searchParams.get("recipient");
  const recipientName = searchParams.get("recipientName");

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [newConvRecipient, setNewConvRecipient] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchCandidateConversations({ limit: 50 });
      setConversations(data.items ?? []);
      return data.items ?? [];
    } catch {
      return [];
    } finally {
      setLoadingConvs(false);
    }
  }, []);

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

  useEffect(() => {
    if (authLoading || !user) return;

    loadConversations().then((items) => {
      if (initialConvId) {
        const target = items.find((c) => c.id === initialConvId);
        if (target) {
          setActiveTab(target.conversationType === "candidate_candidate" ? "personal" : "company");
          setSelectedConv(target);
          loadMessages(target.id);
        }
      } else if (recipientId) {
        setActiveTab("personal");
        const existing = items.find(
          (c) =>
            c.conversationType === "candidate_candidate" &&
            (c.participant1Id === recipientId ||
              c.participant2Id === recipientId),
        );
        if (existing) {
          setSelectedConv(existing);
          loadMessages(existing.id);
        } else {
          setNewConvRecipient({
            id: recipientId,
            name: recipientName ?? "",
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleSelectConv = useCallback(
    (conv: Conversation) => {
      setNewConvRecipient(null);
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

  const handleSendNewConv = useCallback(
    async (body: string) => {
      if (!newConvRecipient) return;
      const conv = await startCandidateConversation({
        recipientId: newConvRecipient.id,
        body: body,
      });
      setNewConvRecipient(null);
      setSelectedConv(conv);
      setMessages([{
        id: conv.id + "-first",
        conversationId: conv.id,
        senderType: "candidate",
        senderId: user!.id,
        body,
        createdAt: conv.createdAt,
      }]);
      await loadConversations();
      refreshUnread();
      loadMessages(conv.id);
    },
    [newConvRecipient, user, loadConversations, refreshUnread, loadMessages],
  );

  const handleBack = useCallback(() => {
    setSelectedConv(null);
    setNewConvRecipient(null);
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

  const handleTabChange = useCallback((key: ActiveTab) => {
    setActiveTab(key);
    setSelectedConv(null);
    setNewConvRecipient(null);
    setMessages([]);
    router.replace(key === "scout" ? "/scout" : "/messages");
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
      </div>
    );
  }

  const showThread = selectedConv || newConvRecipient;
  const threadCounterpartName = selectedConv && user
    ? getCounterpartName(selectedConv, user.id)
    : newConvRecipient?.name ?? "";

  const companyUnread = conversations
    .filter((c) => c.conversationType === "company_candidate")
    .reduce((sum, c) => sum + c.unreadCount, 0);
  const personalUnread = conversations
    .filter((c) => c.conversationType === "candidate_candidate")
    .reduce((sum, c) => sum + c.unreadCount, 0);

  const tabs: { key: ActiveTab; label: string; badge: number | boolean }[] = [
    { key: "company", label: "企業", badge: companyUnread },
    { key: "personal", label: "個人", badge: personalUnread },
    { key: "scout", label: "スカウト", badge: hasUnreadScouts },
  ];

  const isMessageTab = activeTab === "company" || activeTab === "personal";

  return (
    <div className="h-screen overflow-hidden md:pl-[50px] bg-[#f6f7f5]">
      {user && <Sidebar username={user.username} displayName={user.name} />}

      <div className="flex h-[calc(100vh-env(safe-area-inset-bottom,0px))] flex-col md:pb-0 pb-[68px]">
        {/* Tabs — always fixed at top */}
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-5xl flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const badgeNum = typeof tab.badge === "number" ? tab.badge : 0;
              const hasDot = typeof tab.badge === "boolean" && tab.badge;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex-1 py-3 text-sm font-medium transition-colors text-center ${
                    isActive
                      ? "text-[#3D8B6E] border-b-2 border-[#3D8B6E]"
                      : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
                  }`}
                >
                  <span className="relative">
                    {tab.label}
                    {badgeNum > 0 && (
                      <span className="absolute -right-6 top-1/2 -translate-y-[44%] inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#3D8B6E] px-1 text-[10px] font-bold text-white">
                        {badgeNum > 99 ? "99+" : badgeNum}
                      </span>
                    )}
                    {hasDot && (
                      <span className="absolute -right-3 -top-0.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#3D8B6E] opacity-60 animate-[ping_2.5s_ease-in-out_infinite]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3D8B6E]" />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0">
          {isMessageTab ? (
            /* ── Messaging: conversation list + thread ── */
            <div className="mx-auto flex h-full max-w-5xl flex-col md:flex-row">
              {/* Conversation list */}
              <div
                className={`flex w-full flex-col border-r border-gray-200 bg-white md:w-80 md:flex ${
                  showThread ? "hidden" : "flex"
                }`}
              >
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {loadingConvs ? (
                    <div className="flex items-center justify-center py-12">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
                    </div>
                  ) : (
                    <ConversationList
                      conversations={conversations.filter((c) =>
                        activeTab === "company"
                          ? c.conversationType === "company_candidate"
                          : c.conversationType === "candidate_candidate"
                      )}
                      selectedId={selectedConv?.id ?? null}
                      onSelect={handleSelectConv}
                      getDisplayName={(c) => user ? getCounterpartName(c, user.id) : c.companyName}
                    />
                  )}
                </div>
              </div>

              {/* Message thread */}
              <div
                className={`flex-1 min-h-0 flex flex-col md:flex ${
                  showThread ? "flex" : "hidden md:flex"
                }`}
              >
                {showThread && user ? (
                  <MessageThread
                    messages={messages}
                    myId={user.id}
                    mySenderType="candidate"
                    counterpartName={threadCounterpartName}
                    onSend={selectedConv ? handleSend : handleSendNewConv}
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
          ) : (
            /* ── Scout: full-width card list ── */
            <div className="mx-auto max-w-[900px] h-full overflow-y-auto bg-[#f6f7f5]">
              <ScoutListView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
