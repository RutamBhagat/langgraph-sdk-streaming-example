"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Client } from "@langchain/langgraph-sdk"; // Changed StreamMode to StreamEvent
import { Input } from "@/components/ui/input";

export default function ChatStream() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<{ type: string; content: string }[]>(
    [],
  );
  const clientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize the client only once when the component mounts
    clientRef.current = new Client({
      apiUrl: "http://localhost:8000",
    });

    // Pre-create a thread. This is more efficient than creating
    // a new thread for every request. However, make sure your LangServe
    // instance is configured to handle this correctly (e.g., by clearing
    // thread state between requests if needed.) otherwise there might be
    // some unexpected issues if the state isn't managed correctly.

    const createThread = async () => {
      if (clientRef.current !== null) {
        const thread = await clientRef.current.threads.create({});
        console.log("Thread created:", thread);
      }
    };
    void createThread();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || streaming || !clientRef.current) return;

    const userMessage = { type: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setStreaming(true);

    try {
      const thread = await clientRef.current.threads.create({}); // Create a thread for each request

      // Stream events
      const stream = clientRef.current.runs.stream(
        thread.thread_id,
        "agent", // Replace with your agent ID if different
        {
          input: { question: input }, // Or whatever your graph input looks like
          streamMode: "events", // Critical: Stream events
        },
      );

      let botMessageContent = "";
      for await (const chunk of stream) {
        // Correctly access chunk.event and chunk.data
        if (chunk.event === "events") {
          //  Access the nested event and data from the LangGraph chain
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
    <Card>
      <CardHeader>
        <CardTitle>LangGraph Chat</CardTitle>
        <CardDescription>Streaming generation from agent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-blue-500 text-white"
                    : message.type === "bot"
                      ? "bg-gray-200 text-black"
                      : "bg-red-500 text-white"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            type="text"
            placeholder="Enter your question here"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
          />
          <Button type="submit" disabled={streaming}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
