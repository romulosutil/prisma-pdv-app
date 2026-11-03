const indisponivel = (): never => { throw new Error('Pagamento integrado indisponível nesta fase.'); };
export const provedoresPagamento = { criarCobrancaPix: indisponivel, situacaoPix: indisponivel, iniciarTap: indisponivel, situacaoTap: indisponivel, simularPagamentoPix: indisponivel, simularAbandonoTap: indisponivel };
