# LEX — Roteiro de validação manual

Checklist de teste da interface, **versionado para acumular entre fases**.
Não é a documentação da banca.

Reúne tudo o que ficou pendente de validação visual até a Fase 2D.1 —
principalmente o que depende de navegador (`FileReader`, `canvas`,
`clipboard`, foco de teclado, Word/LibreOffice) e por isso nunca pôde ser
executado por script.

**Os passos estão agrupados por tela, não por fase**, para a interface ser
percorrida uma vez só. A coluna *Fase de origem* fica em cada item, para saber
de onde ele veio.

## Antes de começar

```bash
# Backend
cd lex-backend
npm run seed:fresh     # derruba e repovoa a base
npm run dev            # porta 3001

# Frontend (outro terminal)
cd lex-frontend
npm run dev            # porta 5173
```

Conta do seed: **demo@lex.dev** / **Lex123456**

Dados que vários passos usam:

| Dado | Onde |
|---|---|
| Cliente PF sem profissão | Beatriz Ramos Pereira (lacuna intencional) |
| Cliente PJ sem representante legal | Agro Campos Gerais Ltda (intencional) |
| Processo com litisconsórcio | Inventário e Partilha de Bens (2 participantes) |
| Processo com 2 honorários ativos | o primeiro da lista (caso ambíguo) |
| Documento editado à mão | 1 dos contratos gerados |
| Documento com lacuna `[...]` | 1 documento gerado |

> Alguns passos alteram a base (excluir, desativar, trocar senha). Rode
> `npm run seed:fresh` de novo antes de repetir o roteiro do início.

---

## 1. Cadastro (`/registrar`)

- [ ] **1. Cadastro — assistente de duas etapas**
  Pré-condição: deslogado.
  Passos: 1) abrir `/registrar`; 2) preencher a etapa 1 (nome, e-mail, senha,
  confirmação); 3) avançar; 4) preencher a etapa 2 (CPF, telefone, OAB,
  escritório, endereço); 5) enviar.
  Esperado: as duas etapas aparecem separadas, com o botão de voltar
  preservando o que já foi digitado.
  Fase de origem: 1

- [ ] **2. Cadastro — máscaras de CPF, telefone e CEP**
  Pré-condição: etapa 2 do cadastro aberta.
  Passos: digitar apenas dígitos em CPF, telefone e CEP.
  Esperado: CPF vira `000.000.000-00`, telefone vira `(00) 00000-0000`, CEP
  vira `00000-000`, enquanto se digita.
  Fase de origem: 1

- [ ] **3. Cadastro — ViaCEP preenche o endereço**
  Pré-condição: etapa 2 do cadastro aberta.
  Passos: digitar um CEP válido (ex.: `84010-330`) e sair do campo.
  Esperado: logradouro, bairro, cidade e UF chegam preenchidos; o foco vai
  para o número.
  Fase de origem: 1

- [ ] **4. Cadastro — e-mail duplicado volta para a etapa 1**
  Pré-condição: usar `demo@lex.dev` na etapa 1 e completar a etapa 2.
  Passos: enviar o formulário.
  Esperado: erro dizendo que o e-mail já está cadastrado, a tela **volta para
  a etapa 1**, o campo de e-mail fica destacado e nada do que foi digitado se
  perde.
  Fase de origem: 1

- [ ] **5. Cadastro leva direto ao sistema autenticado**
  Pré-condição: dados novos e válidos nas duas etapas.
  Passos: concluir o cadastro.
  Esperado: **não passa pela tela de login**. Cai em `/dashboard` já
  autenticada, com o nome no cabeçalho, e o toast diz "Conta criada com
  sucesso. Bem-vinda ao LEX!". Recarregar a página (F5) continua autenticada —
  o cookie `lex-token` foi emitido no cadastro.
  Fase de origem: 2D.1

---

## 2. Login (`/login`)

- [ ] **6. Login com o usuário do seed**
  Pré-condição: deslogado.
  Passos: entrar com `demo@lex.dev` / `Lex123456`.
  Esperado: vai para `/dashboard`; o cabeçalho mostra o nome; F5 mantém a
  sessão.
  Fase de origem: 1

