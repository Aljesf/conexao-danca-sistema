import { getSystemSettings } from "@/lib/systemSettings";
import { SystemBranding } from "@/components/branding/SystemBranding";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const settings = await getSystemSettings();
  const erro = searchParams?.erro === "1";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4ecf5 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SystemBranding
              settings={settings}
              variant="color"
              showWordmark
              showSystemName={false}
              className="justify-center"
            />
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Acesso restrito
          </div>
        </div>

        {erro ? (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              padding: "8px 12px",
              fontSize: 13,
              color: "#b91c1c",
              textAlign: "center",
            }}
          >
            E-mail ou senha inválidos.
          </div>
        ) : null}

        <form action="/auth/login" method="post" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            defaultValue=""
            placeholder="E-mail"
            style={{
              padding: 12,
              width: "100%",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          />

          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            defaultValue=""
            placeholder="Senha"
            style={{
              padding: 12,
              width: "100%",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
