import api from "./axios";

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
  created_at: string;
}

interface SendMessageResponse {
  message: Message;
  assistant_response: Message;
  source?: string;
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

export async function listMessages(conversationId: number): Promise<Message[]> {
  const { data } = await api.get<Message[]>(
    `/conversations/${conversationId}/messages/`
  );
  return data;
}

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
