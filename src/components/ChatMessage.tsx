import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  User,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  ThumbsUp,
  ThumbsDown,
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

/** Soft light-mode-only badges (no dark fills) */
const STATUS_CLASSES: Record<string, string> = {
  active:
    "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80",
  cancelled:
    "bg-red-50/90 text-red-700 ring-1 ring-red-200/80",
  amended:
    "bg-amber-50/90 text-amber-800 ring-1 ring-amber-200/80",
  neutral:
    "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80",
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
    <div className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm transition-shadow hover:border-zinc-300/90 hover:shadow-md">
      {/* card header */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        {/* index badge */}
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">
            {chunk.law_name || t("Unnamed law", "قانون بدون اسم")}
          </p>

          {chunk.status ? (
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-primary/25 hover:bg-primary/[0.06] hover:text-primary"
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

function AssistantSources({
  display,
  feedbackSlot,
}: {
  display: MessageSourcesDisplay;
  feedbackSlot?: ReactNode;
}) {
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
    <div className="text-start">
      <div className="flex flex-wrap items-center gap-2">
        {/* toggle button — pill style (light badges only) */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
            open
              ? "border-primary/25 bg-primary/[0.06] text-primary"
              : "border-zinc-200/90 bg-white text-zinc-600 hover:border-primary/20 hover:bg-primary/[0.04] hover:text-zinc-800"
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          {t("Sources", "المصادر")}
          <span
            className={cn(
              "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
              open
                ? "bg-primary/15 text-primary"
                : "bg-zinc-100 text-zinc-600"
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
        {feedbackSlot}
      </div>

      {/* expandable panel */}
      {open ? (
        <div className="sources-panel mt-2.5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3">
          {display.mode === "raw" ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200/80 bg-white p-3 text-[11px] leading-relaxed text-zinc-600">
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

                  <div className="flex flex-col gap-2.5">
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
  onFeedback?: (messageId: number, feedback: "like" | "dislike" | null) => void;
}

export function ChatMessage({ message, onFeedback }: ChatMessageProps) {
  const isUser = message.role === "user";
  const { t } = useLang();
  const sourceDisplay = !isUser
    ? getMessageSourcesDisplay(message.metadata?.source)
    : null;

  function handleFeedback(value: "like" | "dislike") {
    if (!onFeedback) return;
    onFeedback(message.id, message.feedback === value ? null : value);
  }

  const feedbackButtons =
    onFeedback ? (
      <>
        <button
          type="button"
          onClick={() => handleFeedback("like")}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all",
            message.feedback === "like"
              ? "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/80"
              : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
          )}
          title={t("Helpful", "مفيد")}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleFeedback("dislike")}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all",
            message.feedback === "dislike"
              ? "bg-red-100 text-red-500 ring-1 ring-red-200/80"
              : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
          )}
          title={t("Not helpful", "غير مفيد")}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </>
    ) : null;

  const avatar = (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ${
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground ring-1 ring-border/50"
      }`}
    >
      {isUser ? (
        <User className="h-3.5 w-3.5" />
      ) : (
        <img
          src="/small-logo.svg"
          alt=""
          className="h-3.5 w-3.5 object-contain"
          aria-hidden
        />
      )}
    </div>
  );

  if (isUser) {
    return (
      <div className="flex flex-row-reverse items-end gap-3">
        {avatar}
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const metaRow =
    sourceDisplay || feedbackButtons ? (
      <div className="mt-2 flex flex-row gap-3">
        <div className="h-7 w-7 shrink-0" aria-hidden />
        <div className="min-w-0 max-w-[82%]">
          {sourceDisplay ? (
            <AssistantSources
              display={sourceDisplay}
              feedbackSlot={
                feedbackButtons ? (
                  <div className="flex items-center gap-1">{feedbackButtons}</div>
                ) : undefined
              }
            />
          ) : (
            <div className="flex items-center gap-1">{feedbackButtons}</div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-row items-end gap-3">
        {avatar}
        <div className="min-w-0 max-w-[82%]">
          <div className="w-fit max-w-full rounded-2xl rounded-bl-sm border border-border/30 bg-card px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground shadow-sm">
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
      {metaRow}
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
    <div className="flex items-end gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/50">
        <img
          src="/small-logo.svg"
          alt=""
          className="h-3.5 w-3.5 object-contain"
          aria-hidden
        />
      </div>

      <div className="max-w-[82%] rounded-2xl rounded-bl-sm border border-border/30 bg-card px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground shadow-sm">
        {content ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : thinking ? (
          <div className="flex items-center gap-2.5 py-0.5 text-muted-foreground">
            <span className="text-[12px]">{thinkingLabel}</span>
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:300ms]" />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
