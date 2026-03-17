BEGIN;

-- grupo 55|2026-02|9900
-- pessoa: Bruna do Socorro de Amorin de Lima
-- cobranca mantida: 274
-- cobrancas canceladas: 300
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

-- grupo 59|2026-02|42000
-- pessoa: Carla Velasco Silvestre Luján
-- cobranca mantida: 25
-- cobrancas canceladas: 26, 245
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 59|2026-03|42000
-- pessoa: Carla Velasco Silvestre Luján
-- cobranca mantida: 27
-- cobrancas canceladas: 374
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 63|2026-02|11000
-- pessoa: Kamilla Melo Faro
-- cobranca mantida: 138
-- cobrancas canceladas: 238
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

-- grupo 75|2026-02|30334
-- pessoa: Halanna Denise de Oliveira Demétrio
-- cobranca mantida: 61
-- cobrancas canceladas: 242
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

-- grupo 83|2026-02|27000
-- pessoa: Lucianny Van Assche
-- cobranca mantida: 247
-- cobrancas canceladas: 259
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 87|2026-02|12000
-- pessoa: Tedy de Figueiredo da Costa Pinheiro
-- cobranca mantida: 204
-- cobrancas canceladas: 231
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

-- grupo 87|2026-03|12000
-- pessoa: Tedy de Figueiredo da Costa Pinheiro
-- cobranca mantida: 205
-- cobrancas canceladas: 370
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

-- grupo 95|2026-02|27500
-- pessoa: Natália Cintia Assunção Brito
-- cobranca mantida: 38
-- cobrancas canceladas: 244
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 100|2026-03|17600
-- pessoa: Vanessa Aguierre de Amorin
-- cobranca mantida: 402
-- cobrancas canceladas: 413
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 102|2026-02|30800
-- pessoa: Raimundo Nonato Barbosa Pessoa
-- cobranca mantida: 302
-- cobrancas canceladas: 314
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 156|2026-02|11000
-- pessoa: Maria de Nazare de Sousa Moura Monteiro
-- cobranca mantida: 171
-- cobrancas canceladas: 234
-- motivo: MULTIPLO_RECEBIMENTO_LEGADO

-- grupo 193|2026-02|12000
-- pessoa: Cledson Belo da Costa
-- cobranca mantida: 182
-- cobrancas canceladas: 232
-- motivo: RECEBIMENTO_LEGADO_PREVALECE

UPDATE public.cobrancas
SET status = 'CANCELADA'
WHERE id IN (26, 231, 232, 234, 238, 242, 244, 245, 259, 300, 314, 370, 374, 413)
  AND status <> 'CANCELADA';

COMMIT;
