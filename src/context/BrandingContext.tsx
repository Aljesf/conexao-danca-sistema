"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ContextKey =
  | "escola"
  | "secretaria"
  | "loja"
  | "lanchonete"
  | "administracao"
  | "bolsas"
  | "financeiro"
  | "suporte";

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
  isReady: boolean;
  configs: Record<ContextKey, ContextConfig>;
  setActiveContext: (key: ContextKey) => void;
  updateContext: (key: ContextKey, patch: Partial<ContextConfig>) => void;
};

const STORAGE_KEY = "ctx-branding-v1";

const defaultEscola: ContextConfig = {
  key: "escola",
  displayName: "Conexao Danca",
  legalName: "Conexao Danca",
  document: "",
  contacts: { phone: "", email: "", site: "" },
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

const defaultSecretaria: ContextConfig = {
  key: "secretaria",
  displayName: "Secretaria da Escola",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#0f4c5c",
    secondary: "#d97706",
    background: "#fcfaf6",
    text: "#1f2937",
    accent: "#6b7280",
    gradientFrom: "#f4e7d3",
    gradientTo: "#e1eef0",
  },
};

const defaultLanchonete: ContextConfig = {
  key: "lanchonete",
  displayName: "Ballet Cafe",
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
  displayName: "Administracao do Sistema",
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

const defaultFinanceiro: ContextConfig = {
  key: "financeiro",
  displayName: "Financeiro",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#059669",
    secondary: "#10b981",
    background: "#f3faf7",
    text: "#0f172a",
    accent: "#64748b",
    gradientFrom: "#dcfce7",
    gradientTo: "#ecfdf5",
  },
};

const defaultSuporte: ContextConfig = {
  key: "suporte",
  displayName: "Suporte ao Usuario",
  legalName: "",
  document: "",
  contacts: {},
  logoUrl: "",
  palette: {
    primary: "#0f766e",
    secondary: "#14b8a6",
    background: "#f2fbfa",
    text: "#0f172a",
    accent: "#64748b",
    gradientFrom: "#d8fbf5",
    gradientTo: "#dcfce7",
  },
};

const BrandingContext = createContext<BrandingContextType>({
  activeContext: "escola",
  isReady: false,
  configs: {
    escola: defaultEscola,
    secretaria: defaultSecretaria,
    loja: defaultLoja,
    lanchonete: defaultLanchonete,
    administracao: defaultAdmin,
    bolsas: defaultBolsas,
    financeiro: defaultFinanceiro,
    suporte: defaultSuporte,
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
  const [isReady, setIsReady] = useState(false);
  const [configs, setConfigs] = useState<Record<ContextKey, ContextConfig>>({
    escola: defaultEscola,
    secretaria: defaultSecretaria,
    loja: defaultLoja,
    lanchonete: defaultLanchonete,
    administracao: defaultAdmin,
    bolsas: defaultBolsas,
    financeiro: defaultFinanceiro,
    suporte: defaultSuporte,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfigs({
          escola: { ...defaultEscola, ...(parsed.escola ?? {}) },
          secretaria: { ...defaultSecretaria, ...(parsed.secretaria ?? {}) },
          loja: { ...defaultLoja, ...(parsed.loja ?? {}) },
          lanchonete: { ...defaultLanchonete, ...(parsed.lanchonete ?? {}) },
          administracao: { ...defaultAdmin, ...(parsed.administracao ?? {}) },
          bolsas: { ...defaultBolsas, ...(parsed.bolsas ?? {}) },
          financeiro: { ...defaultFinanceiro, ...(parsed.financeiro ?? {}) },
          suporte: { ...defaultSuporte, ...(parsed.suporte ?? {}) },
        });
        if (parsed.activeContext) setActiveContext(parsed.activeContext);
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            escola: defaultEscola,
            secretaria: defaultSecretaria,
            loja: defaultLoja,
            lanchonete: defaultLanchonete,
            administracao: defaultAdmin,
            bolsas: defaultBolsas,
            financeiro: defaultFinanceiro,
            suporte: defaultSuporte,
            activeContext: "escola",
          }),
        );
      }
    } catch (err) {
      console.warn("Falha ao carregar branding salvo:", err);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    applyPalette(configs[activeContext].palette);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...configs, activeContext }));
    } catch (err) {
      console.warn("Falha ao salvar branding:", err);
    }
  }, [configs, activeContext, isReady]);

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
    () => ({ activeContext, isReady, configs, setActiveContext, updateContext }),
    [activeContext, configs, isReady],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
