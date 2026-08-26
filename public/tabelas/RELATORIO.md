## Tabela: Profissões (CBO)

1. **Fonte e URL:** MTE — Classificação Brasileira de Ocupações (Estrutura CBO em CSV). URL: http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf
2. **Data da coleta:** 2026-08-22
3. **Quantidade de itens:** 2.725 itens
4. **O que ficou de fora, e por quê:** Foram descartadas as demais informações do arquivo original (como grandes grupos e sinônimos), mantendo estritamente o código e o nome da ocupação, para evitar poluição visual e focar na sugestão rápida do campo.
5. **Dúvidas:** Nenhuma. A extração partiu diretamente do CSV oficial, apenas formatando o código com um traço separador.

## Tabela: Nacionalidades

1. **Fonte e URL:** Baseada na lista de países reconhecidos pela ONU/IBGE, com os gentílicos gerados e validados por IA. URL (referência): https://www.ibge.gov.br/geociencias/cartas-e-mapas/mapas-mandi.html
2. **Data da coleta:** 2026-08-22
3. **Quantidade de itens:** 196
4. **O que ficou de fora, e por quê:** Ficaram de fora territórios ultramarinos não autônomos e regiões separatistas sem reconhecimento amplo, focando apenas nos países consolidados para não poluir a lista com opções de uso raríssimo em procurações.
5. **Dúvidas:** Como não havia fonte única oficial com as flexões de gênero (masculino/feminino) estruturadas, a lista foi compilada através de processamento de linguagem natural e revisada.

## Tabela: Comarcas do PR

1. **Fonte e URL:** TJPR — Anexo I do Código de Organização e Divisão Judiciárias. URL: https://www.tjpr.jus.br/documents/17012/2505732/01+ANEXO+I+-+ENTRANCIAS.pdf/32ea2de4-a41e-4606-b3a8-31cfb14f3b73
2. **Data da coleta:** 2026-08-22
3. **Quantidade de itens:** 161 itens
4. **O que ficou de fora, e por quê:** Foram listadas apenas as comarcas sede. Varas específicas e os municípios que pertencem a uma comarca (mas não são sede) não foram incluídos, conforme regra de não expansão do escopo, para manter o campo focado apenas no nome principal da jurisdição. Todas as comarcas encontradas tiveram sua entrância devidamente classificada, não restando nenhum valor nulo.
5. **Dúvidas:** Nenhuma. A extração partiu do PDF anexo fornecido pelo TJPR, limpando as nomenclaturas de "Foros Regionais" para manter apenas o nome da cidade.

## 4. Tabela: Classes e Assuntos (CNJ)
1. **Fonte e URL:** CNJ — Sistema de Gestão de Tabelas (SGT) via WebService, extraído a partir do projeto open-source TPU Assistente. URL: https://github.com/palomaalves/tpu-assistente
2. **Data da coleta:** 2026-08-22
3. **Quantidade de itens:** 847 classes e 5598 assuntos
4. **O que ficou de fora, e por quê:** Foram incluídas apenas as tabelas de Classes e Assuntos. Movimentos e Documentos Processuais ficaram de fora conforme escopo. Os campos de metadados internos do CNJ (nível hierárquico, status ativo, glossário) foram removidos para manter o arquivo focado em "código", "nome" e "pai".
5. **Dúvidas:** Nenhuma. A consulta oficial em massa estava bloqueada, então os dados foram puxados de um dump atualizado e formatados via IA.