- [ ] **7. Login com senha errada**
  Passos: entrar com `demo@lex.dev` e uma senha qualquer errada.
  Esperado: mensagem "Credenciais inválidas" — a mesma para e-mail
  inexistente, sem dizer qual dos dois falhou.
  Fase de origem: 1

- [ ] **8. Sessão expirada redireciona**
  Pré-condição: autenticada, em qualquer tela interna.
  Passos: apagar o cookie `lex-token` pelo DevTools e clicar em algo que
  chame a API.
  Esperado: toast "Sessão expirada" e volta para `/login`, sem tela quebrada.
  Fase de origem: 1

---

## 3. Perfil (`/dashboard/perfil`)

- [ ] **9. Perfil — os 5 blocos**
  Passos: abrir o perfil.
  Esperado: os cinco blocos aparecem preenchidos com os dados do seed —
  dados pessoais, OAB, escritório, endereço e segurança.
  Fase de origem: 1

- [ ] **10. Perfil — salvar alterações**
  Passos: alterar o telefone e salvar.
  Esperado: toast de sucesso e o valor persiste após F5. O cabeçalho reflete a
  mudança na hora, sem recarregar.
  Fase de origem: 1

- [ ] **11. Perfil — campo apagado grava de fato**
  Passos: apagar o conteúdo do Instagram (ou da chave PIX), salvar, dar F5.
  Esperado: o campo continua vazio depois do F5. Se voltar com o valor antigo,
  o backend ignorou a limpeza — que é exatamente o bug que a Fase 1.3 corrigiu.
  Fase de origem: 1

- [ ] **12. Perfil — troca de senha**
  Passos: trocar a senha para `Lex654321`, sair, entrar com a nova; depois
  voltar a senha para `Lex123456`.
  Esperado: a troca exige a senha atual; senha atual errada é recusada; o
  login com a nova funciona.
  Fase de origem: 1

- [ ] **13. Perfil — logo de 800 KB é redimensionado e aceito** ⚠️
  Pré-condição: ter à mão um JPG/PNG de **cerca de 800 KB** (bem acima do
  teto de 200 KB do backend).
  Passos: 1) abrir o perfil; 2) escolher esse arquivo como logo do escritório;
  3) salvar; 4) dar F5.
  Esperado: **é aceito**, sem erro de tamanho. O canvas do navegador
  redimensiona antes de enviar. A miniatura aparece no perfil e continua lá
  depois do F5.
  Por que só aqui: depende de `FileReader`, `Image` e `canvas`, que não existem
  no Node — nunca pôde ser executado por script.
  Fase de origem: 2C

- [ ] **14. Perfil — remover o logo**
  Pré-condição: ter um logo salvo (passo 13).
  Passos: remover o logo e salvar; dar F5.
  Esperado: a miniatura some e não volta depois do F5. O documento gerado
  depois disso continua baixando normalmente, com cabeçalho só de texto
  (conferir no passo 30).
  Fase de origem: 2C / 2D.1

---

## 4. Clientes (`/dashboard/clientes`)

- [ ] **15. Cliente PF — cadastro completo**
  Passos: criar um cliente pessoa física preenchendo todos os campos.
  Esperado: máscaras de CPF, telefone e CEP funcionando; ViaCEP preenchendo o
  endereço; salva e aparece na lista.
  Fase de origem: 1

- [ ] **16. Cliente PJ — cadastro completo**
  Passos: criar um cliente pessoa jurídica, com representante legal.
  Esperado: ao trocar para PJ o formulário troca os campos (razão social,
  nome fantasia, CNPJ com máscara `00.000.000/0000-00`, bloco de representante
  legal). Salva e aparece na lista.
  Fase de origem: 1

- [ ] **17. Cliente — CPF duplicado destaca o campo**
  Passos: cadastrar um cliente com um CPF que já existe.
  Esperado: erro 409 com mensagem clara e **o campo CPF destacado em
  vermelho** — não uma mensagem genérica no topo. Nada do que foi digitado se
  perde.
  Fase de origem: 1

