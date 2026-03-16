import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuthBootstrapState,
  getSessaoAtual,
  logoutApp,
  restaurarSessao,
  salvarSessaoLocal,
  subscribeAuthState,
  type AuthBootstrapState,
  type UsuarioAutenticadoResumo,
} from "../lib/api";

export type RootAuthStatus = "booting" | "unauthenticated" | "authenticated";

export type AuthContextValue = {
  authStatus: RootAuthStatus;
  authState: AuthBootstrapState;
  usuarioAutenticado: UsuarioAutenticadoResumo | null;
  refreshAuthState: () => Promise<AuthBootstrapState>;
  completeLogin: (session: Session | null) => Promise<void>;
  logout: (motivo?: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function mapRootAuthStatus(state: AuthBootstrapState): RootAuthStatus {
  if (state.isHydratingSession) return "booting";
  return state.isAuthenticated ? "authenticated" : "unauthenticated";
}

function authContextLog(evento: string, detalhes?: Record<string, unknown>): void {
  if (detalhes) {
    console.log(`[AUTH_CTX] ${evento}`, detalhes);
    return;
  }

  console.log(`[AUTH_CTX] ${evento}`);
}

function resumoAuthState(state: AuthBootstrapState): Record<string, unknown> {
  return {
    isHydratingSession: state.isHydratingSession,
    isAuthenticated: state.isAuthenticated,
    hasAccessToken: Boolean(state.accessToken),
    hasRefreshToken: Boolean(state.refreshToken),
    hasUser: Boolean(state.user),
  };
}

function resumoUsuario(state: AuthBootstrapState): UsuarioAutenticadoResumo | null {
  if (!state.user) return null;

  return {
    nome: state.user.nome,
    email: state.user.email,
    perfil: state.user.perfil,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthBootstrapState>(getAuthBootstrapState());
  const [authStatus, setAuthStatus] = useState<RootAuthStatus>(() => mapRootAuthStatus(getAuthBootstrapState()));

  function applyAuthState(origem: string, nextState: AuthBootstrapState): AuthBootstrapState {
    setAuthState(nextState);
    setAuthStatus((previousStatus) => {
      const nextStatus = mapRootAuthStatus(nextState);
      authContextLog(`authStatus ${origem}`, {
        previousStatus,
        nextStatus,
        ...resumoAuthState(nextState),
      });
      return nextStatus;
    });
    return nextState;
  }

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextState) => {
      applyAuthState("subscribeAuthState", nextState);
    });

    void restaurarSessao()
      .then((nextState) => {
        applyAuthState("restaurarSessao", nextState);
      })
      .catch((error: unknown) => {
        authContextLog("restaurarSessao erro", {
          message: error instanceof Error ? error.message : "erro_desconhecido",
        });
        applyAuthState("restaurarSessao:erro", {
          ...getAuthBootstrapState(),
          isHydratingSession: false,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
        });
      });

    return unsubscribe;
  }, []);

  async function refreshAuthState(): Promise<AuthBootstrapState> {
    authContextLog("refreshAuthState inicio", resumoAuthState(authState));
    const nextState = await getSessaoAtual({
      preserveAuthenticatedState: true,
      origem: "auth-context.refreshAuthState",
    });

    return applyAuthState("refreshAuthState", nextState);
  }

  async function completeLogin(session: Session | null): Promise<void> {
    authContextLog("completeLogin inicio", {
      hasAccessToken: Boolean(session?.access_token),
      hasRefreshToken: Boolean(session?.refresh_token),
      hasUser: Boolean(session?.user),
    });

    if (!session?.access_token || !session.refresh_token) {
      throw new Error("Sessão inválida retornada pelo login.");
    }

    await salvarSessaoLocal(session);
    const nextState = await restaurarSessao();

    if (!nextState.isAuthenticated || !nextState.accessToken) {
      throw new Error("Sessão não ficou disponível no app.");
    }

    applyAuthState("completeLogin", nextState);
  }

  async function logout(motivo = "manual"): Promise<void> {
    authContextLog(`logout inicio motivo=${motivo}`, resumoAuthState(authState));
    const nextState = await logoutApp(motivo);
    applyAuthState(`logout:${motivo}`, nextState);
  }

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        authState,
        usuarioAutenticado: resumoUsuario(authState),
        refreshAuthState,
        completeLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useProfessorAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("AuthContext indisponível no app.");
  }

  return value;
}
