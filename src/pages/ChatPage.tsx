import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Plus,
  LogOut,
  MessageSquare,
  Menu,
  User,
  Trash2,
  ShieldAlert,
  EyeOff,
  Briefcase,
  X,
  PanelLeftClose,
  PanelLeft,
  SquarePen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage, StreamingMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useChat, type StreamEvent } from "@/hooks/useChat";
import {
  listConversations,
  createConversation,
  deleteConversation,
  listMessages,
  sendMessage,
  type Conversation,
  type Message,
} from "@/api/chat";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);
  const pendingInitialMsg = useRef<string | null>(null);

  const {
    connected,
    streaming,
    streamingContent,
    currentMessageId,
    sendQuery,
    cancelQuery,
    listMessagesWs,
    onStreamEnd,
  } = useChat();

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const msg = (location.state as { initialMessage?: string })?.initialMessage;
    if (msg && typeof msg === "string") {
      pendingInitialMsg.current = msg;
      setInput(msg);
      window.history.replaceState({}, "");
    }
  }, []);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (activeId) {
      const load = connected
        ? listMessagesWs(activeId).catch(() => listMessages(activeId))
        : listMessages(activeId);
      load.then(setMessages).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [activeId, connected, listMessagesWs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (pendingInitialMsg.current && input === pendingInitialMsg.current) {
      pendingInitialMsg.current = null;
      handleSend();
    }
  }, [input]);

  useEffect(() => {
    onStreamEnd.current = (data: StreamEvent) => {
      if (data.final_data) {
        const convId = Number(data.final_data.conversation_id);

        setMessages((prev) => [
          ...prev,
          {
            id: Number(data.message_id),
            role: "assistant",
            content: data.final_data!.response,
            status: "completed",
            response_time: data.final_data!.response_time,
            metadata: {
              source: data.final_data!.source,
              search_strategy: data.final_data!.search_strategy,
            },
            celery_task_id: null,
            created_at: new Date().toISOString(),
          },
        ]);

        if (!activeId && convId) {
          setActiveId(convId);
        }
        listConversations().then(setConversations).catch(() => {});
      }
      setSending(false);
    };
  }, [activeId]);

  async function handleNewChat() {
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function handleDeleteConversation(id: number) {
    // Optimistic update — remove immediately so UI feels instant
    const previous = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    try {
      await deleteConversation(id);
    } catch (err) {
      // Restore list on failure
      console.error("Failed to delete conversation:", err);
      setConversations(previous);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const tempUserMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      status: "completed",
      response_time: null,
      metadata: {},
      celery_task_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setSending(true);

    if (connected) {
      sendQuery(text, activeId ?? undefined);
    } else {
      try {
        let convId = activeId;
        if (!convId) {
          const conv = await createConversation();
          setConversations((prev) => [conv, ...prev]);
          convId = conv.id;
          skipNextFetch.current = true;
          setActiveId(conv.id);
        }
        const resp = await sendMessage(convId, text);
        const assistant = resp.assistant_response;
        const assistantWithSources: Message = {
          ...assistant,
          metadata: {
            ...assistant.metadata,
            ...(resp.source !== undefined ? { source: resp.source } : {}),
          },
        };
        setMessages((prev) => [...prev, assistantWithSources]);
        listConversations().then(setConversations).catch(() => {});
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: t(
              "Sorry, something went wrong. Please try again.",
              "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى."
            ),
            status: "failed",
            response_time: null,
            metadata: {},
            celery_task_id: null,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    }
  }

  function handleSuggestion(text: string) {
    setInput(text);
    pendingInitialMsg.current = text;
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // AuthContext already clears state; still redirect
    }
    navigate("/login", { replace: true });
  }

  const suggestions = [
    {
      icon: Briefcase,
      text: t(
        "What are my rights if I get fired without notice?",
        "ما هي حقوقي إذا تم فصلي بدون إنذار؟"
      ),
    },
    {
      icon: EyeOff,
      text: t(
        "Is recording someone without permission legal in Libya?",
        "هل تسجيل شخص بدون إذنه قانوني في ليبيا؟"
      ),
    },
    {
      icon: ShieldAlert,
      text: t(
        "What does Libyan law say about workplace discrimination?",
        "ماذا يقول القانون الليبي عن التمييز في مكان العمل؟"
      ),
    },
  ];

  const showEmptyState = messages.length === 0 && !streaming;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex flex-col border-e border-border/40 bg-card/95 backdrop-blur-sm transition-all duration-300 md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          sidebarOpen
            ? "w-64 translate-x-0 shadow-2xl"
            : "max-md:ltr:-translate-x-full max-md:rtl:translate-x-full"
        )}
      >
        {/* Logo & collapse */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3 border-b border-border/30">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center">
              <img src="/full-logo.svg" alt="Qanoon.ly" className="h-7" />
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/" className="mx-auto flex items-center">
              <img src="/small-logo.svg" alt="Qanoon.ly" className="h-8 w-8" />
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary md:flex"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 py-3">
          <Button
            variant="outline"
            onClick={handleNewChat}
            className={cn(
              "h-9 w-full justify-start gap-2 rounded-lg border-primary/20 bg-primary/5 text-sm font-medium text-primary shadow-none transition-all hover:bg-primary/10 hover:border-primary/30",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && t("New Chat", "محادثة جديدة")}
          </Button>
        </div>

        {/* Section label */}
        {!sidebarCollapsed && (
          <div className="px-4 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {t("Conversations", "المحادثات")}
            </span>
          </div>
        )}

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && !sidebarCollapsed && (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/50">
                {t("No conversations yet", "لا توجد محادثات بعد")}
              </p>
            </div>
          )}
          <div className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = activeId === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group/item relative flex items-center rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/15"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <button
                    onClick={() => {
                      setActiveId(c.id);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 py-2 text-start",
                      sidebarCollapsed ? "justify-center px-2" : "px-2.5"
                    )}
                    title={
                      sidebarCollapsed
                        ? c.title || t("Conversation", "محادثة")
                        : undefined
                    }
                  >
                    <MessageSquare
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-primary" : "opacity-40"
                      )}
                    />
                    {!sidebarCollapsed && (
                      <span className="block truncate text-[12.5px]">
                        {c.title || t("Conversation", "محادثة")}
                      </span>
                    )}
                  </button>
                  {!sidebarCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(c.id);
                      }}
                      className="me-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/item:opacity-100"
                      title={t("Delete", "حذف")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-border/30 p-2">
          <div
            className={cn(
              "flex items-center rounded-lg p-2 transition-colors",
              sidebarCollapsed ? "justify-center" : "justify-between gap-2"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
                <User className="h-3.5 w-3.5" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-foreground">
                    {user?.username ?? user?.email}
                  </span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title={t("Logout", "تسجيل الخروج")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Top bar */}
        <header className="flex h-13 shrink-0 items-center gap-2 border-b border-border/30 bg-card/60 px-4 backdrop-blur-sm">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-[13px] font-medium text-foreground/90">
              {activeId
                ? conversations.find((c) => c.id === activeId)?.title ||
                  t("Conversation", "محادثة")
                : t("New Conversation", "محادثة جديدة")}
            </span>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title={t("New Chat", "محادثة جديدة")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-5 py-10">
              <div className="relative mb-2">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                <img src="/small-logo.svg" alt="Qanoon.ly" className="relative h-14 w-14" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                {t("How can I help you today?", "كيف يمكنني مساعدتك اليوم؟")}
              </h2>
              <p className="mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
                {t(
                  "Ask a legal question in Arabic or Libyan dialect. I'll find the relevant Libyan law for you.",
                  "اطرح سؤالاً قانونياً بالعربية أو باللهجة الليبية. سأجد لك القانون الليبي المناسب."
                )}
              </p>

              <div className="mt-7 grid w-full max-w-lg gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3.5 text-start text-[13px] text-foreground shadow-sm transition-all hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-md"
                  >
                    <s.icon className="h-4 w-4 shrink-0 text-primary/50" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {streaming && (
                <StreamingMessage
                  content={streamingContent}
                  thinking={!streamingContent}
                  thinkingLabel={t("Thinking...", "جارٍ التفكير...")}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onCancel={
            currentMessageId
              ? () => cancelQuery(currentMessageId)
              : undefined
          }
          disabled={sending && !streaming}
          sending={sending}
          showCancel={streaming && !!currentMessageId}
          placeholder={t(
            "Type your legal question...",
            "اكتب سؤالك القانوني..."
          )}
        />
      </main>
    </div>
  );
}
