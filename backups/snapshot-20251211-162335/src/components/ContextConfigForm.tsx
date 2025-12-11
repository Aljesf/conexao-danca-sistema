"use client";

import { useEffect, useState } from "react";
import { useBranding, type ContextKey, type Palette } from "@/context/BrandingContext";

type Props = {
  contextKey: ContextKey;
  title: string;
  description?: string;
};

export default function ContextConfigForm({ contextKey, title, description }: Props) {
  const { configs, updateContext } = useBranding();
  const cfg = configs[contextKey];
  const [displayName, setDisplayName] = useState(cfg.displayName);
  const [legalName, setLegalName] = useState(cfg.legalName ?? "");
  const [document, setDocument] = useState(cfg.document ?? "");
  const [phone, setPhone] = useState(cfg.contacts?.phone ?? "");
  const [email, setEmail] = useState(cfg.contacts?.email ?? "");
  const [site, setSite] = useState(cfg.contacts?.site ?? "");
  const [logoUrl, setLogoUrl] = useState(cfg.logoUrl ?? "");
  const [palette, setPalette] = useState<Palette>(cfg.palette);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(cfg.displayName);
    setLegalName(cfg.legalName ?? "");
    setDocument(cfg.document ?? "");
    setPhone(cfg.contacts?.phone ?? "");
    setEmail(cfg.contacts?.email ?? "");
    setSite(cfg.contacts?.site ?? "");
    setLogoUrl(cfg.logoUrl ?? "");
    setPalette(cfg.palette);
  }, [cfg]);

  function handlePalette(field: keyof Palette, value: string) {
    setPalette((p) => ({ ...p, [field]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateContext(contextKey, {
      displayName,
      legalName,
      document,
      contacts: { phone, email, site },
      logoUrl,
      palette,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h2">{title}</h1>
          {description ? (
            <p className="text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {saved ? (
          <span className="text-sm text-green-600">Salvo</span>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Nome exibido (branding)</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Razão social</label>
          <input
            className="input"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="label">Documento (CNPJ/CPF)</label>
          <input
            className="input"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div>
          <label className="label">Telefone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="label">E-mail</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="label">Site</label>
          <input
            className="input"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="label">Logo (URL ou upload público)</label>
          <input
            className="input"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="/logo.png ou https://"
          />
        </div>

        <div className="md:col-span-2 mt-2">
          <div className="text-sm font-semibold mb-1">Paleta de cores</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">Primária</label>
              <input
                type="color"
                className="input"
                value={palette.primary}
                onChange={(e) => handlePalette("primary", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Secundária</label>
              <input
                type="color"
                className="input"
                value={palette.secondary}
                onChange={(e) => handlePalette("secondary", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Acento</label>
              <input
                type="color"
                className="input"
                value={palette.accent}
                onChange={(e) => handlePalette("accent", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Fundo</label>
              <input
                type="color"
                className="input"
                value={palette.background}
                onChange={(e) => handlePalette("background", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Texto</label>
              <input
                type="color"
                className="input"
                value={palette.text}
                onChange={(e) => handlePalette("text", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Gradiente início</label>
              <input
                type="color"
                className="input"
                value={palette.gradientFrom ?? "#ffffff"}
                onChange={(e) => handlePalette("gradientFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Gradiente fim</label>
              <input
                type="color"
                className="input"
                value={palette.gradientTo ?? "#ffffff"}
                onChange={(e) => handlePalette("gradientTo", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 mt-2">
          <button type="submit" className="btn primary">
            Salvar configurações
          </button>
        </div>
      </form>
    </div>
  );
}
