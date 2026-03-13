export type ScreenshotCaptureResult = {
  ok: boolean;
  blob: Blob | null;
  dataUrl: string | null;
  error: string | null;
};

type CaptureAttempt = {
  name: string;
  selectors: string[];
};

type TargetDimensions = {
  width: number;
  height: number;
};

type PotentialIssues = {
  totalImages: number;
  externalImages: string[];
  totalSvg: number;
  externalBackgrounds: string[];
  totalIframes: number;
  totalCanvas: number;
  totalWithFilters: number;
  totalWithOklch: number;
  oklchExamples: string[];
};

type FailureDetail = {
  stage: "select" | "render" | "export";
  attempt: string;
  selector: string;
  element: string;
  dimensions: TargetDimensions;
  errorName: string;
  errorMessage: string;
  errorStack: string | null;
  issues: PotentialIssues;
};

type SanitizableProperty = {
  cssName: string;
  fallback: string;
};

const CAPTURE_ATTEMPTS: CaptureAttempt[] = [
  {
    name: "tentativa_1_root_conteudo",
    selectors: [
      '[data-app-capture-root="true"] > *:not([data-html2canvas-ignore="true"])',
      '[data-app-capture-root="true"]',
      '[data-main-content="true"] > *:not([data-html2canvas-ignore="true"])',
      '[data-main-content="true"]',
    ],
  },
  { name: "tentativa_2_wrapper_interno", selectors: ["main", "#__next"] },
  { name: "tentativa_3_fallback_absoluto", selectors: ["body"] },
];

const IGNORE_SELECTORS = [
  '[data-html2canvas-ignore="true"]',
  '[data-suporte-modal-overlay="true"]',
  '[data-suporte-modal-content="true"]',
  '[data-suporte-fab="true"]',
].join(",");

const SANITIZABLE_COLOR_PROPERTIES: SanitizableProperty[] = [
  { cssName: "color", fallback: "#000000" },
  { cssName: "background", fallback: "#ffffff" },
  { cssName: "background-color", fallback: "#ffffff" },
  { cssName: "border-color", fallback: "#000000" },
  { cssName: "outline-color", fallback: "#000000" },
  { cssName: "box-shadow", fallback: "none" },
  { cssName: "text-decoration-color", fallback: "#000000" },
  { cssName: "fill", fallback: "#000000" },
  { cssName: "stroke", fallback: "#000000" },
];

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

function createEmptyIssues(): PotentialIssues {
  return {
    totalImages: 0,
    externalImages: [],
    totalSvg: 0,
    externalBackgrounds: [],
    totalIframes: 0,
    totalCanvas: 0,
    totalWithFilters: 0,
    totalWithOklch: 0,
    oklchExamples: [],
  };
}

function describeElement(element: HTMLElement | null) {
  if (!element) return "elemento_nao_encontrado";

  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string"
      ? element.className
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4)
          .map((item) => `.${item}`)
          .join("")
      : "";

  return `${element.tagName.toLowerCase()}${id}${className}`;
}

function getElementDimensions(element: HTMLElement | null): TargetDimensions {
  if (!element) return { width: 0, height: 0 };
  return {
    width: element.clientWidth,
    height: element.clientHeight,
  };
}

function hasValidDimensions(element: HTMLElement) {
  const { width, height } = getElementDimensions(element);
  return width > 0 && height > 0;
}

function summarizeStack(stack: string | null) {
  if (!stack) return null;
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");
}

