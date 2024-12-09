"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Client } from "@langchain/langgraph-sdk";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { json } from "stream/consumers";
import remarkGfm from "remark-gfm";

type Message = {
  type: "user" | "bot" | "error" | "info";
  content: string;
  data?: any; // For displaying raw event data
};

export default function LangGraphChat() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clientRef.current = new Client({
      apiUrl: "http://localhost:8000", // Replace with your deployment URL
    });
    createThread();

    // const storedThreadId = localStorage.getItem("threadId");
    // if (storedThreadId) {
    //   setThreadId(storedThreadId);
    // } else {
    //   createThread();
    // }
  }, []);

  const createThread = async () => {
    if (!clientRef.current) return;
    try {
      const thread = await clientRef.current.threads.create();
      setThreadId(thread.thread_id);
      localStorage.setItem("threadId", thread.thread_id);
      // Add info message about thread creation (optional)
      setMessages((prev) => [
        ...prev,
        {
          type: "info",
          content: `New thread created: ${thread.thread_id}`,
        },
      ]);
    } catch (error) {
      console.error("Error creating thread:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Failed to create conversation thread. Please try again.",
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

    const userMessage: Message = { type: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    try {
      const streamResponse = clientRef.current.runs.stream(
        threadId,
        "graph", // Replace 'graph' with your assistant ID if needed
        {
          input: { question: input }, // Adjust input as needed by your graph
          streamMode: "events",
        },
      );

      setMessages((prev) => [...prev, { type: "bot", content: "" }]);

      for await (const chunk of streamResponse) {
        if (
          chunk.data.event == "on_chat_model_stream" &&
          chunk.data.metadata.langgraph_node == "generate_node"
        ) {
          const data = chunk.data.data;
          setMessages((prev) => [
            ...prev,
            { type: "bot", content: data.chunk.content },
          ]);
        }
      }
    } catch (error) {
      console.error("Error during streaming:", error);
      if (error instanceof TypeError) {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            content: "A network error occurred. Please check your connection.",
          },
        ]);
      } else if (error instanceof Error) {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            content: `API error: ${error.message}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            content: "An unexpected error occurred during streaming.",
          },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto flex h-[844px] w-full flex-col overflow-hidden rounded-[40px] bg-[#15162c]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 text-white">
        <Avatar className="h-12 w-12 border-2 border-red-600">
          <AvatarImage src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/HAL9000.svg/2048px-HAL9000.svg.png" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <p className="text-sm text-white/90">Online</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.type === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "prose max-w-[80%] rounded-[20px] px-4 py-2",
                  message.type === "user"
                    ? "bg-white text-[#15162c]"
                    : message.type === "bot"
                      ? "bg-[#8378FF] text-white"
                      : "bg-red-500 text-white",
                )}
              >
                {message.type === "bot" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-[15px]">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">AI is typing...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="h-12 rounded-full bg-white pl-12 pr-4 text-[#15162c]"
              disabled={streaming}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-full bg-white text-[#15162c] hover:bg-white/90 disabled:opacity-50"
            disabled={streaming}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
