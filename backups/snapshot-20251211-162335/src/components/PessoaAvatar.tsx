"use client";

import Image from "next/image";

type Props = {
  name: string;
  fotoUrl: string | null;
  onClick?: () => void;
};

function getInitials(nome: string) {
  if (!nome) return "?";
  const partes = nome.trim().split(" ");
  const primeira = partes[0]?.[0] ?? "";
  const ultima =
    partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default function PessoaAvatar({ name, fotoUrl, onClick }: Props) {
  const initials = getInitials(name);

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        relative 
        flex 
        h-64 w-64                  /* 👈 3x maior (de 32 → 96) */
        items-center justify-center 
        overflow-hidden 
        rounded-[48px]             /* curva maior para foto grande */
        bg-gradient-to-br 
        from-violet-500 
        via-fuchsia-500 
        to-rose-500 
        text-white 
        shadow-2xl 
        ring-8 ring-white/70 
        hover:brightness-110 
        transition
      "
    >
      {fotoUrl ? (
        <Image 
          src={fotoUrl} 
          alt={name} 
          fill 
          className="object-cover" 
        />
      ) : (
        <span className="text-7xl font-semibold">
          {initials}
        </span>
      )}
    </button>
  );
}
