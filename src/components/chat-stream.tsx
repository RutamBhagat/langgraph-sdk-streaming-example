"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Client } from "@langchain/langgraph-sdk";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  type: "user" | "bot" | "error";
  content: string;
};

export default function EnhancedChatUI() {
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
    <Card className="mx-auto flex h-[600px] w-full max-w-2xl flex-col">
      <CardContent className="flex-grow overflow-hidden p-6">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 flex items-start ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type !== "user" && (
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarImage src="/bot-avatar.png" alt="Bot" />
                  <AvatarFallback>Bot</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.type === "bot"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-destructive text-destructive-foreground"
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              {message.type === "user" && (
                <Avatar className="ml-2 h-8 w-8">
                  <AvatarImage src="/user-avatar.png" alt="User" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {streaming && (
            <div className="text-muted-foreground flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Bot is typing...</span>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            type="text"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            className="flex-grow"
          />
          <Button type="submit" disabled={streaming} size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