function isExternalUrl(url: string) {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function collectBackgroundUrls(styleValue: string) {
  const matches = [...styleValue.matchAll(/url\((['"]?)(.*?)\1\)/gi)];
  return matches.map((match) => match[2]).filter(Boolean);
}

function includesOklch(value: string | null | undefined) {
  return typeof value === "string" && value.toLowerCase().includes("oklch(");
}

function inspectPotentialIssues(target: HTMLElement): PotentialIssues {
  const images = Array.from(target.querySelectorAll("img"));
  const externalImages = images
    .map((image) => image.currentSrc || image.getAttribute("src") || "")
    .filter(Boolean)
    .filter((src) => isExternalUrl(src))
    .slice(0, 8);

  const svgImages = target.querySelectorAll("svg").length;
  const iframes = target.querySelectorAll("iframe").length;
  const canvases = target.querySelectorAll("canvas").length;

  const backgroundUrls = Array.from(target.querySelectorAll<HTMLElement>("*"))
    .flatMap((node) => collectBackgroundUrls(window.getComputedStyle(node).backgroundImage))
    .filter((url) => isExternalUrl(url))
    .slice(0, 8);

  const filteredNodes = Array.from(target.querySelectorAll<HTMLElement>("*")).filter((node) => {
    const style = window.getComputedStyle(node);
    return style.filter !== "none" || style.backdropFilter !== "none";
  });

  const oklchExamples: string[] = [];
  const oklchNodes = Array.from(target.querySelectorAll<HTMLElement>("*")).filter((node) => {
    const style = window.getComputedStyle(node);
    return SANITIZABLE_COLOR_PROPERTIES.some((property) => {
      const computedValue = style.getPropertyValue(property.cssName);
      if (!includesOklch(computedValue)) return false;
      if (oklchExamples.length < 8) {
        oklchExamples.push(`${describeElement(node)}:${property.cssName}=${computedValue.trim()}`);
      }
      return true;
    });
  });

  return {
    totalImages: images.length,
    externalImages,
    totalSvg: svgImages,
    externalBackgrounds: backgroundUrls,
    totalIframes: iframes,
    totalCanvas: canvases,
    totalWithFilters: filteredNodes.length,
    totalWithOklch: oklchNodes.length,
    oklchExamples,
  };
}

function inferPrimaryCauseCode(detail: FailureDetail) {
  const lowerMessage = detail.errorMessage.toLowerCase();
  if (lowerMessage.includes("oklch") || detail.issues.totalWithOklch > 0) return "oklch_nao_suportado";
  if (lowerMessage.includes("taint")) return "canvas_contaminado";
  if (lowerMessage.includes("clone")) return "clone_dom_falhou";
  if (lowerMessage.includes("width") || lowerMessage.includes("height") || lowerMessage.includes("dimension")) {
    return "alvo_sem_dimensoes";
  }
  if (
    (lowerMessage.includes("load") || lowerMessage.includes("fetch")) &&
    (detail.issues.externalImages.length > 0 || detail.issues.externalBackgrounds.length > 0)
  ) {
    return "recurso_externo_falhou";
  }
  if (detail.stage === "export") return "exportacao_falhou";
  return "falha_nao_classificada";
}

function inferPrimaryCauseText(detail: FailureDetail) {
  switch (inferPrimaryCauseCode(detail)) {
    case "oklch_nao_suportado":
      return "html2canvas nao suporta cor CSS oklch no subtree capturado";
    case "canvas_contaminado":
      return "canvas contaminado por recurso externo";
    case "clone_dom_falhou":
      return "clone do DOM falhou";
    case "alvo_sem_dimensoes":
      return "elemento alvo sem dimensoes validas";
    case "recurso_externo_falhou":
      return "recurso externo falhou ao carregar no clone do DOM";
    case "exportacao_falhou":
      return "canvas foi gerado, mas a exportacao da imagem falhou";
    default:
      return "falha nao classificada na captura";
  }
}

function formatSecondarySuspects(issues: PotentialIssues) {
  return [
    `img=${issues.totalImages}`,
    `img_externas=${issues.externalImages.length}`,
    `svg=${issues.totalSvg}`,
    `bg_externos=${issues.externalBackgrounds.length}`,
    `iframe=${issues.totalIframes}`,
    `canvas=${issues.totalCanvas}`,
    `filters=${issues.totalWithFilters}`,
    `oklch=${issues.totalWithOklch}`,
  ].join(", ");
}

function formatFailureSummary(detail: FailureDetail) {
  const stackSummary = summarizeStack(detail.errorStack);
  const parts = [
    `causa_principal=${inferPrimaryCauseCode(detail)}`,
    `causa_texto=${inferPrimaryCauseText(detail)}`,
    `tentativa=${detail.attempt}`,
    `seletor=${detail.selector}`,
    `alvo=${detail.element}`,
    `dimensoes=${detail.dimensions.width}x${detail.dimensions.height}`,
    `stage=${detail.stage}`,
    `erro=${detail.errorName}: ${detail.errorMessage}`,
    `suspeitos_secundarios=${formatSecondarySuspects(detail.issues)}`,
  ];

  if (detail.issues.externalImages.length > 0) {
    parts.push(`imgs_externas=${detail.issues.externalImages.join(", ")}`);
  }
  if (detail.issues.externalBackgrounds.length > 0) {
    parts.push(`bg_externos=${detail.issues.externalBackgrounds.join(", ")}`);
  }
  if (detail.issues.oklchExamples.length > 0) {
    parts.push(`oklch_detectado=${detail.issues.oklchExamples.join(" ; ")}`);
  }
  if (stackSummary) {
    parts.push(`stack=${stackSummary}`);
  }

  return parts.join(" | ");
}

function buildFailureDetail(params: {
  stage: FailureDetail["stage"];
  attempt: string;
  selector: string;
  element: HTMLElement | null;
  error: unknown;
  issues: PotentialIssues;
}): FailureDetail {
  const { stage, attempt, selector, element, error, issues } = params;
  const dimensions = getElementDimensions(element);

  return {
    stage,
    attempt,
    selector,
    element: describeElement(element),
    dimensions,
    errorName: error instanceof Error ? error.name || "Error" : "UnknownError",
    errorMessage:
      error instanceof Error
        ? error.message || "falha ao capturar tela"
        : typeof error === "string"
          ? error
          : "falha ao capturar tela",
    errorStack: error instanceof Error ? error.stack ?? null : null,
    issues,
  };
}

function logCaptureFailure(detail: FailureDetail) {
  const summary = formatFailureSummary(detail);
  console.error(`[SuporteScreenshot] Falha na captura: ${inferPrimaryCauseText(detail)}. ${summary}`);
}

function logCaptureTarget(attempt: string, selector: string, element: HTMLElement, issues: PotentialIssues) {
  const { width, height } = getElementDimensions(element);
  console.info(
    `[SuporteScreenshot] Tentando captura | tentativa=${attempt} | seletor=${selector} | alvo=${describeElement(element)} | dimensoes=${width}x${height} | suspeitos=${formatSecondarySuspects(issues)}`,
  );
}

function sanitizeCloneForOklch(clonedTarget: HTMLElement, clonedWindow: Window) {
  const nodes = [clonedTarget, ...Array.from(clonedTarget.querySelectorAll<HTMLElement>("*"))];

  nodes.forEach((node) => {
    const computed = clonedWindow.getComputedStyle(node);

    SANITIZABLE_COLOR_PROPERTIES.forEach((property) => {
      const computedValue = computed.getPropertyValue(property.cssName);
      const inlineValue = node.style.getPropertyValue(property.cssName);

      if (!includesOklch(computedValue) && !includesOklch(inlineValue)) return;

      node.style.setProperty(property.cssName, property.fallback, "important");
    });
  });
}

function sanitizeClonedTree(clonedDocument: Document, selector: string) {
  const style = clonedDocument.createElement("style");
  style.textContent = `
    ${IGNORE_SELECTORS} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    * {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }
    iframe {
      visibility: hidden !important;
    }
  `;
  clonedDocument.head.appendChild(style);

  const hiddenNodes = clonedDocument.querySelectorAll<HTMLElement>(IGNORE_SELECTORS);
  hiddenNodes.forEach((node) => {
    node.style.display = "none";
    node.style.visibility = "hidden";
    node.style.opacity = "0";
  });

  const clonedTarget =
    (clonedDocument.querySelector(selector) as HTMLElement | null) ??
    (selector === "body" ? clonedDocument.body : null);

  if (!clonedTarget) return;

  let current: HTMLElement | null = clonedTarget;
  while (current) {
    current.style.overflow = "visible";
    current.style.maxHeight = "none";
    current = current.parentElement;
  }

  const descendants = clonedTarget.querySelectorAll<HTMLElement>("*");
  descendants.forEach((node) => {
    node.style.animation = "none";
    node.style.transition = "none";
    node.style.setProperty("backdrop-filter", "none");
    node.style.setProperty("-webkit-backdrop-filter", "none");
    if (node.style.filter) {
      node.style.filter = "none";
    }
  });

  if (clonedDocument.defaultView) {
    sanitizeCloneForOklch(clonedTarget, clonedDocument.defaultView);
  }
}

async function captureTarget(
  html2canvas: typeof import("html2canvas").default,
  attempt: string,
  selector: string,
  target: HTMLElement,
): Promise<ScreenshotCaptureResult> {
  const issues = inspectPotentialIssues(target);
  logCaptureTarget(attempt, selector, target, issues);

  if (selector === "body") {
    console.warn(
      `[SuporteScreenshot] Fallback para body ativado | tentativa=${attempt} | body inclui CSS global e shell e pode falhar por estilos como oklch.`,
    );
  }

  try {
    const canvas = await html2canvas(target, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      scale: 1,
      imageTimeout: 5000,
      removeContainer: true,
      foreignObjectRendering: false,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: 0,
      scrollY: -window.scrollY,
      ignoreElements: (element) => {
        if (!(element instanceof HTMLElement)) return false;
        return element.matches(IGNORE_SELECTORS) || Boolean(element.closest(IGNORE_SELECTORS));
      },
      onclone: (clonedDocument) => {
        sanitizeClonedTree(clonedDocument, selector);
      },
    });

    const blob = await canvasToBlob(canvas);
    if (!blob) {
      const detail = buildFailureDetail({
        stage: "export",
        attempt,
        selector,
        element: target,
        error: new Error("blob da captura retornou nulo"),
        issues,
      });
      logCaptureFailure(detail);
      return { ok: false, blob: null, dataUrl: null, error: formatFailureSummary(detail) };
    }

    try {
      const dataUrl = canvas.toDataURL("image/png", 0.92);
      return {
        ok: true,
        blob,
        dataUrl,
        error: null,
      };
    } catch (error) {
      const detail = buildFailureDetail({
        stage: "export",
        attempt,
        selector,
        element: target,
        error,
        issues,
      });
      logCaptureFailure(detail);
      return { ok: false, blob: null, dataUrl: null, error: formatFailureSummary(detail) };
    }
  } catch (error) {
    const detail = buildFailureDetail({
      stage: "render",
      attempt,
      selector,
      element: target,
      error,
      issues,
    });
    logCaptureFailure(detail);
    return { ok: false, blob: null, dataUrl: null, error: formatFailureSummary(detail) };
  }
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

  const { default: html2canvas } = await import("html2canvas");
  const attemptedSelectors = new Set<string>();
  const attemptedErrors: string[] = [];

  for (const attempt of CAPTURE_ATTEMPTS) {
    for (const selector of attempt.selectors) {
      if (attemptedSelectors.has(selector)) continue;
      attemptedSelectors.add(selector);

      const target =
        (document.querySelector(selector) as HTMLElement | null) ??
        (selector === "body" ? document.body : null);

      if (!target) {
        const detail = buildFailureDetail({
          stage: "select",
          attempt: attempt.name,
          selector,
          element: null,
          error: new Error(`elemento nao encontrado para ${selector}`),
          issues: createEmptyIssues(),
        });
        logCaptureFailure(detail);
        attemptedErrors.push(formatFailureSummary(detail));
        continue;
      }

      if (!hasValidDimensions(target)) {
        const detail = buildFailureDetail({
          stage: "select",
          attempt: attempt.name,
          selector,
          element: target,
          error: new Error(`elemento alvo sem dimensoes validas em ${selector}`),
          issues: inspectPotentialIssues(target),
        });
        logCaptureFailure(detail);
        attemptedErrors.push(formatFailureSummary(detail));
        continue;
      }

      const result = await captureTarget(html2canvas, attempt.name, selector, target);
      if (result.ok) return result;
      if (result.error) attemptedErrors.push(result.error);
    }
  }

  return {
    ok: false,
    blob: null,
    dataUrl: null,
    error: attemptedErrors[attemptedErrors.length - 1] ?? "falha ao capturar tela",
  };
}
