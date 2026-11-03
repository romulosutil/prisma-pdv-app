import { z } from 'zod';

export const VERSAO_POLITICAS = '2026-11-02';
/** Lista fechada: nunca aceitar dumps de estado, mensagens de erro ou credenciais como diagnóstico. */
export const ResumoSuporteSchema = z.object({
  versao: z.string().max(30), ambiente: z.enum(['demo', 'homologacao', 'producao']),
  plataforma: z.enum(['android', 'ios', 'web']),
  pendentes: z.number().int().nonnegative(), rejeitadas: z.number().int().nonnegative(),
  ultimaSincronizacaoEm: z.iso.datetime().nullable(),
}).strict();
export const SolicitarSuporteSchema = z.object({
  id: z.uuid(), tipo: z.enum(['suporte', 'exclusao']),
  mensagem: z.string().trim().min(10).max(2000),
  diagnostico: ResumoSuporteSchema.nullable().default(null),
  versaoPoliticas: z.literal(VERSAO_POLITICAS),
}).strict();
export type SolicitarSuporte = z.infer<typeof SolicitarSuporteSchema>;
export const SolicitacaoSuporteSchema = SolicitarSuporteSchema.extend({
  estado: z.enum(['aberto', 'em_analise', 'concluido']), resposta: z.string().nullable(),
  criadoEm: z.iso.datetime(), atualizadoEm: z.iso.datetime(),
});
export type SolicitacaoSuporte = z.infer<typeof SolicitacaoSuporteSchema>;

export const POLITICAS_PILOTO = [
  { titulo: 'Suporte do piloto', texto: 'Envie uma solicitação neste app e acompanhe a resposta pelo protocolo. O atendimento é manual, sem prazo de resposta garantido no piloto. Se houver perda, duplicação ou acesso indevido, interrompa novas operações no aparelho afetado e preserve os registros. Não limpe os dados nem reinstale antes da revisão. Sem acesso à conta, solicite um código no seu e-mail e use a recuperação de acesso.' },
  { titulo: 'Privacidade', texto: 'O Prisma PDV usa nome, e-mail, documento da empresa, vínculos, identificação do aparelho e registros comerciais para autenticar, separar empresas, operar vendas e recuperar dados. O servidor recebe os registros sincronizados; pendências ficam no aparelho de origem. E-mails de acesso passam pelo serviço de entrega configurado. Consultas de catálogo enviam o código do produto à fonte externa, sem enviar vendas ou clientes. O resumo técnico é opcional e contém apenas versão, ambiente, plataforma, contagens de pendências e data da última sincronização. Não envie senha, código de acesso, cartão ou dados de clientes na mensagem.' },
  { titulo: 'Retenção e exclusão', texto: 'Dados comerciais confirmados são mantidos durante o uso da conta e até análise de um pedido de exclusão. O pedido não apaga dados, não cancela vínculos e não elimina histórico automaticamente. A equipe informa no protocolo o escopo, prazo de execução e eventual retenção necessária antes de executar a exclusão. Solicitações concluídas são removidas após 90 dias. Backups locais têm retenção configurada de sete cópias diárias; dados excluídos podem permanecer nessas cópias até sua rotação. Dados e pendências locais permanecem no aparelho até sua remoção autorizada. Arquivos que você compartilhar ficam sob seu controle e do destinatário.' },
  { titulo: 'Termos do piloto', texto: 'O piloto registra vendas, estoque e caixa com pagamentos manuais. Confira o recebimento no banco ou na maquininha antes de registrar Pix ou cartão; o app não processa esses pagamentos nem emite documento fiscal. Cada pessoa usa seu próprio acesso. Faça a conferência diária e acompanhe a sincronização. Uma instalação substituta recupera somente os registros confirmados pelo servidor. Exportação não restaura automaticamente uma fila pendente. O acesso está liberado sem cobrança enquanto essa política estiver vigente; não há contratação automática de assinatura.' },
] as const;
