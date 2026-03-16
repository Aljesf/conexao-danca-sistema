import { createContext, useContext } from "react";
import type { AuthBootstrapState, UsuarioAutenticadoResumo } from "../lib/api";

export type RootAuthStatus = "booting" | "unauthenticated" | "authenticated";

export type AuthContextValue = {
  authStatus: RootAuthStatus;
  authState: AuthBootstrapState;
  usuarioAutenticado: UsuarioAutenticadoResumo | null;
  refreshAuthState: () => Promise<AuthBootstrapState>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useProfessorAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("AuthContext indisponivel no app.");
  }

  return value;
}
