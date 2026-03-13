"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  LoaderCircle,
  Monitor,
  Paperclip,
  RefreshCcw,
  Route,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RequireUserResult } from "@/lib/auth/requireUser";
import { capturarScreenshot } from "@/lib/suporte/capturarScreenshot";
import { coletarContextoTela } from "@/lib/suporte/coletarContextoTela";
import {
  SUPORTE_TIPO_LABEL,
  type SuporteTicketTipo,
} from "@/lib/suporte/constants";

type SuporteModalProps = {
  open: boolean;
  onClose: () => void;
  user?: RequireUserResult | null;
};

type Etapa = "tipo" | "formulario";

type FormState = {
  titulo: string;
  descricao: string;
  oQueDeveriaAcontecer: string;
  impactoPercebido: string;
  areaFuncional: string;
  prioridadeCritica: boolean;
  incluirScreenshot: boolean;
};

const DEFAULT_FORM: FormState = {
  titulo: "",
  descricao: "",
  oQueDeveriaAcontecer: "",
  impactoPercebido: "",
  areaFuncional: "",
  prioridadeCritica: false,
  incluirScreenshot: false,
};

type UploadResponse = {
  ok: boolean;
  screenshot_url?: string;
  error?: string;
};

type TicketSuccessState = {
  id: number;
  codigo: string | null;
};

const AREA_FUNCIONAL_OPTIONS = [
  "Matrícula",
  "Financeiro",
  "Loja",
  "Café",
  "Administração",
  "Outro",
] as const;

function resumirNavegador(userAgent: string | null) {
  if (!userAgent) return "Navegador nao identificado";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
  return "Navegador identificado";
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}

