"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ContextKey = "escola" | "loja" | "lanchonete" | "administracao" | "bolsas";

export type Palette = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  gradientFrom?: string;
  gradientTo?: string;
};

export type Contacts = {
  phone?: string;
  email?: string;
  site?: string;
};

export type ContextConfig = {
  key: ContextKey;
  displayName: string;
  legalName?: string;
  document?: string;
  contacts?: Contacts;
  logoUrl?: string;
  palette: Palette;
};

type BrandingContextType = {
  activeContext: ContextKey;
  configs: Record<ContextKey, ContextConfig>;
  setActiveContext: (key: ContextKey) => void;
  updateContext: (key: ContextKey, patch: Partial<ContextConfig>) => void;
};

const STORAGE_KEY = "ctx-branding-v1";

const defaultEscola: ContextConfig = {
  key: "escola",
  displayName: "Conexão Dança",
  legalName: "Conexão Dança",
  document: "",
  contacts: {
    phone: "",
    email: "",
    site: "",
  },
  logoUrl: "/logo-conexao.png",
  palette: {
    primary: "#8B5CF6",
    secondary: "#F472B6",
    background: "#f9f6ff",
    text: "#1f2937",
    accent: "#6b7280",
    gradientFrom: "#ffe9f7",
    gradientTo: "#efe4ff",
  },
};

const defaultLoja: ContextConfig = {
  key: "loja",
  displayName: "AJ Dance Store",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#0F172A",
    secondary: "#475569",
    background: "#f8fafc",
    text: "#0f172a",
    accent: "#94a3b8",
    gradientFrom: "#e2e8f0",
    gradientTo: "#cbd5e1",
  },
};

const defaultLanchonete: ContextConfig = {
  key: "lanchonete",
  displayName: "Ballet Café",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#c26a3d",
    secondary: "#8b5e34",
    background: "#fff8f1",
    text: "#3f2f28",
    accent: "#d6a77a",
    gradientFrom: "#ffe4d2",
    gradientTo: "#ffd7ba",
  },
};

const defaultAdmin: ContextConfig = {
  key: "administracao",
  displayName: "Administração do Sistema",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#4338ca",
    secondary: "#6366f1",
    background: "#f8f7ff",
    text: "#111827",
    accent: "#6b7280",
    gradientFrom: "#e5e7ff",
    gradientTo: "#ede9fe",
  },
};

const defaultBolsas: ContextConfig = {
  key: "bolsas",
  displayName: "Bolsas & Projetos Sociais",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#1d4ed8",
    secondary: "#0ea5e9",
    background: "#f5f9ff",
    text: "#0f172a",
    accent: "#64748b",
    gradientFrom: "#e0efff",
    gradientTo: "#dbeafe",
  },
};

const BrandingContext = createContext<BrandingContextType>({
  activeContext: "escola",
  configs: {
    escola: defaultEscola,
    loja: defaultLoja,
    lanchonete: defaultLanchonete,
    administracao: defaultAdmin,
    bolsas: defaultBolsas,
  },
  setActiveContext: () => {},
  updateContext: () => {},
});

function applyPalette(palette: Palette) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--bg", palette.background);
  root.style.setProperty("--ink", palette.text);
  root.style.setProperty("--muted", palette.accent);
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--secondary", palette.secondary);
  if (palette.gradientFrom) root.style.setProperty("--accent-1", palette.gradientFrom);
  if (palette.gradientTo) root.style.setProperty("--accent-2", palette.gradientTo);
  if (palette.gradientTo) root.style.setProperty("--accent-3", palette.gradientTo);
  root.style.setProperty("--hover", "rgba(140, 82, 255, 0.10)");
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [activeContext, setActiveContext] = useState<ContextKey>("escola");
  const [configs, setConfigs] = useState<Record<ContextKey, ContextConfig>>({
    escola: defaultEscola,
    loja: defaultLoja,
    lanchonete: defaultLanchonete,
    administracao: defaultAdmin,
    bolsas: defaultBolsas,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfigs({
          escola: { ...defaultEscola, ...(parsed.escola ?? {}) },
          loja: { ...defaultLoja, ...(parsed.loja ?? {}) },
          lanchonete: { ...defaultLanchonete, ...(parsed.lanchonete ?? {}) },
          administracao: { ...defaultAdmin, ...(parsed.administracao ?? {}) },
          bolsas: { ...defaultBolsas, ...(parsed.bolsas ?? {}) },
        });
        if (parsed.activeContext) setActiveContext(parsed.activeContext);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...configs, activeContext }));
      }
    } catch (err) {
      console.warn("Falha ao carregar branding salvo:", err);
    }
  }, []);

  useEffect(() => {
    applyPalette(configs[activeContext].palette);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...configs, activeContext })
      );
    } catch (err) {
      console.warn("Falha ao salvar branding:", err);
    }
  }, [configs, activeContext]);

  const updateContext = (key: ContextKey, patch: Partial<ContextConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
        palette: {
          ...prev[key].palette,
          ...(patch.palette ?? {}),
        },
        contacts: {
          ...prev[key].contacts,
          ...(patch.contacts ?? {}),
        },
      },
    }));
  };

  const value = useMemo(
    () => ({ activeContext, configs, setActiveContext, updateContext }),
    [activeContext, configs]
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
