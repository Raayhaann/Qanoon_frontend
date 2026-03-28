import { useRef, useState, useCallback, useEffect } from "react";

export interface StreamEvent {
  type: string;
  message_id?: string;
  conversation_id?: string;
  detail?: string;
  tool_name?: string;
  output?: string;
  final_data?: {
    response: string;
    source: string | null;
    search_strategy: string | null;
    conversation_id: string;
    response_time: number;
  };
  message?: string;
}

interface UseChatReturn {
  connected: boolean;
  streaming: boolean;
  streamingContent: string;
  currentMessageId: string | null;
  sendQuery: (query: string, conversationId?: number) => void;
  cancelQuery: (messageId: string) => void;
  onStreamEnd: React.MutableRefObject<
    ((data: StreamEvent) => void) | null
  >;
}

export function useChat(): UseChatReturn {
  const wsRef = useRef<WebSocket | null>(null);
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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat/`);

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data: StreamEvent = JSON.parse(event.data);

      switch (data.type) {
        case "status.start":
          setStreaming(true);
          setStreamingContent("");
          setCurrentMessageId(data.message_id ?? null);
          break;

        case "tool.result":
          break;

        case "stream.end":
          setStreaming(false);
          setStreamingContent(data.final_data?.response ?? "");
          onStreamEnd.current?.(data);
          break;

        case "cancel.success":
          setStreaming(false);
          setStreamingContent("");
          setCurrentMessageId(null);
          break;

        case "error":
          setStreaming(false);
          setStreamingContent(data.message ?? "An error occurred.");
          break;
      }
    };

    ws.onclose = () => {
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

  return {
    connected,
    streaming,
    streamingContent,
    currentMessageId,
    sendQuery,
    cancelQuery,
    onStreamEnd,
  };
}
