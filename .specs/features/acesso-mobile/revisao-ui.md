# Revisão UI e fluxo — acesso mobile

## Reavaliação dos achados

- **Lista e revogação de A após troca para B:** pps/mobile/app/ajustes/aparelhos.tsx:32-44 rejeita carregamento de escopo obsoleto e protege respostas por geração e escopo; :46-71 protege os callbacks de revogação e saída e o efeito invalida operações na troca. A lista e o modal também são filtrados por escopo (:82-90). Os nove testes em pps/mobile/test/aparelhosTela.test.ts:33-86 exercitam hooks e estado React em Node com componentes React Native, backend e navegação simulados: lista e consultas antigas, revogação atrasada com sucesso ou falha, sucesso após resposta, erros e modo demo. Não encontrei remanescente da corrida relatada por inspeção e nesses cenários.
- **Catálogo A gravado/publicado como B:** o catálogo captura e confere escopo antes de usar cache, após consultas e antes de gravar (pps/mobile/src/servicos/catalogoEan.ts:81-87,128-150,217-247). Testes Node cobrem resposta, cache e 401 tardios.
- **Falha de gravação Pix:** o formulário captura rejeição, informa erro e libera carregamento em inally (pps/mobile/src/telas/pagar/PixEstatico.tsx:113-121). A chave exposta pelo hook está condicionada ao escopo carregado (pps/mobile/src/telas/pagar/chavePix.ts:45). Revisado por inspeção, sem teste de componente.

## Verificação e limites

- 
pm run test --workspace apps/mobile -- test/aparelhosTela.test.ts test/fluxo.test.ts test/fluxoAcesso.test.ts test/catalogoEscopo.test.ts test/assinaturaEscopo.test.ts: 29 testes passaram em Node. O renderer React e os hosts simulados verificam contratos de estado, não a interface nativa; os testes de fluxo verificam decisões puras.
- 
pm run typecheck --workspace apps/mobile: passou.
- Sensor por mutação da guarda inicial de carregar não foi executado; a proteção independente em 
evogar também impede o caminho antigo e a simples remoção dessa guarda não isola o defeito originalmente reportado.
- Inspeção e testes Node não comprovam overlay, acessibilidade, navegação, erros visíveis ou checkout em UI nativa. Não foi executado teste Android, aparelho físico ou UX no navegador. Validar checkout 2500/1000/1500, 401 e vencimento com navegação real e telas de aparelhos/Pix.
