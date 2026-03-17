import CafeDashboard from "@/components/cafe/CafeDashboard";
import CafePageShell from "@/components/cafe/CafePageShell";

export default function CafeHomePage() {
  return (
    <CafePageShell
      eyebrow="Dashboard operacional"
      title="Dashboard do Ballet Cafe"
      description="Consolide vendas, consumo, horarios, meios de pagamento, conta interna e alertas operacionais do Ballet Cafe em uma unica home inteligente."
    >
      <CafeDashboard />
    </CafePageShell>
  );
}
