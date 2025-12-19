"use client";

export default function NovoUsuarioPage() {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Cadastrar novo usuário
      </h1>
      <p style={{ color: "rgba(0,0,0,0.65)", fontSize: 14 }}>
        O cadastro de usuários é feito a partir de uma pessoa existente. Em breve esta tela
        permitirá criar usuários internos com vínculo à Pessoa cadastrada.
      </p>
    </div>
  );
}
