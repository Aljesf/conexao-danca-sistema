import { z } from "zod";

export const EncerramentoPayloadSchema = z.object({
  motivo: z.string().min(5, "Informe um motivo (min. 5 caracteres)."),
});

export type EncerramentoPayload = z.infer<typeof EncerramentoPayloadSchema>;
export type EncerramentoTipo = "CONCLUIDA" | "CANCELADA";
