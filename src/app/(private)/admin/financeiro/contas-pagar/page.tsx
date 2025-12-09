"use client";

type SimplePageProps = {
  title: string;
  description?: string;
};

function SimplePlaceholder({ title, description }: SimplePageProps) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-600">
        {description ?? "Esta tela ainda será implementada."}
      </p>
    </div>
  );
}

export default function Page() {
  return <SimplePlaceholder title="Contas a pagar (Admin)" description="Esta tela ainda será implementada." />;
}
