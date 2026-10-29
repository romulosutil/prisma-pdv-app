# Identidade e recuperação de aparelho

A instalação guarda um identificador público de aparelho e o reutiliza em cadastro e login, inclusive ao alternar contas. Quando ainda não há identidade salva, uma sessão antiga carregada é usada para preservá-la. O identificador não é um segredo e não substitui a proteção do token de sessão, ainda pendente em P0-03-D.

Uma reinstalação pode apagar a identidade e criar outra. Quando o limite de aparelhos da conta estiver atingido, será necessária recuperação autenticada ou substituição do aparelho antigo. A consulta, revogação e substituição de aparelhos ainda dependem de P0-03-F; não há procedimento implementado para executá-las neste momento. Preservar o aparelho e seus dados locais, especialmente vendas ainda não sincronizadas, até existir recuperação segura. Não apagar vendas para contornar o limite.

O armazenamento ou identificador inválido interrompe o acesso em vez de trocar a identidade silenciosamente. Preserve os dados para diagnóstico e recuperação. A validação local não comprova revogação no servidor, isolamento entre contas nem recuperação de vendas após reinstalação; esses trabalhos permanecem pendentes.
