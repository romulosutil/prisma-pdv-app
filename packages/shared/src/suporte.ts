import { z } from 'zod';

export const VERSAO_POLITICAS = '2026-11-21';
export const VERSOES_POLITICAS_ACEITAS = ['2026-11-02', VERSAO_POLITICAS] as const;
/** Nome do desenvolvedor exibido na Google Play Console e nas páginas legais exigidas pela loja. */
export const NOME_DESENVOLVEDOR = 'Rômulo Sutil';
/** Contato público de suporte, privacidade e exclusão de conta (contato comercial, pode aparecer em páginas e no app). */
export const EMAIL_CONTATO = 'contato@prumo.services';
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
  versaoPoliticas: z.enum(VERSOES_POLITICAS_ACEITAS),
}).strict();
export type SolicitarSuporte = z.infer<typeof SolicitarSuporteSchema>;
export const SolicitacaoSuporteSchema = SolicitarSuporteSchema.extend({
  estado: z.enum(['aberto', 'em_analise', 'concluido']), resposta: z.string().nullable(),
  criadoEm: z.iso.datetime(), atualizadoEm: z.iso.datetime(),
});
export type SolicitacaoSuporte = z.infer<typeof SolicitacaoSuporteSchema>;

export const POLITICAS = [
  { titulo: 'Suporte', texto: 'Envie uma solicitação no Prisma PDV e acompanhe a resposta pelo protocolo. O atendimento é feito pela equipe do desenvolvedor Rômulo Sutil, sem garantia de atendimento imediato. Se houver perda, duplicação ou acesso indevido, interrompa novas operações no aparelho afetado e preserve os registros. Não limpe os dados nem reinstale antes da revisão. Sem acesso à conta, solicite um código no seu e-mail e use a recuperação de acesso.' },
  { titulo: 'Privacidade', texto: 'O Prisma PDV, desenvolvido por Rômulo Sutil, usa nome, e-mail, documento da empresa, vínculos, identificação do aparelho e registros comerciais para autenticar, separar empresas, operar vendas e recuperar dados. O servidor recebe os registros sincronizados; pendências ficam no aparelho de origem. E-mails de acesso passam pelo serviço de entrega configurado. Consultas de catálogo enviam o código do produto à fonte externa, sem enviar vendas ou clientes. O resumo técnico é opcional e contém apenas versão, ambiente, plataforma, contagens de pendências e data da última sincronização. Não envie senha, código de acesso, cartão ou dados de clientes na mensagem.' },
  { titulo: 'Retenção e exclusão', texto: 'Dados comerciais confirmados são mantidos durante o uso da conta e até análise de um pedido de exclusão. O pedido não apaga dados, não cancela vínculos e não elimina histórico automaticamente. A equipe informa no protocolo ou por e-mail o escopo, o prazo de execução e eventual retenção necessária antes de executar a exclusão. Solicitações concluídas são removidas após 90 dias. Backups locais têm retenção configurada de sete cópias diárias; dados excluídos podem permanecer nessas cópias até sua rotação. Dados e pendências locais permanecem no aparelho até sua remoção autorizada. Arquivos que você compartilhar ficam sob seu controle e do destinatário.' },
  { titulo: 'Termos de uso', texto: 'O Prisma PDV registra vendas, estoque, caixa e cobranças da loja. Nos pagamentos manuais, confira o recebimento no banco ou na maquininha antes de concluir; nos meios integrados conectados pela própria loja, o recebimento vai diretamente para a conta do lojista no provedor escolhido, sem intermediação financeira do Prisma PDV ou do desenvolvedor Rômulo Sutil. O aplicativo não emite documento fiscal. Cada pessoa usa seu próprio acesso. Faça a conferência diária e acompanhe a sincronização. Uma instalação substituta recupera somente os registros confirmados pelo servidor; exportação não restaura automaticamente uma fila pendente. Planos pagos opcionais são contratados e gerenciados exclusivamente pela Google Play Store; enquanto o acesso estiver em modo gratuito, não há contratação automática de assinatura.' },
] as const;

export const POLITICAS_PILOTO = POLITICAS;
