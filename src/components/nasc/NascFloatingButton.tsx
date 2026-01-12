"use client";

import * as React from "react";

type Props = {
  onClick: () => void;
};

const LS_KEY = "nasc_fab_pos_v1";
const BUTTON_SIZE = 52;
const PAD = 12;
const NOTE_EMOJI = String.fromCodePoint(0x1f4dd);

function safeParsePos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { x?: unknown; y?: unknown };
    const x = Number(obj.x);
    const y = Number(obj.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}

function clampToViewport(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = Math.max(PAD, Math.min(w - BUTTON_SIZE - PAD, x));
  const cy = Math.max(PAD, Math.min(h - BUTTON_SIZE - PAD, y));
  return { x: cx, y: cy };
}

export function NascFloatingButton({ onClick }: Props) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const moved = React.useRef(false);
  const dragOffset = React.useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  React.useEffect(() => {
    const stored = safeParsePos();
    if (stored) {
      setPos(clampToViewport(stored.x, stored.y));
      return;
    }
    const x = window.innerWidth - 64;
    const y = window.innerHeight - 120;
    setPos(clampToViewport(x, y));
  }, []);

  React.useEffect(() => {
    if (!pos) return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(pos));
  }, [pos]);

  React.useEffect(() => {
    const onResize = () => {
      setPos((p) => (p ? clampToViewport(p.x, p.y) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    dragging.current = true;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    moved.current = true;
    const next = clampToViewport(e.clientX - dragOffset.current.dx, e.clientY - dragOffset.current.dy);
    setPos(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onClickInternal = () => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    onClick();
  };

  if (!pos) return null;

  return (
    <button
      type="button"
      aria-label="Registro de Observacoes Operacionais"
      title="Registro de Observacoes Operacionais"
      onClick={onClickInternal}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="fixed z-[9999] h-[52px] w-[52px] rounded-full shadow-lg border bg-white hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center"
      style={{ left: pos.x, top: pos.y }}
    >
      <span className="text-xl">{NOTE_EMOJI}</span>
    </button>
  );
}