- [ ] **18. Cliente — campo apagado grava de fato**
  Passos: editar um cliente, apagar o RG (ou a profissão), salvar, dar F5.
  Esperado: o campo continua vazio depois do F5.
  Fase de origem: 1

- [ ] **19. Cliente — busca**
  Passos: digitar parte de um nome no campo de busca.
  Esperado: a lista filtra sozinha depois de uma pausa curta (debounce), sem
  botão de buscar.
  Fase de origem: 1

- [ ] **20. Cliente — excluir com processo ativo é recusado**
  Passos: tentar excluir "Maria Aparecida Costa" (tem processo).
  Esperado: recusa com 409 dizendo quantos processos impedem. O cliente
  continua na lista.
  Fase de origem: 2B

---

## 5. Processos (`/dashboard/processos`)

- [ ] **21. Processo — lista de participantes no formulário**
  Pré-condição: criar processo novo.
  Passos: 1) abrir o formulário; 2) acrescentar dois clientes como
  participantes; 3) dar um papel a cada um (autor, litisconsorte...); 4)
  marcar um como principal; 5) salvar.
  Esperado: o seletor é uma **lista de participantes**, não um cliente único.
  O principal é escolhido por **rádio** — marcar um desmarca o outro. Salvar
  sem participante nenhum, ou sem principal, é barrado antes de chamar a API.
  Fase de origem: 2B *(reconstruído — ver nota no fim)*

- [ ] **22. Processo — litisconsórcio visível na listagem**
  Passos: abrir a lista de processos e localizar "Inventário e Partilha de
  Bens".
  Esperado: mostra o cliente principal seguido de **"+1"**, indicando que há
  outro participante.
  Fase de origem: 2B *(reconstruído)*

- [ ] **23. Processo — detalhe mostra todos os participantes**
  Passos: abrir o detalhe de "Inventário e Partilha de Bens".
  Esperado: seção com os dois participantes, cada um com nome, tipo de pessoa
  e papel; o principal aparece destacado.
  Fase de origem: 2B *(reconstruído)*

- [ ] **24. Processo — código de acesso é buscado sob demanda e copiado**
  Passos: no detalhe do processo, clicar no botão de código de acesso de um
  participante.
  Esperado: o código **não aparece antes do clique** (não vem na listagem).
  Ao clicar, aparece no formato `LEX-XXXX-XXXX` (13 caracteres) e é copiado
  para a área de transferência — colar em algum lugar confirma. Toast
  confirmando a cópia.
  Fase de origem: 2B *(reconstruído)*

- [ ] **25. Processo — trocar o principal e remover participante**
  Passos: 1) editar um processo com dois participantes; 2) marcar o outro como
  principal; 3) remover o que deixou de ser principal; 4) salvar.
  Esperado: salva sem erro. O backend recusa remover o principal enquanto
  houver outros, e a tela promove o novo **antes** de remover — se a ordem
  estiver errada, aparece um 409.
  Fase de origem: 2B *(reconstruído)*

---

## 6. Biblioteca de Seções (`/dashboard/secoes`)

- [ ] **26. Seções — entrada no menu e lista**
  Passos: clicar em "Seções" no menu lateral.
  Esperado: o item existe entre "Documentos" e "Perfil". A lista traz as 10
  seções do seed com título, tipo (badge), trecho inicial do texto e a
  contagem de variáveis.
  Fase de origem: 2D.1

- [ ] **27. Seções — filtro por tipo**
  Passos: escolher "Qualificação" no filtro de tipo.
  Esperado: sobram só as 3 seções de qualificação. Voltar para "Todos os
  tipos" traz as 10 de volta.
  Fase de origem: 2D.1

- [ ] **28. Seções — busca por título, com e sem acento**
  Passos: digitar `qualificacao` (sem acento), depois `qualificação` (com).
  Esperado: **os dois** trazem as mesmas 3 seções. A lista filtra sozinha após
  uma pausa curta (debounce). `HONORARIOS` em maiúsculas também acha a
  cláusula de honorários.
  Fase de origem: 2D.1

