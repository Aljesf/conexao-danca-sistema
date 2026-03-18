import { z } from "zod";
import { CANCELAMENTO_TIPOS } from "@/lib/matriculas/cancelamento-real";

export const EncerramentoPayloadSchema = z.object({
  motivo: z.string().min(5, "Informe um motivo (min. 5 caracteres)."),
  cancelamento_tipo: z.enum(CANCELAMENTO_TIPOS).optional(),
  gera_perda_financeira: z.boolean().optional(),
});

export type EncerramentoPayload = z.infer<typeof EncerramentoPayloadSchema>;
export type EncerramentoTipo = "CONCLUIDA" | "CANCELADA";
