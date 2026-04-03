export type ScreenshotCaptureResult = {
  ok: boolean;
  blob: Blob | null;
  dataUrl: string | null;
  error: string | null;
};

type ExtendedDisplayMediaTrackConstraints = MediaTrackConstraints & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // ignora falha ao encerrar track
    }
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

function mapCaptureError(error: unknown) {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "AbortError":
      case "NotAllowedError":
        return "Captura cancelada ou permissao negada. Voce pode colar um print ou selecionar imagens.";
      case "NotFoundError":
        return "Nenhuma tela ou aba foi disponibilizada para captura.";
      case "NotReadableError":
        return "A captura nativa nao conseguiu ler a tela selecionada. Tente novamente ou use Ctrl+V.";
      case "NotSupportedError":
        return "Seu navegador nao suporta captura nativa de tela neste fluxo.";
      default:
        return error.message || "Falha ao capturar tela.";
    }
  }

  if (error instanceof Error) {
    return error.message || "Falha ao capturar tela.";
  }

  return "Falha ao capturar tela.";
}

function buildDisplayMediaOptions(): DisplayMediaStreamOptions {
  const video: ExtendedDisplayMediaTrackConstraints = {
    frameRate: { ideal: 1, max: 1 },
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "include",
  };

  return {
    video,
    audio: false,
  };
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
    };

    video.onloadedmetadata = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("falha_ao_carregar_stream_de_captura"));
    };
  });
}

export async function capturarScreenshot(): Promise<ScreenshotCaptureResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      blob: null,
      dataUrl: null,
      error: "captura_indisponivel_no_servidor",
    };
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    return {
      ok: false,
      blob: null,
      dataUrl: null,
      error: "Seu navegador nao suporta captura nativa de tela neste fluxo.",
    };
  }

  let stream: MediaStream | null = null;
  const video = document.createElement("video");

  try {
    stream = await navigator.mediaDevices.getDisplayMedia(buildDisplayMediaOptions());
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await waitForVideoReady(video);
    await video.play();
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      throw new Error("A captura nativa retornou dimensoes invalidas.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Nao foi possivel inicializar o canvas para a captura.");
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      throw new Error("Nao foi possivel gerar a imagem capturada.");
    }

    return {
      ok: true,
      blob,
      dataUrl: null,
      error: null,
    };
  } catch (error) {
    const message = mapCaptureError(error);
    console.warn(`[SuporteScreenshot] Captura nativa falhou: ${message}`);
    return {
      ok: false,
      blob: null,
      dataUrl: null,
      error: message,
    };
  } finally {
    try {
      video.pause();
      video.srcObject = null;
    } catch {
      // ignora erro ao soltar video
    }
    stopStream(stream);
  }
}

