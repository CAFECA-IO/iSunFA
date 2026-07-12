"use client";

import React, { useState, useEffect, useRef } from "react";
import { Centrifuge } from "centrifuge";
import { Send, User, Hash, AlertCircle, MessageSquare } from "lucide-react";

interface IChatMessage {
  sender: string;
  text: string;
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [sender, setSender] = useState("");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState("lobby");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState(["lobby", "room-1", "room-2"]);
  const [newChannelName, setNewChannelName] = useState("");
  const centrifugeRef = useRef<Centrifuge | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize random sender nickname on mount
  useEffect(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setSender(`User_${randomNum}`);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Centrifugo connection logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use current protocol & host, routing through gateway or direct port 20027
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname;
    const wsPort = window.location.port;

    const chatroomPort = process.env.NEXT_PUBLIC_CHATROOM_PORT || "20027";
    const wsUrl =
      wsPort === "3000"
        ? `${wsProtocol}//${wsHost}:${chatroomPort}/connection/websocket`
        : `${wsProtocol}//${window.location.host}/connection/websocket`;

    console.log("[Chat] Connecting to Centrifugo:", wsUrl);

    // In secure/production environments, we need a JWT token.
    // Since we enabled CENTRIFUGO_INSECURE=true, we don't need to pass a token.
    const centrifuge = new Centrifuge(wsUrl);
    centrifugeRef.current = centrifuge;

    centrifuge.on("connected", (ctx) => {
      console.log("[Chat] Connected:", ctx);
      setConnected(true);
      setError(null);
    });

    centrifuge.on("disconnected", (ctx) => {
      console.log("[Chat] Disconnected:", ctx);
      setConnected(false);
    });

    centrifuge.on("error", (ctx) => {
      console.error("[Chat] Connection error:", ctx);
      setError("Failed to connect to real-time server.");
    });

    // Subscribe to selected channel
    const sub = centrifuge.newSubscription(channel);

    sub.on("publication", (ctx) => {
      console.log("[Chat] Message received:", ctx.data);
      const msg = ctx.data as IChatMessage;
      setMessages((prev) => {
        // Prevent duplicate messages in list if we receive our own or duplicate packets
        const exists = prev.some(
          (m) =>
            m.sender === msg.sender &&
            m.text === msg.text &&
            m.timestamp === msg.timestamp,
        );
        if (exists) return prev;
        return [...prev, msg];
      });
    });

    sub.on("subscribed", (ctx) => {
      console.log("[Chat] Subscribed to:", channel, ctx);
      // Fetch history if available (can be enabled in Centrifugo namespace config)
      setError(null);
    });

    sub.on("error", (ctx) => {
      console.error("[Chat] Subscription error:", ctx);
      setError(
        `Subscription error: ${ctx.error?.message || "permission denied"}`,
      );
    });

    sub.subscribe();
    centrifuge.connect();

    return () => {
      console.log("[Chat] Cleaning up subscription for:", channel);
      sub.unsubscribe();
      centrifuge.disconnect();
    };
  }, [channel]);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !sender.trim()) return;

    const messageText = text.trim();
    setText(""); // clear input field early for better UX

    try {
      // Publish the message using Next.js backend API (proxied to Centrifugo)
      const response = await fetch("/api/chat/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          sender: sender.trim(),
          text: messageText,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to send message");
      }
    } catch (err: unknown) {
      console.error("[Chat] Send error:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to send message: ${errMsg}`);
    }
  };

  // Add custom channel
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!formatted) return;

    // Keep channel names simple (e.g. "lobby") to match default Centrifugo config.
    const fullChannelName = formatted.replace(/^chatroom:/, "");

    if (!channels.includes(fullChannelName)) {
      setChannels((prev) => [...prev, fullChannelName]);
    }
    setChannel(fullChannelName);
    setMessages([]);
    setNewChannelName("");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Sidebar */}
      <aside className="flex w-80 flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        {/* App Title */}
        <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-5">
          <MessageSquare className="h-6 w-6 text-emerald-400" />
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-xl font-bold text-transparent">
            iSunFA Chatroom
          </h1>
        </div>

        {/* User Nickname Configuration */}
        <div className="border-b border-slate-800 p-6">
          <label
            htmlFor="nickname-input"
            className="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
          >
            My Nickname
          </label>
          <div className="relative">
            <User className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              id="nickname-input"
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pr-4 pl-9 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-emerald-500 focus:outline-none"
              placeholder="Nickname"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Channels
            </span>
          </div>

          <div className="space-y-1">
            {channels.map((ch) => (
              <button
                key={ch}
                onClick={() => {
                  setChannel(ch);
                  setMessages([]);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  channel === ch
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "hover:bg-slate-850 border border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Hash className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">{ch}</span>
              </button>
            ))}
          </div>

          {/* Add Channel Form */}
          <form onSubmit={handleAddChannel} className="mt-6 px-2">
            <label
              htmlFor="channel-input"
              className="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
            >
              Create Channel
            </label>
            <div className="flex gap-2">
              <input
                id="channel-input"
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. general"
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs transition-colors focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500 active:scale-95"
              >
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Connection Status Footbar */}
        <div className="border-t border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Status</span>
            <div className="flex items-center gap-1.5">
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-rose-400">
                    Disconnected
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col bg-slate-950">
        {/* Chat Header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900/20 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">{channel}</h2>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs text-slate-400">
            Test Route:{" "}
            <span className="font-mono text-emerald-400">/chat</span>
          </div>
        </header>

        {/* Error Alert (if any) */}
        {error && (
          <div className="mx-8 mt-4 flex items-center gap-2 rounded-lg border border-rose-900/30 bg-rose-950/30 p-4 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Panel */}
        <div className="flex-1 space-y-4 overflow-y-auto px-8 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <MessageSquare className="mb-2 h-12 w-12 text-slate-700" />
              <p className="text-sm">
                No messages yet. Send a message to start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isSelf = msg.sender === sender;
              return (
                <div
                  key={i}
                  className={`flex max-w-[70%] flex-col ${isSelf ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div className="mb-1 flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold text-slate-400">
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-all ${
                      isSelf
                        ? "rounded-tr-none bg-emerald-600 text-white"
                        : "rounded-tl-none border border-slate-800 bg-slate-900 text-slate-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Footer */}
        <footer className="border-t border-slate-800 bg-slate-900/10 p-6">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!connected}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm placeholder-slate-600 transition-colors focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              placeholder={
                connected
                  ? "Type a message..."
                  : "Connecting to real-time server..."
              }
            />
            <button
              type="submit"
              disabled={!connected || !text.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-55"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
