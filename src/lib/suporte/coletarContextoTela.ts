import type { SuporteContextoTela, SuporteUsuarioContexto } from "./constants";
import { buildSupportScreenContext } from "./screen-context";

export function coletarContextoTela(
  usuario?: Partial<SuporteUsuarioContexto> | null,
): SuporteContextoTela {
  return buildSupportScreenContext(usuario);
}
