import { type Session, type User } from "@supabase/supabase-js";
import { ENV } from "../config/env";
import { clearSession, loadSession, saveSession } from "./secureStore";
import { supabase } from "./supabase";

export const AUTH_SESSION_NOT_READY = "AUTH_SESSION_NOT_READY";
export const AUTH_SESSION_MISSING = "AUTH_SESSION_MISSING";
export const AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED";
export const AUTH_REQUEST_UNAUTHORIZED = "AUTH_REQUEST_UNAUTHORIZED";

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

type DashboardUsuarioPayload = {
  id?: unknown;
  nome?: unknown;
  email?: unknown;
  perfil?: unknown;
};

type DashboardPayloadComUsuario = {
  usuario?: DashboardUsuarioPayload | null;
};

type AuthStateListener = (state: AuthBootstrapState) => void;

type GetSessaoAtualOptions = {
  preserveAuthenticatedState?: boolean;
  origem?: string;
};

const estadoAuthInicial: AuthBootstrapState = {
  isHydratingSession: false,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
};

const authControl = {
  bootstrapInProgress: false,
  logoutInProgress: false,
};

let authState: AuthBootstrapState = estadoAuthInicial;
let hydrationPromise: Promise<AuthBootstrapState> | null = null;
const authListeners = new Set<AuthStateListener>();

function authLog(evento: string, detalhes?: Record<string, unknown>): void {
  if (detalhes) {
    console.log(`[AUTH] ${evento}`, detalhes);
    return;
  }

  console.log(`[AUTH] ${evento}`);
}

