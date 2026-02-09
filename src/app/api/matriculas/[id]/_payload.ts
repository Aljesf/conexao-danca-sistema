/* [INÍCIO DO BLOCO] src/app/api/matriculas/[id]/_payload.ts (novo) */
import { z } from "zod";

export const MotivoSchema = z.object({
  motivo: z.string().min(5, "Motivo obrigatório (mínimo 5 caracteres)."),
});

export type MotivoPayload = z.infer<typeof MotivoSchema>;
/* [FIM DO BLOCO] */
