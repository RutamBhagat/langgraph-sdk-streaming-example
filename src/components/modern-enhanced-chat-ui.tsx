"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Client } from "@langchain/langgraph-sdk";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  type: "user" | "bot" | "error";
  content: string;
};

export default function ModernEnhancedChatUI() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const clientRef = useRef<Client | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clientRef.current = new Client({
      apiUrl: "http://localhost:8000",
    });

    const createThread = async () => {
      if (clientRef.current !== null) {
        const thread = await clientRef.current.threads.create({});
        console.log("Thread created:", thread);
      }
    };
    void createThread();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || streaming || !clientRef.current) return;

    const userMessage: Message = { type: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setStreaming(true);

    try {
      const thread = await clientRef.current.threads.create({});
      const stream = clientRef.current.runs.stream(thread.thread_id, "agent", {
        input: { question: input },
        streamMode: "events",
      });

      let botMessageContent = "";
      for await (const chunk of stream) {
        if (chunk.event === "events") {
          if (chunk.data.event === "on_chain_end") {
            if ("generation" in chunk.data.data.output) {
              botMessageContent += chunk.data.data.output.generation;
              setMessages((prev) => [
                ...prev,
                { type: "bot", content: botMessageContent },
              ]);
            }
          } else if (chunk.data.event === "on_chat_model_stream") {
            if ("content" in chunk.data.data.chunk) {
              botMessageContent += chunk.data.data.chunk.content;
              setMessages((prevMessages) => {
                const lastMessageIndex = prevMessages.length - 1;
                if (
                  lastMessageIndex >= 0 &&
                  prevMessages[lastMessageIndex]?.type === "bot"
                ) {
                  const updatedMessages = [...prevMessages];
                  updatedMessages[lastMessageIndex] = {
                    type: "bot",
                    content: botMessageContent,
                  };
                  return updatedMessages;
                } else {
                  return [
                    ...prevMessages,
                    { type: "bot", content: botMessageContent },
                  ];
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error during streaming:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "error", content: "An error occurred during streaming." },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto flex h-[844px] w-full max-w-md flex-col overflow-hidden rounded-[40px] bg-[#15162c]">
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
                  "max-w-[80%] rounded-[20px] px-4 py-2",
                  message.type === "user"
                    ? "bg-white text-[#15162c]"
                    : message.type === "bot"
                      ? "bg-[#8378FF] text-white"
                      : "bg-red-500 text-white",
                )}
              >
                <p className="text-[15px]">{message.content}</p>
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex items-center text-white/70">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
