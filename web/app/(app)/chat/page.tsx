"use client";

import { ArrowRight, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ExtractionBadge } from "@/components/chat/ExtractionBadge";
import { getStoryById } from "@/lib/mock-data";
import { analyzeMessage, buildAssistantReply } from "@/lib/chat-engine";
import { useAppStore } from "@/lib/store";
import type { ChatMessage, InterestType } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const TOPIC_TYPE: InterestType = "topic";

const SUGGESTIONS = [
  "I've been really into AI policy lately, following the India framework closely.",
  "Just saw a headline about UK visas, not that important to me though.",
  "Honestly I'm sick of hearing about cricket governance drama.",
  "Big fan of Formula 1 and I always read about the championship.",
];

export default function ChatPage() {
  const { profile, chatMessages, addChatMessage, addInferredInterest, addNegativeSignal } = useAppStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    if (!greetedRef.current && chatMessages.length === 0 && profile) {
      greetedRef.current = true;
      addChatMessage({
        id: uid("msg"),
        role: "assistant",
        text: `Hi ${profile.name.split(" ")[0]}, tell me what's on your mind — I'll quietly learn what matters to you and show you exactly what I saved.`,
        createdAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const send = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    addChatMessage(userMsg);

    const extractions = analyzeMessage(text);
    extractions.forEach((ext) => {
      if (ext.verdict === "interested") {
        addInferredInterest(ext.topic, TOPIC_TYPE, ext.confidence, `Inferred from chat: "${text.trim().slice(0, 80)}"`);
      } else if (ext.verdict === "negative") {
        addNegativeSignal(ext.topic, TOPIC_TYPE, `Negative sentiment in chat: "${text.trim().slice(0, 80)}"`);
      }
    });

    const reply = buildAssistantReply(extractions);
    const assistantMsg: ChatMessage = {
      id: uid("msg"),
      role: "assistant",
      text: reply.text,
      createdAt: new Date().toISOString(),
      extractions,
      suggestedStoryId: reply.suggestedStoryId,
    };
    // Slight delay so the two messages don't render in the same tick — reads more like a reply.
    setTimeout(() => addChatMessage(assistantMsg), 300);

    setInput("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Chat</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Talk naturally. Every message is scored for topic and confidence — genuine interests are
          saved to your graph, passing mentions are not.
        </p>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-lg", msg.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                )}
              >
                {msg.role === "assistant" && (
                  <Sparkles className="mb-1 h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                )}
                {msg.text}
              </div>

              {msg.extractions && msg.extractions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {msg.extractions.map((ext, i) => (
                    <ExtractionBadge key={i} extraction={ext} />
                  ))}
                </div>
              )}

              {msg.suggestedStoryId && (
                <SuggestedStoryLink storyId={msg.suggestedStoryId} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            {s.length > 46 ? `${s.slice(0, 46)}…` : s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me what's on your mind…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          disabled={!input.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function SuggestedStoryLink({ storyId }: { storyId: string }) {
  const story = getStoryById(storyId);
  if (!story) return null;
  return (
    <Link
      href={`/story/${story.id}`}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
    >
      View &quot;{story.title}&quot;
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}
