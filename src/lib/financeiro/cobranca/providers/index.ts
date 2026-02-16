import type { ICobrancaProvider, CobrancaProviderCode } from "./types";
import { NeofinProvider } from "./neofinProvider";

const providers: Record<CobrancaProviderCode, ICobrancaProvider> = {
  NEOFIN: new NeofinProvider(),
};

export function getCobrancaProvider(code: CobrancaProviderCode): ICobrancaProvider {
  const provider = providers[code];
  if (!provider) throw new Error(`Provedor de cobranca nao suportado: ${code}`);
  return provider;
}
