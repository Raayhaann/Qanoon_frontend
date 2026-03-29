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
      listMessages(activeId)
        .then(setMessages)
        .catch(() => {});
    } else {
      setMessages([]);
    }
  }, [activeId]);

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
          listConversations().then(setConversations).catch(() => {});
        }
      }
      setSending(false);
    };
  }, [activeId]);

  async function handleNewChat() {
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id: number) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
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
        setMessages((prev) => [...prev, resp.assistant_response]);
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
    await logout();
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
          "fixed inset-y-0 start-0 z-40 flex flex-col border-e border-border/50 bg-card opacity-[0.85] transition-all duration-200 md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          sidebarOpen
            ? "w-64 translate-x-0"
            : "max-md:ltr:-translate-x-full max-md:rtl:translate-x-full"
        )}
      >
        {/* Logo & collapse */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
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
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
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
        <div className="px-3 pb-2">
          <Button
            variant="outline"
            onClick={handleNewChat}
            className={cn(
              "h-9 w-full justify-start gap-2 rounded-lg border-border/60 text-sm font-normal shadow-none hover:bg-muted/60 hover:text-foreground",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && t("New Chat", "محادثة جديدة")}
          </Button>
        </div>

        {/* Section label */}
        {!sidebarCollapsed && (
          <div className="px-4 pb-1.5 pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("Conversations", "المحادثات")}
            </span>
          </div>
        )}

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && !sidebarCollapsed && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground/60">
              {t("No conversations yet", "لا توجد محادثات بعد")}
            </p>
          )}
          <div className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = activeId === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group/item relative flex items-center rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/[0.08] text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                        ? c.title ||
                          `${t("Conversation", "محادثة")} #${c.id}`
                        : undefined
                    }
                  >
                    <MessageSquare
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "opacity-50"
                      )}
                    />
                    {!sidebarCollapsed && (
                      <span className="block truncate text-[13px]">
                        {c.title ||
                          `${t("Conversation", "محادثة")} #${c.id}`}
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
        <div className="border-t border-border/40 p-2">
          <div
            className={cn(
              "flex items-center rounded-lg p-2 transition-colors hover:bg-muted/60",
              sidebarCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              {!sidebarCollapsed && (
                <span className="max-w-[120px] truncate text-[13px] text-foreground">
                  {user?.username ?? user?.email}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                title={t("Logout", "تسجيل الخروج")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-4">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-[13px] font-medium text-foreground">
              {activeId
                ? conversations.find((c) => c.id === activeId)?.title ||
                  `${t("Conversation", "محادثة")} #${activeId}`
                : t("New Conversation", "محادثة جديدة")}
            </span>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              title={t("New Chat", "محادثة جديدة")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-5">
              <img src="/small-logo.svg" alt="Qanoon.ly" className="h-12 w-12" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {t("How can I help you today?", "كيف يمكنني مساعدتك اليوم؟")}
              </h2>
              <p className="mt-1.5 max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
                {t(
                  "Ask a legal question in Arabic or Libyan dialect. I'll find the relevant Libyan law for you.",
                  "اطرح سؤالاً قانونياً بالعربية أو باللهجة الليبية. سأجد لك القانون الليبي المناسب."
                )}
              </p>

              <div className="mt-6 grid w-full max-w-lg gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-3 text-start text-[13px] text-foreground transition-all hover:border-primary/20 hover:bg-primary/[0.02]"
                  >
                    <s.icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
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
