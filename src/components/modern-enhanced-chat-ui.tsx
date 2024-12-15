"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Client } from "@langchain/langgraph-sdk";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { env } from "@/env";
import remarkGfm from "remark-gfm";

type Message = {
  type: "user" | "bot" | "error" | "info";
  content: string;
  id: string;
};

export default function ModernEnhancedChatUI() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clientRef.current = new Client({
      apiUrl: env.NEXT_PUBLIC_API_URL,
    });
    createThread();
  }, []);

  const createThread = async () => {
    if (!clientRef.current) return;
    try {
      const thread = await clientRef.current.threads.create();
      setThreadId(thread.thread_id);
      localStorage.setItem("threadId", thread.thread_id);
      setMessages((prev) => [
        ...prev,
        {
          type: "info",
          content: "AI Assistant is ready to help you.",
          id: crypto.randomUUID(),
        },
      ]);
    } catch (error) {
      console.error("Error creating thread:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Failed to create conversation thread. Please try again.",
          id: crypto.randomUUID(),
        },
      ]);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || streaming || !clientRef.current || !threadId) return;

    const userMessage: Message = { 
      type: "user", 
      content: input,
      id: crypto.randomUUID()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    try {
      const assistantID = "graph";
      const streamResponse = clientRef.current.runs.stream(threadId, assistantID, {
        input: { question: input },
        streamMode: "events",
      });

      const botMessageId = crypto.randomUUID();
      setMessages((prev) => [...prev, { type: "bot", content: "", id: botMessageId }]);

      for await (const chunk of streamResponse) {
        if (
          chunk.data.event == "on_chat_model_stream" &&
          chunk.data.metadata.langgraph_node == "generate_node"
        ) {
          const newContent = chunk.data.data.chunk.content;
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                type: lastMessage?.type ?? "bot",
                content: (lastMessage?.content ?? "") + newContent,
                id: botMessageId,
              },
            ];
          });
        }
      }
    } catch (error) {
      console.error("Error during streaming:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: error instanceof Error ? error.message : "An unexpected error occurred.",
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-[600px] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <Avatar className="h-10 w-10 border border-purple-500/50">
          <AvatarImage src="/bot-avatar.png" />
          <AvatarFallback>
            <Bot className="h-6 w-6 text-purple-400" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-medium text-white">AI Assistant</h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-white/70">Online</span>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-purple-400" />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <AnimatePresence initial={false}>
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "flex",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "prose max-w-[80%] rounded-2xl px-4 py-2 shadow-lg",
                    message.type === "user"
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      : message.type === "bot"
                        ? "bg-white/10 text-white backdrop-blur-sm"
                        : message.type === "error"
                          ? "bg-red-500/10 text-red-400 backdrop-blur-sm"
                          : "bg-purple-500/10 text-purple-400 backdrop-blur-sm"
                  )}
                >
                  {message.type === "bot" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="text-[15px] leading-relaxed"
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="m-0 text-[15px]">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {streaming && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-white/70"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="h-12 flex-1 rounded-full border-white/10 bg-white/10 px-6 text-white placeholder-white/50 backdrop-blur-sm transition-colors focus:bg-white/20"
            disabled={streaming}
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-transform hover:scale-105 disabled:opacity-50"
            disabled={streaming}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}