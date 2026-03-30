import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  User,
  Loader2,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import {
  getMessageSourcesDisplay,
  type Message,
  type MessageSourcesDisplay,
  type LawSourceChunk,
} from "@/api/chat";
import { useLang } from "@/context/LangContext";
import { cn } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────────────────── */

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

function statusVariant(
  status: string
): "active" | "cancelled" | "amended" | "neutral" {
  if (/نافذ|ساري/.test(status)) return "active";
  if (/ملغ/.test(status)) return "cancelled";
  if (/معدل/.test(status)) return "amended";
  return "neutral";
}

const STATUS_CLASSES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
  cancelled:
    "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800",
  amended:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
  neutral:
    "bg-muted text-muted-foreground ring-border",
};

/* ─── single source card ───────────────────────────────────────── */

function SourceCard({
  chunk,
  index,
}: {
  chunk: LawSourceChunk;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLang();
  const variant = statusVariant(chunk.status);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* card header */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        {/* index badge */}
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">
            {chunk.law_name || t("Unnamed law", "قانون بدون اسم")}
          </p>

          {chunk.status ? (
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                STATUS_CLASSES[variant]
              )}
            >
              {chunk.status}
            </span>
          ) : null}
        </div>
      </div>

      {/* divider */}
      <div className="mx-3 border-t border-border/40" />

      {/* text excerpt toggle */}
      {chunk.text ? (
        <div className="px-3 pt-2">
          <p
            className={cn(
              "text-[11.5px] leading-relaxed text-muted-foreground transition-all",
              expanded ? "" : "line-clamp-3"
            )}
          >
            {chunk.text}
          </p>
          {chunk.text.length > 180 ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-primary/80 hover:text-primary"
            >
              {expanded ? (
                <>
                  {t("Show less", "عرض أقل")}
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  {t("Show more", "عرض المزيد")}
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* footer link */}
      {chunk.link ? (
        <div className="mt-auto px-3 pb-3 pt-2">
          <a
            href={chunk.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {parseDomain(chunk.link)}
          </a>
        </div>
      ) : (
        <div className="pb-3" />
      )}
    </div>
  );
}

/* ─── grouped sources section ─────────────────────────────────── */

function AssistantSources({ display }: { display: MessageSourcesDisplay }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const count = display.mode === "chunks" ? display.chunks.length : 1;

  /* group chunks by search_query */
  const groups: { query: string | null; items: (LawSourceChunk & { globalIdx: number })[] }[] = [];
  if (display.mode === "chunks") {
    let globalIdx = 0;
    for (const chunk of display.chunks) {
      const q = chunk.search_query ?? null;
      const last = groups[groups.length - 1];
      if (!last || last.query !== q) {
        groups.push({ query: q, items: [{ ...chunk, globalIdx: globalIdx++ }] });
      } else {
        last.items.push({ ...chunk, globalIdx: globalIdx++ });
      }
    }
  }

  return (
    <div className="mt-3 text-start">
      {/* toggle button — pill style */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
          open
            ? "border-primary/30 bg-primary/8 text-primary"
            : "border-border/70 bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
        )}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        {t("Sources", "المصادر")}
        <span
          className={cn(
            "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            open
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
        />
      </button>

      {/* expandable panel */}
      {open ? (
        <div className="sources-panel mt-2.5 overflow-hidden rounded-2xl border border-border/50 bg-muted/20 p-3">
          {display.mode === "raw" ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {display.text}
            </pre>
          ) : (
            <div className="space-y-4">
              {groups.map((group, gi) => (
                <div key={gi}>
                  {/* search query header */}
                  {group.query ? (
                    <div className="mb-2.5 flex items-start gap-2">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <p className="text-[11.5px] leading-snug">
                        <span className="font-medium text-muted-foreground/90">
                          {t("Query:", "البحث:")}
                        </span>{" "}
                        <span className="text-foreground/80">{group.query}</span>
                      </p>
                    </div>
                  ) : null}

                  {/* cards grid */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {group.items.map((chunk) => (
                      <SourceCard
                        key={`${chunk.search_query ?? ""}-${chunk.chunk_index}-${chunk.globalIdx}`}
                        chunk={chunk}
                        index={chunk.globalIdx}
                      />
                    ))}
                  </div>

                  {/* group separator */}
                  {gi < groups.length - 1 ? (
                    <div className="mt-4 border-t border-border/40" />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ─── main message components ─────────────────────────────────── */

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const sourceDisplay = !isUser
    ? getMessageSourcesDisplay(message.metadata?.source)
    : null;

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/70 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
            {sourceDisplay ? (
              <AssistantSources display={sourceDisplay} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
  thinking: boolean;
  thinkingLabel: string;
}

export function StreamingMessage({
  content,
  thinking,
  thinkingLabel,
}: StreamingMessageProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>

      <div className="max-w-[78%] rounded-xl bg-muted/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
        {content ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : thinking ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-[12px]">{thinkingLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