function resumirUserId(userId: string | null) {
  if (!userId) return null;
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

function resolverIdentificacaoUsuario(user?: RequireUserResult | null) {
  if (user?.name?.trim()) return user.name.trim();
  if (user?.email?.trim()) return user.email.trim();
  if (user?.id?.trim()) return resumirUserId(user.id.trim());
  return "Usuário não identificado";
}

function resumirDetalheTecnico(detail: string | null) {
  if (!detail) return null;
  if (detail.includes("causa_principal=oklch_nao_suportado") || detail.includes("oklch")) {
    return "html2canvas não suportou cor CSS oklch na área capturada.";
  }
  return detail;
}

function montarDescricaoFinal(tipo: SuporteTicketTipo | null, form: FormState) {
  if (!tipo) return form.descricao.trim();
  if (tipo === "ERRO_SISTEMA") return form.descricao.trim();

  return [
    form.descricao.trim(),
    form.oQueDeveriaAcontecer.trim()
      ? `O que deveria acontecer:\n${form.oQueDeveriaAcontecer.trim()}`
      : null,
    form.impactoPercebido.trim() ? `Impacto percebido:\n${form.impactoPercebido.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("falha_leitura_imagem"));
    reader.readAsDataURL(file);
  });
}

export function SuporteModal({ open, onClose, user }: SuporteModalProps) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("tipo");
  const [tipo, setTipo] = useState<SuporteTicketTipo | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureErrorDetail, setCaptureErrorDetail] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<TicketSuccessState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const contextoTela = coletarContextoTela({
    id: user?.id ?? null,
    email: user?.email ?? null,
    nome: user?.name ?? null,
  });
  const usuarioAtual = resolverIdentificacaoUsuario(user);

  useEffect(() => {
    if (!open) return;
    setEtapa("tipo");
    setTipo(null);
    setForm(DEFAULT_FORM);
    setScreenshotBlob(null);
    setScreenshotPreview(null);
    setCaptureError(null);
    setCaptureErrorDetail(null);
    setSuccessTicket(null);
    setErrorMessage(null);
  }, [open]);

  async function tentarCapturaAutomatica() {
    setCaptureError(null);
    setCaptureErrorDetail(null);
    const captured = await capturarScreenshot();
    if (!captured.ok || !captured.blob) {
      setScreenshotBlob(null);
      setScreenshotPreview(null);
      if (captured.error) {
        console.error(`[SuporteModal] Falha tecnica ao capturar screenshot: ${captured.error}`);
      }
      setCaptureError("Nao foi possivel capturar a tela agora. O ticket pode ser enviado sem print.");
      setCaptureErrorDetail(captured.error ?? "falha ao capturar tela");
      return;
    }

    setScreenshotBlob(captured.blob);
    setScreenshotPreview(captured.dataUrl);
    setCaptureErrorDetail(null);
  }

  function selecionarTipo(nextTipo: SuporteTicketTipo) {
    setTipo(nextTipo);
    setEtapa("formulario");
    setForm({
      ...DEFAULT_FORM,
      incluirScreenshot: nextTipo === "ERRO_SISTEMA",
    });

    if (nextTipo === "ERRO_SISTEMA") {
      void tentarCapturaAutomatica();
    } else {
      setScreenshotBlob(null);
      setScreenshotPreview(null);
      setCaptureError(null);
      setCaptureErrorDetail(null);
    }
  }

  async function onManualFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setScreenshotBlob(file);
    setScreenshotPreview(await fileToDataUrl(file));
    setCaptureError(null);
    setCaptureErrorDetail(null);
  }

  async function uploadScreenshotIfNeeded() {
    if (!form.incluirScreenshot || !screenshotBlob) return null;

    const formData = new FormData();
    formData.set("file", new File([screenshotBlob], `suporte-${Date.now()}.png`, { type: screenshotBlob.type || "image/png" }));

    const response = await fetch("/api/suporte/upload", {
      method: "POST",
      body: formData,
    });

    const json = (await response.json().catch(() => null)) as UploadResponse | null;
    if (!response.ok || !json?.ok) {
      throw new Error(json?.error ?? "falha_upload_screenshot");
    }

    return json.screenshot_url ?? null;
  }

  async function salvarTicket() {
    if (!tipo) {
      setErrorMessage("Selecione o tipo de chamado.");
      return;
    }

    if (!form.descricao.trim()) {
      setErrorMessage("Descreva o ocorrido antes de salvar.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessTicket(null);

    try {
      let screenshotUrl: string | null = null;
      try {
        screenshotUrl = await uploadScreenshotIfNeeded();
      } catch (error) {
        screenshotUrl = null;
        setCaptureError(
          error instanceof Error
            ? "Nao foi possivel anexar o print. O ticket foi enviado sem a imagem."
            : "Nao foi possivel anexar o print. O ticket foi enviado sem a imagem.",
        );
      }

      const descricao = montarDescricaoFinal(tipo, form);
      const response = await fetch("/api/suporte/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          prioridade: form.prioridadeCritica ? "CRITICA" : undefined,
          titulo: form.titulo,
          descricao,
          contexto_slug: contextoTela.contextoSlug,
          contexto_nome: contextoTela.contextoNome,
          rota_path: contextoTela.pathname,
          url_completa: contextoTela.href,
          pagina_titulo: contextoTela.pageTitle,
          screenshot_url: screenshotUrl,
          dados_contexto_json: {
            area_funcional: tipo === "ERRO_SISTEMA" ? form.areaFuncional || null : null,
            horario_captura: contextoTela.timestampIso,
            navegador_resumo: resumirNavegador(contextoTela.userAgent),
            usuario_id: contextoTela.usuario.id,
            usuario_email: contextoTela.usuario.email,
            usuario_nome: contextoTela.usuario.nome,
            sugestao_melhoria:
              tipo === "MELHORIA_SISTEMA"
                ? {
                    o_que_deveria_acontecer: form.oQueDeveriaAcontecer || null,
                    impacto_percebido: form.impactoPercebido || null,
                  }
                : null,
          },
          dados_tecnicos_json: {
            capture_error: captureError,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenshot_enviada: Boolean(screenshotUrl),
            ultimo_erro: contextoTela.lastError,
          },
          erro_mensagem: contextoTela.lastError?.message ?? null,
          erro_stack: contextoTela.lastError?.stack ?? null,
          erro_nome: contextoTela.lastError?.name ?? null,
          user_agent: contextoTela.userAgent,
          viewport_largura: contextoTela.viewport.largura,
          viewport_altura: contextoTela.viewport.altura,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; ticket?: { id?: number; codigo?: string | null }; error?: string }
        | null;

      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "falha_criar_ticket");
      }

      setSuccessTicket({
        id: json.ticket?.id ?? 0,
        codigo: json.ticket?.codigo ?? null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar chamado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      data-html2canvas-ignore="true"
      data-suporte-modal-overlay="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        data-html2canvas-ignore="true"
        data-suporte-modal-content="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-emerald-50 px-6 py-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              <LifeBuoy className="h-3.5 w-3.5" />
              Suporte ao Usuário
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {etapa === "tipo" ? "Como podemos ajudar?" : SUPORTE_TIPO_LABEL[tipo!]}
            </h2>
            <p className="text-sm text-slate-600">
              O sistema coleta o contexto técnico da tela automaticamente para agilizar a triagem.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Fechar suporte"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          {successTicket ? (
            <div className="mx-auto max-w-2xl rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-emerald-950">Ticket criado com sucesso</h3>
              <div className="mt-4 text-sm text-emerald-900">
                Codigo: <span className="font-semibold">{successTicket.codigo || `#${successTicket.id}`}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-emerald-900">
                Nossa equipe analisara o chamado.
                <br />
                Voce pode acompanhar o andamento no painel de suporte.
              </p>
            </div>
          ) : etapa === "tipo" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => selecionarTipo("ERRO_SISTEMA")}
                className="group rounded-[28px] border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-slate-900">Reportar erro do sistema</div>
                  <p className="text-sm leading-6 text-slate-600">
                    Use quando algo trava, falha, desaparece ou não funciona como deveria.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selecionarTipo("MELHORIA_SISTEMA")}
                className="group rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-slate-900">Sugerir melhoria do sistema</div>
                  <p className="text-sm leading-6 text-slate-600">
                    Use quando o fluxo atual funciona, mas pode ficar mais claro, rápido ou completo.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-5">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setEtapa("tipo");
                      setTipo(null);
                    }}
                    className="mb-3 text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Trocar tipo de chamado
                  </button>

                  <label className="mb-2 block text-sm font-medium text-slate-700">Título curto (opcional)</label>
                  <Input
                    value={form.titulo}
                    onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                    placeholder={tipo === "ERRO_SISTEMA" ? "Ex.: botão salvar não responde" : "Ex.: filtro por contexto no dashboard"}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {tipo === "ERRO_SISTEMA" ? "Descreva o problema" : "Descreva a melhoria"}
                  </label>
                  <Textarea
                    rows={7}
                    value={form.descricao}
                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    placeholder={
                      tipo === "ERRO_SISTEMA"
                        ? `O que aconteceu?
O que você esperava que acontecesse?
Se souber, como reproduzir o erro?`
                        : "Conte a ideia principal da melhoria."
                    }
                  />
                </div>

                {tipo === "ERRO_SISTEMA" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Onde aconteceu?</label>
                      <select
                        value={form.areaFuncional}
                        onChange={(event) => setForm((prev) => ({ ...prev, areaFuncional: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
                      >
                        <option value="">Selecione</option>
                        {AREA_FUNCIONAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      <input
                        type="checkbox"
                        checked={form.prioridadeCritica}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, prioridadeCritica: event.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-rose-300"
                      />
                        <span>
                        <span className="block font-semibold">Isto está impedindo o trabalho?</span>
                        <span className="mt-1 block text-rose-800/80">
                          Se marcar, o ticket será enviado com prioridade crítica.
                        </span>
                      </span>
                    </label>

                    {contextoTela.lastError ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="mb-1 text-sm font-semibold text-amber-900">Resumo do erro detectado</div>
                        <div className="text-sm text-amber-800">{contextoTela.lastError.message || "Sem mensagem adicional."}</div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">O que deveria acontecer</label>
                      <Textarea
                        rows={4}
                        value={form.oQueDeveriaAcontecer}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, oQueDeveriaAcontecer: event.target.value }))
                        }
                        placeholder="Descreva o comportamento ideal."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Impacto percebido</label>
                      <Textarea
                        rows={3}
                        value={form.impactoPercebido}
                        onChange={(event) => setForm((prev) => ({ ...prev, impactoPercebido: event.target.value }))}
                        placeholder="Explique o ganho esperado para a operação."
                      />
                    </div>
                  </>
                )}

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.incluirScreenshot}
                        onChange={async (event) => {
                          const checked = event.target.checked;
                          setForm((prev) => ({ ...prev, incluirScreenshot: checked }));
                          if (checked && !screenshotPreview) {
                            await tentarCapturaAutomatica();
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Incluir captura da tela
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void tentarCapturaAutomatica()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Capturar tela
                      </button>
                      <button
                        type="button"
                        onClick={() => inputFileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Enviar imagem do computador
                      </button>
                      <input
                        ref={inputFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onManualFileSelected}
                      />
                    </div>
                  </div>

                  {screenshotPreview ? (
                    <img
                      src={screenshotPreview}
                      alt="Preview da captura de tela"
                      className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                      A captura aparece aqui quando estiver disponível.
                    </div>
                  )}

                  {captureError ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-amber-700">{captureError}</p>
                      {process.env.NODE_ENV !== "production" && captureErrorDetail ? (
                        <p className="text-xs text-slate-500">
                          Detalhe técnico: {resumirDetalheTecnico(captureErrorDetail)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 text-sm font-semibold text-slate-900">Contexto detectado automaticamente</div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <Monitor className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">{contextoTela.contextoNome || "Contexto não identificado"}</div>
                        <div>{contextoTela.pageTitle || "Sem título de página"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Route className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div className="break-all">{contextoTela.pathname || "Rota não identificada"}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>{formatarDataHora(contextoTela.timestampIso)}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Camera className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>{resumirNavegador(contextoTela.userAgent)}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>Usuário: {usuarioAtual}</div>
                    </div>
                  </div>
                </div>

                {tipo === "ERRO_SISTEMA" && contextoTela.lastError ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                    <div className="mb-2 text-sm font-semibold text-rose-900">Último erro em memória</div>
                    <div className="text-sm text-rose-800">{contextoTela.lastError.message || "Sem mensagem."}</div>
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-5">
          {successTicket ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/suporte-usuario/ticket/${successTicket.id}`);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Ver ticket
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}

          {etapa === "formulario" && !successTicket ? (
            <button
              type="button"
              onClick={() => void salvarTicket()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Enviando..." : "Enviar ticket"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
