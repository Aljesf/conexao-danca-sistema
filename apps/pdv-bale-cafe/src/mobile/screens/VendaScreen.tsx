import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useDeferredValue, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  buscarPessoas,
  carregarCategorias,
  carregarPagamentos,
  carregarProdutos,
  carregarTabelasPreco,
  criarVenda,
  currentCompetencia,
  formatMoney,
  formatPdvErrorMessage,
  formatPerfil,
  type CafeCompradorTipo,
  type CategoriaCafe,
  type PagamentoOpcao,
  type PessoaBuscaItem,
  type ProdutoCatalogo,
  type TabelaPrecoOpcao,
} from "../../lib/pdv-api";
import type { RootStackParamList } from "../App";
import CartPanel, { type CartItemViewModel } from "../components/CartPanel";
import PrimaryButton from "../components/PrimaryButton";
import ProductGrid from "../components/ProductGrid";
import ScreenShell from "../components/ScreenShell";
import StatusBanner from "../components/StatusBanner";
import { TOKENS } from "../theme/tokens";

type VendaScreenProps = NativeStackScreenProps<RootStackParamList, "Venda">;

type CartItem = CartItemViewModel & {
  unidade_venda: string | null;
};

function parseMoneyInputToCentavos(raw: string): number {
  const normalized = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function formatChipLabel(option: PagamentoOpcao): string {
  if (option.codigo === "DINHEIRO" || option.codigo === "PIX" || option.codigo === "CARTAO") {
    return option.label;
  }

  if (option.exige_conta_conexao) {
    return "Conta interna";
  }

  return option.label;
}

export default function VendaScreen({ navigation }: VendaScreenProps) {
  const [categorias, setCategorias] = useState<CategoriaCafe[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([]);
  const [comprador, setComprador] = useState<PessoaBuscaItem | null>(null);
  const [pessoas, setPessoas] = useState<PessoaBuscaItem[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoOpcao[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPrecoOpcao[]>([]);
  const [contaInternaId, setContaInternaId] = useState<number | null>(null);
  const [contaInternaElegivel, setContaInternaElegivel] = useState(false);
  const [tipoComprador, setTipoComprador] = useState<CafeCompradorTipo>("NAO_IDENTIFICADO");
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<number | null>(null);
  const [subcategoriaSelecionadaId, setSubcategoriaSelecionadaId] = useState<number | null>(null);
  const [tabelaPrecoId, setTabelaPrecoId] = useState<number | null>(null);
  const [pagamentoCodigo, setPagamentoCodigo] = useState("");
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [buscaProdutos, setBuscaProdutos] = useState("");
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacaoVenda, setObservacaoVenda] = useState("");
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [carregandoCompradores, setCarregandoCompradores] = useState(false);
  const [carregandoContexto, setCarregandoContexto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoVendaId, setSucessoVendaId] = useState<number | null>(null);

  const buscaPessoaDeferred = useDeferredValue(buscaPessoa);
  const buscaProdutosDeferred = useDeferredValue(buscaProdutos);

  const categoriaSelecionada = categorias.find((item) => item.id === categoriaSelecionadaId) ?? null;
  const subcategorias = categoriaSelecionada?.subcategorias ?? [];
  const pagamentoSelecionado = pagamentos.find((item) => item.codigo === pagamentoCodigo) ?? null;
  const totalCentavos = carrinho.reduce(
    (total, item) => total + item.valor_unitario_centavos * item.quantidade,
    0,
  );
  const quantidadesPorProdutoId = carrinho.reduce<Record<number, number>>((acc, item) => {
    acc[item.produto_id] = (acc[item.produto_id] ?? 0) + item.quantidade;
    return acc;
  }, {});
  const pagamentoEmDinheiro = Boolean(
    pagamentoSelecionado?.codigo === "DINHEIRO" || pagamentoSelecionado?.exige_troco,
  );
  const valorRecebidoCentavos = parseMoneyInputToCentavos(valorRecebido);
  const trocoCentavos = pagamentoEmDinheiro ? Math.max(valorRecebidoCentavos - totalCentavos, 0) : 0;
  const carrinhoProdutoIdsKey = carrinho.map((item) => item.produto_id).join(",");

  useEffect(() => {
    let active = true;

    async function carregarBase() {
      setCarregandoCategorias(true);
      try {
        const data = await carregarCategorias();
        if (!active) return;
        setCategorias(data);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar categorias."));
      } finally {
        if (active) {
          setCarregandoCategorias(false);
        }
      }
    }

    void carregarBase();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function carregarContextoComprador() {
      setCarregandoContexto(true);
      try {
        const [pagamentosPayload, tabelasPayload] = await Promise.all([
          carregarPagamentos({
            compradorPessoaId: comprador?.id ?? null,
            compradorTipo: comprador ? null : "NAO_IDENTIFICADO",
          }),
          carregarTabelasPreco({
            compradorPessoaId: comprador?.id ?? null,
            compradorTipo: comprador ? null : "NAO_IDENTIFICADO",
          }),
        ]);

        if (!active) return;

        setErro(null);
        setPagamentos(pagamentosPayload.opcoes);
        setTipoComprador(pagamentosPayload.comprador.tipo);
        setContaInternaElegivel(Boolean(pagamentosPayload.conta_interna?.elegivel));
        setContaInternaId(pagamentosPayload.conta_interna?.conta_id ?? null);
        setPagamentoCodigo((current) => {
          const stillAvailable = pagamentosPayload.opcoes.find((item) => item.codigo === current && item.habilitado);
          return stillAvailable?.codigo ?? pagamentosPayload.opcoes.find((item) => item.habilitado)?.codigo ?? "";
        });

        setTabelasPreco(tabelasPayload.itens);
        setTabelaPrecoId((current) => {
          if (current && tabelasPayload.itens.some((item) => item.id === current)) return current;
          return (
            tabelasPayload.tabelaPrecoAtualId ??
            tabelasPayload.itens.find((item) => item.padrao)?.id ??
            tabelasPayload.itens[0]?.id ??
            null
          );
        });
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar contexto."));
      } finally {
        if (active) {
          setCarregandoContexto(false);
        }
      }
    }

    void carregarContextoComprador();

    return () => {
      active = false;
    };
  }, [comprador]);

  useEffect(() => {
    let active = true;

    async function carregarListaProdutos() {
      setCarregandoProdutos(true);
      try {
        const data = await carregarProdutos({
          search: buscaProdutosDeferred,
          categoriaId: categoriaSelecionadaId,
          subcategoriaId: subcategoriaSelecionadaId,
          tabelaPrecoId,
        });

        if (!active) return;
        setProdutos(data);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar produtos."));
      } finally {
        if (active) {
          setCarregandoProdutos(false);
        }
      }
    }

    void carregarListaProdutos();

    return () => {
      active = false;
    };
  }, [buscaProdutosDeferred, categoriaSelecionadaId, subcategoriaSelecionadaId, tabelaPrecoId]);

  useEffect(() => {
    const termo = buscaPessoaDeferred.trim();
    if (termo.length < 2) {
      setPessoas([]);
      return;
    }

    let active = true;

    async function carregarCompradores() {
      setCarregandoCompradores(true);
      try {
        const data = await buscarPessoas(termo);
        if (!active) return;
        setPessoas(data);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao buscar pessoas."));
      } finally {
        if (active) {
          setCarregandoCompradores(false);
        }
      }
    }

    void carregarCompradores();

    return () => {
      active = false;
    };
  }, [buscaPessoaDeferred]);

  useEffect(() => {
    if (!pagamentoSelecionado?.exige_conta_conexao) {
      setContaInternaId(null);
      return;
    }

    if (contaInternaElegivel && contaInternaId) {
      return;
    }
  }, [contaInternaElegivel, contaInternaId, pagamentoSelecionado]);

  useEffect(() => {
    if (!carrinhoProdutoIdsKey || !tabelaPrecoId) {
      return;
    }

    let active = true;

    async function recalcularCarrinho() {
      try {
        const carrinhoProdutoIds = carrinhoProdutoIdsKey
          .split(",")
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item) && item > 0);

        const produtosAtualizados = await carregarProdutos({
          ids: carrinhoProdutoIds,
          tabelaPrecoId,
        });
        if (!active) return;

        const produtoPorId = new Map(produtosAtualizados.map((item) => [item.id, item]));
        setCarrinho((current) =>
          current.map((item) => {
            const produtoAtualizado = produtoPorId.get(item.produto_id);
            if (!produtoAtualizado) return item;

            return {
              ...item,
              nome: produtoAtualizado.nome,
              unidade_venda: produtoAtualizado.unidade_venda,
              valor_unitario_centavos: produtoAtualizado.preco_venda_centavos,
            };
          }),
        );
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao recalcular carrinho."));
      }
    }

    void recalcularCarrinho();

    return () => {
      active = false;
    };
  }, [carrinhoProdutoIdsKey, tabelaPrecoId]);

  function limparRetornoOperacional(): void {
    setErro(null);
    setSucessoVendaId(null);
  }

  function selecionarComprador(pessoa: PessoaBuscaItem): void {
    limparRetornoOperacional();
    setComprador(pessoa);
    setBuscaPessoa("");
    setPessoas([]);
  }

  function removerComprador(): void {
    limparRetornoOperacional();
    setComprador(null);
    setTipoComprador("NAO_IDENTIFICADO");
    setBuscaPessoa("");
    setPessoas([]);
  }

  function adicionarProduto(produto: ProdutoCatalogo): void {
    limparRetornoOperacional();
    setCarrinho((current) => {
      const index = current.findIndex((item) => item.produto_id === produto.id);
      if (index >= 0) {
        return current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, quantidade: item.quantidade + 1 } : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          valor_unitario_centavos: produto.preco_venda_centavos,
          unidade_venda: produto.unidade_venda,
          observacao: "",
        },
      ];
    });
  }

  function aumentarQuantidade(productId: number): void {
    setCarrinho((current) =>
      current.map((item) =>
        item.produto_id === productId ? { ...item, quantidade: item.quantidade + 1 } : item,
      ),
    );
  }

  function diminuirQuantidade(productId: number): void {
    setCarrinho((current) =>
      current
        .map((item) =>
          item.produto_id === productId ? { ...item, quantidade: item.quantidade - 1 } : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  }

  function removerItem(productId: number): void {
    setCarrinho((current) => current.filter((item) => item.produto_id !== productId));
  }

  function atualizarObservacaoItem(productId: number, observacao: string): void {
    setCarrinho((current) =>
      current.map((item) =>
        item.produto_id === productId ? { ...item, observacao } : item,
      ),
    );
  }

  async function finalizarVendaAtual(): Promise<void> {
    limparRetornoOperacional();

    if (!comprador?.id) {
      setErro("Selecione a pessoa antes de finalizar a venda.");
      return;
    }

    if (carrinho.length === 0) {
      setErro("Adicione ao menos um item antes de finalizar.");
      return;
    }

    if (!pagamentoSelecionado?.habilitado) {
      setErro("Selecione uma forma de pagamento valida.");
      return;
    }

    if (pagamentoSelecionado.exige_conta_conexao && !contaInternaId) {
      setErro("A conta interna deste comprador ainda nao esta elegivel para o cafe.");
      return;
    }

    if (pagamentoSelecionado.exige_conta_conexao && !/^\d{4}-\d{2}$/.test(competencia)) {
      setErro("Informe a competencia no formato AAAA-MM.");
      return;
    }

    if (pagamentoEmDinheiro && valorRecebidoCentavos < totalCentavos) {
      setErro("Informe um valor recebido suficiente para calcular o troco.");
      return;
    }

    setFinalizando(true);
    try {
      const dataHoraVenda = new Date().toISOString();
      const resultado = await criarVenda({
        compradorPessoaId: comprador.id,
        compradorTipo: tipoComprador,
        dataHoraVenda,
        formaPagamento: pagamentoSelecionado,
        tabelaPrecoId,
        contaInternaId,
        competenciaAnoMes: pagamentoSelecionado.exige_conta_conexao ? competencia : null,
        valorRecebidoCentavos: pagamentoEmDinheiro ? valorRecebidoCentavos : null,
        trocoCentavos: pagamentoEmDinheiro ? trocoCentavos : null,
        observacaoVenda: observacaoVenda.trim() || null,
        itens: carrinho.map((item) => ({
          produto_id: item.produto_id,
          nome: item.nome,
          quantidade: item.quantidade,
          valor_unitario_centavos: item.valor_unitario_centavos,
          observacao: item.observacao.trim() || null,
        })),
      });

      setCarrinho([]);
      setObservacaoVenda("");
      setBuscaPessoa("");
      setComprador(null);
      setCompetencia(currentCompetencia());
      setValorRecebido("");
      setSucessoVendaId(resultado.id);
    } catch (error) {
      setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao finalizar venda."));
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <ScreenShell
      title="Nova venda"
      subtitle="Catalogo rapido, comprador, pagamento e fechamento direto no mesmo fluxo."
      rightSlot={<PrimaryButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />}
      footer={
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total atual</Text>
            <Text style={styles.footerValue}>{formatMoney(totalCentavos)}</Text>
          </View>
          <PrimaryButton
            label={finalizando ? "Finalizando..." : "Finalizar venda"}
            onPress={() => {
              void finalizarVendaAtual();
            }}
            loading={finalizando}
            disabled={carregandoContexto}
          />
        </View>
      }
    >
      {erro ? <StatusBanner tone="error" text={erro} /> : null}
      {sucessoVendaId ? (
        <View style={styles.successCard}>
          <StatusBanner tone="success" text={`Venda confirmada com sucesso. #${sucessoVendaId}`} />
          <View style={styles.successActions}>
            <PrimaryButton
              label="Abrir detalhe"
              onPress={() => navigation.navigate("VendaDetalhe", { vendaId: sucessoVendaId })}
            />
            <PrimaryButton
              label="Seguir vendendo"
              variant="secondary"
              onPress={() => setSucessoVendaId(null)}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Comprador da venda</Text>
        <Text style={styles.sectionText}>O contrato atual do backend exige a pessoa vinculada antes do fechamento.</Text>

        {comprador ? (
          <View style={styles.selectedBuyerCard}>
            <View style={styles.selectedBuyerCopy}>
              <Text style={styles.selectedBuyerName}>{comprador.nome}</Text>
              <Text style={styles.selectedBuyerMeta}>
                {comprador.email ?? "Sem email"} · {formatPerfil(tipoComprador)}
              </Text>
            </View>
            <PrimaryButton label="Trocar" variant="ghost" onPress={removerComprador} />
          </View>
        ) : (
          <>
            <TextInput
              placeholder="Buscar pessoa por nome"
              placeholderTextColor={TOKENS.colors.textMuted}
              style={styles.input}
              value={buscaPessoa}
              onChangeText={setBuscaPessoa}
            />

            {carregandoCompradores ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={TOKENS.colors.accent} />
                <Text style={styles.loadingText}>Buscando pessoas...</Text>
              </View>
            ) : null}

            {pessoas.map((pessoa) => (
              <Pressable key={pessoa.id} style={styles.personRow} onPress={() => selecionarComprador(pessoa)}>
                <View>
                  <Text style={styles.personName}>{pessoa.nome}</Text>
                  <Text style={styles.personMeta}>{pessoa.email ?? `Pessoa #${pessoa.id}`}</Text>
                </View>
                <Text style={styles.personAction}>Selecionar</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pagamento e contexto</Text>
        {carregandoContexto ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={TOKENS.colors.accent} />
            <Text style={styles.loadingText}>Carregando formas de pagamento e tabela de preco...</Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Tabela de preco</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {tabelasPreco.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.chip,
                tabelaPrecoId === item.id ? styles.chipActive : null,
              ]}
              onPress={() => {
                limparRetornoOperacional();
                setTabelaPrecoId(item.id);
              }}
            >
              <Text style={[styles.chipText, tabelaPrecoId === item.id ? styles.chipTextActive : null]}>
                {item.nome}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>Forma de pagamento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {pagamentos.map((item) => (
            <Pressable
              key={`${item.codigo}-${item.id ?? "sem-id"}`}
              disabled={!item.habilitado}
              style={[
                styles.chip,
                pagamentoCodigo === item.codigo ? styles.chipActive : null,
                !item.habilitado ? styles.chipDisabled : null,
              ]}
              onPress={() => {
                limparRetornoOperacional();
                setPagamentoCodigo(item.codigo);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  pagamentoCodigo === item.codigo ? styles.chipTextActive : null,
                ]}
              >
                {formatChipLabel(item)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {pagamentoSelecionado?.exige_conta_conexao ? (
          <>
            <Text style={styles.fieldLabel}>Competencia</Text>
            <TextInput
              placeholder="AAAA-MM"
              placeholderTextColor={TOKENS.colors.textMuted}
              style={styles.input}
              value={competencia}
              onChangeText={setCompetencia}
              maxLength={7}
            />
            <Text style={styles.helperText}>
              {contaInternaElegivel
                ? "Conta interna elegivel resolvida pela API."
                : "A API ainda nao confirmou conta interna elegivel para esta pessoa."}
            </Text>
          </>
        ) : null}

        {pagamentoEmDinheiro ? (
          <>
            <Text style={styles.fieldLabel}>Valor recebido</Text>
            <TextInput
              placeholder="0,00"
              placeholderTextColor={TOKENS.colors.textMuted}
              style={styles.input}
              value={valorRecebido}
              onChangeText={setValorRecebido}
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>Troco previsto: {formatMoney(trocoCentavos)}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Catalogo do cafe</Text>
        <TextInput
          placeholder="Buscar produto"
          placeholderTextColor={TOKENS.colors.textMuted}
          style={styles.input}
          value={buscaProdutos}
          onChangeText={setBuscaProdutos}
        />

        <Text style={styles.fieldLabel}>Categorias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            style={[styles.chip, categoriaSelecionadaId === null ? styles.chipActive : null]}
            onPress={() => {
              setCategoriaSelecionadaId(null);
              setSubcategoriaSelecionadaId(null);
            }}
          >
            <Text style={[styles.chipText, categoriaSelecionadaId === null ? styles.chipTextActive : null]}>
              Todas
            </Text>
          </Pressable>
          {categorias.map((categoria) => (
            <Pressable
              key={categoria.id}
              style={[styles.chip, categoriaSelecionadaId === categoria.id ? styles.chipActive : null]}
              onPress={() => {
                setCategoriaSelecionadaId(categoria.id);
                setSubcategoriaSelecionadaId(null);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  categoriaSelecionadaId === categoria.id ? styles.chipTextActive : null,
                ]}
              >
                {categoria.nome}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {categoriaSelecionada && subcategorias.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Subcategorias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                style={[styles.chip, subcategoriaSelecionadaId === null ? styles.chipActive : null]}
                onPress={() => setSubcategoriaSelecionadaId(null)}
              >
                <Text style={[styles.chipText, subcategoriaSelecionadaId === null ? styles.chipTextActive : null]}>
                  Todas
                </Text>
              </Pressable>
              {subcategorias.map((subcategoria) => (
                <Pressable
                  key={subcategoria.id}
                  style={[styles.chip, subcategoriaSelecionadaId === subcategoria.id ? styles.chipActive : null]}
                  onPress={() => setSubcategoriaSelecionadaId(subcategoria.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      subcategoriaSelecionadaId === subcategoria.id ? styles.chipTextActive : null,
                    ]}
                  >
                    {subcategoria.nome}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {carregandoCategorias || carregandoProdutos ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={TOKENS.colors.accent} />
            <Text style={styles.loadingText}>Carregando catalogo do cafe...</Text>
          </View>
        ) : (
          <ProductGrid
            products={produtos}
            quantitiesByProductId={quantidadesPorProdutoId}
            onAddProduct={adicionarProduto}
          />
        )}
      </View>

      <CartPanel
        items={carrinho}
        totalCentavos={totalCentavos}
        observacaoVenda={observacaoVenda}
        onIncrease={aumentarQuantidade}
        onDecrease={diminuirQuantidade}
        onRemove={removerItem}
        onChangeItemNote={atualizarObservacaoItem}
        onChangeSaleNote={setObservacaoVenda}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: TOKENS.spacing.md,
    justifyContent: "space-between",
  },
  footerLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  footerValue: {
    color: TOKENS.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  successCard: {
    gap: TOKENS.spacing.md,
  },
  successActions: {
    gap: TOKENS.spacing.sm,
  },
  sectionCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
  },
  sectionTitle: {
    color: TOKENS.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  selectedBuyerCard: {
    alignItems: "flex-start",
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderRadius: TOKENS.radius.md,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.md,
  },
  selectedBuyerCopy: {
    gap: 4,
  },
  selectedBuyerName: {
    color: TOKENS.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  selectedBuyerMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  input: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    color: TOKENS.colors.text,
    minHeight: 52,
    paddingHorizontal: TOKENS.spacing.md,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
  },
  loadingText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  personRow: {
    alignItems: "center",
    borderBottomColor: TOKENS.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: TOKENS.spacing.sm,
  },
  personName: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  personMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  personAction: {
    color: TOKENS.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  fieldLabel: {
    color: TOKENS.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  chipRow: {
    gap: TOKENS.spacing.sm,
  },
  chip: {
    backgroundColor: TOKENS.colors.chip,
    borderColor: TOKENS.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: TOKENS.colors.white,
  },
  helperText: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
