"use client";

import { useState } from "react";
import type { AdminAiMessage } from "@/lib/openaiClient";

export default function AdminIaPage() {
  const [messages, setMessages] = useState<AdminAiMessage[]>([
    {
      role: "system",
      content:
        "Você é o assistente administrativo técnico do Sistema Conexão Dança. Seja objetivo, técnico e econômico.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: AdminAiMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, mode: "economico" }),
      });

      if (!res.ok) {
        let errorText = "Ocorreu um erro ao consultar o assistente de IA.";
        try {
          const data = await res.json();
          if (data?.error) {
            errorText = data.error;
            if (data.details) {
              errorText += ` Detalhes: ${data.details}`;
            }
          }
        } catch {
          // ignore parse error
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorText,
          },
        ]);
        return;
      }

      const data = await res.json();
      const answer = data.answer as AdminAiMessage;

      setMessages((prev) => [...prev, answer]);
    } catch (error) {
      console.error("Erro de rede ao chamar /api/admin/ia:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ocorreu um erro de rede ao consultar o assistente de IA. Verifique a conexão com o servidor.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSend();
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="h-full w-full px-4 py-6">
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-4">
        {/* Cabeçalho local do painel */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Painel de IA — Administração
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça perguntas sobre qualquer parte do sistema. Este painel usa o
              modo econômico da IA para reduzir custos.
            </p>
          </div>
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Modo: <span className="font-medium">Econômico</span>{" "}
            <span className="opacity-70">(gpt-4.1-mini)</span>
          </div>
        </header>

        {/* Card principal de conversa */}
        <section className="flex-1 rounded-2xl border bg-card/60 shadow-sm backdrop-blur-sm">
          <div className="flex h-full flex-col">
            {/* Área de mensagens */}
            <div className="flex-1 space-y-2 overflow-y-auto border-b px-4 py-3">
              {visibleMessages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma interação ainda. Envie a primeira pergunta abaixo.
                </p>
              )}

              {visibleMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex w-full ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {isUser ? "Você" : "Assistente"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Área de entrada */}
            <div className="px-4 py-3">
              <div className="flex flex-col gap-2 rounded-xl border bg-background/70 p-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Digite sua pergunta para o assistente de IA
                </label>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus-visible:border-primary"
                  placeholder="Ex.: 'Me explique como está estruturado o módulo de turmas'  (Ctrl+Enter para enviar)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Atalho: Ctrl+Enter para enviar.</span>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Consultando a IA..." : "Enviar pergunta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
