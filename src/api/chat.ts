import api from "./axios";

/** One retrieved law chunk from the backend workflow (matches `parse_retrieved_laws_to_sources`). */
export interface LawSourceChunk {
  search_query: string | null;
  chunk_index: number;
  law_name: string;
  status: string;
  link: string;
  text: string;
}

export type MessageSourcesDisplay =
  | { mode: "chunks"; chunks: LawSourceChunk[] }
  | { mode: "raw"; text: string };

/**
 * Normalize `metadata.source` or API `source` for UI: structured chunks, legacy string, or none.
 */
export function getMessageSourcesDisplay(
  source: unknown
): MessageSourcesDisplay | null {
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
      law_name: String(o.law_name ?? ""),
      status: String(o.status ?? ""),
      link: String(o.link ?? ""),
      text: String(o.text ?? ""),
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
  source?: LawSourceChunk[] | string;
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
