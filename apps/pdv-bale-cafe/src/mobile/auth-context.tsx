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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapRootAuthStatus(state: AuthBootstrapState): RootAuthStatus {
  if (state.isHydratingSession) return "booting";
  return state.isAuthenticated ? "authenticated" : "unauthenticated";
}

function mapUsuario(state: AuthBootstrapState): UsuarioAutenticadoResumo | null {
  if (!state.user) return null;

  return {
    nome: state.user.nome,
    email: state.user.email,
    perfil: state.user.perfil,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthBootstrapState>(getAuthBootstrapState());
  const [authStatus, setAuthStatus] = useState<RootAuthStatus>(mapRootAuthStatus(getAuthBootstrapState()));

  function applyAuthState(nextState: AuthBootstrapState): AuthBootstrapState {
    setAuthState(nextState);
    setAuthStatus(mapRootAuthStatus(nextState));
    return nextState;
  }

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextState) => {
      applyAuthState(nextState);
    });

    void restaurarSessao()
      .then((nextState) => {
        applyAuthState(nextState);
      })
      .catch(() => {
        applyAuthState({
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
    return applyAuthState(await getSessaoAtual({ preserveAuthenticatedState: true }));
  }

  async function completeLogin(session: Session | null): Promise<void> {
    if (!session?.access_token || !session.refresh_token) {
      throw new Error("Sessao invalida retornada pelo login.");
    }

    await salvarSessaoLocal(session);
    applyAuthState(await restaurarSessao());
  }

  async function logout(): Promise<void> {
    applyAuthState(await logoutApp());
  }

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        authState,
        usuarioAutenticado: mapUsuario(authState),
        refreshAuthState,
        completeLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function usePdvAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("AuthContext indisponivel no app.");
  }

  return value;
}
