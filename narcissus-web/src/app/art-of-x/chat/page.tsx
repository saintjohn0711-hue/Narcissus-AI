"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  displayName,
  loadChats,
  loadPartners,
  mainPhoto,
  normalizeKinks,
  saveChats,
  stubPartnerReply,
  type ChatMessage,
  type PartnerRecord,
} from "@/lib/artOfX";

export default function ChatPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = loadPartners();
    setPartners(list);
    setChats(loadChats());
    if (list[0]) setActiveId(list[0].id);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveChats(chats);
  }, [chats, ready]);

  const partner = useMemo(
    () => partners.find((p) => p.id === activeId) || null,
    [partners, activeId],
  );
  const threadKey = activeId != null ? String(activeId) : "";
  const messages = threadKey ? chats[threadKey] || [] : [];

  function send(e: FormEvent) {
    e.preventDefault();
    if (!partner || !text.trim()) return;
    const now = new Date().toISOString();
    const you: ChatMessage = {
      id: `m_${Date.now()}`,
      partnerId: partner.id,
      who: "You",
      text: text.trim(),
      at: now,
    };
    const reply: ChatMessage = {
      id: `m_${Date.now() + 1}`,
      partnerId: partner.id,
      who: "Partner",
      text: stubPartnerReply(partner, text.trim()),
      at: new Date().toISOString(),
    };
    setChats((prev) => ({
      ...prev,
      [String(partner.id)]: [...(prev[String(partner.id)] || []), you, reply],
    }));
    setText("");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
      <AppNav />
      <header className="mb-8">
        <h1
          className="text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          AI chat
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#c4b7a8]">
          Chat against partner cards. Replies are a local personality stub
          grounded in history / kinks / dynamics — real LLM wiring is next.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="text-sm text-[#c4b7a8]">
          Add partners first, then come back to chat with them.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`flex w-full items-center gap-3 border px-3 py-2 text-left text-sm ${
                  activeId === p.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--line)]"
                }`}
              >
                {mainPhoto(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mainPhoto(p)!}
                    alt=""
                    className="h-10 w-10 object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center bg-[#1c1814] text-xs text-[#c4b7a8]">
                    {p.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[var(--ink)]">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {p.type} · {p.gender}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <section className="flex min-h-[28rem] flex-col border border-[var(--line)] bg-[var(--bg-elevated)]/40">
            {partner && (
              <div className="border-b border-[var(--line)] p-4">
                <h2
                  className="text-xl text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {displayName(partner)}
                </h2>
                <p className="mt-1 text-xs text-[#c4b7a8]">
                  {normalizeKinks(partner.kinks)
                    .slice(0, 5)
                    .map((k) => k.tag)
                    .join(" · ") || "No kinks tagged"}
                  {partner.dynTags.length
                    ? ` · ${partner.dynTags.slice(0, 3).join(", ")}`
                    : ""}
                </p>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {messages.length === 0 && (
                <p className="text-sm text-[#c4b7a8]">
                  Say something filthy. They already know your history.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                    m.who === "You"
                      ? "ml-auto bg-[var(--accent)]/20 text-[#f7f1e8]"
                      : "bg-[#1c1814] text-[#f7f1e8]"
                  }`}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {m.who}
                  </p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={send}
              className="flex gap-2 border-t border-[var(--line)] p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message…"
                className="prompt-field min-w-0 flex-1 rounded-sm border border-[var(--line)] bg-[#1c1814] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a120c]"
              >
                Send
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
