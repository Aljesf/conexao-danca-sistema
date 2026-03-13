"use client";

import { useEffect } from "react";
import type { SupportLastError } from "@/lib/suporte/constants";

declare global {
  interface Window {
    __SUPORTE_LAST_ERROR__?: SupportLastError | null;
  }
}

function toSupportError(value: unknown): SupportLastError {
  if (value instanceof Error) {
    return {
      message: value.message || null,
      stack: value.stack || null,
      name: value.name || "Error",
      timestamp: new Date().toISOString(),
    };
  }

  if (typeof value === "string") {
    return {
      message: value,
      stack: null,
      name: "Error",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    message: "Erro nao identificado",
    stack: null,
    name: "UnknownError",
    timestamp: new Date().toISOString(),
  };
}

export default function AppErrorCaptureProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleError = (event: ErrorEvent) => {
      window.__SUPORTE_LAST_ERROR__ = toSupportError(event.error ?? event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      window.__SUPORTE_LAST_ERROR__ = toSupportError(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
