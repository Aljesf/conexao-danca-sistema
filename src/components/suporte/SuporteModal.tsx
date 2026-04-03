"use client";

import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  LoaderCircle,
  Monitor,
  Paperclip,
  RefreshCcw,
  Route,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RequireUserResult } from "@/lib/auth/requireUser";
import { capturarScreenshot } from "@/lib/suporte/capturarScreenshot";
import { extractClipboardImageFiles } from "@/lib/suporte/clipboard-images";
import {
  SUPORTE_ANALISE_IA_STATUS_LABEL,
  SUPORTE_ANALISE_IA_MODO_LABEL,
  SUPORTE_TIPO_LABEL,
  type SuporteAnaliseIaModo,
  type SuporteTicketTipo,
  type SuporteUploadOrigem,
} from "@/lib/suporte/constants";
import { buildSupportScreenContext } from "@/lib/suporte/screen-context";

type SuporteModalProps = {
  open: boolean;
  onClose: () => void;
  user?: RequireUserResult | null;
};

type FormState = {
  titulo: string;
  descricao: string;
  oQueDeveriaAcontecer: string;
  impactoPercebido: string;
  areaFuncional: string;
  prioridadeCritica: boolean;
};

type PendingAttachment = {
  clientId: string;
  file: File;
  source: Exclude<SuporteUploadOrigem, "legacy">;
  previewUrl: string;
  fingerprint: string;
  width: number | null;
  height: number | null;
};

type TicketResponse = {
  ok?: boolean;
  ticket?: {
    id?: number;
    codigo?: string | null;
    analise_ia_solicitada?: boolean;
    analise_ia_status?: string | null;
    analise_ia_modo?: SuporteAnaliseIaModo | null;
  };
  upload_summary?: {
    saved_count?: number;
    failed_count?: number;
    failed_items?: Array<{
      nome_arquivo?: string;
      failureReason?: string;
      error?: string;
      stage?: string;
    }>;
  };
  error?: string;
};

type TicketSuccess = {
  id: number;
  codigo: string | null;
  savedCount: number;
  failedCount: number;
  failedItems: Array<{ nome: string; motivo: string }>;
  analysisRequested: boolean;
  analysisStatus: string | null;
  analysisMode: SuporteAnaliseIaModo | null;
};

const DEFAULT_FORM: FormState = {
  titulo: "",
  descricao: "",
  oQueDeveriaAcontecer: "",
  impactoPercebido: "",
  areaFuncional: "",
  prioridadeCritica: false,
};

const AREA_FUNCIONAL_OPTIONS = ["Matricula", "Financeiro", "Loja", "Cafe", "Administracao", "Outro"] as const;
const MAX_ATTACHMENT_COUNT = 6;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function resumirNavegador(userAgent: string | null) {
  if (!userAgent) return "Navegador nao identificado";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
  return "Navegador identificado";
}

