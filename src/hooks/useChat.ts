import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  listMessages as listMessagesRest,
  sendMessage as sendMessageRest,
  type Message,
} from "@/api/chat";
import { refreshToken } from "@/api/auth";
import { ChatWebSocketClient, type QueryResult } from "@/api/ws";

export interface SendQueryResult extends QueryResult {
  viaWebSocket: boolean;
}

export interface UseChatOptions {
  enabled: boolean;
}

export function useChat({ enabled }: UseChatOptions) {
  const clientRef = useRef<ChatWebSocketClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [processingMessageId, setProcessingMessageId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!enabled) {
      clientRef.current?.disconnect();
      clientRef.current = null;
      setWsConnected(false);
      setProcessingMessageId(null);
      return;
    }

    const client = new ChatWebSocketClient({
      onConnectionChange: setWsConnected,
      onProcessingChange: setProcessingMessageId,
    });
    clientRef.current = client;

    refreshToken()
      .catch(() => {
        // Cookie may still be valid from a prior session
      })
      .finally(() => {
        client.connect();
      });

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [enabled]);

  const loadMessages = useCallback(
    async (conversationId: number): Promise<Message[]> => {
      const client = clientRef.current;
      if (client?.isConnected()) {
        try {
          return await client.listMessages(conversationId);
        } catch {
          // fall through to REST
        }
      }
      return listMessagesRest(conversationId);
    },
    []
  );

  const sendQuery = useCallback(
    async (
      query: string,
      conversationId?: number | null
    ): Promise<SendQueryResult> => {
      const client = clientRef.current;
      if (client?.isConnected()) {
        try {
          const result = await client.sendQuery(query, conversationId);
          return { ...result, viaWebSocket: true };
        } catch {
          // fall through to REST when WS send fails
        }
      }

      let convId = conversationId ?? undefined;
      if (convId == null) {
        const conv = await createConversation();
        convId = conv.id;
      }

      const resp = await sendMessageRest(convId, query);
      return {
        conversationId: convId,
        assistantMessageId: resp.assistant_response.id,
        assistantMessage: resp.assistant_response,
        viaWebSocket: false,
      };
    },
    []
  );

  const cancelQuery = useCallback(async (): Promise<void> => {
    const client = clientRef.current;
    const messageId = client?.getProcessingMessageId();
    if (client?.isConnected() && messageId != null) {
      client.cancelMessage(messageId);
    }
  }, []);

  return {
    wsConnected,
    processingMessageId,
    loadMessages,
    sendQuery,
    cancelQuery,
  };
}
