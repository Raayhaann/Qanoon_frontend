import {
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { ArrowUp, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  showCancel?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onCancel,
  disabled = false,
  sending = false,
  placeholder = "",
  showCancel = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !sending) {
        onSend();
      }
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-2">
      <div className="relative flex items-end rounded-2xl border border-border/50 bg-card shadow-sm transition-all focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent py-3.5 pe-12 ps-4 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50",
            showCancel && "pe-20"
          )}
        />

        <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1.5">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Cancel"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim() || disabled || sending}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground/35">
        Qanoon.ly provides legal information, not legal advice.
      </p>
    </div>
  );
}
