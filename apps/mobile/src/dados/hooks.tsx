import {
  dentroDoLimite as dentroDoLimiteDoPlano,
  limite as limiteDoPlano,
  licencaPermiteVenda,
  podeUsar as planoPodeUsar,
  type Caixa,
  type ChaveLimite,
  type Centavos,
  type Licenca,
  type MotivoBloqueio,
  type PermissaoDeVenda,
  type PlanoId,
  type Produto,
  type Recurso,
  type Venda,
} from '@pdv/shared';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AssinaturaServico, EstadoAssinatura } from '@/servicos/assinatura';
import { resumirDia, type ResumoDoDia } from './caixa';
import type { Dados } from './dados';
import { useObservavel } from './observavel';
import type { Preferencias } from './preferencias';
import type { NovoProduto } from './produtos';
import type { NovaVenda } from './vendas';

const ContextoDados = createContext<Dados | null>(null);

export function DadosProvider({ dados, children }: { dados: Dados; children: ReactNode }) {
  return <ContextoDados.Provider value={dados}>{children}</ContextoDados.Provider>;
}

export function useDados(): Dados {
  const dados = useContext(ContextoDados);
  if (!dados) throw new Error('useDados precisa estar dentro de <DadosProvider>');
  return dados;
}

/** Conta deste aparelho: sessão (token, lojaId, operadorId, aparelhoId) e nomes exibidos. */
export function useConta() {
  const dados = useDados();
  const { conta } = dados;
  const { sessao, perfil, identidade, reautenticacaoNecessaria: reautenticacaoSalva } = useObservavel(conta);
  const reautenticacaoNecessaria = reautenticacaoSalva || (dados.backend.modo === 'http' && !!identidade && !dados.acessoOffline.permitido(identidade));
  const transicao = useObservavel(conta.transicao);
  const segundoPlano = useObservavel(conta.atualizacaoEmSegundoPlano);
  const finalizandoAcesso = useObservavel(conta.finalizandoAcesso);
  const carregandoConta = finalizandoAcesso || (transicao && !segundoPlano);
  return {
    sessao,
    perfil,
    identidade,
    reautenticacaoNecessaria,
    carregandoConta,
    temConta: identidade !== null,
    nomeLoja: perfil?.nomeLoja ?? '',
    primeiroNome: perfil?.nomeResponsavel.split(' ')[0] ?? '',
  };
}

export function usePreferencias() {
  const { preferencias } = useDados();
  const valor: Preferencias = useObservavel(preferencias);
  return {
    preferencias: valor,
    alterar: (parcial: Partial<Preferencias>) => preferencias.alterar(parcial),
    definirConexao: preferencias.definirConexao.bind(preferencias),
  };
}

/**
 * Catálogo. `atalhos` já vem na ordem definida em Produtos → Atalhos (novos no fim, em ordem alfabética),
 * a mesma para a venda e para o gerenciador. `criar` lança `ErroDeDominio` com `codigo === 'limite_plano'` quando o plano não comporta
 * mais produtos (e `ean_duplicado` / `valor_invalido`). Exclusão é lógica.
 */
export function useProdutos() {
  const { produtos: repo, ordemAtalhos } = useDados();
  const estado = useObservavel(repo);
  const ordem = useObservavel(ordemAtalhos);
  return useMemo(
    () => ({
      produtos: repo.listar(),
      atalhos: ordemAtalhos.ordenar(repo.atalhos()),
      /** Sobe (`-1`) ou desce (`1`) um atalho; devolve os ids na nova ordem. */
      moverAtalho: (id: string, sentido: -1 | 1): Promise<string[]> => ordemAtalhos.mover(repo.atalhos(), id, sentido),
      buscarPorId: (id: string): Produto | null => repo.buscarPorId(id),
      buscarPorEan: (ean: string): Produto | null => repo.buscarPorEan(ean),
      buscarPorNome: (consulta: string): Produto[] => repo.buscarPorNome(consulta),
      criar: (dados: NovoProduto): Promise<Produto> => repo.criar(dados),
      editar: (id: string, mudancas: Partial<NovoProduto>): Promise<Produto> => repo.editar(id, mudancas),
      excluir: (id: string): Promise<void> => repo.excluir(id),
    }),
    // `estado` e `ordem` trocam a cada mudança e invalidam as listas derivadas.
    [repo, ordemAtalhos, estado, ordem],
  );
}

/** Vendas do aparelho, da mais recente para a mais antiga. */
export function useVendas() {
  const { vendas: repo } = useDados();
  const estado = useObservavel(repo);
  return useMemo(
    () => ({
      vendas: repo.listar(),
      listarPorDia: (dia: Date): Venda[] => repo.listarPorDia(dia),
      numeroDe: (venda: Venda): string => repo.numeroDe(venda),
      registrar: (nova: NovaVenda): Promise<Venda> => repo.registrar(nova),
      cancelar: (id: string): Promise<Venda> => repo.cancelar(id),
    }),
    [repo, estado],
  );
}

