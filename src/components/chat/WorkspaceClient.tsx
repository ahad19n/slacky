"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { JWTPayload } from "@/types";

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

interface Props {
  user: JWTPayload;
  token: string;
}

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
      style={{ backgroundColor: `hsl(${hue},55%,45%)` }}
    >
      {initials}
    </div>
  );
}

export default function WorkspaceClient({ user, token }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Socket.IO ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { socket.disconnect(); };
  }, [token]);

  // ── Load channels ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/channels?tenantId=${user.tenantId}`)
      .then((r) => r.json())
      .then((data: Channel[]) => {
        setChannels(data);
        if (data.length > 0) setActiveChannel(data[0]);
      });
  }, [user.tenantId]);

  // ── Load + subscribe to channel ────────────────────────────────
  useEffect(() => {
    if (!activeChannel) return;
    const socket = socketRef.current;

    // Join socket room
    socket?.emit("join_channel", activeChannel.id);

    // Load history
    fetch(`/api/messages?tenantId=${user.tenantId}&channelId=${activeChannel.id}`)
      .then((r) => r.json())
      .then(setMessages);

    return () => { socket?.emit("leave_channel", activeChannel.id); };
  }, [activeChannel, user.tenantId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const switchChannel = useCallback((ch: Channel) => {
    setMessages([]);
    setActiveChannel(ch);
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!draft.trim() || !activeChannel || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: user.tenantId, channelId: activeChannel.id, content }),
    });
    setSending(false);
    inputRef.current?.focus();
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: user.tenantId, name: newChannelName }),
    });
    const ch: Channel = await res.json();
    setChannels((prev) => [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveChannel(ch);
    setNewChannelName("");
    setShowNewChannel(false);
  };

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    window.location.href = "/login";
  };

  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    const last = acc[acc.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="flex h-screen w-full bg-surface-900 overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-surface-800 border-r border-surface-600 flex flex-col">
        {/* Workspace header */}
        <div className="px-4 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white font-mono font-bold text-xs">#</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-chalk text-sm font-semibold truncate leading-tight">
                {user.tenantId.slice(0, 8)}…
              </p>
              <p className="text-chalk-muted text-xs truncate">{user.username}</p>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="flex items-center justify-between px-4 mb-1">
            <span className="text-chalk-muted text-xs font-semibold uppercase tracking-wider">
              Channels
            </span>
            <button
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="text-chalk-muted hover:text-chalk text-lg leading-none"
              title="Add channel"
            >
              +
            </button>
          </div>

          {showNewChannel && (
            <div className="px-3 mb-2">
              <div className="flex gap-1">
                <input
                  autoFocus
                  className="flex-1 bg-surface-700 border border-surface-600 focus:border-accent rounded px-2 py-1 text-xs text-chalk outline-none"
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createChannel();
                    if (e.key === "Escape") setShowNewChannel(false);
                  }}
                />
                <button
                  onClick={createChannel}
                  className="bg-accent hover:bg-accent-hover text-white text-xs px-2 rounded"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => switchChannel(ch)}
              className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                activeChannel?.id === ch.id
                  ? "bg-accent-muted text-chalk"
                  : "text-chalk-muted hover:text-chalk hover:bg-surface-700"
              }`}
            >
              <span className="text-chalk-faint">#</span>
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-surface-600 flex items-center gap-2">
          <Avatar name={user.username} />
          <span className="flex-1 text-sm text-chalk truncate">{user.username}</span>
          <button
            onClick={logout}
            className="text-chalk-faint hover:text-red-400 text-xs transition-colors"
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <header className="px-5 py-3 border-b border-surface-600 flex items-center gap-2 flex-shrink-0">
              <span className="text-chalk-muted">#</span>
              <span className="text-chalk font-semibold">{activeChannel.name}</span>
              {activeChannel.description && (
                <>
                  <span className="text-surface-500">|</span>
                  <span className="text-chalk-muted text-sm truncate">{activeChannel.description}</span>
                </>
              )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-surface-600" />
                    <span className="text-chalk-faint text-xs">{group.date}</span>
                    <div className="h-px flex-1 bg-surface-600" />
                  </div>
                  <div className="space-y-1">
                    {group.msgs.map((msg, i) => {
                      const prev = group.msgs[i - 1];
                      const grouped = prev?.userId === msg.userId;
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${grouped ? "" : "mt-3"}`}>
                          <div className="w-7 flex-shrink-0 mt-0.5">
                            {!grouped && <Avatar name={msg.username} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {!grouped && (
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-chalk">{msg.username}</span>
                                <span className="text-chalk-faint text-xs font-mono">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            )}
                            <p className="text-sm text-chalk leading-relaxed break-words">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 pb-5 flex-shrink-0">
              <div className="flex items-center gap-2 bg-surface-700 rounded-xl border border-surface-600 focus-within:border-accent px-4 py-2.5">
                <span className="text-chalk-faint text-sm">#</span>
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-sm text-chalk outline-none placeholder:text-chalk-faint"
                  placeholder={`Message #${activeChannel.name}`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className="text-accent disabled:text-chalk-faint transition-colors text-sm font-medium"
                >
                  Send
                </button>
              </div>
              <p className="text-chalk-faint text-xs mt-1.5 pl-1">
                Press Enter to send
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-chalk-muted text-sm">Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
