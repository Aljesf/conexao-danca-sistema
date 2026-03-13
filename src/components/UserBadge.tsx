"use client";

type UserBadgeProps = {
  user?: { id: string; email: string | null; name?: string | null } | null;
  logoutAction?: () => Promise<void>;
};

export default function UserBadge({ user, logoutAction }: UserBadgeProps) {
  if (!user) {
    return <div className="px-4 py-3 text-xs text-slate-500">Nao autenticado</div>;
  }

  return (
    <div className="px-4 py-3 text-xs">
      <div className="truncate max-w-[220px] font-medium">{user.name ?? user.email ?? "Autenticado"}</div>
      {user.name && user.email ? <div className="truncate max-w-[220px] text-slate-500">{user.email}</div> : null}
      {logoutAction ? (
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-2 rounded border border-slate-300 px-3 py-1 text-[11px] hover:bg-slate-100"
          >
            Sair
          </button>
        </form>
      ) : null}
    </div>
  );
}
