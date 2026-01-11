import { getSystemSettings } from "@/lib/systemSettings";
import { SystemBranding } from "@/components/branding/SystemBranding";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const settings = await getSystemSettings();

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

        <LoginClient />
      </div>
    </main>
  );
}