/** Caixa do aparelho. `caixa` é o caixa aberto (ou `null`). */
export function useSincronizacao() {
  const { sincronizacao } = useDados();
  const estado = useObservavel(sincronizacao);
  return { ...estado, servico: sincronizacao };
}

export function useCaixa() {
  const dados = useDados();
  const { caixa: repo, vendas } = dados;
  const historico = useObservavel(repo);
  return useMemo(
    () => ({
      caixa: repo.atual(),
      historico,
      abrir: (trocoInicialCentavos: Centavos): Promise<Caixa> => dados.abrirCaixa(trocoInicialCentavos),
      fechar: (contadoCentavos: Centavos, trocoRestanteCentavos = 0): Promise<Caixa> => repo.fechar(contadoCentavos, vendas.obter().vendas, trocoRestanteCentavos),
      registrarMovimento: (tipo: 'sangria' | 'suprimento' | 'retirada', valorCentavos: Centavos, motivo?: string, detalhes?: { categoria: string; destino: string }): Promise<Caixa> =>
        repo.registrarMovimento(tipo, valorCentavos, motivo ?? null, detalhes),
    }),
    [repo, vendas, historico],
  );
}

/** Totais do dia (padrão: hoje no relógio do app) — Início e Caixa usam o mesmo cálculo. */
export function useResumoDoDia(dia?: Date): ResumoDoDia {
  const { vendas, caixa, relogio, conta } = useDados();
  const estadoConta = useObservavel(conta);
  const estadoVendas = useObservavel(vendas);
  const caixas = useObservavel(caixa);
  const diasDeDesvio = useObservavel(relogio);
  return useMemo(
    () => resumirDia(dia ?? relogio.agora(), estadoVendas.vendas.filter(v => v.operadorId === estadoConta.identidade?.operadorId), caixa.atual()),
    // `caixas` e `diasDeDesvio` mudam quando o caixa ou o relógio de teste mudam.
    [dia, estadoVendas, caixas, diasDeDesvio, relogio, caixa, estadoConta],
  );
}

export function useAssinatura(): EstadoAssinatura & { servico: AssinaturaServico; modo: 'demo' | 'http' } {
  const { assinatura, backend } = useDados();
  const estado = useObservavel(assinatura);
  return { ...estado, servico: assinatura, modo: backend.modo };
}

export interface LicencaApp {
  planoId: PlanoId;
  licenca: Licenca | null;
  podeUsar: (recurso: Recurso) => boolean;
  /** `null` = ilimitado. */
  limite: (chave: ChaveLimite) => number | null;
  /** true se ainda cabe mais um, dado o uso atual. */
  dentroDoLimite: (chave: ChaveLimite, usoAtual: number) => boolean;
  permissaoDeVenda: PermissaoDeVenda;
  /** Se pode abrir uma NOVA venda (nunca bloqueia uma venda em andamento). */
  podeAbrirVenda: boolean;
}

/** Plano e permissões decididos offline pela licença em cache, com as funções puras do `@pdv/shared`. */
export function useLicenca(): LicencaApp {
  const { licenca, agora } = useAssinatura();
  const planoId: PlanoId = licenca?.planoId ?? 'essencial';
  const { reautenticacaoNecessaria } = useConta();
  return useMemo(() => {
    const permissaoDeVenda: PermissaoDeVenda = licenca
      ? licencaPermiteVenda(licenca, agora)
      : { permitido: false, motivo: 'suspensa' };
    return {
      planoId,
      licenca,
      podeUsar: (recurso) => planoPodeUsar(planoId, recurso),
      limite: (chave) => limiteDoPlano(planoId, chave),
      dentroDoLimite: (chave, usoAtual) => dentroDoLimiteDoPlano(planoId, chave, usoAtual),
      permissaoDeVenda,
      podeAbrirVenda: permissaoDeVenda.permitido && !reautenticacaoNecessaria,
    };
  }, [licenca, agora, planoId, reautenticacaoNecessaria]);
}

const MENSAGEM_BLOQUEIO: Record<MotivoBloqueio, string> = {
  precisa_sincronizar: 'Conecte-se à internet para abrir uma nova venda.',
  expirada: 'Sua licença expirou. Conecte-se à internet para renová-la.',
  suspensa: 'Sua assinatura está suspensa. Atualize o cartão para voltar a vender.',
};

export const mensagemDeBloqueio = (motivo: MotivoBloqueio): string => MENSAGEM_BLOQUEIO[motivo];
