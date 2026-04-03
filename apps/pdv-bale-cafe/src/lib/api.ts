import { type Session, type User } from "@supabase/supabase-js";
import { ENV } from "../config/env";
import { clearSession, loadSession, saveSession } from "./secureStore";
import { supabase } from "./supabase";

export const AUTH_SESSION_NOT_READY = "AUTH_SESSION_NOT_READY";
export const AUTH_SESSION_MISSING = "AUTH_SESSION_MISSING";
export const AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED";

type UsuarioAutenticadoInterno = {
  id: string | null;
  nome: string | null;
  email: string | null;
  perfil: string | null;
};

export type UsuarioAutenticadoResumo = {
  nome: string | null;
  email: string | null;
  perfil: string | null;
};

export type AuthBootstrapState = {
  isHydratingSession: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: UsuarioAutenticadoInterno | null;
};

type SessaoLocalPersistida = {
  accessToken: string;
  refreshToken: string;
  user: UsuarioAutenticadoInterno | null;
};

type AuthStateListener = (state: AuthBootstrapState) => void;

type GetSessaoAtualOptions = {
  preserveAuthenticatedState?: boolean;
};

const estadoInicial: AuthBootstrapState = {
  isHydratingSession: false,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
};

let authState: AuthBootstrapState = estadoInicial;
let hydrationPromise: Promise<AuthBootstrapState> | null = null;
const authListeners = new Set<AuthStateListener>();

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function extractUserName(user: User | null | undefined): string | null {
  if (!user?.user_metadata || typeof user.user_metadata !== "object") {
    return null;
  }

  const metadata = user.user_metadata as Record<string, unknown>;
  return normalizeOptionalString(metadata.full_name)
    ?? normalizeOptionalString(metadata.name)
    ?? normalizeOptionalString(metadata.nome)
    ?? null;
}

function buildUserFromSession(session: Session | null): UsuarioAutenticadoInterno | null {
  const user = session?.user;
  if (!user) return null;

  return {
    id: normalizeOptionalString(user.id),
    nome: extractUserName(user),
    email: normalizeOptionalString(user.email),
    perfil: null,
  };
}

function mergeUsers(
  primary: UsuarioAutenticadoInterno | null,
  fallback: UsuarioAutenticadoInterno | null,
): UsuarioAutenticadoInterno | null {
  if (!primary && !fallback) return null;

  return {
    id: primary?.id ?? fallback?.id ?? null,
    nome: primary?.nome ?? fallback?.nome ?? null,
    email: primary?.email ?? fallback?.email ?? null,
    perfil: primary?.perfil ?? fallback?.perfil ?? null,
  };
}

function cloneUser(user: UsuarioAutenticadoInterno | null): UsuarioAutenticadoInterno | null {
  if (!user) return null;

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
  };
}

function cloneAuthState(state: AuthBootstrapState): AuthBootstrapState {
  return {
    isHydratingSession: state.isHydratingSession,
    isAuthenticated: state.isAuthenticated,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    user: cloneUser(state.user),
  };
}

function notifyAuthListeners(): void {
  const snapshot = cloneAuthState(authState);
  for (const listener of authListeners) {
    listener(snapshot);
  }
}

function setAuthState(nextState: AuthBootstrapState): AuthBootstrapState {
  authState = cloneAuthState(nextState);
  notifyAuthListeners();
  return cloneAuthState(authState);
}

function createUnauthenticatedState(isHydratingSession: boolean): AuthBootstrapState {
  return {
    isHydratingSession,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
  };
}

function createAuthenticatedState(params: {
  session: Session;
  user?: UsuarioAutenticadoInterno | null;
  isHydratingSession: boolean;
}): AuthBootstrapState {
  return {
    isHydratingSession: params.isHydratingSession,
    isAuthenticated: !params.isHydratingSession,
    accessToken: params.session.access_token,
    refreshToken: params.session.refresh_token,
    user: mergeUsers(params.user ?? null, buildUserFromSession(params.session)),
  };
}

function validateStoredSession(payload: unknown): SessaoLocalPersistida | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as {
    accessToken?: unknown;
    refreshToken?: unknown;
    user?: unknown;
  };

  const accessToken = normalizeOptionalString(candidate.accessToken);
  const refreshToken = normalizeOptionalString(candidate.refreshToken);
  if (!accessToken || !refreshToken) return null;

  let user: UsuarioAutenticadoInterno | null = null;
  if (candidate.user && typeof candidate.user === "object") {
    const rawUser = candidate.user as Record<string, unknown>;
    user = {
      id: normalizeOptionalString(rawUser.id),
      nome: normalizeOptionalString(rawUser.nome),
      email: normalizeOptionalString(rawUser.email),
      perfil: normalizeOptionalString(rawUser.perfil),
    };
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
}

export async function salvarSessaoLocal(session: Session | null): Promise<void> {
  if (!session?.access_token || !session.refresh_token) {
    return;
  }

  const payload: SessaoLocalPersistida = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: mergeUsers(authState.user, buildUserFromSession(session)),
  };

  await saveSession(JSON.stringify(payload));
}