- [ ] **29. Seções — estado vazio útil**
  Passos: buscar por algo inexistente, ex.: `zzzz`.
  Esperado: **não é tela em branco** — traz texto explicativo e um botão
  "Limpar filtros" que devolve a lista completa.
  Fase de origem: 2D.1

- [ ] **30. Seções — pré-visualização (modal)**
  Passos: clicar em "Ver" numa seção que use variáveis (ex.: a de
  qualificação).
  Esperado: modal com título e tipo no topo; o texto aparece **cru**, em fonte
  monoespaçada, com as quebras de linha preservadas e as chaves `{{...}}`
  **destacadas em cor**, sem nada resolvido. O rodapé diz quantas variáveis o
  texto tem.
  Fase de origem: 2D.1

- [ ] **31. Seções — o modal fecha por Esc, clique fora e prende o foco**
  Pré-condição: modal de pré-visualização aberto.
  Passos: 1) apertar **Esc**; 2) reabrir e clicar **fora** do modal; 3)
  reabrir e apertar **Tab** várias vezes.
  Esperado: fecha nos dois primeiros. No terceiro, o foco **circula apenas
  dentro do modal** e não escapa para a página atrás. Ao fechar, o foco volta
  para o botão "Ver" que o abriu.
  Fase de origem: 2D.1

- [ ] **32. Seções — criar seção com inserção de variável no cursor** ⭐
  Passos: 1) "Nova Seção"; 2) título e tipo; 3) no texto, escrever
  `Eu, , portador do CPF.` ; 4) **clicar entre a vírgula e o espaço**, no meio
  da frase; 5) no painel da direita, clicar em "Nome completo" (grupo
  Cliente).
  Esperado: `{{nomeCliente}}` entra **exatamente onde o cursor estava**, não
  no fim do texto. O foco volta para o textarea com o cursor **logo depois**
  do que foi inserido — dá para continuar digitando sem clicar de novo.
  Fase de origem: 2D.1

- [ ] **33. Seções — o seletor mostra nomes legíveis, não a chave**
  Passos: olhar o painel de variáveis.
  Esperado: cada item mostra em destaque o **rótulo em português**
  ("Nome completo", "CPF", "Estado civil"), abaixo a **descrição** dizendo de
  onde o dado vem, e só então a chave `{{...}}` em cinza e monoespaçada.
  **Não pode aparecer "Nome Cliente" ou "Cpf Cliente"** — se aparecer, o
  rótulo está sendo derivado da chave. Os grupos são "Cliente", "Processo",
  "Advogada e escritório", "Honorário" e "Sistema", com o total de 47 no topo.
  Fase de origem: 2D.1

- [ ] **34. Seções — busca dentro do seletor de variáveis**
  Passos: digitar `cpf` no campo de busca do painel.
  Esperado: sobram as entradas de CPF (cliente, representante legal,
  advogada), agrupadas. Buscar por `extenso` acha "Valor por extenso".
  Fase de origem: 2D.1

- [ ] **35. Seções — variável inexistente é recusada pelo backend**
  Passos: escrever `{{naoExiste}}` no texto e salvar.
  Esperado: erro 400 com a mensagem do backend dizendo que a variável é
  desconhecida. A tela apenas exibe — não inventa validação própria.
  Fase de origem: 2D.1

- [ ] **36. Seções — título duplicado**
  Passos: criar uma seção com um título que já existe.
  Esperado: erro 409 dizendo que já existe seção com esse título.
  Fase de origem: 2D.1

- [ ] **37. Seções — editar**
  Passos: editar uma seção, mudar o texto e salvar.
  Esperado: volta para a lista com toast de sucesso; o trecho inicial na lista
  reflete o texto novo; a contagem de variáveis acompanha.
  Fase de origem: 2D.1

- [ ] **38. Seções — desativar pede confirmação**
  Passos: clicar em "Desativar" numa seção **não usada** por documento.
  Esperado: modal de confirmação nomeando a seção. Confirmando, ela sai da
  lista.
  Fase de origem: 2D.1

