import api from "./axios";

/** Metadata object for a single source law, as returned by the backend. */
export interface SourceMeta {
  official_name?: string;
  law_year?: number;
  law_number?: number;
  status?: string;
  issuer?: string;
  sector?: string;
  category?: string;
  link?: string;
}

/** One retrieved law chunk ready for UI display. */
export interface LawSourceChunk {
  search_query: string | null;
  chunk_index: number;
  law_name: string;
  status: string;
  link: string;
  text: string;
  official_name: string;
  law_year: number | null;
  law_number: number | null;
  issuer: string;
  sector: string;
  category: string;
}

export type MessageSourcesDisplay =
  | { mode: "chunks"; chunks: LawSourceChunk[] }
  | { mode: "raw"; text: string };

/**
 * Build displayable source data from message metadata.
 *
 * The backend stores:
 *   metadata.sources       – string[][]  (text chunks grouped by search query)
 *   metadata.source_metadata – SourceMeta[][] (parallel metadata per chunk)
 *
 * Legacy / WebSocket may also send metadata.source as LawSourceChunk[] or string.
 */
export function getMessageSourcesDisplay(
  metadata: Record<string, unknown> | undefined | null
): MessageSourcesDisplay | null {
  if (!metadata) return null;

  const rawSources = metadata.sources as unknown;
  const rawMeta = metadata.source_metadata as unknown;
  const legacySource = metadata.source as unknown;

  if (
    Array.isArray(rawSources) &&
    rawSources.length > 0 &&
    Array.isArray(rawMeta) &&
    rawMeta.length > 0
  ) {
    const chunks: LawSourceChunk[] = [];
    let globalIdx = 0;
    for (let i = 0; i < rawSources.length; i++) {
      const textArr = rawSources[i];
      const metaArr = Array.isArray(rawMeta[i]) ? rawMeta[i] : [];
      if (!Array.isArray(textArr)) continue;
      for (let j = 0; j < textArr.length; j++) {
        const text = typeof textArr[j] === "string" ? textArr[j] : "";
        const m = (metaArr[j] ?? {}) as Record<string, unknown>;
        chunks.push({
          search_query: null,
          chunk_index: globalIdx++,
          law_name: String(m.official_name ?? ""),
          status: String(m.status ?? ""),
          link: String(m.link ?? ""),
          text,
          official_name: String(m.official_name ?? ""),
          law_year: typeof m.law_year === "number" ? m.law_year : null,
          law_number: typeof m.law_number === "number" ? m.law_number : null,
          issuer: String(m.issuer ?? ""),
          sector: String(m.sector ?? ""),
          category: String(m.category ?? ""),
        });
      }
    }
    return chunks.length ? { mode: "chunks", chunks } : null;
  }

  const source = legacySource ?? rawSources;
  if (source === undefined || source === null) return null;
  if (typeof source === "string") {
    const t = source.trim();
    return t ? { mode: "raw", text: t } : null;
  }
  if (!Array.isArray(source) || source.length === 0) return null;
  const chunks: LawSourceChunk[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sq = o.search_query;
    chunks.push({
      search_query:
        sq === null || sq === undefined
          ? null
          : typeof sq === "string"
            ? sq
            : String(sq),
      chunk_index:
        typeof o.chunk_index === "number"
          ? o.chunk_index
          : Number(o.chunk_index) || 0,
      law_name: String(o.law_name ?? o.official_name ?? ""),
      status: String(o.status ?? ""),
      link: String(o.link ?? ""),
      text: String(o.text ?? ""),
      official_name: String(o.official_name ?? o.law_name ?? ""),
      law_year: typeof o.law_year === "number" ? o.law_year : null,
      law_number: typeof o.law_number === "number" ? o.law_number : null,
      issuer: String(o.issuer ?? ""),
      sector: String(o.sector ?? ""),
      category: String(o.category ?? ""),
    });
  }
  return chunks.length ? { mode: "chunks", chunks } : null;
}

export interface Conversation {
  id: number;
  title: string;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "processing" | "completed" | "failed";
  response_time: number | null;
  metadata: Record<string, unknown>;
  celery_task_id: string | null;
  feedback: "like" | "dislike" | null;
  created_at: string;
}

interface SendMessageResponse {
  message: Message;
  assistant_response: Message;
  sources?: string[][];
  source_metadata?: SourceMeta[][];
  search_strategy?: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>("/conversations/");
  return data;
}

export async function createConversation(): Promise<Conversation> {
  const { data } = await api.post<Conversation>("/conversations/");
  return data;
}

/** REST fallback when WebSocket is disconnected; primary path is `listMessagesWs` in `useChat`. */
export async function listMessages(conversationId: number): Promise<Message[]> {
  const { data } = await api.get<Message[]>(
    `/conversations/${conversationId}/messages/`
  );
  return data;
}

export async function deleteConversation(id: number): Promise<void> {
  await api.delete(`/conversations/${id}/`);
}

/** REST fallback when WebSocket is disconnected; primary send path is WebSocket `query` in `useChat`. */
export async function sendMessage(
  conversationId: number,
  content: string
): Promise<SendMessageResponse> {
  const { data } = await api.post<SendMessageResponse>(
    `/conversations/${conversationId}/messages/`,
    { content }
  );
  return data;
}

export async function updateMessageFeedback(
  conversationId: number,
  messageId: number,
  feedback: "like" | "dislike" | null
): Promise<Message> {
  const { data } = await api.patch<Message>(
    `/conversations/${conversationId}/messages/${messageId}/feedback/`,
    { feedback }
  );
  return data;
}
