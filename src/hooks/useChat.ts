import { useRef, useState, useCallback, useEffect } from "react";
import type { LawSourceChunk, Message } from "@/api/chat";

export interface StreamEvent {
  type: string;
  message_id?: string;
  conversation_id?: string;
  detail?: string;
  tool_name?: string;
  output?: string;
  final_data?: {
    response: string;
    source: LawSourceChunk[] | string | null;
    search_strategy: string | null;
    conversation_id: string;
    response_time: number;
  };
  message?: string;
}

type RpcEntry = {
  resolve: (value: Message[]) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

interface UseChatReturn {
  connected: boolean;
  streaming: boolean;
  streamingContent: string;
  currentMessageId: string | null;
  sendQuery: (query: string, conversationId?: number) => void;
  cancelQuery: (messageId: string) => void;
  listMessagesWs: (conversationId: number) => Promise<Message[]>;
  onStreamEnd: React.MutableRefObject<
    ((data: StreamEvent) => void) | null
  >;
}

const RPC_TIMEOUT_MS = 30_000;

function rejectAllRpc(
  pending: Map<string, RpcEntry>,
  reason: Error
): void {
  pending.forEach(({ reject, timeout }) => {
    clearTimeout(timeout);
    reject(reason);
  });
  pending.clear();
}

export function useChat(): UseChatReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const rpcPendingRef = useRef<Map<string, RpcEntry>>(new Map());
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const onStreamEnd = useRef<((data: StreamEvent) => void) | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectAttempts = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_DELAY_MS = 1000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return;

    const apiOrigin = import.meta.env.VITE_API_ORIGIN as string | undefined;
    const wsUrl = apiOrigin
      ? apiOrigin.replace(/\/$/, "").replace(/^http/, "ws") + "/ws/chat/"
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/chat/`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      const msgType = data.type;

      if (msgType === "messages.list.result") {
        const requestId = data.request_id as string;
        const entry = rpcPendingRef.current.get(requestId);
        if (entry) {
          clearTimeout(entry.timeout);
          rpcPendingRef.current.delete(requestId);
          entry.resolve((data.messages as Message[]) ?? []);
        }
        return;
      }

      if (msgType === "messages.list.error") {
        const requestId = data.request_id as string;
        const entry = rpcPendingRef.current.get(requestId);
        if (entry) {
          clearTimeout(entry.timeout);
          rpcPendingRef.current.delete(requestId);
          entry.reject(
            new Error(String(data.message ?? "Failed to load messages"))
          );
        }
        return;
      }

      const streamData = data as unknown as StreamEvent;
      switch (streamData.type) {
        case "status.start":
          setStreaming(true);
          setStreamingContent("");
          setCurrentMessageId(streamData.message_id ?? null);
          break;

        case "tool.result":
          break;

        case "stream.end":
          setStreaming(false);
          setStreamingContent(streamData.final_data?.response ?? "");
          onStreamEnd.current?.(streamData);
          break;

        case "cancel.success":
          setStreaming(false);
          setStreamingContent("");
          setCurrentMessageId(null);
          break;

        case "error":
          setStreaming(false);
          setStreamingContent(streamData.message ?? "An error occurred.");
          break;
      }
    };

    ws.onclose = () => {
      rejectAllRpc(
        rpcPendingRef.current,
        new Error("WebSocket closed")
      );
      setConnected(false);
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, reconnectAttempts.current);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      rejectAllRpc(
        rpcPendingRef.current,
        new Error("WebSocket closed")
      );
      wsRef.current?.close();
    };
  }, [connect]);

  const sendQuery = useCallback(
    (query: string, conversationId?: number) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const payload: Record<string, unknown> = { type: "query", query };
      if (conversationId) payload.conversation_id = conversationId;
      wsRef.current.send(JSON.stringify(payload));
    },
    []
  );

  const cancelQuery = useCallback((messageId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ type: "cancel", message_id: messageId })
    );
  }, []);

  const listMessagesWs = useCallback((conversationId: number) => {
    return new Promise<Message[]>((resolve, reject) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }
      const requestId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        const entry = rpcPendingRef.current.get(requestId);
        if (entry) {
          rpcPendingRef.current.delete(requestId);
          entry.reject(new Error("Request timed out"));
        }
      }, RPC_TIMEOUT_MS);
      rpcPendingRef.current.set(requestId, { resolve, reject, timeout });
      wsRef.current.send(
        JSON.stringify({
          type: "messages.list",
          request_id: requestId,
          conversation_id: conversationId,
        })
      );
    });
  }, []);

  return {
    connected,
    streaming,
    streamingContent,
    currentMessageId,
    sendQuery,
    cancelQuery,
    listMessagesWs,
    onStreamEnd,
  };
}