- [ ] **39. Seções — desativar seção em uso é recusado**
  Passos: tentar desativar uma seção que compõe um modelo (ex.: a de
  qualificação).
  Esperado: recusa com 409, e a mensagem **nomeia os documentos** que a usam.
  A seção continua na lista.
  Fase de origem: 2D.1

---

## 7. Documentos (`/dashboard/documentos`)

- [ ] **40. Documento — download em PDF abre com acentuação correta**
  Passos: baixar um contrato gerado em PDF e abrir.
  Esperado: acentuação correta em "ação", "inventário", "cônjuge",
  "supérstite", "domiciliado(a)" e "nº" — sem quadradinhos nem letras trocadas.
  Margens de 2,5 cm, A4, corpo justificado, parágrafos preservados.
  Fase de origem: 2C

- [ ] **41. Documento — timbrado com e sem logo**
  Passos: baixar o mesmo documento **com** logo salvo no perfil e depois
  **sem** logo (passo 14).
  Esperado: com logo, ele aparece no cabeçalho. Sem logo, o cabeçalho usa só
  texto e continua bem diagramado — **sem buraco** no lugar da imagem.
  Fase de origem: 2C / 2D.1

- [ ] **42. Documento — rodapé "página X de Y"**
  Pré-condição: um documento com várias páginas (o contrato longo).
  Passos: abrir o PDF e conferir o rodapé em três páginas diferentes.
  Esperado: numeração correta e coerente em todas — não "página 1 de 1"
  repetido.
  Fase de origem: 2C

- [ ] **43. DOCX abre no Word e no LibreOffice sem aviso de reparo** ⚠️
  Passos: baixar o mesmo documento em DOCX e abrir **no Microsoft Word** e
  **no LibreOffice Writer**.
  Esperado: abre nos dois **sem caixa de diálogo de reparo/recuperação**, com
  o mesmo timbrado, as mesmas margens e a mesma acentuação do PDF.
  Por que só aqui: a estrutura OOXML foi validada por script, mas a abertura
  nos aplicativos reais nunca foi.
  Fase de origem: 2C

- [ ] **44. Documento editado à mão baixa o texto editado**
  Pré-condição: o seed marca um contrato como editado à mão.
  Passos: baixar esse documento.
  Esperado: o arquivo traz o **texto editado**, não o recomposto a partir das
  seções. Se o parágrafo acrescentado à mão sumir, a edição está sendo
  descartada.
  Fase de origem: 2C

- [ ] **45. Documento com lacuna avisa mas não bloqueia**
  Passos: abrir o documento que contém `[...]` e baixá-lo.
  Esperado: a tela avisa da lacuna, e **o download acontece mesmo assim** —
  lacuna é aviso, não impedimento.
  Fase de origem: 2C

- [ ] **46. Geração com pendência é bloqueada e orienta**
  Passos: gerar documento para o processo "Usucapião de Imóvel Urbano"
  (a cliente Beatriz não tem profissão).
  Esperado: recusa com 422 apontando `{{profissaoCliente}}` e dizendo **onde
  preencher** ("no cadastro do cliente"). Não gera documento pela metade.
  Fase de origem: 2C

---

## Notas

**Itens reconstruídos.** Os passos 21 a 25 correspondem aos itens 19 a 22 da
Fase 2B, que nunca foram executados. O enunciado original **não foi
localizado** — não está no `CLAUDE.md`, não há arquivo de relatório de fase no
repositório e as mensagens de commit da 2B descrevem a entrega, não a lista de
verificação. Foram **reconstruídos a partir do que a 2B entregou** (endpoints
de participantes, promoção a principal em transação, código de acesso sob
demanda, litisconsórcio no seed e as telas de processo). São cinco passos onde
o original tinha quatro, porque a promoção a principal e a remoção de
participante mereciam passos separados.

**Legenda:** ⚠️ depende de aplicativo externo ou de API só existente no
navegador. ⭐ item central da fase.
