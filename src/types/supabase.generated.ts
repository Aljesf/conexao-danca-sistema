export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          ativo: boolean
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: number
          nome: string
          telefone: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: number
          nome: string
          telefone?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: number
          nome?: string
          telefone?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      alunos_turmas: {
        Row: {
          aluno_id: number
          created_at: string
          dt_fim: string | null
          dt_inicio: string
          id: number
          situacao: string
          turma_id: number
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          aluno_id: number
          created_at?: string
          dt_fim?: string | null
          dt_inicio?: string
          id?: number
          situacao?: string
          turma_id: number
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          aluno_id?: number
          created_at?: string
          dt_fim?: string | null
          dt_inicio?: string
          id?: number
          situacao?: string
          turma_id?: number
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turmas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auth_signup_allowlist: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: number
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: number
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: number
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      avaliacao_aluno_resultado: {
        Row: {
          atualizado_em: string
          avaliador_id: number | null
          conceito_final_id: number | null
          conceitos_por_grupo: Json | null
          criado_em: string
          data_avaliacao: string
          id: number
          observacoes_professor: string | null
          pessoa_id: number
          turma_avaliacao_id: number
        }
        Insert: {
          atualizado_em?: string
          avaliador_id?: number | null
          conceito_final_id?: number | null
          conceitos_por_grupo?: Json | null
          criado_em?: string
          data_avaliacao: string
          id?: number
          observacoes_professor?: string | null
          pessoa_id: number
          turma_avaliacao_id: number
        }
        Update: {
          atualizado_em?: string
          avaliador_id?: number | null
          conceito_final_id?: number | null
          conceitos_por_grupo?: Json | null
          criado_em?: string
          data_avaliacao?: string
          id?: number
          observacoes_professor?: string | null
          pessoa_id?: number
          turma_avaliacao_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_aluno_resultado_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_aluno_resultado_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_aluno_resultado_conceito_final_id_fkey"
            columns: ["conceito_final_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_conceitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_aluno_resultado_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_aluno_resultado_turma_avaliacao_id_fkey"
            columns: ["turma_avaliacao_id"]
            isOneToOne: false
            referencedRelation: "turma_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_conceitos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          codigo: string
          cor_hex: string | null
          criado_em: string
          descricao: string | null
          id: number
          ordem: number
          rotulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          codigo: string
          cor_hex?: string | null
          criado_em?: string
          descricao?: string | null
          id?: number
          ordem?: number
          rotulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string
          cor_hex?: string | null
          criado_em?: string
          descricao?: string | null
          id?: number
          ordem?: number
          rotulo?: string
        }
        Relationships: []
      }
      avaliacoes_modelo: {
        Row: {
          ativo: boolean
          atualizado_em: string
          conceitos_ids: number[]
          criado_em: string
          descricao: string | null
          grupos: Json
          id: number
          nome: string
          obrigatoria: boolean
          tipo_avaliacao: Database["public"]["Enums"]["tipo_avaliacao_enum"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          conceitos_ids?: number[]
          criado_em?: string
          descricao?: string | null
          grupos: Json
          id?: number
          nome: string
          obrigatoria?: boolean
          tipo_avaliacao: Database["public"]["Enums"]["tipo_avaliacao_enum"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          conceitos_ids?: number[]
          criado_em?: string
          descricao?: string | null
          grupos?: Json
          id?: number
          nome?: string
          obrigatoria?: boolean
          tipo_avaliacao?: Database["public"]["Enums"]["tipo_avaliacao_enum"]
        }
        Relationships: []
      }
      bairros: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          created_at: string | null
          estado: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendario_itens_institucionais: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          dominio: string
          em_avaliacao: boolean
          id: number
          periodo_letivo_id: number | null
          ponto_facultativo: boolean
          sem_aula: boolean
          subcategoria: string | null
          titulo: string
          updated_at: string
          updated_by: string | null
          visibilidade: string
        }
        Insert: {
          categoria: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          dominio: string
          em_avaliacao?: boolean
          id?: number
          periodo_letivo_id?: number | null
          ponto_facultativo?: boolean
          sem_aula?: boolean
          subcategoria?: string | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
          visibilidade?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          dominio?: string
          em_avaliacao?: boolean
          id?: number
          periodo_letivo_id?: number | null
          ponto_facultativo?: boolean
          sem_aula?: boolean
          subcategoria?: string | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendario_itens_institucionais_periodo_letivo_id_fkey"
            columns: ["periodo_letivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_letivos"
            referencedColumns: ["id"]
          },
        ]
      }
      cartao_bandeiras: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      cartao_maquinas: {
        Row: {
          ativo: boolean
          centro_custo_id: number
          conta_financeira_id: number
          created_at: string
          id: number
          nome: string
          observacoes: string | null
          operadora: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_id: number
          conta_financeira_id: number
          created_at?: string
          id?: number
          nome: string
          observacoes?: string | null
          operadora?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: number
          conta_financeira_id?: number
          created_at?: string
          id?: number
          nome?: string
          observacoes?: string | null
          operadora?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartao_maquinas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartao_maquinas_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      cartao_recebiveis: {
        Row: {
          bandeira_id: number
          conta_financeira_id: number
          created_at: string
          data_pagamento_real: string | null
          data_prevista_pagamento: string
          id: number
          maquina_id: number
          numero_parcelas: number
          status: string
          taxa_operadora_centavos: number
          updated_at: string
          valor_bruto_centavos: number
          valor_liquido_centavos: number
          venda_id: number
        }
        Insert: {
          bandeira_id: number
          conta_financeira_id: number
          created_at?: string
          data_pagamento_real?: string | null
          data_prevista_pagamento: string
          id?: number
          maquina_id: number
          numero_parcelas?: number
          status?: string
          taxa_operadora_centavos?: number
          updated_at?: string
          valor_bruto_centavos: number
          valor_liquido_centavos: number
          venda_id: number
        }
        Update: {
          bandeira_id?: number
          conta_financeira_id?: number
          created_at?: string
          data_pagamento_real?: string | null
          data_prevista_pagamento?: string
          id?: number
          maquina_id?: number
          numero_parcelas?: number
          status?: string
          taxa_operadora_centavos?: number
          updated_at?: string
          valor_bruto_centavos?: number
          valor_liquido_centavos?: number
          venda_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cartao_recebiveis_bandeira_id_fkey"
            columns: ["bandeira_id"]
            isOneToOne: false
            referencedRelation: "cartao_bandeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartao_recebiveis_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartao_recebiveis_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "cartao_maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartao_recebiveis_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "loja_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cartao_regras_operacao: {
        Row: {
          ativo: boolean
          bandeira_id: number
          created_at: string
          id: number
          maquina_id: number
          max_parcelas: number
          permitir_parcelado: boolean
          prazo_recebimento_dias: number
          taxa_fixa_centavos: number
          taxa_percentual: number
          tipo_transacao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bandeira_id: number
          created_at?: string
          id?: number
          maquina_id: number
          max_parcelas?: number
          permitir_parcelado?: boolean
          prazo_recebimento_dias?: number
          taxa_fixa_centavos?: number
          taxa_percentual?: number
          tipo_transacao: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bandeira_id?: number
          created_at?: string
          id?: number
          maquina_id?: number
          max_parcelas?: number
          permitir_parcelado?: boolean
          prazo_recebimento_dias?: number
          taxa_fixa_centavos?: number
          taxa_percentual?: number
          tipo_transacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartao_regras_operacao_bandeira_id_fkey"
            columns: ["bandeira_id"]
            isOneToOne: false
            referencedRelation: "cartao_bandeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartao_regras_operacao_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "cartao_maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          codigo: string
          id: number
          nome: string
          plano_conta_id: number | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          id?: number
          nome: string
          plano_conta_id?: number | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          id?: number
          nome?: string
          plano_conta_id?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          codigo: string
          contextos_aplicaveis: string[]
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          contextos_aplicaveis?: string[]
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          contextos_aplicaveis?: string[]
          id?: number
          nome?: string
        }
        Relationships: []
      }
      cobrancas: {
        Row: {
          centro_custo_id: number | null
          competencia_ano_mes: string | null
          created_at: string | null
          data_inicio_encargos: string | null
          data_pagamento: string | null
          data_prevista_pagamento: string | null
          descricao: string
          id: number
          juros_mora_percentual_mensal_aplicavel: number | null
          linha_digitavel: string | null
          link_pagamento: string | null
          metodo_pagamento: string | null
          moeda: string
          multa_percentual_aplicavel: number | null
          neofin_charge_id: string | null
          neofin_payload: Json | null
          observacoes: string | null
          origem_id: number | null
          origem_subtipo: string | null
          origem_tipo: string | null
          parcela_numero: number | null
          pessoa_id: number
          status: string
          total_parcelas: number | null
          updated_at: string | null
          valor_centavos: number
          vencimento: string
        }
        Insert: {
          centro_custo_id?: number | null
          competencia_ano_mes?: string | null
          created_at?: string | null
          data_inicio_encargos?: string | null
          data_pagamento?: string | null
          data_prevista_pagamento?: string | null
          descricao: string
          id?: number
          juros_mora_percentual_mensal_aplicavel?: number | null
          linha_digitavel?: string | null
          link_pagamento?: string | null
          metodo_pagamento?: string | null
          moeda?: string
          multa_percentual_aplicavel?: number | null
          neofin_charge_id?: string | null
          neofin_payload?: Json | null
          observacoes?: string | null
          origem_id?: number | null
          origem_subtipo?: string | null
          origem_tipo?: string | null
          parcela_numero?: number | null
          pessoa_id: number
          status?: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor_centavos: number
          vencimento: string
        }
        Update: {
          centro_custo_id?: number | null
          competencia_ano_mes?: string | null
          created_at?: string | null
          data_inicio_encargos?: string | null
          data_pagamento?: string | null
          data_prevista_pagamento?: string | null
          descricao?: string
          id?: number
          juros_mora_percentual_mensal_aplicavel?: number | null
          linha_digitavel?: string | null
          link_pagamento?: string | null
          metodo_pagamento?: string | null
          moeda?: string
          multa_percentual_aplicavel?: number | null
          neofin_charge_id?: string | null
          neofin_payload?: Json | null
          observacoes?: string | null
          origem_id?: number | null
          origem_subtipo?: string | null
          origem_tipo?: string | null
          parcela_numero?: number | null
          pessoa_id?: number
          status?: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor_centavos?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_funcoes: {
        Row: {
          ativo: boolean
          colaborador_id: number
          funcao_id: number
          id: number
          principal: boolean
        }
        Insert: {
          ativo?: boolean
          colaborador_id: number
          funcao_id: number
          id?: number
          principal?: boolean
        }
        Update: {
          ativo?: boolean
          colaborador_id?: number
          funcao_id?: number
          id?: number
          principal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_funcoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_funcoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_funcoes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes_colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_funcoes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["funcao_id"]
          },
        ]
      }
      colaborador_jornada: {
        Row: {
          ativo: boolean
          colaborador_id: number
          created_at: string
          fim_vigencia: string | null
          id: number
          inicio_vigencia: string
          observacoes: string | null
          tipo_vinculo_id: number | null
        }
        Insert: {
          ativo?: boolean
          colaborador_id: number
          created_at?: string
          fim_vigencia?: string | null
          id?: number
          inicio_vigencia: string
          observacoes?: string | null
          tipo_vinculo_id?: number | null
        }
        Update: {
          ativo?: boolean
          colaborador_id?: number
          created_at?: string
          fim_vigencia?: string | null
          id?: number
          inicio_vigencia?: string
          observacoes?: string | null
          tipo_vinculo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_jornada_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_jornada_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_jornada_tipo_vinculo_id_fkey"
            columns: ["tipo_vinculo_id"]
            isOneToOne: false
            referencedRelation: "tipos_vinculo_colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_jornada_dias: {
        Row: {
          ativo: boolean
          dia_semana: string
          entrada_1: string | null
          entrada_2: string | null
          id: number
          jornada_id: number
          saida_1: string | null
          saida_2: string | null
        }
        Insert: {
          ativo?: boolean
          dia_semana: string
          entrada_1?: string | null
          entrada_2?: string | null
          id?: number
          jornada_id: number
          saida_1?: string | null
          saida_2?: string | null
        }
        Update: {
          ativo?: boolean
          dia_semana?: string
          entrada_1?: string | null
          entrada_2?: string | null
          id?: number
          jornada_id?: number
          saida_1?: string | null
          saida_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_jornada_dias_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "colaborador_jornada"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          centro_custo_id: number | null
          data_fim: string | null
          data_inicio: string | null
          id: number
          observacoes: string | null
          pessoa_id: number
          tipo_vinculo: string | null
          tipo_vinculo_id: number | null
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: number
          observacoes?: string | null
          pessoa_id: number
          tipo_vinculo?: string | null
          tipo_vinculo_id?: number | null
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: number
          observacoes?: string | null
          pessoa_id?: number
          tipo_vinculo?: string | null
          tipo_vinculo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_tipo_vinculo_id_fkey"
            columns: ["tipo_vinculo_id"]
            isOneToOne: false
            referencedRelation: "tipos_vinculo_colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      config_pagamento_colaborador: {
        Row: {
          ativo: boolean
          colaborador_id: number
          funcao_id: number | null
          id: number
          modelo_pagamento_id: number
          observacoes: string | null
          valor_centavos: number | null
        }
        Insert: {
          ativo?: boolean
          colaborador_id: number
          funcao_id?: number | null
          id?: number
          modelo_pagamento_id: number
          observacoes?: string | null
          valor_centavos?: number | null
        }
        Update: {
          ativo?: boolean
          colaborador_id?: number
          funcao_id?: number | null
          id?: number
          modelo_pagamento_id?: number
          observacoes?: string | null
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "config_pagamento_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_pagamento_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_pagamento_colaborador_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes_colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_pagamento_colaborador_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["funcao_id"]
          },
          {
            foreignKeyName: "config_pagamento_colaborador_modelo_pagamento_id_fkey"
            columns: ["modelo_pagamento_id"]
            isOneToOne: false
            referencedRelation: "modelos_pagamento_colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_financeiras: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          centro_custo_id: number | null
          codigo: string
          created_at: string
          id: number
          nome: string
          numero_conta: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          centro_custo_id?: number | null
          codigo: string
          created_at?: string
          id?: number
          nome: string
          numero_conta?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          centro_custo_id?: number | null
          codigo?: string
          created_at?: string
          id?: number
          nome?: string
          numero_conta?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria_id: number | null
          centro_custo_id: number
          created_at: string
          data_pagamento: string | null
          descricao: string
          id: number
          metodo_pagamento: string | null
          observacoes: string | null
          pessoa_id: number | null
          status: string
          updated_at: string
          valor_centavos: number
          vencimento: string
        }
        Insert: {
          categoria_id?: number | null
          centro_custo_id: number
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          id?: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          pessoa_id?: number | null
          status?: string
          updated_at?: string
          valor_centavos: number
          vencimento: string
        }
        Update: {
          categoria_id?: number | null
          centro_custo_id?: number
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          id?: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          pessoa_id?: number | null
          status?: string
          updated_at?: string
          valor_centavos?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar_pagamentos: {
        Row: {
          cartao_bandeira_id: number | null
          cartao_maquina_id: number | null
          cartao_numero_parcelas: number | null
          centro_custo_id: number
          conta_financeira_id: number | null
          conta_pagar_id: number
          created_at: string
          data_pagamento: string
          desconto_centavos: number
          forma_pagamento_codigo: string | null
          id: number
          juros_centavos: number
          metodo_pagamento: string | null
          observacoes: string | null
          usuario_id: string | null
          valor_principal_centavos: number
        }
        Insert: {
          cartao_bandeira_id?: number | null
          cartao_maquina_id?: number | null
          cartao_numero_parcelas?: number | null
          centro_custo_id: number
          conta_financeira_id?: number | null
          conta_pagar_id: number
          created_at?: string
          data_pagamento: string
          desconto_centavos?: number
          forma_pagamento_codigo?: string | null
          id?: number
          juros_centavos?: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          usuario_id?: string | null
          valor_principal_centavos: number
        }
        Update: {
          cartao_bandeira_id?: number | null
          cartao_maquina_id?: number | null
          cartao_numero_parcelas?: number | null
          centro_custo_id?: number
          conta_financeira_id?: number | null
          conta_pagar_id?: number
          created_at?: string
          data_pagamento?: string
          desconto_centavos?: number
          forma_pagamento_codigo?: string | null
          id?: number
          juros_centavos?: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          usuario_id?: string | null
          valor_principal_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_pagamentos_cartao_bandeira_id_fkey"
            columns: ["cartao_bandeira_id"]
            isOneToOne: false
            referencedRelation: "cartao_bandeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pagamentos_cartao_maquina_id_fkey"
            columns: ["cartao_maquina_id"]
            isOneToOne: false
            referencedRelation: "cartao_maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pagamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pagamentos_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pagamentos_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_emitidos: {
        Row: {
          conteudo_renderizado_md: string
          contrato_modelo_id: number
          created_at: string
          created_by: string | null
          hash_conteudo: string | null
          id: number
          matricula_id: number
          pdf_url: string | null
          snapshot_financeiro_json: Json
          status_assinatura: string
          updated_at: string
          variaveis_utilizadas_json: Json
        }
        Insert: {
          conteudo_renderizado_md: string
          contrato_modelo_id: number
          created_at?: string
          created_by?: string | null
          hash_conteudo?: string | null
          id?: number
          matricula_id: number
          pdf_url?: string | null
          snapshot_financeiro_json?: Json
          status_assinatura?: string
          updated_at?: string
          variaveis_utilizadas_json?: Json
        }
        Update: {
          conteudo_renderizado_md?: string
          contrato_modelo_id?: number
          created_at?: string
          created_by?: string | null
          hash_conteudo?: string | null
          id?: number
          matricula_id?: number
          pdf_url?: string | null
          snapshot_financeiro_json?: Json
          status_assinatura?: string
          updated_at?: string
          variaveis_utilizadas_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contratos_emitidos_contrato_modelo_id_fkey1"
            columns: ["contrato_modelo_id"]
            isOneToOne: false
            referencedRelation: "contratos_modelo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_emitidos_matricula_fk"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_emitidos_termos: {
        Row: {
          contrato_emitido_id: number
          created_at: string
          termo_modelo_id: number
          versao: string | null
        }
        Insert: {
          contrato_emitido_id: number
          created_at?: string
          termo_modelo_id: number
          versao?: string | null
        }
        Update: {
          contrato_emitido_id?: number
          created_at?: string
          termo_modelo_id?: number
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_emitidos_termos_contrato_emitido_id_fkey1"
            columns: ["contrato_emitido_id"]
            isOneToOne: false
            referencedRelation: "contratos_emitidos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_modelo: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          observacoes: string | null
          placeholders_schema_json: Json
          texto_modelo_md: string
          tipo_contrato: string
          titulo: string
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          observacoes?: string | null
          placeholders_schema_json?: Json
          texto_modelo_md: string
          tipo_contrato: string
          titulo: string
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          observacoes?: string | null
          placeholders_schema_json?: Json
          texto_modelo_md?: string
          tipo_contrato?: string
          titulo?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      credito_conexao_configuracoes: {
        Row: {
          ativo: boolean
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          id: number
          juros_dia_percentual: number
          multa_percentual: number
          tipo_conta: string
          tolerancia_dias: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_fechamento: number
          dia_vencimento: number
          id?: number
          juros_dia_percentual?: number
          multa_percentual?: number
          tipo_conta: string
          tolerancia_dias?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: number
          juros_dia_percentual?: number
          multa_percentual?: number
          tipo_conta?: string
          tolerancia_dias?: number
          updated_at?: string
        }
        Relationships: []
      }
      credito_conexao_contas: {
        Row: {
          ativo: boolean
          categoria_taxas_id: number | null
          centro_custo_intermediacao_id: number | null
          centro_custo_principal_id: number | null
          conta_financeira_destino_id: number | null
          conta_financeira_origem_id: number | null
          created_at: string
          descricao_exibicao: string | null
          dia_fechamento: number
          dia_vencimento: number | null
          id: number
          limite_autorizado_centavos: number | null
          limite_maximo_centavos: number | null
          pessoa_titular_id: number
          responsavel_financeiro_pessoa_id: number | null
          tipo_conta: string
          tipo_liquidacao: string | null
          tipo_titular: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_taxas_id?: number | null
          centro_custo_intermediacao_id?: number | null
          centro_custo_principal_id?: number | null
          conta_financeira_destino_id?: number | null
          conta_financeira_origem_id?: number | null
          created_at?: string
          descricao_exibicao?: string | null
          dia_fechamento?: number
          dia_vencimento?: number | null
          id?: number
          limite_autorizado_centavos?: number | null
          limite_maximo_centavos?: number | null
          pessoa_titular_id: number
          responsavel_financeiro_pessoa_id?: number | null
          tipo_conta: string
          tipo_liquidacao?: string | null
          tipo_titular?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_taxas_id?: number | null
          centro_custo_intermediacao_id?: number | null
          centro_custo_principal_id?: number | null
          conta_financeira_destino_id?: number | null
          conta_financeira_origem_id?: number | null
          created_at?: string
          descricao_exibicao?: string | null
          dia_fechamento?: number
          dia_vencimento?: number | null
          id?: number
          limite_autorizado_centavos?: number | null
          limite_maximo_centavos?: number | null
          pessoa_titular_id?: number
          responsavel_financeiro_pessoa_id?: number | null
          tipo_conta?: string
          tipo_liquidacao?: string | null
          tipo_titular?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credito_conexao_contas_centro_custo_fkey"
            columns: ["centro_custo_principal_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_contas_conta_financeira_destino_fkey"
            columns: ["conta_financeira_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_contas_conta_financeira_origem_fkey"
            columns: ["conta_financeira_origem_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_contas_pessoa_titular_fkey"
            columns: ["pessoa_titular_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_contas_responsavel_financeiro_pessoa_id_fkey"
            columns: ["responsavel_financeiro_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_conexao_fatura_lancamentos: {
        Row: {
          created_at: string
          fatura_id: number
          lancamento_id: number
        }
        Insert: {
          created_at?: string
          fatura_id: number
          lancamento_id: number
        }
        Update: {
          created_at?: string
          fatura_id?: number
          lancamento_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "credito_conexao_fatura_lancamentos_fatura_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "credito_conexao_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_fatura_lancamentos_lancamento_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "credito_conexao_lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_conexao_faturas: {
        Row: {
          cobranca_id: number | null
          conta_conexao_id: number
          created_at: string
          data_fechamento: string
          data_vencimento: string | null
          folha_pagamento_id: number | null
          id: number
          neofin_invoice_id: string | null
          periodo_referencia: string
          status: string
          updated_at: string
          valor_taxas_centavos: number
          valor_total_centavos: number
        }
        Insert: {
          cobranca_id?: number | null
          conta_conexao_id: number
          created_at?: string
          data_fechamento: string
          data_vencimento?: string | null
          folha_pagamento_id?: number | null
          id?: number
          neofin_invoice_id?: string | null
          periodo_referencia: string
          status?: string
          updated_at?: string
          valor_taxas_centavos?: number
          valor_total_centavos: number
        }
        Update: {
          cobranca_id?: number | null
          conta_conexao_id?: number
          created_at?: string
          data_fechamento?: string
          data_vencimento?: string | null
          folha_pagamento_id?: number | null
          id?: number
          neofin_invoice_id?: string | null
          periodo_referencia?: string
          status?: string
          updated_at?: string
          valor_taxas_centavos?: number
          valor_total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "credito_conexao_faturas_cobranca_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_faturas_cobranca_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "vw_governanca_boletos_neofin"
            referencedColumns: ["cobranca_id"]
          },
          {
            foreignKeyName: "credito_conexao_faturas_conta_fkey"
            columns: ["conta_conexao_id"]
            isOneToOne: false
            referencedRelation: "credito_conexao_contas"
            referencedColumns: ["id"]
          },
        ]
      }
        credito_conexao_lancamentos: {
          Row: {
            aluno_id: number | null
            centro_custo_id: number | null
            cobranca_id: number | null
            competencia: string | null
            composicao_json: Json | null
            conta_conexao_id: number
          created_at: string
          data_lancamento: string
          descricao: string | null
          id: number
          matricula_id: number | null
          numero_parcelas: number | null
          origem_id: number | null
          origem_sistema: string
          referencia_item: string | null
          status: string
          updated_at: string
          valor_centavos: number
        }
          Insert: {
            aluno_id?: number | null
            centro_custo_id?: number | null
            cobranca_id?: number | null
            competencia?: string | null
            composicao_json?: Json | null
            conta_conexao_id: number
          created_at?: string
          data_lancamento?: string
          descricao?: string | null
          id?: number
          matricula_id?: number | null
          numero_parcelas?: number | null
          origem_id?: number | null
          origem_sistema: string
          referencia_item?: string | null
          status?: string
          updated_at?: string
          valor_centavos: number
        }
          Update: {
            aluno_id?: number | null
            centro_custo_id?: number | null
            cobranca_id?: number | null
            competencia?: string | null
            composicao_json?: Json | null
            conta_conexao_id?: number
          created_at?: string
          data_lancamento?: string
          descricao?: string | null
          id?: number
          matricula_id?: number | null
          numero_parcelas?: number | null
          origem_id?: number | null
          origem_sistema?: string
          referencia_item?: string | null
          status?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "credito_conexao_lancamentos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: true
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_lancamentos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: true
            referencedRelation: "vw_governanca_boletos_neofin"
            referencedColumns: ["cobranca_id"]
          },
            {
              foreignKeyName: "credito_conexao_lancamentos_aluno_id_fkey"
              columns: ["aluno_id"]
              isOneToOne: false
              referencedRelation: "pessoas"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "credito_conexao_lancamentos_centro_custo_id_fkey"
              columns: ["centro_custo_id"]
              isOneToOne: false
              referencedRelation: "centros_custo"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "credito_conexao_lancamentos_conta_fkey"
              columns: ["conta_conexao_id"]
              isOneToOne: false
              referencedRelation: "credito_conexao_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_lancamentos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_conexao_regras_parcelas: {
        Row: {
          ativo: boolean
          categoria_financeira_id: number | null
          centro_custo_id: number | null
          created_at: string
          id: number
          numero_parcelas_max: number
          numero_parcelas_min: number
          taxa_fixa_centavos: number
          taxa_percentual: number
          tipo_conta: string
          updated_at: string
          valor_minimo_centavos: number
        }
        Insert: {
          ativo?: boolean
          categoria_financeira_id?: number | null
          centro_custo_id?: number | null
          created_at?: string
          id?: number
          numero_parcelas_max: number
          numero_parcelas_min: number
          taxa_fixa_centavos?: number
          taxa_percentual?: number
          tipo_conta: string
          updated_at?: string
          valor_minimo_centavos?: number
        }
        Update: {
          ativo?: boolean
          categoria_financeira_id?: number | null
          centro_custo_id?: number | null
          created_at?: string
          id?: number
          numero_parcelas_max?: number
          numero_parcelas_min?: number
          taxa_fixa_centavos?: number
          taxa_percentual?: number
          tipo_conta?: string
          updated_at?: string
          valor_minimo_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "credito_conexao_regras_parcelas_cat_fk"
            columns: ["categoria_financeira_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_conexao_regras_parcelas_cc_fk"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          created_at: string
          id: number
          metodologia: string | null
          nome: string
          observacoes: string | null
          situacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          metodologia?: string | null
          nome: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          metodologia?: string | null
          nome?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      debug_vercel_pings: {
        Row: {
          created_at: string
          id: number
          payload: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: number
          payload?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json | null
          source?: string
        }
        Relationships: []
      }
      documentos_colecoes: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: number
          nome: string
          ordem: number
          root_tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: number
          nome: string
          ordem?: number
          root_tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: number
          nome?: string
          ordem?: number
          root_tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_colecoes_colunas: {
        Row: {
          ativo: boolean
          codigo: string
          colecao_id: number
          created_at: string
          formato: string | null
          id: number
          label: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          colecao_id: number
          created_at?: string
          formato?: string | null
          id?: number
          label: string
          ordem?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          colecao_id?: number
          created_at?: string
          formato?: string | null
          id?: number
          label?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_colecoes_colunas_colecao_id_fkey"
            columns: ["colecao_id"]
            isOneToOne: false
            referencedRelation: "documentos_colecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_conjuntos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: never
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: never
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_conjuntos_grupos: {
        Row: {
          ativo: boolean | null
          conjunto_id: number | null
          created_at: string | null
          grupo_id: number | null
          id: number
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          conjunto_id?: number | null
          created_at?: string | null
          grupo_id?: number | null
          id?: number
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          conjunto_id?: number | null
          created_at?: string | null
          grupo_id?: number | null
          id?: number
          ordem?: number | null
        }
        Relationships: []
      }
      documentos_conjuntos_grupos_modelos: {
        Row: {
          ativo: boolean
          conjunto_grupo_id: number
          created_at: string
          grupo_modelo_id: number
          modelo_id: number
          ordem: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          conjunto_grupo_id: number
          created_at?: string
          grupo_modelo_id?: number
          modelo_id: number
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          conjunto_grupo_id?: number
          created_at?: string
          grupo_modelo_id?: number
          modelo_id?: number
          ordem?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_cgm_modelo_fk"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "documentos_modelo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emitidos: {
        Row: {
          cabecalho_html: string | null
          conteudo_renderizado_md: string
          conteudo_resolvido_html: string | null
          conteudo_template_html: string | null
          contexto_json: Json | null
          contrato_modelo_id: number
          created_at: string
          created_by: string | null
          documento_conjunto_id: number | null
          documento_grupo_id: number | null
          editado_manual: boolean
          footer_height_px: number
          footer_html: string | null
          hash_conteudo: string | null
          header_height_px: number
          header_html: string | null
          id: number
          matricula_id: number
          page_margin_mm: number
          pdf_url: string | null
          rodape_html: string | null
          snapshot_financeiro_json: Json
          status_assinatura: string
          updated_at: string
          variaveis_utilizadas_json: Json
        }
        Insert: {
          cabecalho_html?: string | null
          conteudo_renderizado_md: string
          conteudo_resolvido_html?: string | null
          conteudo_template_html?: string | null
          contexto_json?: Json | null
          contrato_modelo_id: number
          created_at?: string
          created_by?: string | null
          documento_conjunto_id?: number | null
          documento_grupo_id?: number | null
          editado_manual?: boolean
          footer_height_px?: number
          footer_html?: string | null
          hash_conteudo?: string | null
          header_height_px?: number
          header_html?: string | null
          id?: number
          matricula_id: number
          page_margin_mm?: number
          pdf_url?: string | null
          rodape_html?: string | null
          snapshot_financeiro_json?: Json
          status_assinatura?: string
          updated_at?: string
          variaveis_utilizadas_json?: Json
        }
        Update: {
          cabecalho_html?: string | null
          conteudo_renderizado_md?: string
          conteudo_resolvido_html?: string | null
          conteudo_template_html?: string | null
          contexto_json?: Json | null
          contrato_modelo_id?: number
          created_at?: string
          created_by?: string | null
          documento_conjunto_id?: number | null
          documento_grupo_id?: number | null
          editado_manual?: boolean
          footer_height_px?: number
          footer_html?: string | null
          hash_conteudo?: string | null
          header_height_px?: number
          header_html?: string | null
          id?: number
          matricula_id?: number
          page_margin_mm?: number
          pdf_url?: string | null
          rodape_html?: string | null
          snapshot_financeiro_json?: Json
          status_assinatura?: string
          updated_at?: string
          variaveis_utilizadas_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contratos_emitidos_contrato_modelo_id_fkey"
            columns: ["contrato_modelo_id"]
            isOneToOne: false
            referencedRelation: "documentos_modelo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_conjunto_fk"
            columns: ["documento_conjunto_id"]
            isOneToOne: false
            referencedRelation: "documentos_conjuntos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_grupo_fk"
            columns: ["documento_grupo_id"]
            isOneToOne: false
            referencedRelation: "documentos_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_matricula_fk"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emitidos_termos: {
        Row: {
          contrato_emitido_id: number
          created_at: string
          termo_modelo_id: number
          versao: string | null
        }
        Insert: {
          contrato_emitido_id: number
          created_at?: string
          termo_modelo_id: number
          versao?: string | null
        }
        Update: {
          contrato_emitido_id?: number
          created_at?: string
          termo_modelo_id?: number
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_emitidos_termos_contrato_emitido_id_fkey"
            columns: ["contrato_emitido_id"]
            isOneToOne: false
            referencedRelation: "documentos_emitidos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_grupos: {
        Row: {
          ativo: boolean
          codigo: string
          conjunto_id: number
          created_at: string
          descricao: string | null
          id: number
          nome: string
          obrigatorio: boolean
          ordem: number
          papel: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conjunto_id: number
          created_at?: string
          descricao?: string | null
          id?: never
          nome: string
          obrigatorio?: boolean
          ordem?: number
          papel?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conjunto_id?: number
          created_at?: string
          descricao?: string | null
          id?: never
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          papel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_grupos_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "documentos_conjuntos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_imagens: {
        Row: {
          altura: number | null
          ativo: boolean
          bucket: string
          created_at: string
          imagem_id: number
          largura: number | null
          mime_type: string | null
          nome: string
          path: string
          public_url: string
          tags: string[]
          tamanho_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          bucket?: string
          created_at?: string
          imagem_id?: number
          largura?: number | null
          mime_type?: string | null
          nome: string
          path: string
          public_url: string
          tags?: string[]
          tamanho_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          bucket?: string
          created_at?: string
          imagem_id?: number
          largura?: number | null
          mime_type?: string | null
          nome?: string
          path?: string
          public_url?: string
          tags?: string[]
          tamanho_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos_layout_templates: {
        Row: {
          ativo: boolean
          created_at: string
          height_px: number
          html: string
          layout_template_id: number
          nome: string
          tags: string[]
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          height_px?: number
          html?: string
          layout_template_id?: number
          nome: string
          tags?: string[]
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          height_px?: number
          html?: string
          layout_template_id?: number
          nome?: string
          tags?: string[]
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos_layouts: {
        Row: {
          ativo: boolean
          cabecalho_html: string | null
          created_at: string
          layout_id: number
          nome: string
          rodape_html: string | null
          tags: string[]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cabecalho_html?: string | null
          created_at?: string
          layout_id?: number
          nome: string
          rodape_html?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cabecalho_html?: string | null
          created_at?: string
          layout_id?: number
          nome?: string
          rodape_html?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos_modelo: {
        Row: {
          ai_source_text: string | null
          ai_sugestoes_json: Json | null
          ai_updated_at: string | null
          ativo: boolean
          cabecalho_html: string | null
          conteudo_html: string | null
          created_at: string
          footer_height_px: number
          footer_template_id: number | null
          formato: string
          header_height_px: number
          header_template_id: number | null
          id: number
          layout_id: number | null
          observacoes: string | null
          page_margin_mm: number
          placeholders_schema_json: Json
          rodape_html: string | null
          texto_modelo_md: string
          tipo_documento_id: number | null
          titulo: string
          updated_at: string
          versao: string
        }
        Insert: {
          ai_source_text?: string | null
          ai_sugestoes_json?: Json | null
          ai_updated_at?: string | null
          ativo?: boolean
          cabecalho_html?: string | null
          conteudo_html?: string | null
          created_at?: string
          footer_height_px?: number
          footer_template_id?: number | null
          formato?: string
          header_height_px?: number
          header_template_id?: number | null
          id?: number
          layout_id?: number | null
          observacoes?: string | null
          page_margin_mm?: number
          placeholders_schema_json?: Json
          rodape_html?: string | null
          texto_modelo_md: string
          tipo_documento_id?: number | null
          titulo: string
          updated_at?: string
          versao?: string
        }
        Update: {
          ai_source_text?: string | null
          ai_sugestoes_json?: Json | null
          ai_updated_at?: string | null
          ativo?: boolean
          cabecalho_html?: string | null
          conteudo_html?: string | null
          created_at?: string
          footer_height_px?: number
          footer_template_id?: number | null
          formato?: string
          header_height_px?: number
          header_template_id?: number | null
          id?: number
          layout_id?: number | null
          observacoes?: string | null
          page_margin_mm?: number
          placeholders_schema_json?: Json
          rodape_html?: string | null
          texto_modelo_md?: string
          tipo_documento_id?: number | null
          titulo?: string
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_modelo_footer_template_fk"
            columns: ["footer_template_id"]
            isOneToOne: false
            referencedRelation: "documentos_layout_templates"
            referencedColumns: ["layout_template_id"]
          },
          {
            foreignKeyName: "documentos_modelo_header_template_fk"
            columns: ["header_template_id"]
            isOneToOne: false
            referencedRelation: "documentos_layout_templates"
            referencedColumns: ["layout_template_id"]
          },
          {
            foreignKeyName: "documentos_modelo_layout_fk"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "documentos_layouts"
            referencedColumns: ["layout_id"]
          },
          {
            foreignKeyName: "documentos_modelo_tipo_documento_fk"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_tipos"
            referencedColumns: ["tipo_documento_id"]
          },
        ]
      }
      documentos_tipos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          nome: string
          tipo_documento_id: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          nome: string
          tipo_documento_id?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          nome?: string
          tipo_documento_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos_variaveis: {
        Row: {
          ai_gerada: boolean
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          display_label: string | null
          formato: string | null
          id: number
          join_path: Json | null
          mapeamento_pendente: boolean
          origem: string
          path_labels: Json | null
          path_origem: string | null
          root_pk_column: string | null
          root_table: string | null
          target_column: string | null
          target_table: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ai_gerada?: boolean
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          display_label?: string | null
          formato?: string | null
          id?: never
          join_path?: Json | null
          mapeamento_pendente?: boolean
          origem: string
          path_labels?: Json | null
          path_origem?: string | null
          root_pk_column?: string | null
          root_table?: string | null
          target_column?: string | null
          target_table?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ai_gerada?: boolean
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          display_label?: string | null
          formato?: string | null
          id?: never
          join_path?: Json | null
          mapeamento_pendente?: boolean
          origem?: string
          path_labels?: Json | null
          path_origem?: string | null
          root_pk_column?: string | null
          root_table?: string | null
          target_column?: string | null
          target_table?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      endereco: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          endereco_id: number
          logradouro: string | null
          numero: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          endereco_id?: number
          logradouro?: string | null
          numero?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          endereco_id?: number
          logradouro?: string | null
          numero?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string | null
          bairro_id: number | null
          cep: string | null
          cidade: string
          cidade_id: number | null
          complemento: string | null
          created_at: string
          id: number
          logradouro: string
          numero: string | null
          referencia: string | null
          uf: string
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          bairro_id?: number | null
          cep?: string | null
          cidade: string
          cidade_id?: number | null
          complemento?: string | null
          created_at?: string
          id?: number
          logradouro: string
          numero?: string | null
          referencia?: string | null
          uf: string
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          bairro_id?: number | null
          cep?: string | null
          cidade?: string
          cidade_id?: number | null
          complemento?: string | null
          created_at?: string
          id?: number
          logradouro?: string
          numero?: string | null
          referencia?: string | null
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "enderecos_bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enderecos_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos_bairros: {
        Row: {
          cidade_id: number
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          cidade_id: number
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          cidade_id?: number
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_bairros_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos_cidades: {
        Row: {
          created_at: string
          id: number
          nome: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          uf?: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      enderecos_pessoa: {
        Row: {
          bairro: string | null
          bairro_id: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          logradouro: string | null
          numero: string | null
          pessoa_id: number | null
          referencia: string | null
          rua_id: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          bairro_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          pessoa_id?: number | null
          referencia?: string | null
          rua_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          bairro_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          pessoa_id?: number | null
          referencia?: string | null
          rua_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_pessoa_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enderecos_pessoa_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: true
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enderecos_pessoa_rua_id_fkey"
            columns: ["rua_id"]
            isOneToOne: false
            referencedRelation: "ruas"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_config_financeira: {
        Row: {
          centro_custo_intermediacao_financeira_id: number | null
          centro_custo_padrao_escola_id: number | null
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          centro_custo_intermediacao_financeira_id?: number | null
          centro_custo_padrao_escola_id?: number | null
          created_at?: string
          id: number
          updated_at?: string
        }
        Update: {
          centro_custo_intermediacao_financeira_id?: number | null
          centro_custo_padrao_escola_id?: number | null
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_config_financeira_centro_custo_intermediacao_financ_fkey"
            columns: ["centro_custo_intermediacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_config_financeira_centro_custo_padrao_escola_id_fkey"
            columns: ["centro_custo_padrao_escola_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_contextos_matricula: {
        Row: {
          ano_referencia: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: number
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: number
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: number
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      escola_produtos_educacionais: {
        Row: {
          ativo: boolean
          contexto_matricula_id: number | null
          created_at: string
          curso_id: number | null
          id: number
          tier_grupo_id: number | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contexto_matricula_id?: number | null
          created_at?: string
          curso_id?: number | null
          id?: number
          tier_grupo_id?: number | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contexto_matricula_id?: number | null
          created_at?: string
          curso_id?: number | null
          id?: number
          tier_grupo_id?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_produtos_educacionais_contexto_matricula_id_fkey"
            columns: ["contexto_matricula_id"]
            isOneToOne: false
            referencedRelation: "escola_contextos_matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_produtos_educacionais_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_produtos_educacionais_tier_grupo_id_fkey"
            columns: ["tier_grupo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_tier_grupos"
            referencedColumns: ["tier_grupo_id"]
          },
        ]
      }
      escola_tabelas_precos_cursos: {
        Row: {
          ano_referencia: number | null
          ativo: boolean
          created_at: string
          id: number
          observacoes: string | null
          referencia_id: number | null
          referencia_tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: never
          observacoes?: string | null
          referencia_id?: number | null
          referencia_tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: never
          observacoes?: string | null
          referencia_id?: number | null
          referencia_tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      escola_tabelas_precos_cursos_itens: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: number
          moeda: string
          ordem: number
          tabela_id: number
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: never
          moeda?: string
          ordem?: number
          tabela_id: number
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: never
          moeda?: string
          ordem?: number
          tabela_id?: number
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "escola_tabelas_precos_cursos_itens_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "escola_tabelas_precos_cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_unidades_execucao: {
        Row: {
          ativo: boolean
          created_at: string
          denominacao: string
          nome: string
          origem_id: number | null
          origem_tipo: string
          servico_id: number
          unidade_execucao_id: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          denominacao: string
          nome: string
          origem_id?: number | null
          origem_tipo: string
          servico_id: number
          unidade_execucao_id?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          denominacao?: string
          nome?: string
          origem_id?: number | null
          origem_tipo?: string
          servico_id?: number
          unidade_execucao_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_unidades_execucao_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "escola_produtos_educacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      espacos: {
        Row: {
          ativo: boolean
          capacidade: number | null
          created_at: string
          id: number
          local_id: number
          nome: string
          observacoes: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          id?: number
          local_id: number
          nome: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          id?: number
          local_id?: number
          nome?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "espacos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_internos: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          descricao: string | null
          dominio: string
          fim: string | null
          formato: string
          id: number
          inicio: string
          local: string | null
          origem_tipo: string
          periodo_letivo_id: number | null
          status: string
          subcategoria: string | null
          titulo: string
          updated_at: string
          updated_by: string | null
          visibilidade: string
        }
        Insert: {
          categoria: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dominio: string
          fim?: string | null
          formato?: string
          id?: number
          inicio: string
          local?: string | null
          origem_tipo?: string
          periodo_letivo_id?: number | null
          status?: string
          subcategoria?: string | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
          visibilidade?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dominio?: string
          fim?: string | null
          formato?: string
          id?: number
          inicio?: string
          local?: string | null
          origem_tipo?: string
          periodo_letivo_id?: number | null
          status?: string
          subcategoria?: string | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_internos_periodo_letivo_id_fkey"
            columns: ["periodo_letivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_letivos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_aluno_planos_preco: {
        Row: {
          ativo: boolean
          created_at: string
          definida_em: string | null
          definida_por: string | null
          id: number
          justificativa: string | null
          manual: boolean
          motivo: string | null
          pessoa_id: number
          politica_id: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          definida_em?: string | null
          definida_por?: string | null
          id?: number
          justificativa?: string | null
          manual?: boolean
          motivo?: string | null
          pessoa_id: number
          politica_id: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          definida_em?: string | null
          definida_por?: string | null
          id?: number
          justificativa?: string | null
          manual?: boolean
          motivo?: string | null
          pessoa_id?: number
          politica_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_aluno_planos_preco_pessoa_fk"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_aluno_planos_preco_politica_fk"
            columns: ["politica_id"]
            isOneToOne: false
            referencedRelation: "financeiro_politicas_preco"
            referencedColumns: ["politica_preco_id"]
          },
        ]
      }
      financeiro_analises_gpt: {
        Row: {
          alertas: Json
          created_at: string | null
          id: number
          model: string | null
          raw: Json
          snapshot_id: number | null
          texto_curto: string | null
        }
        Insert: {
          alertas?: Json
          created_at?: string | null
          id?: number
          model?: string | null
          raw?: Json
          snapshot_id?: number | null
          texto_curto?: string | null
        }
        Update: {
          alertas?: Json
          created_at?: string | null
          id?: number
          model?: string | null
          raw?: Json
          snapshot_id?: number | null
          texto_curto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_analises_gpt_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "financeiro_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_politicas_preco: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          nome: string
          politica_preco_id: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          nome: string
          politica_preco_id?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          nome?: string
          politica_preco_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      financeiro_politicas_preco_padroes: {
        Row: {
          created_at: string
          id: number
          politica_preco_id: number
          tabela_id: number
          tabela_item_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          politica_preco_id: number
          tabela_id: number
          tabela_item_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          politica_preco_id?: number
          tabela_id?: number
          tabela_item_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_politicas_preco_padroes_item_fk"
            columns: ["tabela_item_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabela_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_politicas_preco_padroes_politica_fk"
            columns: ["politica_preco_id"]
            isOneToOne: false
            referencedRelation: "financeiro_politicas_preco"
            referencedColumns: ["politica_preco_id"]
          },
          {
            foreignKeyName: "financeiro_politicas_preco_padroes_tabela_fk"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_snapshots: {
        Row: {
          caixa_hoje_centavos: number
          centro_custo_id: number | null
          created_at: string | null
          data_base: string
          entradas_previstas_30d_centavos: number
          folego_caixa_dias: number | null
          id: number
          periodo_fim: string
          periodo_inicio: string
          regras_alerta: Json
          resumo_por_centro: Json
          saidas_comprometidas_30d_centavos: number
          serie_fluxo_caixa: Json
          tendencia: Json
        }
        Insert: {
          caixa_hoje_centavos?: number
          centro_custo_id?: number | null
          created_at?: string | null
          data_base: string
          entradas_previstas_30d_centavos?: number
          folego_caixa_dias?: number | null
          id?: number
          periodo_fim: string
          periodo_inicio: string
          regras_alerta?: Json
          resumo_por_centro?: Json
          saidas_comprometidas_30d_centavos?: number
          serie_fluxo_caixa?: Json
          tendencia?: Json
        }
        Update: {
          caixa_hoje_centavos?: number
          centro_custo_id?: number | null
          created_at?: string | null
          data_base?: string
          entradas_previstas_30d_centavos?: number
          folego_caixa_dias?: number | null
          id?: number
          periodo_fim?: string
          periodo_inicio?: string
          regras_alerta?: Json
          resumo_por_centro?: Json
          saidas_comprometidas_30d_centavos?: number
          serie_fluxo_caixa?: Json
          tendencia?: Json
        }
        Relationships: []
      }
      financeiro_tier_grupos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          nome: string
          tier_grupo_id: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          nome: string
          tier_grupo_id?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          nome?: string
          tier_grupo_id?: number
        }
        Relationships: []
      }
      financeiro_tiers: {
        Row: {
          ajuste_tipo: string | null
          ajuste_valor_centavos: number | null
          ativo: boolean
          created_at: string
          ordem: number
          politica_id: number | null
          politica_preco_id: number | null
          tabela_id: number | null
          tabela_item_id: number | null
          tier_grupo_id: number
          tier_id: number
          valor_centavos: number
        }
        Insert: {
          ajuste_tipo?: string | null
          ajuste_valor_centavos?: number | null
          ativo?: boolean
          created_at?: string
          ordem: number
          politica_id?: number | null
          politica_preco_id?: number | null
          tabela_id?: number | null
          tabela_item_id?: number | null
          tier_grupo_id: number
          tier_id?: number
          valor_centavos: number
        }
        Update: {
          ajuste_tipo?: string | null
          ajuste_valor_centavos?: number | null
          ativo?: boolean
          created_at?: string
          ordem?: number
          politica_id?: number | null
          politica_preco_id?: number | null
          tabela_id?: number | null
          tabela_item_id?: number | null
          tier_grupo_id?: number
          tier_id?: number
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_tiers_politica_fk"
            columns: ["politica_id"]
            isOneToOne: false
            referencedRelation: "financeiro_politicas_preco"
            referencedColumns: ["politica_preco_id"]
          },
          {
            foreignKeyName: "financeiro_tiers_politica_preco_fk"
            columns: ["politica_preco_id"]
            isOneToOne: false
            referencedRelation: "financeiro_politicas_preco"
            referencedColumns: ["politica_preco_id"]
          },
          {
            foreignKeyName: "financeiro_tiers_tabela_fk"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_tiers_tabela_item_fk"
            columns: ["tabela_item_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabela_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_tiers_tier_grupo_id_fkey"
            columns: ["tier_grupo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_tier_grupos"
            referencedColumns: ["tier_grupo_id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: number
          nome: string
          tipo_base: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: number
          nome: string
          tipo_base: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: number
          nome?: string
          tipo_base?: string
          updated_at?: string
        }
        Relationships: []
      }
      formas_pagamento_contexto: {
        Row: {
          ativo: boolean
          cartao_maquina_id: number | null
          carteira_tipo: string | null
          centro_custo_id: number
          conta_financeira_id: number | null
          created_at: string
          descricao_exibicao: string
          forma_pagamento_codigo: string
          id: number
          ordem_exibicao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cartao_maquina_id?: number | null
          carteira_tipo?: string | null
          centro_custo_id: number
          conta_financeira_id?: number | null
          created_at?: string
          descricao_exibicao: string
          forma_pagamento_codigo: string
          id?: number
          ordem_exibicao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cartao_maquina_id?: number | null
          carteira_tipo?: string | null
          centro_custo_id?: number
          conta_financeira_id?: number | null
          created_at?: string
          descricao_exibicao?: string
          forma_pagamento_codigo?: string
          id?: number
          ordem_exibicao?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_contexto_cartao_maquina_id_fkey"
            columns: ["cartao_maquina_id"]
            isOneToOne: false
            referencedRelation: "cartao_maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formas_pagamento_contexto_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formas_pagamento_contexto_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formas_pagamento_contexto_forma_pagamento_codigo_fkey"
            columns: ["forma_pagamento_codigo"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["codigo"]
          },
        ]
      }
      funcoes_colaborador: {
        Row: {
          ativo: boolean
          codigo: string
          descricao: string | null
          grupo: string
          grupo_id: number | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          descricao?: string | null
          grupo: string
          grupo_id?: number | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          descricao?: string | null
          grupo?: string
          grupo_id?: number | null
          id?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_colaborador_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "funcoes_grupo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcoes_colaborador_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      funcoes_grupo: {
        Row: {
          ativo: boolean
          centro_custo_id: number | null
          descricao: string | null
          id: number
          nome: string
          ordem: number | null
          pode_lecionar: boolean
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: number | null
          descricao?: string | null
          id?: number
          nome: string
          ordem?: number | null
          pode_lecionar?: boolean
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: number | null
          descricao?: string | null
          id?: number
          nome?: string
          ordem?: number | null
          pode_lecionar?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_grupo_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      habilidades: {
        Row: {
          created_at: string
          criterio_avaliacao: string | null
          curso_id: number
          descricao: string | null
          id: number
          modulo_id: number
          nivel_id: number
          nome: string
          ordem: number
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterio_avaliacao?: string | null
          curso_id: number
          descricao?: string | null
          id?: number
          modulo_id: number
          nivel_id: number
          nome: string
          ordem?: number
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterio_avaliacao?: string | null
          curso_id?: number
          descricao?: string | null
          id?: number
          modulo_id?: number
          nivel_id?: number
          nome?: string
          ordem?: number
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habilidades_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habilidades_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habilidades_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis"
            referencedColumns: ["id"]
          },
        ]
      }
      locais: {
        Row: {
          ativo: boolean
          created_at: string
          endereco: string | null
          id: number
          nome: string
          observacoes: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          endereco?: string | null
          id?: number
          nome: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          endereco?: string | null
          id?: number
          nome?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      loja_cores: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          hex: string | null
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          hex?: string | null
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          hex?: string | null
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      loja_estoque_movimentos: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario_centavos: number | null
          id: number
          motivo: string | null
          observacao: string | null
          origem: string
          produto_id: number
          quantidade: number
          referencia_id: number | null
          saldo_antes: number | null
          saldo_depois: number | null
          tipo: string
          variante_id: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario_centavos?: number | null
          id?: number
          motivo?: string | null
          observacao?: string | null
          origem: string
          produto_id: number
          quantidade: number
          referencia_id?: number | null
          saldo_antes?: number | null
          saldo_depois?: number | null
          tipo: string
          variante_id?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario_centavos?: number | null
          id?: number
          motivo?: string | null
          observacao?: string | null
          origem?: string
          produto_id?: number
          quantidade?: number
          referencia_id?: number | null
          saldo_antes?: number | null
          saldo_depois?: number | null
          tipo?: string
          variante_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_loja_mov_variante"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loja_movimentos_variante"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      loja_fornecedor_precos: {
        Row: {
          created_at: string
          data_referencia: string
          fornecedor_id: number
          id: number
          moeda: string
          observacoes: string | null
          preco_custo_centavos: number
          produto_id: number
        }
        Insert: {
          created_at?: string
          data_referencia?: string
          fornecedor_id: number
          id?: number
          moeda?: string
          observacoes?: string | null
          preco_custo_centavos: number
          produto_id: number
        }
        Update: {
          created_at?: string
          data_referencia?: string
          fornecedor_id?: number
          id?: number
          moeda?: string
          observacoes?: string | null
          preco_custo_centavos?: number
          produto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "loja_fornecedor_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "loja_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_fornecedor_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_fornecedor_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      loja_fornecedores: {
        Row: {
          ativo: boolean
          codigo_interno: string | null
          created_at: string
          id: number
          observacoes: string | null
          pessoa_id: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_interno?: string | null
          created_at?: string
          id?: number
          observacoes?: string | null
          pessoa_id: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_interno?: string | null
          created_at?: string
          id?: number
          observacoes?: string | null
          pessoa_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loja_fornecedores_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: true
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_marcas: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      loja_modelos: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      loja_numeracoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          tipo?: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      loja_pedidos_compra: {
        Row: {
          conta_pagar_id: number | null
          created_at: string
          created_by: string | null
          data_pedido: string
          fornecedor_id: number
          id: number
          observacoes: string | null
          status: string
          updated_at: string
          updated_by: string | null
          valor_estimado_centavos: number
        }
        Insert: {
          conta_pagar_id?: number | null
          created_at?: string
          created_by?: string | null
          data_pedido?: string
          fornecedor_id: number
          id?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valor_estimado_centavos?: number
        }
        Update: {
          conta_pagar_id?: number | null
          created_at?: string
          created_by?: string | null
          data_pedido?: string
          fornecedor_id?: number
          id?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valor_estimado_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "loja_pedidos_compra_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "loja_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loja_pedidos_compra_itens: {
        Row: {
          id: number
          observacoes: string | null
          pedido_id: number
          preco_custo_centavos: number
          produto_id: number
          quantidade_pedida: number
          quantidade_recebida: number
          quantidade_solicitada: number
          variante_id: number
        }
        Insert: {
          id?: number
          observacoes?: string | null
          pedido_id: number
          preco_custo_centavos?: number
          produto_id: number
          quantidade_pedida?: number
          quantidade_recebida?: number
          quantidade_solicitada: number
          variante_id: number
        }
        Update: {
          id?: number
          observacoes?: string | null
          pedido_id?: number
          preco_custo_centavos?: number
          produto_id?: number
          quantidade_pedida?: number
          quantidade_recebida?: number
          quantidade_solicitada?: number
          variante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_loja_compra_item_variante"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "loja_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      loja_pedidos_compra_recebimentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_recebimento: string
          id: number
          item_id: number
          observacao: string | null
          pedido_id: number
          preco_custo_centavos: number
          produto_id: number
          quantidade: number
          quantidade_recebida: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_recebimento?: string
          id?: number
          item_id: number
          observacao?: string | null
          pedido_id: number
          preco_custo_centavos: number
          produto_id: number
          quantidade: number
          quantidade_recebida: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_recebimento?: string
          id?: number
          item_id?: number
          observacao?: string | null
          pedido_id?: number
          preco_custo_centavos?: number
          produto_id?: number
          quantidade?: number
          quantidade_recebida?: number
        }
        Relationships: [
          {
            foreignKeyName: "loja_pedidos_compra_recebimentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_recebimentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "loja_pedidos_compra_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "loja_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_recebimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_pedidos_compra_recebimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      loja_produto_categoria: {
        Row: {
          ativo: boolean
          atualizado_em: string
          codigo: string | null
          criado_em: string
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string | null
          criado_em?: string
          id?: never
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string | null
          criado_em?: string
          id?: never
          nome?: string
        }
        Relationships: []
      }
      loja_produto_categoria_subcategoria: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria_id: number
          centro_custo_id: number | null
          codigo: string | null
          criado_em: string
          despesa_categoria_id: number | null
          id: number
          nome: string
          receita_categoria_id: number | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria_id: number
          centro_custo_id?: number | null
          codigo?: string | null
          criado_em?: string
          despesa_categoria_id?: number | null
          id?: never
          nome: string
          receita_categoria_id?: number | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria_id?: number
          centro_custo_id?: number | null
          codigo?: string | null
          criado_em?: string
          despesa_categoria_id?: number | null
          id?: never
          nome?: string
          receita_categoria_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loja_subcategoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_subcategoria_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_subcategoria_despesa_categoria_id_fkey"
            columns: ["despesa_categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_subcategoria_receita_categoria_id_fkey"
            columns: ["receita_categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_produto_variantes: {
        Row: {
          ativo: boolean
          cor_id: number | null
          created_at: string
          estoque_atual: number
          id: number
          numeracao_id: number | null
          observacoes: string | null
          preco_venda_centavos: number | null
          produto_id: number
          sku: string
          tamanho_id: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor_id?: number | null
          created_at?: string
          estoque_atual?: number
          id?: number
          numeracao_id?: number | null
          observacoes?: string | null
          preco_venda_centavos?: number | null
          produto_id: number
          sku: string
          tamanho_id?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor_id?: number | null
          created_at?: string
          estoque_atual?: number
          id?: number
          numeracao_id?: number | null
          observacoes?: string | null
          preco_venda_centavos?: number | null
          produto_id?: number
          sku?: string
          tamanho_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loja_variantes_cor"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "loja_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loja_variantes_numeracao"
            columns: ["numeracao_id"]
            isOneToOne: false
            referencedRelation: "loja_numeracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loja_variantes_produto"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loja_variantes_produto"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fk_loja_variantes_tamanho"
            columns: ["tamanho_id"]
            isOneToOne: false
            referencedRelation: "loja_tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_produtos: {
        Row: {
          ativo: boolean
          bloqueado_para_venda: boolean
          categoria: string | null
          categoria_subcategoria_id: number | null
          codigo: string | null
          created_at: string
          descricao: string | null
          estoque_atual: number
          fornecedor_principal_id: number | null
          id: number
          marca_id: number | null
          modelo_id: number | null
          nome: string
          observacoes: string | null
          preco_venda_centavos: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bloqueado_para_venda?: boolean
          categoria?: string | null
          categoria_subcategoria_id?: number | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          fornecedor_principal_id?: number | null
          id?: number
          marca_id?: number | null
          modelo_id?: number | null
          nome: string
          observacoes?: string | null
          preco_venda_centavos: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bloqueado_para_venda?: boolean
          categoria?: string | null
          categoria_subcategoria_id?: number | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_atual?: number
          fornecedor_principal_id?: number | null
          id?: number
          marca_id?: number | null
          modelo_id?: number | null
          nome?: string
          observacoes?: string | null
          preco_venda_centavos?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loja_produtos_marca_id"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "loja_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loja_produtos_modelo_id"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "loja_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_produtos_categoria_subcategoria_fk"
            columns: ["categoria_subcategoria_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_categoria_subcategoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_produtos_fornecedor_principal_fk"
            columns: ["fornecedor_principal_id"]
            isOneToOne: false
            referencedRelation: "loja_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_tamanhos: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      loja_venda_itens: {
        Row: {
          beneficiario_pessoa_id: number | null
          id: number
          observacoes: string | null
          preco_unitario_centavos: number
          produto_id: number
          quantidade: number
          total_centavos: number
          variante_id: number | null
          venda_id: number
        }
        Insert: {
          beneficiario_pessoa_id?: number | null
          id?: number
          observacoes?: string | null
          preco_unitario_centavos: number
          produto_id: number
          quantidade: number
          total_centavos: number
          variante_id?: number | null
          venda_id: number
        }
        Update: {
          beneficiario_pessoa_id?: number | null
          id?: number
          observacoes?: string | null
          preco_unitario_centavos?: number
          produto_id?: number
          quantidade?: number
          total_centavos?: number
          variante_id?: number | null
          venda_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_loja_venda_item_variante"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "loja_produto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_venda_itens_beneficiario_pessoa_id_fkey"
            columns: ["beneficiario_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "loja_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_loja_produtos_estoque"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "loja_venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "loja_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_vendas: {
        Row: {
          cancelada_em: string | null
          cancelada_por_user_id: string | null
          cliente_pessoa_id: number
          cobranca_id: number | null
          conta_conexao_id: number | null
          created_at: string
          data_vencimento: string | null
          data_venda: string
          desconto_centavos: number
          forma_pagamento: string
          id: number
          motivo_cancelamento: string | null
          numero_parcelas: number | null
          observacao_vendedor: string | null
          observacoes: string | null
          status_pagamento: string
          status_venda: string
          tipo_venda: string
          updated_at: string
          valor_total_centavos: number
          vendedor_user_id: string | null
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por_user_id?: string | null
          cliente_pessoa_id: number
          cobranca_id?: number | null
          conta_conexao_id?: number | null
          created_at?: string
          data_vencimento?: string | null
          data_venda?: string
          desconto_centavos?: number
          forma_pagamento: string
          id?: number
          motivo_cancelamento?: string | null
          numero_parcelas?: number | null
          observacao_vendedor?: string | null
          observacoes?: string | null
          status_pagamento: string
          status_venda?: string
          tipo_venda: string
          updated_at?: string
          valor_total_centavos: number
          vendedor_user_id?: string | null
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por_user_id?: string | null
          cliente_pessoa_id?: number
          cobranca_id?: number | null
          conta_conexao_id?: number | null
          created_at?: string
          data_vencimento?: string | null
          data_venda?: string
          desconto_centavos?: number
          forma_pagamento?: string
          id?: number
          motivo_cancelamento?: string | null
          numero_parcelas?: number | null
          observacao_vendedor?: string | null
          observacoes?: string | null
          status_pagamento?: string
          status_venda?: string
          tipo_venda?: string
          updated_at?: string
          valor_total_centavos?: number
          vendedor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loja_vendas_cancelada_por_user_id_fkey"
            columns: ["cancelada_por_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loja_vendas_cliente_pessoa_id_fkey"
            columns: ["cliente_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_vendas_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_vendas_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "vw_governanca_boletos_neofin"
            referencedColumns: ["cobranca_id"]
          },
          {
            foreignKeyName: "loja_vendas_vendedor_user_id_fkey"
            columns: ["vendedor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      matricula_configuracoes: {
        Row: {
          arredondamento_centavos: string
          ativo: boolean
          created_at: string
          created_by: string | null
          id: number
          juros_mora_percentual_mensal_padrao: number
          mes_referencia_dias: number
          moeda: string
          multa_percentual_padrao: number
          parcelas_padrao: number
          updated_at: string
          updated_by: string | null
          vencimento_dia_padrao: number
        }
        Insert: {
          arredondamento_centavos?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: never
          juros_mora_percentual_mensal_padrao?: number
          mes_referencia_dias?: number
          moeda?: string
          multa_percentual_padrao?: number
          parcelas_padrao?: number
          updated_at?: string
          updated_by?: string | null
          vencimento_dia_padrao?: number
        }
        Update: {
          arredondamento_centavos?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: never
          juros_mora_percentual_mensal_padrao?: number
          mes_referencia_dias?: number
          moeda?: string
          multa_percentual_padrao?: number
          parcelas_padrao?: number
          updated_at?: string
          updated_by?: string | null
          vencimento_dia_padrao?: number
        }
        Relationships: []
      }
      matricula_eventos: {
        Row: {
          autorizado_por: string | null
          criado_em: string
          dados: Json
          id: number
          matricula_id: number
          tipo_evento: string
        }
        Insert: {
          autorizado_por?: string | null
          criado_em?: string
          dados?: Json
          id?: number
          matricula_id: number
          tipo_evento: string
        }
        Update: {
          autorizado_por?: string | null
          criado_em?: string
          dados?: Json
          id?: number
          matricula_id?: number
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "matricula_eventos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_grupos_financeiros: {
        Row: {
          aluno_id: number
          ano_referencia: number
          ativo: boolean
          created_at: string
          id: number
          observacoes: string | null
          responsavel_financeiro_id: number | null
          updated_at: string
        }
        Insert: {
          aluno_id: number
          ano_referencia: number
          ativo?: boolean
          created_at?: string
          id?: number
          observacoes?: string | null
          responsavel_financeiro_id?: number | null
          updated_at?: string
        }
        Update: {
          aluno_id?: number
          ano_referencia?: number
          ativo?: boolean
          created_at?: string
          id?: number
          observacoes?: string | null
          responsavel_financeiro_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matricula_grupos_financeiros_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_grupos_financeiros_responsavel_financeiro_id_fkey"
            columns: ["responsavel_financeiro_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_planos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: number
          nome: string
          total_parcelas: number
          updated_at: string
          updated_by: string | null
          valor_anuidade_centavos: number
          valor_mensal_base_centavos: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: never
          nome: string
          total_parcelas?: number
          updated_at?: string
          updated_by?: string | null
          valor_anuidade_centavos: number
          valor_mensal_base_centavos: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: never
          nome?: string
          total_parcelas?: number
          updated_at?: string
          updated_by?: string | null
          valor_anuidade_centavos?: number
          valor_mensal_base_centavos?: number
        }
        Relationships: []
      }
      matricula_planos_pagamento: {
        Row: {
          ativo: boolean
          ciclo_cobranca: string | null
          ciclo_financeiro: string | null
          created_at: string
          data_fim_manual: string | null
          descricao: string | null
          forma_liquidacao_padrao: string | null
          id: number
          nome: string | null
          numero_parcelas: number | null
          observacoes: string | null
          permite_prorata: boolean
          permite_prorrata: boolean | null
          politica_primeira_cobranca: string
          regra_total_devido: string | null
          termino_cobranca: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          ciclo_cobranca?: string | null
          ciclo_financeiro?: string | null
          created_at?: string
          data_fim_manual?: string | null
          descricao?: string | null
          forma_liquidacao_padrao?: string | null
          id?: number
          nome?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          permite_prorata?: boolean
          permite_prorrata?: boolean | null
          politica_primeira_cobranca?: string
          regra_total_devido?: string | null
          termino_cobranca?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          ciclo_cobranca?: string | null
          ciclo_financeiro?: string | null
          created_at?: string
          data_fim_manual?: string | null
          descricao?: string | null
          forma_liquidacao_padrao?: string | null
          id?: number
          nome?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          permite_prorata?: boolean
          permite_prorrata?: boolean | null
          politica_primeira_cobranca?: string
          regra_total_devido?: string | null
          termino_cobranca?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      matricula_precos_servico: {
        Row: {
          ano_referencia: number | null
          ativo: boolean
          created_at: string
          descricao: string | null
          id: number
          moeda: string
          servico_id: number
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: number
          moeda?: string
          servico_id: number
          updated_at?: string
          valor_centavos?: number
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: number
          moeda?: string
          servico_id?: number
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "matricula_precos_servico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_precos_turma: {
        Row: {
          ano_referencia: number
          ativo: boolean
          centro_custo_id: number | null
          created_at: string
          created_by: string | null
          id: number
          plano_id: number
          turma_id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_referencia: number
          ativo?: boolean
          centro_custo_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          plano_id: number
          turma_id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_referencia?: number
          ativo?: boolean
          centro_custo_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          plano_id?: number
          turma_id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      matricula_tabela_itens: {
        Row: {
          ativo: boolean
          codigo_item: string
          created_at: string
          descricao: string | null
          id: number
          ordem: number
          tabela_id: number
          tipo_item: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          ativo?: boolean
          codigo_item: string
          created_at?: string
          descricao?: string | null
          id?: number
          ordem?: number
          tabela_id: number
          tipo_item: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          ativo?: boolean
          codigo_item?: string
          created_at?: string
          descricao?: string | null
          id?: number
          ordem?: number
          tabela_id?: number
          tipo_item?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "matricula_tabela_itens_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_tabelas: {
        Row: {
          ano_referencia: number | null
          ativo: boolean
          created_at: string
          id: number
          produto_tipo: string
          referencia_id: number | null
          referencia_tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: number
          produto_tipo: string
          referencia_id?: number | null
          referencia_tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: number
          produto_tipo?: string
          referencia_id?: number | null
          referencia_tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      matricula_tabelas_alvos: {
        Row: {
          alvo_id: number
          alvo_tipo: string
          created_at: string
          id: number
          tabela_id: number
        }
        Insert: {
          alvo_id: number
          alvo_tipo: string
          created_at?: string
          id?: number
          tabela_id: number
        }
        Update: {
          alvo_id?: number
          alvo_tipo?: string
          created_at?: string
          id?: number
          tabela_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "matricula_tabelas_alvos_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_tabelas_precificacao_tiers: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          item_codigo: string
          maximo_modalidades: number | null
          minimo_modalidades: number
          tabela_id: number
          tipo_item: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          item_codigo: string
          maximo_modalidades?: number | null
          minimo_modalidades: number
          tabela_id: number
          tipo_item?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          item_codigo?: string
          maximo_modalidades?: number | null
          minimo_modalidades?: number
          tabela_id?: number
          tipo_item?: string
        }
        Relationships: [
          {
            foreignKeyName: "matricula_tabelas_precificacao_tiers_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_tabelas_turmas: {
        Row: {
          created_at: string
          id: number
          tabela_id: number
          turma_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          tabela_id: number
          turma_id: number
        }
        Update: {
          created_at?: string
          id?: number
          tabela_id?: number
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "matricula_tabelas_turmas_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_tabelas_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      matricula_tabelas_unidades_execucao: {
        Row: {
          created_at: string
          id: number
          tabela_id: number
          unidade_execucao_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          tabela_id: number
          unidade_execucao_id: number
        }
        Update: {
          created_at?: string
          id?: number
          tabela_id?: number
          unidade_execucao_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "matricula_tabelas_unidades_execucao_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_tabelas_unidades_execucao_unidade_execucao_id_fkey"
            columns: ["unidade_execucao_id"]
            isOneToOne: false
            referencedRelation: "escola_unidades_execucao"
            referencedColumns: ["unidade_execucao_id"]
          },
        ]
      }
        matriculas: {
          Row: {
            ano_referencia: number | null
            cancelamento_tipo: string | null
            concluida_em: string | null
            created_at: string
            created_by: string | null
            data_encerramento: string | null
            data_inicio_vinculo: string | null
          data_matricula: string
          documento_conjunto_id: number | null
          documento_emitido_id: number | null
          documento_modelo_id: number | null
          documento_pdf_url: string | null
          escola_tabela_preco_curso_id: number | null
          excecao_autorizada_por: string | null
          excecao_criada_em: string | null
          excecao_primeiro_pagamento: boolean
            forma_liquidacao_padrao: string | null
            gera_perda_financeira: boolean | null
            grupo_financeiro_id: number | null
            id: number
            metodo_liquidacao: string
            motivo_excecao_primeiro_pagamento: string | null
          observacoes: string | null
          pessoa_id: number
          plano_id: number | null
          plano_matricula_id: number | null
          plano_pagamento_id: number | null
          primeira_cobranca_cobranca_id: number | null
          primeira_cobranca_data_pagamento: string | null
          primeira_cobranca_forma_pagamento_id: number | null
          primeira_cobranca_recebimento_id: number | null
          primeira_cobranca_status: string
          primeira_cobranca_tipo: string | null
          primeira_cobranca_valor_centavos: number | null
          produto_id: number | null
          rascunho_expira_em: string | null
          responsavel_financeiro_id: number
          servico_id: number | null
          status: Database["public"]["Enums"]["status_matricula_enum"]
          status_fluxo: string
          tabela_matricula_id: number | null
          tipo_matricula: Database["public"]["Enums"]["tipo_matricula_enum"]
          total_mensalidade_centavos: number
          updated_at: string
          updated_by: string | null
          vencimento_dia_padrao: number | null
          vencimento_padrao_referencia: number | null
          vinculo_id: number
        }
          Insert: {
            ano_referencia?: number | null
            cancelamento_tipo?: string | null
            concluida_em?: string | null
            created_at?: string
            created_by?: string | null
            data_encerramento?: string | null
            data_inicio_vinculo?: string | null
          data_matricula?: string
          documento_conjunto_id?: number | null
          documento_emitido_id?: number | null
          documento_modelo_id?: number | null
          documento_pdf_url?: string | null
          escola_tabela_preco_curso_id?: number | null
          excecao_autorizada_por?: string | null
          excecao_criada_em?: string | null
          excecao_primeiro_pagamento?: boolean
            forma_liquidacao_padrao?: string | null
            gera_perda_financeira?: boolean | null
            grupo_financeiro_id?: number | null
            id?: number
            metodo_liquidacao?: string
            motivo_excecao_primeiro_pagamento?: string | null
          observacoes?: string | null
          pessoa_id: number
          plano_id?: number | null
          plano_matricula_id?: number | null
          plano_pagamento_id?: number | null
          primeira_cobranca_cobranca_id?: number | null
          primeira_cobranca_data_pagamento?: string | null
          primeira_cobranca_forma_pagamento_id?: number | null
          primeira_cobranca_recebimento_id?: number | null
          primeira_cobranca_status?: string
          primeira_cobranca_tipo?: string | null
          primeira_cobranca_valor_centavos?: number | null
          produto_id?: number | null
          rascunho_expira_em?: string | null
          responsavel_financeiro_id: number
          servico_id?: number | null
          status: Database["public"]["Enums"]["status_matricula_enum"]
          status_fluxo?: string
          tabela_matricula_id?: number | null
          tipo_matricula: Database["public"]["Enums"]["tipo_matricula_enum"]
          total_mensalidade_centavos?: number
          updated_at?: string
          updated_by?: string | null
          vencimento_dia_padrao?: number | null
          vencimento_padrao_referencia?: number | null
          vinculo_id: number
        }
          Update: {
            ano_referencia?: number | null
            cancelamento_tipo?: string | null
            concluida_em?: string | null
            created_at?: string
            created_by?: string | null
            data_encerramento?: string | null
            data_inicio_vinculo?: string | null
          data_matricula?: string
          documento_conjunto_id?: number | null
          documento_emitido_id?: number | null
          documento_modelo_id?: number | null
          documento_pdf_url?: string | null
          escola_tabela_preco_curso_id?: number | null
          excecao_autorizada_por?: string | null
          excecao_criada_em?: string | null
          excecao_primeiro_pagamento?: boolean
            forma_liquidacao_padrao?: string | null
            gera_perda_financeira?: boolean | null
            grupo_financeiro_id?: number | null
            id?: number
            metodo_liquidacao?: string
            motivo_excecao_primeiro_pagamento?: string | null
          observacoes?: string | null
          pessoa_id?: number
          plano_id?: number | null
          plano_matricula_id?: number | null
          plano_pagamento_id?: number | null
          primeira_cobranca_cobranca_id?: number | null
          primeira_cobranca_data_pagamento?: string | null
          primeira_cobranca_forma_pagamento_id?: number | null
          primeira_cobranca_recebimento_id?: number | null
          primeira_cobranca_status?: string
          primeira_cobranca_tipo?: string | null
          primeira_cobranca_valor_centavos?: number | null
          produto_id?: number | null
          rascunho_expira_em?: string | null
          responsavel_financeiro_id?: number
          servico_id?: number | null
          status?: Database["public"]["Enums"]["status_matricula_enum"]
          status_fluxo?: string
          tabela_matricula_id?: number | null
          tipo_matricula?: Database["public"]["Enums"]["tipo_matricula_enum"]
          total_mensalidade_centavos?: number
          updated_at?: string
          updated_by?: string | null
          vencimento_dia_padrao?: number | null
          vencimento_padrao_referencia?: number | null
          vinculo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_matriculas_escola_tabela_preco_curso"
            columns: ["escola_tabela_preco_curso_id"]
            isOneToOne: false
            referencedRelation: "escola_tabelas_precos_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_matriculas_plano_pagamento"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "matricula_planos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_matriculas_servico_id"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_documento_conjunto_fk"
            columns: ["documento_conjunto_id"]
            isOneToOne: false
            referencedRelation: "documentos_conjuntos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_grupo_financeiro_id_fkey"
            columns: ["grupo_financeiro_id"]
            isOneToOne: false
            referencedRelation: "matricula_grupos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_plano_pagamento_fk"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "matricula_planos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_primeira_cobranca_cobranca_fk"
            columns: ["primeira_cobranca_cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_primeira_cobranca_cobranca_fk"
            columns: ["primeira_cobranca_cobranca_id"]
            isOneToOne: false
            referencedRelation: "vw_governanca_boletos_neofin"
            referencedColumns: ["cobranca_id"]
          },
          {
            foreignKeyName: "matriculas_primeira_cobranca_forma_pagamento_fk"
            columns: ["primeira_cobranca_forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_primeira_cobranca_recebimento_fk"
            columns: ["primeira_cobranca_recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "escola_produtos_educacionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_responsavel_financeiro_id_fkey"
            columns: ["responsavel_financeiro_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_tabela_matricula_fk"
            columns: ["tabela_matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula_tabelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      matriculas_compromissos_previstos: {
        Row: {
          aluno_pessoa_id: number
          contexto_matricula_id: number
          created_at: string
          id: number
          snapshot_json: Json
          total_anual_previsto_centavos: number
          total_mensal_previsto_centavos: number
          updated_at: string
        }
        Insert: {
          aluno_pessoa_id: number
          contexto_matricula_id: number
          created_at?: string
          id?: number
          snapshot_json: Json
          total_anual_previsto_centavos: number
          total_mensal_previsto_centavos: number
          updated_at?: string
        }
        Update: {
          aluno_pessoa_id?: number
          contexto_matricula_id?: number
          created_at?: string
          id?: number
          snapshot_json?: Json
          total_anual_previsto_centavos?: number
          total_mensal_previsto_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_compromissos_previstos_aluno_pessoa_id_fkey"
            columns: ["aluno_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_compromissos_previstos_contexto_matricula_id_fkey"
            columns: ["contexto_matricula_id"]
            isOneToOne: false
            referencedRelation: "escola_contextos_matricula"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas_financeiro_linhas: {
        Row: {
          created_at: string
          data_evento: string | null
          descricao: string
          id: number
          matricula_id: number
          origem_id: number | null
          origem_tabela: string | null
          status: string
          tipo: string
          updated_at: string
          valor_centavos: number
          vencimento: string | null
        }
        Insert: {
          created_at?: string
          data_evento?: string | null
          descricao?: string
          id?: number
          matricula_id: number
          origem_id?: number | null
          origem_tabela?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_centavos?: number
          vencimento?: string | null
        }
        Update: {
          created_at?: string
          data_evento?: string | null
          descricao?: string
          id?: number
          matricula_id?: number
          origem_id?: number | null
          origem_tabela?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_centavos?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_financeiro_linhas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas_itens: {
        Row: {
          created_at: string
          id: number
          item_id: number
          matricula_id: number
          moeda: string
          observacoes: string | null
          quantidade: number
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          id?: number
          item_id: number
          matricula_id: number
          moeda?: string
          observacoes?: string | null
          quantidade?: number
          valor_centavos: number
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: number
          matricula_id?: number
          moeda?: string
          observacoes?: string | null
          quantidade?: number
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "servico_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_itens_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_pagamento_colaborador: {
        Row: {
          ativo: boolean
          categoria_financeira_id: number | null
          centro_custo_id: number | null
          codigo: string
          descricao: string | null
          id: number
          nome: string
          tipo: string
          unidade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria_financeira_id?: number | null
          centro_custo_id?: number | null
          codigo: string
          descricao?: string | null
          id?: number
          nome: string
          tipo: string
          unidade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria_financeira_id?: number | null
          centro_custo_id?: number | null
          codigo?: string
          descricao?: string | null
          id?: number
          nome?: string
          tipo?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_pagamento_colaborador_categoria_financeira_id_fkey"
            columns: ["categoria_financeira_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelos_pagamento_colaborador_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string
          curso_id: number
          descricao: string | null
          id: number
          nivel_id: number
          nome: string
          obrigatorio: boolean
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso_id: number
          descricao?: string | null
          id?: number
          nivel_id: number
          nome: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso_id?: number
          descricao?: string | null
          id?: number
          nivel_id?: number
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis"
            referencedColumns: ["id"]
          },
        ]
      }
      movimento_financeiro: {
        Row: {
          centro_custo_id: number
          created_at: string
          data_movimento: string
          descricao: string | null
          id: number
          origem: string
          origem_id: number | null
          tipo: string
          usuario_id: string | null
          valor_centavos: number
        }
        Insert: {
          centro_custo_id: number
          created_at?: string
          data_movimento: string
          descricao?: string | null
          id?: number
          origem: string
          origem_id?: number | null
          tipo: string
          usuario_id?: string | null
          valor_centavos: number
        }
        Update: {
          centro_custo_id?: number
          created_at?: string
          data_movimento?: string
          descricao?: string | null
          id?: number
          origem?: string
          origem_id?: number | null
          tipo?: string
          usuario_id?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimento_financeiro_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      niveis: {
        Row: {
          created_at: string
          curso_id: number
          faixa_etaria_sugerida: string | null
          id: number
          idade_maxima: number | null
          idade_minima: number | null
          nome: string
          observacoes: string | null
          pre_requisito_nivel_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso_id: number
          faixa_etaria_sugerida?: string | null
          id?: number
          idade_maxima?: number | null
          idade_minima?: number | null
          nome: string
          observacoes?: string | null
          pre_requisito_nivel_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso_id?: number
          faixa_etaria_sugerida?: string | null
          id?: number
          idade_maxima?: number | null
          idade_minima?: number | null
          nome?: string
          observacoes?: string | null
          pre_requisito_nivel_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveis_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "niveis_pre_requisito_nivel_id_fkey"
            columns: ["pre_requisito_nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_letivos: {
        Row: {
          ano_referencia: number
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: number
          inicio_letivo_janeiro: string | null
          observacoes: string | null
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_referencia: number
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: number
          inicio_letivo_janeiro?: string | null
          observacoes?: string | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_referencia?: number
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: number
          inicio_letivo_janeiro?: string | null
          observacoes?: string | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      periodos_letivos_faixas: {
        Row: {
          categoria: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          dominio: string
          em_avaliacao: boolean
          id: number
          periodo_letivo_id: number
          sem_aula: boolean
          subcategoria: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          dominio?: string
          em_avaliacao?: boolean
          id?: number
          periodo_letivo_id: number
          sem_aula?: boolean
          subcategoria?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          dominio?: string
          em_avaliacao?: boolean
          id?: number
          periodo_letivo_id?: number
          sem_aula?: boolean
          subcategoria?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_letivos_faixas_periodo_letivo_id_fkey"
            columns: ["periodo_letivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_letivos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_cuidados: {
        Row: {
          alergias_alimentares: string | null
          alergias_medicamentos: string | null
          alergias_produtos: string | null
          condicoes_neuro: string | null
          contato_emergencia_observacao: string | null
          contato_emergencia_pessoa_id: number | null
          contato_emergencia_relacao: string | null
          created_at: string
          historico_lesoes: string | null
          id: number
          pessoa_id: number
          pode_consumir_acucar: string | null
          pode_consumir_refrigerante: string | null
          restricoes_alimentares_observacoes: string | null
          restricoes_fisicas: string | null
          tipo_autorizacao_saida: string | null
          tipo_sanguineo: string | null
          updated_at: string
        }
        Insert: {
          alergias_alimentares?: string | null
          alergias_medicamentos?: string | null
          alergias_produtos?: string | null
          condicoes_neuro?: string | null
          contato_emergencia_observacao?: string | null
          contato_emergencia_pessoa_id?: number | null
          contato_emergencia_relacao?: string | null
          created_at?: string
          historico_lesoes?: string | null
          id?: number
          pessoa_id: number
          pode_consumir_acucar?: string | null
          pode_consumir_refrigerante?: string | null
          restricoes_alimentares_observacoes?: string | null
          restricoes_fisicas?: string | null
          tipo_autorizacao_saida?: string | null
          tipo_sanguineo?: string | null
          updated_at?: string
        }
        Update: {
          alergias_alimentares?: string | null
          alergias_medicamentos?: string | null
          alergias_produtos?: string | null
          condicoes_neuro?: string | null
          contato_emergencia_observacao?: string | null
          contato_emergencia_pessoa_id?: number | null
          contato_emergencia_relacao?: string | null
          created_at?: string
          historico_lesoes?: string | null
          id?: number
          pessoa_id?: number
          pode_consumir_acucar?: string | null
          pode_consumir_refrigerante?: string | null
          restricoes_alimentares_observacoes?: string | null
          restricoes_fisicas?: string | null
          tipo_autorizacao_saida?: string | null
          tipo_sanguineo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_cuidados_contato_emergencia_pessoa_id_fkey"
            columns: ["contato_emergencia_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_cuidados_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_cuidados_autorizados_busca: {
        Row: {
          created_at: string
          id: number
          observacoes: string | null
          parentesco: string | null
          pessoa_autorizada_id: number
          pessoa_cuidados_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          observacoes?: string | null
          parentesco?: string | null
          pessoa_autorizada_id: number
          pessoa_cuidados_id: number
        }
        Update: {
          created_at?: string
          id?: number
          observacoes?: string | null
          parentesco?: string | null
          pessoa_autorizada_id?: number
          pessoa_cuidados_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_cuidados_autorizados_busca_pessoa_autorizada_id_fkey"
            columns: ["pessoa_autorizada_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_cuidados_autorizados_busca_pessoa_cuidados_id_fkey"
            columns: ["pessoa_cuidados_id"]
            isOneToOne: false
            referencedRelation: "pessoa_cuidados"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_medidas_declaradas: {
        Row: {
          categoria: string
          created_at: string
          data_referencia: string | null
          id: number
          observacao: string | null
          pessoa_id: number
          tamanho: string
        }
        Insert: {
          categoria: string
          created_at?: string
          data_referencia?: string | null
          id?: number
          observacao?: string | null
          pessoa_id: number
          tamanho: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_referencia?: string | null
          id?: number
          observacao?: string | null
          pessoa_id?: number
          tamanho?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_medidas_declaradas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_observacoes: {
        Row: {
          created_at: string
          data_referencia: string | null
          descricao: string
          id: number
          natureza: string
          pessoa_id: number
          titulo: string | null
        }
        Insert: {
          created_at?: string
          data_referencia?: string | null
          descricao: string
          id?: number
          natureza: string
          pessoa_id: number
          titulo?: string | null
        }
        Update: {
          created_at?: string
          data_referencia?: string | null
          descricao?: string
          id?: number
          natureza?: string
          pessoa_id?: number
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_observacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_observacoes_pedagogicas: {
        Row: {
          created_at: string
          descricao: string
          id: number
          observado_em: string
          pessoa_id: number
          professor_pessoa_id: number | null
          titulo: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: number
          observado_em?: string
          pessoa_id: number
          professor_pessoa_id?: number | null
          titulo?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: number
          observado_em?: string
          pessoa_id?: number
          professor_pessoa_id?: number | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_observacoes_pedagogicas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_observacoes_pedagogicas_professor_pessoa_id_fkey"
            columns: ["professor_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          endereco: Json | null
          endereco_id: number | null
          estado_civil:
            | Database["public"]["Enums"]["estado_civil_pessoa"]
            | null
          foto_url: string | null
          genero: Database["public"]["Enums"]["genero_pessoa"]
          id: number
          inscricao_estadual: string | null
          nacionalidade: string | null
          nascimento: string | null
          naturalidade: string | null
          neofin_customer_id: string | null
          nome: string
          nome_fantasia: string | null
          nome_social: string | null
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          telefone_secundario: string | null
          tipo_pessoa: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          endereco?: Json | null
          endereco_id?: number | null
          estado_civil?:
            | Database["public"]["Enums"]["estado_civil_pessoa"]
            | null
          foto_url?: string | null
          genero?: Database["public"]["Enums"]["genero_pessoa"]
          id?: number
          inscricao_estadual?: string | null
          nacionalidade?: string | null
          nascimento?: string | null
          naturalidade?: string | null
          neofin_customer_id?: string | null
          nome: string
          nome_fantasia?: string | null
          nome_social?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          endereco?: Json | null
          endereco_id?: number | null
          estado_civil?:
            | Database["public"]["Enums"]["estado_civil_pessoa"]
            | null
          foto_url?: string | null
          genero?: Database["public"]["Enums"]["genero_pessoa"]
          id?: number
          inscricao_estadual?: string | null
          nacionalidade?: string | null
          nascimento?: string | null
          naturalidade?: string | null
          neofin_customer_id?: string | null
          nome?: string
          nome_fantasia?: string | null
          nome_social?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_created_by_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pessoas_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_updated_by_fk"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pessoas_roles: {
        Row: {
          created_at: string | null
          id: number
          pessoa_id: number
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          pessoa_id: number
          role: string
        }
        Update: {
          created_at?: string | null
          id?: number
          pessoa_id?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_roles_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          codigo: string
          id: number
          nome: string
          parent_id: number | null
          tipo: string
        }
        Insert: {
          codigo: string
          id?: number
          nome: string
          parent_id?: number | null
          tipo: string
        }
        Update: {
          codigo?: string
          id?: number
          nome?: string
          parent_id?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          bio: string | null
          colaborador_id: number
          id: number
          observacoes: string | null
          tipo_professor_id: number | null
        }
        Insert: {
          ativo?: boolean
          bio?: string | null
          colaborador_id: number
          id?: number
          observacoes?: string | null
          tipo_professor_id?: number | null
        }
        Update: {
          ativo?: boolean
          bio?: string | null
          colaborador_id?: number
          id?: number
          observacoes?: string | null
          tipo_professor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_tipo_professor_id_fkey"
            columns: ["tipo_professor_id"]
            isOneToOne: false
            referencedRelation: "tipos_professor"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          is_admin: boolean
          pessoa_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          is_admin?: boolean
          pessoa_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          is_admin?: boolean
          pessoa_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: true
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos: {
        Row: {
          cartao_bandeira_id: number | null
          cartao_maquina_id: number | null
          cartao_numero_parcelas: number | null
          centro_custo_id: number | null
          cobranca_id: number | null
          created_at: string
          data_pagamento: string
          forma_pagamento_codigo: string | null
          id: number
          metodo_pagamento: string
          observacoes: string | null
          origem_sistema: string | null
          valor_centavos: number
        }
        Insert: {
          cartao_bandeira_id?: number | null
          cartao_maquina_id?: number | null
          cartao_numero_parcelas?: number | null
          centro_custo_id?: number | null
          cobranca_id?: number | null
          created_at?: string
          data_pagamento: string
          forma_pagamento_codigo?: string | null
          id?: number
          metodo_pagamento: string
          observacoes?: string | null
          origem_sistema?: string | null
          valor_centavos: number
        }
        Update: {
          cartao_bandeira_id?: number | null
          cartao_maquina_id?: number | null
          cartao_numero_parcelas?: number | null
          centro_custo_id?: number | null
          cobranca_id?: number | null
          created_at?: string
          data_pagamento?: string
          forma_pagamento_codigo?: string | null
          id?: number
          metodo_pagamento?: string
          observacoes?: string | null
          origem_sistema?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_cartao_bandeira_id_fkey"
            columns: ["cartao_bandeira_id"]
            isOneToOne: false
            referencedRelation: "cartao_bandeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_cartao_maquina_id_fkey"
            columns: ["cartao_maquina_id"]
            isOneToOne: false
            referencedRelation: "cartao_maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "vw_governanca_boletos_neofin"
            referencedColumns: ["cobranca_id"]
          },
        ]
      }
      roles_sistema: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          editavel: boolean
          id: string
          nome: string
          permissoes: Json | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          id?: string
          nome: string
          permissoes?: Json | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          id?: string
          nome?: string
          permissoes?: Json | null
        }
        Relationships: []
      }
      ruas: {
        Row: {
          ativo: boolean | null
          bairro_id: string | null
          cep: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro_id?: string | null
          cep?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro_id?: string | null
          cep?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ruas_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_itens: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          destino_categoria_financeira_id: number | null
          destino_centro_custo_id: number | null
          id: number
          nome: string
          obrigatorio: boolean
          servico_id: number
          tipo_item: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          destino_categoria_financeira_id?: number | null
          destino_centro_custo_id?: number | null
          id?: number
          nome: string
          obrigatorio?: boolean
          servico_id: number
          tipo_item?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          destino_categoria_financeira_id?: number | null
          destino_centro_custo_id?: number | null
          id?: number
          nome?: string
          obrigatorio?: boolean
          servico_id?: number
          tipo_item?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_itens_precos: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          item_id: number
          moeda: string
          valor_centavos: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: number
          item_id: number
          moeda?: string
          valor_centavos: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          item_id?: number
          moeda?: string
          valor_centavos?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_itens_precos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "servico_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ano_referencia: number | null
          ativo: boolean
          created_at: string
          id: number
          referencia_id: number
          referencia_tipo: string
          tipo: Database["public"]["Enums"]["tipo_servico"]
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: number
          referencia_id: number
          referencia_tipo: string
          tipo: Database["public"]["Enums"]["tipo_servico"]
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean
          created_at?: string
          id?: number
          referencia_id?: number
          referencia_tipo?: string
          tipo?: Database["public"]["Enums"]["tipo_servico"]
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tipos_professor: {
        Row: {
          codigo: string
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          codigo: string
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          codigo?: string
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipos_vinculo_colaborador: {
        Row: {
          ativo: boolean
          codigo: string
          descricao: string | null
          eh_professor_por_natureza: boolean
          exige_config_pagamento: boolean
          gera_folha: boolean
          id: number
          nome: string
          usa_jornada: boolean
          usa_vigencia: boolean
        }
        Insert: {
          ativo?: boolean
          codigo: string
          descricao?: string | null
          eh_professor_por_natureza?: boolean
          exige_config_pagamento?: boolean
          gera_folha?: boolean
          id?: number
          nome: string
          usa_jornada?: boolean
          usa_vigencia?: boolean
        }
        Update: {
          ativo?: boolean
          codigo?: string
          descricao?: string | null
          eh_professor_por_natureza?: boolean
          exige_config_pagamento?: boolean
          gera_folha?: boolean
          id?: number
          nome?: string
          usa_jornada?: boolean
          usa_vigencia?: boolean
        }
        Relationships: []
      }
      turma_aluno: {
        Row: {
          aluno_pessoa_id: number
          dt_fim: string | null
          dt_inicio: string | null
          matricula_id: number | null
          status: string | null
          turma_aluno_id: number
          turma_id: number
        }
        Insert: {
          aluno_pessoa_id: number
          dt_fim?: string | null
          dt_inicio?: string | null
          matricula_id?: number | null
          status?: string | null
          turma_aluno_id?: number
          turma_id: number
        }
        Update: {
          aluno_pessoa_id?: number
          dt_fim?: string | null
          dt_inicio?: string | null
          matricula_id?: number | null
          status?: string | null
          turma_aluno_id?: number
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turma_aluno_aluno_pessoa_id_fkey"
            columns: ["aluno_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_aluno_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_aluno_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turma_avaliacoes: {
        Row: {
          atualizado_em: string
          avaliacao_modelo_id: number
          criado_em: string
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          id: number
          obrigatoria: boolean
          status: string
          titulo: string
          turma_id: number
        }
        Insert: {
          atualizado_em?: string
          avaliacao_modelo_id: number
          criado_em?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: number
          obrigatoria?: boolean
          status?: string
          titulo: string
          turma_id: number
        }
        Update: {
          atualizado_em?: string
          avaliacao_modelo_id?: number
          criado_em?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: number
          obrigatoria?: boolean
          status?: string
          titulo?: string
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turma_avaliacoes_avaliacao_modelo_id_fkey"
            columns: ["avaliacao_modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_modelo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turma_niveis: {
        Row: {
          id: number
          nivel_id: number
          principal: boolean
          turma_id: number
        }
        Insert: {
          id?: number
          nivel_id: number
          principal?: boolean
          turma_id: number
        }
        Update: {
          id?: number
          nivel_id?: number
          principal?: boolean
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turma_niveis_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_niveis_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turma_professores: {
        Row: {
          ativo: boolean
          colaborador_id: number
          data_fim: string | null
          data_inicio: string
          funcao_id: number
          id: number
          observacoes: string | null
          principal: boolean
          turma_id: number
        }
        Insert: {
          ativo?: boolean
          colaborador_id: number
          data_fim?: string | null
          data_inicio?: string
          funcao_id: number
          id?: number
          observacoes?: string | null
          principal?: boolean
          turma_id: number
        }
        Update: {
          ativo?: boolean
          colaborador_id?: number
          data_fim?: string | null
          data_inicio?: string
          funcao_id?: number
          id?: number
          observacoes?: string | null
          principal?: boolean
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turma_professores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_professores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_professores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes_colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_professores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "vw_professores"
            referencedColumns: ["funcao_id"]
          },
          {
            foreignKeyName: "turma_professores_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_referencia: number | null
          ativo: boolean | null
          capacidade: number | null
          carga_horaria_prevista: number | null
          contexto_matricula_id: number | null
          created_at: string | null
          created_by: string | null
          curso: string | null
          data_fim: string | null
          data_inicio: string | null
          dias_semana: string[] | null
          encerramento_automatico: boolean | null
          espaco_id: number | null
          frequencia_minima_percentual: number | null
          hora_fim: string | null
          hora_inicio: string | null
          idade_maxima: number | null
          idade_minima: number | null
          nivel: string | null
          nome: string
          observacoes: string | null
          periodo_letivo_id: number | null
          produto_id: number | null
          professor_id: number | null
          status: string | null
          tipo_turma: string | null
          turma_id: number
          turno: string | null
          updated_at: string
          updated_by: string | null
          user_email: string | null
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          carga_horaria_prevista?: number | null
          contexto_matricula_id?: number | null
          created_at?: string | null
          created_by?: string | null
          curso?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: string[] | null
          encerramento_automatico?: boolean | null
          espaco_id?: number | null
          frequencia_minima_percentual?: number | null
          hora_fim?: string | null
          hora_inicio?: string | null
          idade_maxima?: number | null
          idade_minima?: number | null
          nivel?: string | null
          nome: string
          observacoes?: string | null
          periodo_letivo_id?: number | null
          produto_id?: number | null
          professor_id?: number | null
          status?: string | null
          tipo_turma?: string | null
          turma_id?: number
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          user_email?: string | null
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          carga_horaria_prevista?: number | null
          contexto_matricula_id?: number | null
          created_at?: string | null
          created_by?: string | null
          curso?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: string[] | null
          encerramento_automatico?: boolean | null
          espaco_id?: number | null
          frequencia_minima_percentual?: number | null
          hora_fim?: string | null
          hora_inicio?: string | null
          idade_maxima?: number | null
          idade_minima?: number | null
          nivel?: string | null
          nome?: string
          observacoes?: string | null
          periodo_letivo_id?: number | null
          produto_id?: number | null
          professor_id?: number | null
          status?: string | null
          tipo_turma?: string | null
          turma_id?: number
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_turmas_periodo_letivo"
            columns: ["periodo_letivo_id"]
            isOneToOne: false
            referencedRelation: "periodos_letivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_contexto_matricula_id_fkey"
            columns: ["contexto_matricula_id"]
            isOneToOne: false
            referencedRelation: "escola_contextos_matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "espacos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "escola_produtos_educacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas_historico: {
        Row: {
          actor_user_id: string | null
          diff: Json
          evento: string
          id: number
          ocorrida_em: string
          resumo: string | null
          snapshot: Json | null
          turma_id: number
        }
        Insert: {
          actor_user_id?: string | null
          diff?: Json
          evento: string
          id?: number
          ocorrida_em?: string
          resumo?: string | null
          snapshot?: Json | null
          turma_id: number
        }
        Update: {
          actor_user_id?: string | null
          diff?: Json
          evento?: string
          id?: number
          ocorrida_em?: string
          resumo?: string | null
          snapshot?: Json | null
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turmas_historico_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turmas_horarios: {
        Row: {
          day_of_week: number
          fim: string
          id: number
          inicio: string
          turma_id: number
        }
        Insert: {
          day_of_week: number
          fim: string
          id?: number
          inicio: string
          turma_id: number
        }
        Update: {
          day_of_week?: number
          fim?: string
          id?: number
          inicio?: string
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "turmas_horarios_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      usuario_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vinculos: {
        Row: {
          aluno_id: number
          id: number
          parentesco: string | null
          responsavel_id: number
        }
        Insert: {
          aluno_id: number
          id?: number
          parentesco?: string | null
          responsavel_id: number
        }
        Update: {
          aluno_id?: number
          id?: number
          parentesco?: string | null
          responsavel_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_loja_produtos_estoque: {
        Row: {
          estoque_total: number | null
          produto_id: number | null
        }
        Relationships: []
      }
      vw_governanca_boletos_neofin: {
        Row: {
          centro_custo_codigo: string | null
          centro_custo_id: number | null
          centro_custo_nome: string | null
          cobranca_atualizada_em: string | null
          cobranca_criada_em: string | null
          cobranca_id: number | null
          cobranca_status: string | null
          descricao: string | null
          linha_digitavel: string | null
          link_pagamento: string | null
          neofin_charge_id: string | null
          neofin_payload: Json | null
          pessoa_id: number | null
          pessoa_nome: string | null
          total_recebido_centavos: number | null
          ultimo_pagamento_em: string | null
          valor_centavos: number | null
          vencimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_professores: {
        Row: {
          ativo: boolean | null
          funcao_id: number | null
          funcao_nome: string | null
          grupo_id: number | null
          grupo_nome: string | null
          id: number | null
          nome: string | null
          pode_lecionar: boolean | null
          principal: boolean | null
          vinculo_ativo: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      _get_user_display_name: { Args: { p_user: Json }; Returns: string }
      assign_role_to_email: {
        Args: { p_email: string; p_role_codigo: string }
        Returns: undefined
      }
      assign_role_to_user: {
        Args: { p_role_codigo: string; p_user_id: string }
        Returns: undefined
      }
      credito_conexao_recalcular_total_fatura: {
        Args: { p_fatura_id: number }
        Returns: undefined
      }
      documentos_resolver_por_join_path: {
        Args: {
          p_join_path: Json
          p_root_id: number
          p_root_pk: string
          p_root_table: string
          p_target_column: string
          p_target_table: string
        }
        Returns: string
      }
      documentos_schema_adj: {
        Args: { p_table: string }
        Returns: {
          constraint_name: string
          direction: string
          from_column: string
          from_table: string
          to_column: string
          to_table: string
        }[]
      }
      documentos_schema_adj_guess: {
        Args: { p_table: string }
        Returns: {
          direction: string
          from_column: string
          from_table: string
          reason: string
          to_column: string
          to_table: string
        }[]
      }
      documentos_schema_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          table_name: string
        }[]
      }
      documentos_schema_fks: {
        Args: never
        Returns: {
          constraint_name: string
          from_column: string
          from_table: string
          to_column: string
          to_table: string
        }[]
      }
      documentos_schema_roots_public: {
        Args: never
        Returns: {
          label: string
          root_pk: string
          root_table: string
        }[]
      }
      documentos_schema_table_columns: {
        Args: { p_table: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      recalc_turma_faixa_etaria: {
        Args: { p_turma_id: number }
        Returns: undefined
      }
      schema_healthcheck_matriculas: {
        Args: never
        Returns: {
          key: string
          message: string
          ok: boolean
        }[]
      }
    }
    Enums: {
      estado_civil_pessoa:
        | "SOLTEIRO"
        | "CASADO"
        | "DIVORCIADO"
        | "VIUVO"
        | "UNIAO_ESTAVEL"
        | "OUTRO"
      genero_pessoa: "MASCULINO" | "FEMININO" | "OUTRO" | "NAO_INFORMADO"
      status_matricula_enum: "ATIVA" | "TRANCADA" | "CANCELADA" | "CONCLUIDA"
      tipo_avaliacao_enum: "PRATICA" | "TEORICA" | "DESEMPENHO" | "MISTA"
      tipo_matricula_enum: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO"
      tipo_servico: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_civil_pessoa: [
        "SOLTEIRO",
        "CASADO",
        "DIVORCIADO",
        "VIUVO",
        "UNIAO_ESTAVEL",
        "OUTRO",
      ],
      genero_pessoa: ["MASCULINO", "FEMININO", "OUTRO", "NAO_INFORMADO"],
      status_matricula_enum: ["ATIVA", "TRANCADA", "CANCELADA", "CONCLUIDA"],
      tipo_avaliacao_enum: ["PRATICA", "TEORICA", "DESEMPENHO", "MISTA"],
      tipo_matricula_enum: ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"],
      tipo_servico: ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"],
    },
  },
} as const
