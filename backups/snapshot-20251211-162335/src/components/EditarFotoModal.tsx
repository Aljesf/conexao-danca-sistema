"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  pessoaId: number;
  onUploaded: (url: string) => void;
};

export default function EditarFotoModal({
  open,
  onClose,
  pessoaId,
  onUploaded,
}: Props) {
  const [tab, setTab] = useState<"upload" | "camera">("upload");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Liga / desliga a câmera quando abre o modal ou troca de aba
  useEffect(() => {
    async function startCamera() {
      if (!open || tab !== "camera") return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro("Seu navegador não suporta acesso à câmera.");
        return;
      }

      try {
        setErro(null);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error(e);
        setErro(
          "Não foi possível acessar a câmera. Verifique se o navegador tem permissão."
        );
      }
    }

    startCamera();

    // Ao sair do modal ou trocar de aba, desligar câmera
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, tab]);

  async function enviarArquivo(file: File) {
    try {
      setLoading(true);
      setErro(null);

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/pessoas/${pessoaId}/foto`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        throw new Error(json.error || "Erro ao enviar a foto.");
      }

      onUploaded(json.url);
      onClose();
    } catch (e: any) {
      console.error(e);
      setErro(e?.message || "Erro ao enviar a foto.");
    } finally {
      setLoading(false);
    }
  }

  async function capturarDaCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // garante que o vídeo já carregou
    if (video.readyState < 2) {
      setErro("Aguarde a câmera iniciar antes de tirar a foto.");
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setErro("Não foi possível capturar a imagem.");
        return;
      }
      const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
      await enviarArquivo(file);
    }, "image/jpeg");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[360px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Alterar foto</h2>

        {/* Abas */}
        <div className="mt-4 mb-4 flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-sm ${
              tab === "upload"
                ? "bg-violet-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setTab("upload")}
          >
            Upload
          </button>

          <button
            className={`px-3 py-1.5 rounded-full text-sm ${
              tab === "camera"
                ? "bg-violet-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setTab("camera")}
          >
            Webcam
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {erro}
          </div>
        )}

        {/* Conteúdo das abas */}
        {tab === "upload" && (
          <div className="space-y-2 text-sm">
            <p className="text-slate-600">
              Selecione um arquivo de imagem para usar como foto.
            </p>
            <input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) enviarArquivo(file);
              }}
            />
          </div>
        )}

        {tab === "camera" && (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              className="w-full rounded-lg bg-black/80"
            />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={capturarDaCamera}
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-70"
            >
              {loading ? "Enviando..." : "Tirar foto"}
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 underline"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
