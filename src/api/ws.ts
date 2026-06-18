import type { Message } from "./chat";
import { getAccessToken } from "./axios";

/** Build the WebSocket URL for the chat consumer. */
export function getWsChatUrl(): string {
  const origin = import.meta.env.VITE_API_ORIGIN as string | undefined;
  let url: string;
  if (origin) {
    const base = origin.replace(/\/$/, "");
    const wsBase = base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    url = `${wsBase}/ws/chat/`;
  } else {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    url = `${proto}//${window.location.host}/ws/chat/`;
  }

  // Browsers cannot set Authorization on WebSocket; cookies may not cross
  // localhost vs 127.0.0.1, so pass the in-memory JWT as a query param too.
  const token = getAccessToken();
  if (token) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}token=${encodeURIComponent(token)}`;
  }
  return url;
}

export interface StreamEndPayload {
  type: "stream.end";
  message_id: string;
  conversation_id: string;
  final_data: {
    response: string;
    response_time?: number;
    sources?: unknown;
    source_metadata?: unknown;
    conversation_id?: string;
    [key: string]: unknown;
  };
}

export interface WsServerMessage {
  type: string;
  message?: string;
  message_id?: string;
  conversation_id?: string;
  request_id?: string;
  messages?: Message[];
  detail?: string;
  final_data?: StreamEndPayload["final_data"];
}

export interface QueryResult {
  conversationId: number;
  assistantMessageId: number;
  assistantMessage: Message;
}

type PendingList = {
  resolve: (messages: Message[]) => void;
  reject: (err: Error) => void;
};

type PendingQuery = {
  resolve: (result: QueryResult) => void;
  reject: (err: Error) => void;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const QUERY_TIMEOUT_MS = 180_000;
const LIST_TIMEOUT_MS = 15_000;

function randomRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildAssistantMessage(
  messageId: string,
  finalData: StreamEndPayload["final_data"]
): Message {
  const metadata: Record<string, unknown> = {};
  if (finalData.sources !== undefined) metadata.sources = finalData.sources;
  if (finalData.source_metadata !== undefined) {
    metadata.source_metadata = finalData.source_metadata;
  }

  return {
    id: Number(messageId),
    role: "assistant",
    content: finalData.response || "",
    status: "completed",
    response_time:
      typeof finalData.response_time === "number"
        ? finalData.response_time
        : null,
    metadata,
    celery_task_id: null,
    feedback: null,
    created_at: new Date().toISOString(),
  };
}

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingLists = new Map<string, PendingList>();
  private pendingQuery: PendingQuery | null = null;
  private queryTimer: ReturnType<typeof setTimeout> | null = null;
  private processingMessageId: number | null = null;
  private onConnectionChange?: (connected: boolean) => void;
  private onProcessingChange?: (messageId: number | null) => void;

  constructor(
    callbacks?: {
      onConnectionChange?: (connected: boolean) => void;
      onProcessingChange?: (messageId: number | null) => void;
    }
  ) {
    this.onConnectionChange = callbacks?.onConnectionChange;
    this.onProcessingChange = callbacks?.onProcessingChange;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getProcessingMessageId(): number | null {
    return this.processingMessageId;
  }

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.intentionalClose = false;
    const url = getWsChatUrl();
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      this.onConnectionChange?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsServerMessage;
        this.handleMessage(data);
      } catch {
        // ignore malformed payloads
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.onConnectionChange?.(false);
      this.ws = null;
      this.rejectPending(new Error("WebSocket disconnected"));
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // close handler performs reconnect / rejection
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearQueryTimer();
    this.rejectPending(new Error("WebSocket disconnected"));
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.onConnectionChange?.(false);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.intentionalClose) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private rejectPending(err: Error): void {
    this.pendingLists.forEach(({ reject }) => reject(err));
    this.pendingLists.clear();
    if (this.pendingQuery) {
      this.pendingQuery.reject(err);
      this.pendingQuery = null;
    }
    this.clearQueryTimer();
    this.setProcessingMessageId(null);
  }

  private clearQueryTimer(): void {
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
      this.queryTimer = null;
    }
  }

  private setProcessingMessageId(id: number | null): void {
    this.processingMessageId = id;
    this.onProcessingChange?.(id);
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  private handleMessage(data: WsServerMessage): void {
    switch (data.type) {
      case "status.start": {
        if (data.message_id) {
          this.setProcessingMessageId(Number(data.message_id));
        }
        break;
      }
      case "stream.end": {
        this.clearQueryTimer();
        this.setProcessingMessageId(null);
        if (!this.pendingQuery || !data.message_id || !data.final_data) {
          return;
        }
        const pending = this.pendingQuery;
        this.pendingQuery = null;
        pending.resolve({
          conversationId: Number(data.conversation_id),
          assistantMessageId: Number(data.message_id),
          assistantMessage: buildAssistantMessage(
            data.message_id,
            data.final_data
          ),
        });
        break;
      }
      case "messages.list.result": {
        const requestId = data.request_id;
        if (!requestId) return;
        const pending = this.pendingLists.get(requestId);
        if (!pending) return;
        this.pendingLists.delete(requestId);
        pending.resolve(data.messages ?? []);
        break;
      }
      case "messages.list.error": {
        const requestId = data.request_id;
        if (!requestId) return;
        const pending = this.pendingLists.get(requestId);
        if (!pending) return;
        this.pendingLists.delete(requestId);
        pending.reject(new Error(data.message ?? "Failed to load messages"));
        break;
      }
      case "cancel.success": {
        this.clearQueryTimer();
        this.setProcessingMessageId(null);
        if (this.pendingQuery) {
          this.pendingQuery.reject(new Error("Request cancelled"));
          this.pendingQuery = null;
        }
        break;
      }
      case "error": {
        const err = new Error(data.message ?? "WebSocket error");
        if (this.pendingQuery) {
          this.clearQueryTimer();
          this.setProcessingMessageId(null);
          const pending = this.pendingQuery;
          this.pendingQuery = null;
          pending.reject(err);
        }
        break;
      }
      default:
        break;
    }
  }

  listMessages(conversationId: number): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      const requestId = randomRequestId();
      const timer = setTimeout(() => {
        if (this.pendingLists.has(requestId)) {
          this.pendingLists.delete(requestId);
          reject(new Error("messages.list timed out"));
        }
      }, LIST_TIMEOUT_MS);

      this.pendingLists.set(requestId, {
        resolve: (messages) => {
          clearTimeout(timer);
          resolve(messages);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      try {
        this.send({
          type: "messages.list",
          request_id: requestId,
          conversation_id: conversationId,
        });
      } catch (err) {
        clearTimeout(timer);
        this.pendingLists.delete(requestId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  sendQuery(
    query: string,
    conversationId?: number | null
  ): Promise<QueryResult> {
    if (this.pendingQuery) {
      return Promise.reject(new Error("Another query is already in progress"));
    }

    return new Promise((resolve, reject) => {
      this.pendingQuery = { resolve, reject };
      this.queryTimer = setTimeout(() => {
        if (this.pendingQuery) {
          this.pendingQuery.reject(new Error("Query timed out"));
          this.pendingQuery = null;
          this.setProcessingMessageId(null);
        }
      }, QUERY_TIMEOUT_MS);

      const payload: Record<string, unknown> = {
        type: "query",
        query,
      };
      if (conversationId != null) {
        payload.conversation_id = conversationId;
      }

      try {
        this.send(payload);
      } catch (err) {
        this.clearQueryTimer();
        this.pendingQuery = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  cancelMessage(messageId: number): void {
    this.send({ type: "cancel", message_id: String(messageId) });
  }
}
