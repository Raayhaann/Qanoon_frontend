import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Send,
  LogOut,
  MessageSquare,
  XCircle,
  Menu,
  Scale,
  Loader2,
  User,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setSidebarOpen(false);
    } catch {
      /* ignore */
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
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

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 z-40 flex w-72 flex-col border-e border-border bg-muted/50 transition-transform md:relative md:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "ltr:-translate-x-full rtl:translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-bold text-primary">
            Qanoon<span className="text-foreground">.ly</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title={t("New Chat", "محادثة جديدة")}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              {t("No conversations yet.", "لا توجد محادثات بعد.")}
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors",
                activeId === c.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {c.title || `${t("Conversation", "محادثة")} #${c.id}`}
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <span className="max-w-[140px] truncate text-foreground">
                {user?.username ?? user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={t("Logout", "تسجيل الخروج")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Scale className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {activeId
              ? `${t("Conversation", "محادثة")} #${activeId}`
              : t("New Conversation", "محادثة جديدة")}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-green-500" : "bg-muted-foreground"
              )}
              title={connected ? "Connected" : "Disconnected"}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Scale className="h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  {t(
                    "Ask a legal question",
                    "اطرح سؤالاً قانونياً"
                  )}
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {t(
                    "Type your question below in Arabic or Libyan dialect and get answers grounded in Libyan law.",
                    "اكتب سؤالك بالأسفل بالعربية أو باللهجة الليبية واحصل على إجابات مبنية على القانون الليبي."
                  )}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming indicator */}
            {streaming && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
                  {streamingContent ? (
                    <p className="whitespace-pre-wrap">{streamingContent}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("Thinking...", "جارٍ التفكير...")}
                    </div>
                  )}
                </div>
                {currentMessageId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-center"
                    onClick={() => cancelQuery(currentMessageId)}
                    title={t("Cancel", "إلغاء")}
                  >
                    <XCircle className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background p-4">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(
                "Type your legal question...",
                "اكتب سؤالك القانوني..."
              )}
              disabled={sending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