export async function lerSessaoLocal(): Promise<SessaoLocalPersistida | null> {
  const raw = await loadSession();
  if (!raw) return null;

  try {
    return validateStoredSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function limparSessaoLocal(): Promise<void> {
  await clearSession();
}

export function getAuthBootstrapState(): AuthBootstrapState {
  return cloneAuthState(authState);
}

export function subscribeAuthState(listener: AuthStateListener): () => void {
  authListeners.add(listener);

  return () => {
    authListeners.delete(listener);
  };
}

export async function restaurarSessao(): Promise<AuthBootstrapState> {
  if (hydrationPromise) {
    return await hydrationPromise;
  }

  setAuthState({
    ...authState,
    isHydratingSession: true,
    isAuthenticated: false,
  });

  hydrationPromise = (async () => {
    const sessaoLocal = await lerSessaoLocal();
    if (!sessaoLocal) {
      await limparSessaoLocal();
      return setAuthState(createUnauthenticatedState(false));
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: sessaoLocal.accessToken,
      refresh_token: sessaoLocal.refreshToken,
    });

    if (error || !data.session?.access_token) {
      await limparSessaoLocal();
      return setAuthState(createUnauthenticatedState(false));
    }

    await salvarSessaoLocal(data.session);

    return setAuthState(
      createAuthenticatedState({
        session: data.session,
        user: sessaoLocal.user,
        isHydratingSession: false,
      }),
    );
  })();

  try {
    return await hydrationPromise;
  } finally {
    hydrationPromise = null;
  }
}

export async function getSessaoAtual(options?: GetSessaoAtualOptions): Promise<AuthBootstrapState> {
  if (hydrationPromise) {
    return await hydrationPromise;
  }

  const preserveAuthenticatedState = options?.preserveAuthenticatedState ?? true;
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    await salvarSessaoLocal(data.session);
    return setAuthState(
      createAuthenticatedState({
        session: data.session,
        user: authState.user,
        isHydratingSession: false,
      }),
    );
  }

  if (preserveAuthenticatedState && authState.isAuthenticated && authState.accessToken) {
    return cloneAuthState(authState);
  }

  const sessaoLocal = await lerSessaoLocal();
  if (sessaoLocal?.accessToken && sessaoLocal.refreshToken) {
    return await restaurarSessao();
  }

  await limparSessaoLocal();
  return setAuthState(createUnauthenticatedState(false));
}

export async function logoutApp(): Promise<AuthBootstrapState> {
  await limparSessaoLocal();
  await supabase.auth.signOut().catch(() => undefined);
  return setAuthState(createUnauthenticatedState(false));
}

async function buildAuthenticatedHeaders(path: string, headers?: HeadersInit): Promise<Record<string, string>> {
  if (authState.isHydratingSession) {
    throw new Error(AUTH_SESSION_NOT_READY);
  }

  const currentState = !authState.isAuthenticated || !authState.accessToken
    ? await getSessaoAtual({ preserveAuthenticatedState: true })
    : cloneAuthState(authState);

  if (currentState.isHydratingSession) {
    throw new Error(AUTH_SESSION_NOT_READY);
  }

  if (!currentState.isAuthenticated || !currentState.accessToken) {
    throw new Error(AUTH_SESSION_MISSING);
  }

  const normalizedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalizedHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      normalizedHeaders[key] = value;
    }
  } else if (headers) {
    Object.assign(normalizedHeaders, headers);
  }

  return {
    ...normalizedHeaders,
    Authorization: `Bearer ${currentState.accessToken}`,
  };
}

function isHtmlResponse(contentType: string, body: string): boolean {
  const normalizedType = contentType.toLowerCase();
  const normalizedBody = body.trimStart().toLowerCase();

  return normalizedType.includes("text/html")
    || normalizedBody.startsWith("<!doctype html")
    || normalizedBody.startsWith("<html");
}

function parseJsonSafe(body: string): unknown | null {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as {
    error?: unknown;
    message?: unknown;
    detalhe?: unknown;
    details?: unknown;
  };

  const parts = [
    typeof candidate.error === "string" ? candidate.error : null,
    typeof candidate.message === "string" ? candidate.message : null,
    typeof candidate.detalhe === "string" ? candidate.detalhe : null,
    typeof candidate.details === "string" ? candidate.details : null,
  ].filter((value): value is string => Boolean(value));

  return parts[0] ?? null;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API demorou demais para responder.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;
  const headers = await buildAuthenticatedHeaders(path, init?.headers);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        error.message === "Failed to fetch"
          ? "Falha de rede ao acessar a API."
          : error.message,
      );
    }

    throw new Error("Falha de rede ao acessar a API.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text().catch(() => "");

  if (response.status === 401) {
    await logoutApp();
    throw new Error(AUTH_SESSION_EXPIRED);
  }

  if (isHtmlResponse(contentType, body)) {
    throw new Error("A API retornou HTML em vez de JSON.");
  }

  const payload = parseJsonSafe(body);
  if (payload == null) {
    throw new Error("A API nao retornou JSON valido.");
  }

  if (!response.ok) {
    throw new Error(extractApiMessage(payload) ?? `API ${response.status} ${response.statusText}`);
  }

  return payload as T;
}

void supabase.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    void salvarSessaoLocal(session).then(() => {
      setAuthState(
        createAuthenticatedState({
          session,
          user: authState.user,
          isHydratingSession: false,
        }),
      );
    });
    return;
  }

  if (event === "SIGNED_OUT") {
    void limparSessaoLocal().then(() => {
      setAuthState(createUnauthenticatedState(false));
    });
  }
});