function montarDescricaoFinal(tipo: SuporteTicketTipo | null, form: FormState) {
  if (!tipo || tipo === "ERRO_SISTEMA") return form.descricao.trim();

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

function buildClientId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `support-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildAttachmentFingerprint(file: File) {
  return [file.name, file.type, file.size, file.lastModified].join("|");
}

function formatarBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function buildAutoCaptureFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    "print",
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
    "001",
  ].join("-") + ".png";
}

async function readImageDimensions(previewUrl: string) {
  try {
    if (typeof window === "undefined" || !previewUrl) {
      return { width: null, height: null };
    }

    return await new Promise<{ width: number | null; height: number | null }>((resolve) => {
      const image = new window.Image();

      const finalize = (width: number | null, height: number | null) => {
        image.onload = null;
        image.onerror = null;
        resolve({ width, height });
      };

      image.onload = () => finalize(image.naturalWidth || null, image.naturalHeight || null);
      image.onerror = () => finalize(null, null);
      image.src = previewUrl;
    });
  } catch {
    return { width: null, height: null };
  }
}

async function toPendingAttachment(
  file: File,
  source: Exclude<SuporteUploadOrigem, "legacy">,
): Promise<PendingAttachment> {
  const previewUrl = URL.createObjectURL(file);
  const dimensions = await readImageDimensions(previewUrl);
  return {
    clientId: buildClientId(),
    file,
    source,
    previewUrl,
    fingerprint: buildAttachmentFingerprint(file),
    width: dimensions.width,
    height: dimensions.height,
  };
}

function revokePreviews(items: PendingAttachment[]) {
  items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

export function SuporteModal({ open, onClose, user }: SuporteModalProps) {
  const router = useRouter();
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<PendingAttachment[]>([]);

  const [tipo, setTipo] = useState<SuporteTicketTipo | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<TicketSuccess | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [solicitarAnaliseIA, setSolicitarAnaliseIA] = useState(false);
  const [modoAnaliseIA, setModoAnaliseIA] = useState<SuporteAnaliseIaModo>("contextual");

  const contextoTela = useMemo(
    () =>
      buildSupportScreenContext({
        id: user?.id ?? null,
        email: user?.email ?? null,
        nome: user?.name ?? null,
      }),
    [user?.email, user?.id, user?.name],
  );

  useEffect(() => {
    if (!open) return;
    setTipo(null);
    setForm(DEFAULT_FORM);
    setDragActive(false);
    setCaptureError(null);
    setAttachmentError(null);
    setErrorMessage(null);
    setSuccess(null);
    setCapturing(false);
    setSolicitarAnaliseIA(false);
    setModoAnaliseIA("contextual");
    setAttachments((current) => {
      revokePreviews(current);
      return [];
    });
  }, [open]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      revokePreviews(attachmentsRef.current);
    };
  }, []);

  async function addFiles(entries: Array<{ file: File; source: Exclude<SuporteUploadOrigem, "legacy"> }>) {
    if (!entries.length) return;

    const prepared: PendingAttachment[] = [];
    let skippedDuplicates = 0;
    let nextError: string | null = null;

    for (const entry of entries) {
      if (!ALLOWED_ATTACHMENT_TYPES.has(entry.file.type)) {
        nextError = "Formatos permitidos: PNG, JPG/JPEG e WEBP.";
        continue;
      }

      if (entry.file.size <= 0 || entry.file.size > MAX_ATTACHMENT_BYTES) {
        nextError = "Cada imagem pode ter no maximo 8 MB.";
        continue;
      }

      const pending = await toPendingAttachment(entry.file, entry.source);
      const duplicate =
        attachments.some((item) => item.fingerprint === pending.fingerprint) ||
        prepared.some((item) => item.fingerprint === pending.fingerprint);

      if (duplicate) {
        skippedDuplicates += 1;
        URL.revokeObjectURL(pending.previewUrl);
        continue;
      }

      prepared.push(pending);
    }

    setAttachments((current) => {
      const available = Math.max(0, MAX_ATTACHMENT_COUNT - current.length);
      const accepted = prepared.slice(0, available);
      const rejected = prepared.slice(available);
      if (rejected.length) revokePreviews(rejected);
      return [...current, ...accepted];
    });

    if (prepared.length + attachments.length > MAX_ATTACHMENT_COUNT) {
      nextError = `Voce pode anexar ate ${MAX_ATTACHMENT_COUNT} imagens por atendimento.`;
    } else if (skippedDuplicates > 0) {
      nextError = "Os anexos repetidos foram ignorados.";
    }

    setAttachmentError(nextError);
  }

  function removeAttachment(clientId: string) {
    setAttachments((current) => {
      const next: PendingAttachment[] = [];
      current.forEach((item) => {
        if (item.clientId === clientId) {
          URL.revokeObjectURL(item.previewUrl);
          return;
        }
        next.push(item);
      });
      return next;
    });
  }

  async function capturarAutomaticamente() {
    setCaptureError(null);
    setCapturing(true);

    try {
      const captured = await capturarScreenshot();
      if (!captured.ok || !captured.blob) {
        setCaptureError(
          captured.error ??
            "Nao foi possivel capturar a tela agora. Voce ainda pode colar ou selecionar imagens.",
        );
        return;
      }

      const file = new File([captured.blob], buildAutoCaptureFileName(), {
        type: captured.blob.type || "image/png",
        lastModified: Date.now(),
      });
      await addFiles([{ file, source: "auto_capture" }]);
    } catch {
      setCaptureError("Nao foi possivel capturar a tela agora. Voce ainda pode colar ou selecionar imagens.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    await addFiles(files.map((file) => ({ file, source: "file_picker" as const })));
    event.target.value = "";
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const pasted = await extractClipboardImageFiles(event.clipboardData);
    if (!pasted.length) return;
    event.preventDefault();
    await addFiles(pasted.map((entry) => ({ file: entry.file, source: entry.origin })));
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    await addFiles(files.map((file) => ({ file, source: "drag_drop" as const })));
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
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("tipo", tipo);
      formData.set("titulo", form.titulo);
      formData.set("descricao", montarDescricaoFinal(tipo, form));
      formData.set("solicitarAnaliseIA", solicitarAnaliseIA ? "true" : "false");
      if (solicitarAnaliseIA) {
        formData.set("modoAnaliseIA", modoAnaliseIA);
      }
      formData.set("contexto_slug", contextoTela.contextoSlug ?? "");
      formData.set("contexto_nome", contextoTela.contextoNome ?? "");
      formData.set("rota_path", contextoTela.pathname ?? "");
      formData.set("url_completa", contextoTela.href ?? "");
      formData.set("pagina_titulo", contextoTela.pageTitle ?? "");
      if (form.prioridadeCritica) formData.set("prioridade", "CRITICA");

      formData.set(
        "dados_contexto_json",
        JSON.stringify({
          area_funcional: tipo === "ERRO_SISTEMA" ? form.areaFuncional || null : null,
          usuario_id: contextoTela.usuario.id,
          usuario_email: contextoTela.usuario.email,
          usuario_nome: contextoTela.usuario.nome,
          entity_type: contextoTela.entityType,
          entity_id: contextoTela.entityId,
          entity_label: contextoTela.entityLabel,
          aluno_nome: contextoTela.alunoNome,
          responsavel_nome: contextoTela.responsavelNome,
          turma_nome: contextoTela.turmaNome,
          resumo_legivel_tela: contextoTela.resumoLegivel,
          sugestao_melhoria:
            tipo === "MELHORIA_SISTEMA"
              ? {
                  o_que_deveria_acontecer: form.oQueDeveriaAcontecer || null,
                  impacto_percebido: form.impactoPercebido || null,
                }
              : null,
        }),
      );

      formData.set(
        "dados_tecnicos_json",
        JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          navegador_resumo: resumirNavegador(contextoTela.userAgent),
          attachments_enviados: attachments.length,
          capture_error: captureError,
          ultimo_erro: contextoTela.lastError,
        }),
      );

      formData.set("screen_context", JSON.stringify(contextoTela));
      formData.set("erro_mensagem", contextoTela.lastError?.message ?? "");
      formData.set("erro_stack", contextoTela.lastError?.stack ?? "");
      formData.set("erro_nome", contextoTela.lastError?.name ?? "");
      formData.set("user_agent", contextoTela.userAgent ?? "");
      formData.set("viewport_largura", String(contextoTela.viewport.largura ?? ""));
      formData.set("viewport_altura", String(contextoTela.viewport.altura ?? ""));
      formData.set(
        "attachments_manifest",
        JSON.stringify(
          attachments.map((attachment) => ({
            clientId: attachment.clientId,
            source: attachment.source,
            width: attachment.width,
            height: attachment.height,
            fingerprint: attachment.fingerprint,
            originalName: attachment.file.name,
            lastModified: attachment.file.lastModified,
          })),
        ),
      );

      attachments.forEach((attachment, index) => {
        formData.append("files", attachment.file, attachment.file.name);
        formData.set(`file_client_id_${index}`, attachment.clientId);
      });

      const response = await fetch("/api/suporte/tickets", { method: "POST", body: formData });
      const json = (await response.json().catch(() => null)) as TicketResponse | null;
      if (!response.ok || !json?.ok || !json.ticket) {
        throw new Error(json?.error ?? "falha_criar_ticket");
      }

      setSuccess({
        id: json.ticket.id ?? 0,
        codigo: json.ticket.codigo ?? null,
        savedCount: json.upload_summary?.saved_count ?? 0,
        failedCount: json.upload_summary?.failed_count ?? 0,
        failedItems: (json.upload_summary?.failed_items ?? []).map((item) => ({
          nome: item.nome_arquivo ?? "anexo",
          motivo: item.failureReason ?? item.error ?? "falha ao salvar anexo",
        })),
        analysisRequested: Boolean(json.ticket.analise_ia_solicitada),
        analysisStatus: json.ticket.analise_ia_status ?? null,
        analysisMode: json.ticket.analise_ia_modo ?? null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar chamado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const usuarioAtual =
    user?.name?.trim() || user?.email?.trim() || (user?.id?.trim() ? user.id.trim() : "Usuario nao identificado");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" data-html2canvas-ignore="true">
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        data-html2canvas-ignore="true"
        onPasteCapture={(event) => void handlePaste(event)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-emerald-50 px-6 py-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              <LifeBuoy className="h-3.5 w-3.5" />
              Suporte ao Usuario
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {tipo ? SUPORTE_TIPO_LABEL[tipo] : "Como podemos ajudar?"}
            </h2>
            <p className="text-sm text-slate-600">
              Cole prints com Ctrl+V, arraste imagens ou selecione arquivos. O contexto legivel da tela vai junto no chamado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Fechar suporte"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6">
          {success ? (
            <div className="mx-auto max-w-2xl rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-emerald-950">Ticket criado com sucesso</h3>
              <div className="mt-3 text-sm text-emerald-900">
                Codigo: <span className="font-semibold">{success.codigo || `#${success.id}`}</span>
              </div>
              <p className="mt-4 text-sm text-emerald-900">
                {success.analysisRequested
                  ? "Ticket criado. Analise de IA solicitada."
                  : "Ticket criado sem analise de IA."}
              </p>
              {success.analysisRequested && success.analysisMode ? (
                <p className="mt-2 text-sm text-emerald-900">
                  Modo solicitado: {SUPORTE_ANALISE_IA_MODO_LABEL[success.analysisMode]}.
                </p>
              ) : null}
              {success.analysisRequested && success.analysisStatus ? (
                <p className="mt-2 text-sm text-emerald-900">
                  Status inicial:{" "}
                  {SUPORTE_ANALISE_IA_STATUS_LABEL[
                    success.analysisStatus as keyof typeof SUPORTE_ANALISE_IA_STATUS_LABEL
                  ] ?? success.analysisStatus}
                  .
                </p>
              ) : null}
              <p className="mt-4 text-sm text-emerald-900">
                {success.savedCount} anexo(s) salvos.
                {success.failedCount > 0 ? ` ${success.failedCount} falharam.` : ""}
              </p>
              {success.failedCount > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                  <div className="space-y-2">
                    {success.failedItems.map((item) => (
                      <div key={`${item.nome}-${item.motivo}`}>
                        {item.nome}: {item.motivo}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : !tipo ? (
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTipo("ERRO_SISTEMA");
                }}
                className="rounded-[28px] border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 text-left hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="text-xl font-semibold text-slate-900">Reportar erro do sistema</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use quando algo trava ou nao funciona como deveria.</p>
              </button>
              <button
                type="button"
                onClick={() => setTipo("MELHORIA_SISTEMA")}
                className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 text-left hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="text-xl font-semibold text-slate-900">Sugerir melhoria do sistema</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use quando o fluxo atual funciona, mas pode ficar melhor.</p>
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="space-y-5">
                <button type="button" onClick={() => setTipo(null)} className="text-sm font-medium text-teal-700 hover:text-teal-800">
                  Trocar tipo de chamado
                </button>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Titulo curto (opcional)</label>
                  <Input value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {tipo === "ERRO_SISTEMA" ? "Descreva o problema" : "Descreva a melhoria"}
                  </label>
                  <Textarea rows={7} value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} />
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
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      <input
                        type="checkbox"
                        checked={form.prioridadeCritica}
                        onChange={(event) => setForm((prev) => ({ ...prev, prioridadeCritica: event.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-rose-300"
                      />
                      <span>
                        <span className="block font-semibold">Isto esta impedindo o trabalho?</span>
                        <span className="mt-1 block text-rose-800/80">Se marcar, o ticket sera enviado com prioridade critica.</span>
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">O que deveria acontecer</label>
                      <Textarea rows={4} value={form.oQueDeveriaAcontecer} onChange={(event) => setForm((prev) => ({ ...prev, oQueDeveriaAcontecer: event.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Impacto percebido</label>
                      <Textarea rows={3} value={form.impactoPercebido} onChange={(event) => setForm((prev) => ({ ...prev, impactoPercebido: event.target.value }))} />
                    </div>
                  </>
                )}
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-slate-900">Analise de IA</div>
                  <div className="mt-3">
                    <label className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      <input
                        type="checkbox"
                        checked={solicitarAnaliseIA}
                        onChange={(event) => setSolicitarAnaliseIA(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-sky-300"
                      />
                      <span>
                        <span className="block font-semibold">Solicitar analise de IA deste problema</span>
                        <span className="mt-1 block text-sky-800/80">
                          A IA fara uma leitura diagnostica do problema. Ela nao corrige automaticamente e o ticket continua sendo criado normalmente.
                        </span>
                      </span>
                    </label>
                  </div>
                  {solicitarAnaliseIA ? (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Modo da analise</label>
                      <select
                        value={modoAnaliseIA}
                        onChange={(event) => setModoAnaliseIA(event.target.value as SuporteAnaliseIaModo)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
                      >
                        <option value="contextual">{SUPORTE_ANALISE_IA_MODO_LABEL.contextual}</option>
                        <option value="aprofundada">{SUPORTE_ANALISE_IA_MODO_LABEL.aprofundada}</option>
                      </select>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Imagens do atendimento</div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void capturarAutomaticamente()} disabled={capturing} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                        <RefreshCcw className="h-3.5 w-3.5" />
                        {capturing ? "Capturando..." : "Capturar tela"}
                      </button>
                      <button type="button" onClick={() => inputFileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Paperclip className="h-3.5 w-3.5" />
                        Selecionar imagens
                      </button>
                      <input ref={inputFileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => void handleFileSelect(event)} />
                    </div>
                  </div>
                  <div
                    className={`rounded-3xl border border-dashed bg-white p-4 transition ${dragActive ? "border-teal-400 bg-teal-50/50" : "border-slate-300"}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(event) => void handleDrop(event)}
                  >
                    {attachments.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {attachments.map((attachment) => (
                          <div key={attachment.clientId} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="relative h-32 bg-slate-100">
                              <NextImage
                                src={attachment.previewUrl}
                                alt={attachment.file.name}
                                fill
                                unoptimized
                                sizes="(min-width: 1280px) 20rem, (min-width: 640px) 14rem, 100vw"
                                className="object-cover"
                              />
                              <button type="button" onClick={() => removeAttachment(attachment.clientId)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-1 px-3 py-3 text-xs text-slate-600">
                              <div className="truncate font-semibold text-slate-900">{attachment.file.name}</div>
                              <div>{formatarBytes(attachment.file.size)}</div>
                              <div>{attachment.width && attachment.height ? `${attachment.width} x ${attachment.height}` : "Dimensoes nao identificadas"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                        <Upload className="h-8 w-8 text-slate-400" />
                        <div>Use Capturar tela, Ctrl+V, arraste imagens ou selecione arquivos manualmente.</div>
                      </div>
                    )}
                  </div>
                  {attachmentError ? <p className="mt-3 text-sm text-amber-700">{attachmentError}</p> : null}
                  {captureError ? <p className="mt-3 text-sm text-amber-700">{captureError}</p> : null}
                </div>
              </div>
              <aside className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Contexto detectado automaticamente</div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <Monitor className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">{contextoTela.contextoNome || "Contexto nao identificado"}</div>
                        <div>{contextoTela.pageTitle || "Sem titulo de pagina"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Route className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div className="break-all">{contextoTela.pathname || "Rota nao identificada"}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>{usuarioAtual}</div>
                    </div>
                    {contextoTela.resumoLegivel ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{contextoTela.resumoLegivel}</div> : null}
                  </div>
                </div>
                {errorMessage ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</div> : null}
              </aside>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-5">
          {success ? (
            <>
              <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/suporte-usuario/ticket/${success.id}`);
                  onClose();
                }}
                className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Ver ticket
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              {tipo ? (
                <button type="button" onClick={() => void salvarTicket()} disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Enviando..." : "Enviar ticket"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