function resumirEstado(state: AuthBootstrapState): Record<string, unknown> {
  return {
    isHydratingSession: state.isHydratingSession,
    isAuthenticated: state.isAuthenticated,
    hasAccessToken: Boolean(state.accessToken),
    hasRefreshToken: Boolean(state.refreshToken),
    hasUser: Boolean(state.user),
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

function setAuthState(origem: string, nextState: AuthBootstrapState): AuthBootstrapState {
  const previousState = cloneAuthState(authState);
  authState = cloneAuthState(nextState);

  authLog(`setAuthState origem=${origem}`, {
    previous: resumirEstado(previousState),
    next: resumirEstado(authState),
  });

  notifyAuthListeners();
  return cloneAuthState(authState);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function mergeUsuarioInterno(
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

function usuarioInternoParaResumo(user: UsuarioAutenticadoInterno | null): UsuarioAutenticadoResumo | null {
  if (!user) return null;

  return {
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
  };
}

function extrairNomeDoUser(user: User | null | undefined): string | null {
  if (!user?.user_metadata || typeof user.user_metadata !== "object") {
    return null;
  }

  const metadata = user.user_metadata as Record<string, unknown>;

  return normalizeOptionalString(metadata.full_name)
    ?? normalizeOptionalString(metadata.name)
    ?? normalizeOptionalString(metadata.nome)
    ?? null;
}

function normalizarUsuarioDaSessao(session: Session | null): UsuarioAutenticadoInterno | null {
  const user = session?.user;
  if (!user) return null;

  return {
    id: normalizeOptionalString(user.id) ?? null,
    nome: extrairNomeDoUser(user),
    email: normalizeOptionalString(user.email) ?? null,
    perfil: null,
  };
}

function criarEstadoDeSessao(params: {
  session: Session | null;
  user?: UsuarioAutenticadoInterno | null;
  isHydratingSession: boolean;
}): AuthBootstrapState {
  const mergedUser = mergeUsuarioInterno(params.user ?? null, normalizarUsuarioDaSessao(params.session));
  const accessToken = params.session?.access_token ?? null;
  const refreshToken = params.session?.refresh_token ?? null;

  return {
    isHydratingSession: params.isHydratingSession,
    isAuthenticated: !params.isHydratingSession && Boolean(accessToken),
    accessToken,
    refreshToken,
    user: mergedUser,
  };
}

function criarEstadoNaoAutenticado(isHydratingSession: boolean): AuthBootstrapState {
  return {
    isHydratingSession,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
  };
}

function validarSessaoLocal(payload: unknown): SessaoLocalPersistida | null {
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
      id: normalizeOptionalString(rawUser.id) ?? null,
      nome: normalizeOptionalString(rawUser.nome) ?? null,
      email: normalizeOptionalString(rawUser.email) ?? null,
      perfil: normalizeOptionalString(rawUser.perfil) ?? null,
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
    authLog("salvarSessaoLocal ignorado", {
      hasAccessToken: Boolean(session?.access_token),
      hasRefreshToken: Boolean(session?.refresh_token),
    });
    return;
  }

  const user = mergeUsuarioInterno(authState.user, normalizarUsuarioDaSessao(session));
  const payload: SessaoLocalPersistida = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user,
  };

  await saveSession(JSON.stringify(payload));
  authLog("salvarSessaoLocal ok", {
    hasAccessToken: true,
    hasRefreshToken: true,
    hasUser: Boolean(user),
  });
}

export async function lerSessaoLocal(): Promise<SessaoLocalPersistida | null> {
  const raw = await loadSession();
  authLog("lerSessaoLocal", { hasSession: Boolean(raw) });

  if (!raw) return null;

  try {
    const parsed = validarSessaoLocal(JSON.parse(raw));
    authLog("lerSessaoLocal validada", {
      hasAccessToken: Boolean(parsed?.accessToken),
      hasRefreshToken: Boolean(parsed?.refreshToken),
      hasUser: Boolean(parsed?.user),
    });
    return parsed;
  } catch {
    authLog("lerSessaoLocal invalida");
    return null;
  }
}

export async function limparSessaoLocal(motivo = "nao_informado"): Promise<void> {
  await clearSession();
  authLog(`limparSessaoLocal motivo=${motivo}`);
}

export function extrairUsuarioAutenticado(payload: unknown): UsuarioAutenticadoResumo | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as DashboardPayloadComUsuario;
  if (!candidate.usuario || typeof candidate.usuario !== "object") return null;

  return {
    nome: normalizeOptionalString(candidate.usuario.nome),
    email: normalizeOptionalString(candidate.usuario.email),
    perfil: normalizeOptionalString(candidate.usuario.perfil),
  };
}

async function persistirUsuarioAtualEmMemoria(): Promise<void> {
  if (!authState.accessToken || !authState.refreshToken) return;

  const payload: SessaoLocalPersistida = {
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
    user: cloneUser(authState.user),
  };

  await saveSession(JSON.stringify(payload));
  authLog("persistirUsuarioAtualEmMemoria ok", {
    hasUser: Boolean(payload.user),
  });
}

export async function enriquecerUsuarioAutenticado(payload: unknown): Promise<UsuarioAutenticadoResumo | null> {
  const usuario = extrairUsuarioAutenticado(payload);
  if (!usuario) {
    return usuarioInternoParaResumo(authState.user);
  }

  const nextUser: UsuarioAutenticadoInterno = {
    id: authState.user?.id ?? null,
    nome: usuario.nome ?? authState.user?.nome ?? null,
    email: usuario.email ?? authState.user?.email ?? null,
    perfil: usuario.perfil ?? authState.user?.perfil ?? null,
  };

  setAuthState("enriquecerUsuarioAutenticado", {
    ...authState,
    user: nextUser,
  });
  await persistirUsuarioAtualEmMemoria();

  return usuarioInternoParaResumo(nextUser);
}

async function aplicarSessaoEmMemoria(origem: string, session: Session | null): Promise<AuthBootstrapState> {
  if (!session?.access_token || !session.refresh_token) {
    return setAuthState(origem, criarEstadoNaoAutenticado(false));
  }

  await salvarSessaoLocal(session);
  return setAuthState(
    origem,
    criarEstadoDeSessao({
      session,
      user: authState.user,
      isHydratingSession: authControl.bootstrapInProgress,
    }),
  );
}

export async function restaurarSessao(): Promise<AuthBootstrapState> {
  if (hydrationPromise) {
    authLog("restaurarSessao reutilizando promise");
    return hydrationPromise;
  }

  authControl.bootstrapInProgress = true;
  setAuthState("restaurarSessao:start", {
    ...authState,
    isHydratingSession: true,
    isAuthenticated: false,
  });

  hydrationPromise = (async () => {
    const sessaoLocal = await lerSessaoLocal();

    if (!sessaoLocal) {
      await limparSessaoLocal("restore_sem_storage");
      return setAuthState("restaurarSessao:sem_storage", criarEstadoNaoAutenticado(false));
    }

    authLog("restaurarSessao tentando setSession", {
      hasAccessToken: Boolean(sessaoLocal.accessToken),
      hasRefreshToken: Boolean(sessaoLocal.refreshToken),
      hasUser: Boolean(sessaoLocal.user),
    });

    const { data, error } = await supabase.auth.setSession({
      access_token: sessaoLocal.accessToken,
      refresh_token: sessaoLocal.refreshToken,
    });

    if (error || !data.session?.access_token) {
      await limparSessaoLocal("restore_setSession_falhou");
      return setAuthState("restaurarSessao:falhou", criarEstadoNaoAutenticado(false));
    }

    await salvarSessaoLocal(data.session);

    return setAuthState(
      "restaurarSessao:authenticated",
      criarEstadoDeSessao({
        session: data.session,
        user: mergeUsuarioInterno(sessaoLocal.user, authState.user),
        isHydratingSession: false,
      }),
    );
  })();

  try {
    return await hydrationPromise;
  } finally {
    hydrationPromise = null;
    authControl.bootstrapInProgress = false;
    authLog("restaurarSessao encerrada", resumirEstado(authState));
  }
}

export async function getSessaoAtual(options?: GetSessaoAtualOptions): Promise<AuthBootstrapState> {
  const preserveAuthenticatedState = options?.preserveAuthenticatedState ?? true;
  const origem = options?.origem ?? "getSessaoAtual";

  if (hydrationPromise) {
    authLog(`${origem} aguardando restaurarSessao em andamento`);
    return hydrationPromise;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    await salvarSessaoLocal(data.session);
    return setAuthState(
      `${origem}:session_supabase`,
      criarEstadoDeSessao({
        session: data.session,
        user: authState.user,
        isHydratingSession: false,
      }),
    );
  }

  if (preserveAuthenticatedState && authState.isAuthenticated && authState.accessToken) {
    authLog(`${origem} preservando sessao em memoria`, resumirEstado(authState));
    return cloneAuthState(authState);
  }

  const sessaoLocal = await lerSessaoLocal();
  if (sessaoLocal?.accessToken && sessaoLocal.refreshToken) {
    authLog(`${origem} sem sessao no supabase, tentando restaurar do storage`);
    return restaurarSessao();
  }

  await limparSessaoLocal(`${origem}_sem_sessao`);
  return setAuthState(`${origem}:unauthenticated`, criarEstadoNaoAutenticado(false));
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

export async function logoutApp(motivo = "manual"): Promise<AuthBootstrapState> {
  authControl.logoutInProgress = true;
  authLog(`logoutApp inicio motivo=${motivo}`, resumirEstado(authState));

  try {
    await limparSessaoLocal(`logout_${motivo}`);
    await supabase.auth.signOut().catch(() => undefined);
    return setAuthState(`logoutApp:${motivo}`, criarEstadoNaoAutenticado(false));
  } finally {
    authControl.logoutInProgress = false;
    authLog(`logoutApp fim motivo=${motivo}`, resumirEstado(authState));
  }
}

async function buildAuthenticatedHeaders(path: string, headers?: HeadersInit): Promise<Record<string, string>> {
  if (authState.isHydratingSession) {
    authLog(`bloquear requisição por AUTH_SESSION_NOT_READY em ${path}`, resumirEstado(authState));
    throw new Error(AUTH_SESSION_NOT_READY);
  }

  const currentState = !authState.isAuthenticated || !authState.accessToken
    ? await getSessaoAtual({ origem: `buildAuthenticatedHeaders:${path}` })
    : cloneAuthState(authState);

  if (currentState.isHydratingSession) {
    authLog(`bloquear requisição por AUTH_SESSION_NOT_READY em ${path}`, resumirEstado(currentState));
    throw new Error(AUTH_SESSION_NOT_READY);
  }

  if (!currentState.isAuthenticated || !currentState.accessToken) {
    authLog(`buildAuthenticatedHeaders sem token em ${path}`, resumirEstado(currentState));
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

  authLog(`buildAuthenticatedHeaders ok em ${path}`, {
    hasAccessToken: true,
    hasUser: Boolean(currentState.user),
  });

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

function extractApiMessage(payload: unknown): { error: string; details?: string } | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as { error?: unknown; details?: unknown; message?: unknown };
  const error = typeof candidate.error === "string"
    ? candidate.error
    : typeof candidate.message === "string"
      ? candidate.message
      : null;

  if (!error) return null;

  return {
    error,
    details: typeof candidate.details === "string" ? candidate.details : undefined,
  };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;
  const headers = await buildAuthenticatedHeaders(path, init?.headers);

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text().catch(() => "");

  if (res.status === 401) {
    const currentState = cloneAuthState(authState);
    const sessaoLocal = await lerSessaoLocal();
    const hasConfirmedToken = Boolean(currentState.accessToken || sessaoLocal?.accessToken);

    authLog(`401 detectado em ${path}`, {
      ...resumirEstado(currentState),
      hasLocalAccessToken: Boolean(sessaoLocal?.accessToken),
      hasLocalUser: Boolean(sessaoLocal?.user),
    });

    if (!hasConfirmedToken) {
      await logoutApp(`401_confirmado_${path}`);
      throw new Error(AUTH_SESSION_EXPIRED);
    }

    throw new Error(AUTH_REQUEST_UNAUTHORIZED);
  }

  if (isHtmlResponse(contentType, body)) {
    throw new Error("A API do app retornou HTML em vez de JSON. Verifique se a rota esta publicada no backend.");
  }

  const payload = parseJsonSafe(body);
  if (payload == null) {
    throw new Error("A API do app nao retornou JSON valido.");
  }

  if (!res.ok) {
    const apiMessage = extractApiMessage(payload);
    if (apiMessage) {
      throw new Error(apiMessage.details ? `${apiMessage.error} Detalhe: ${apiMessage.details}` : apiMessage.error);
    }

    throw new Error(`API ${res.status} ${res.statusText}`);
  }

  return payload as T;
}

void supabase.auth.onAuthStateChange((event, session) => {
  authLog(`listener onAuthStateChange evento=${event}`, {
    hasSession: Boolean(session?.access_token),
    bootstrapInProgress: authControl.bootstrapInProgress,
    logoutInProgress: authControl.logoutInProgress,
    ...resumirEstado(authState),
  });

  if (session?.access_token) {
    void aplicarSessaoEmMemoria(`listener:${event}`, session);
    return;
  }

  if (authControl.logoutInProgress) {
    authLog(`listener ${event} aceito durante logout`);
    return;
  }

  if (authControl.bootstrapInProgress) {
    authLog(`listener ${event} ignorado durante bootstrap`);
    return;
  }

  void lerSessaoLocal().then(async (sessaoLocal) => {
    if (sessaoLocal?.accessToken) {
      authLog(`listener ${event} ignorado por sessao local ainda presente`, {
        hasLocalAccessToken: true,
        hasLocalUser: Boolean(sessaoLocal.user),
      });
      return;
    }

    await limparSessaoLocal(`listener_${event}_sem_storage`);
    setAuthState(`listener:${event}:unauthenticated`, criarEstadoNaoAutenticado(false));
  });
});
