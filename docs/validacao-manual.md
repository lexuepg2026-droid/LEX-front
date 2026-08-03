# LEX — Roteiro de validação manual

Checklist de teste da interface, **versionado para acumular entre fases**.
Não é a documentação da banca.

Reúne tudo o que ficou pendente de validação visual até a Fase 2D.2 —
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
| Modelo de procuração PF | "Procuração Ad Judicia" |
| Modelo de procuração PJ | "Procuração Ad Judicia — Pessoa Jurídica" |
| Modelo que usa honorário | "Contrato de Prestação de Serviços Advocatícios" |
| Processo com 2 honorários ativos | Indenizacao por Danos Morais |

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

## 8. Montagem de documento (`/dashboard/documentos/montar`)

- [ ] **47. Montagem — duas portas de entrada no menu**
  Passos: olhar o menu lateral, no grupo de Documentos.
  Esperado: existem **dois** itens novos entre "Documentos" e "Seções":
  **"Gerar documento"** e **"Montar modelo"**. Levam à mesma tela. Estando numa
  delas, **só a porta correspondente fica acesa** no menu — não as duas.
  Fase de origem: 2D.2

- [ ] **48. Montagem — o modo MODELO fica visível o tempo todo** ⭐
  Passos: 1) "Montar modelo"; 2) dar nome e tipo; 3) "Começar a montar";
  4) acrescentar uma seção; 5) rolar a tela.
  Esperado: o cabeçalho traz o selo **"Montando um MODELO"** e a faixa lateral
  dourada, e eles **continuam ali** depois de montar, não só na entrada. O
  subtítulo diz "reutilizável, sem processo e sem cliente". **Não aparece**
  painel de geração.
  Fase de origem: 2D.2

- [ ] **49. Montagem — o modo DOCUMENTO fica visível o tempo todo** ⭐
  Passos: 1) "Gerar documento"; 2) escolher um modelo da lista.
  Esperado: selo **"Montando um DOCUMENTO"**, faixa lateral verde, e o painel
  "Gerar o documento" no fim da tela. Em nenhum momento fica dúvida sobre qual
  dos dois modos está aberto.
  Fase de origem: 2D.2

- [ ] **50. Montagem — canvas em A4 com timbrado e logo**
  Pré-condição: ter logo salvo no perfil (passo 13).
  Passos: abrir a montagem de um modelo com seções.
  Esperado: a folha é **branca nos dois temas** (é papel), em proporção A4, com
  margens visíveis de 2,5 cm. O cabeçalho traz o logo à esquerda e, à direita,
  nome do escritório, `Nome — OAB/UF nº`, endereço em uma linha e
  `telefone · e-mail`. Rodapé no pé da folha.
  Fase de origem: 2D.2

- [ ] **51. Montagem — timbrado sem logo não abre buraco** ⭐
  Pré-condição: **remover** o logo no perfil (passo 14).
  Passos: voltar à montagem.
  Esperado: o bloco de texto do timbrado passa a ocupar a **largura inteira**.
  **Não sobra espaço reservado** onde a imagem estava. Mesma regra da Fase 2C.
  Fase de origem: 2D.2

- [ ] **52. Montagem — biblioteca com filtro e busca sem acento**
  Passos: na barra lateral, 1) escolher "Qualificação" no filtro; 2) limpar;
  3) digitar `qualificacao` sem acento; 4) digitar `qualificação` com acento.
  Esperado: o filtro deixa só as de qualificação; as duas buscas trazem o
  **mesmo** resultado. Cada miniatura mostra título, tipo e trecho inicial.
  Fase de origem: 2D.2 (reusa a busca da 2D.1)

- [ ] **53. Montagem — inserir pelo botão "Adicionar"**
  Passos: clicar em "Adicionar" numa miniatura.
  Esperado: a seção entra **no fim** do documento, numerada na sequência. O
  indicador mostra "salvando…" e depois "salvo às HH:MM:SS".
  Fase de origem: 2D.2

- [ ] **54. Montagem — inserir arrastando da barra para a folha**
  Pré-condição: **mouse** (o arrastar não dispara em toque — ver passo 55).
  Passos: arrastar uma miniatura e soltar **entre dois blocos** da folha.
  Esperado: uma faixa tracejada marca onde vai cair, e a seção entra
  **exatamente naquela posição**, não no fim.
  Fase de origem: 2D.2

- [ ] **55. Montagem — inserir na posição por TOQUE, sem arrastar** ⚠️ ⭐
  Pré-condição: abrir o LEX **no tablet** (ou no emulador de toque do DevTools,
  com "touch" ativado).
  Passos: 1) **tocar no corpo** de uma miniatura (não no botão "Adicionar");
  2) observar a folha; 3) tocar em "Inserir aqui" no ponto desejado.
  Esperado: a miniatura fica destacada, aparece a faixa
  "«título» pronta para entrar", e a folha mostra botões **"Inserir aqui"**
  entre os blocos. A seção entra na posição escolhida — **o mesmo resultado do
  arrastar, sem arrastar**.
  Por que só aqui: `dragstart`/`dragover`/`drop` **não disparam em toque**, e
  este é o caminho que substitui o arrastar no tablet. Não há como exercitá-lo
  por script.
  Fase de origem: 2D.2

- [ ] **56. Montagem — soltar em posição ocupada empurra as demais**
  Passos: inserir uma seção na **posição 2**, com o documento já tendo 4 ou
  mais.
  Esperado: a nova fica na 2, e quem estava na 2 vai para a 3, e assim por
  diante. A numeração continua **1, 2, 3… sem repetir e sem pular**. O empurrão
  é regra do backend — a tela só mostra o resultado.
  Fase de origem: 2D.2

- [ ] **57. Montagem — seção já usada aparece marcada e não entra de novo**
  Passos: 1) olhar na barra lateral uma seção que já está na folha; 2) tentar
  arrastá-la.
  Esperado: a miniatura fica esmaecida, com o selo verde **"no documento"** em
  vez do botão "Adicionar", e **não é arrastável**. A restrição real é o índice
  único do banco; a tela só antecipa.
  Fase de origem: 2D.2

- [ ] **58. Montagem — reordenar por ↑ e ↓**
  Passos: clicar em ↑ e ↓ na barra de um bloco.
  Esperado: o bloco troca de lugar, a numeração acompanha na hora, e o
  indicador vai a "salvando…" e volta a "salvo". O ↑ do primeiro bloco e o ↓ do
  último ficam **desabilitados**.
  Fase de origem: 2D.2

- [ ] **59. Montagem — reordenar arrastando bloco na folha**
  Pré-condição: mouse.
  Passos: arrastar um bloco pela folha e soltar em outra posição.
  Esperado: mesmo resultado do ↑/↓. O bloco arrastado fica translúcido durante
  o arraste.
  Fase de origem: 2D.2

- [ ] **60. Montagem — remover bloco**
  Passos: clicar em "Remover" num bloco.
  Esperado: sai da folha na hora, a numeração dos demais **fecha sem buraco**,
  e a miniatura correspondente **volta a ficar disponível** na barra lateral.
  Fase de origem: 2D.2

- [ ] **61. Montagem — recarregar mantém a ordem**
  Passos: depois de montar e reordenar, dar **F5**.
  Esperado: a mesma sequência volta, na mesma ordem. Não há botão "Salvar" em
  nenhum momento — cada operação já persistiu.
  Fase de origem: 2D.2

- [ ] **62. Montagem — rollback visível quando a rede falha** ⭐
  Passos: 1) montar com 4 seções; 2) no DevTools, aba Network, marcar
  **Offline**; 3) clicar em ↓ num bloco; 4) observar.
  Esperado: o bloco **desce na hora** (atualização otimista) e em seguida
  **volta para o lugar de origem** — o rollback é visível. Aparece toast de
  erro, a faixa vermelha "não salvo — a ordem anterior foi restaurada" no
  cabeçalho, e a mensagem do erro abaixo. Voltando a rede, a próxima
  reordenação funciona normalmente.
  Fase de origem: 2D.2

- [ ] **63. Montagem — cinco reordenações rápidas não embaralham** ⭐
  Passos: clicar em ↑/↓ **cinco vezes seguidas, o mais rápido que conseguir**,
  em blocos diferentes.
  Esperado: a ordem final na tela é exatamente a que se vê depois do último
  clique, e o **F5 confirma a mesma**. As chamadas são serializadas — se
  embaralhar, a fila não está funcionando.
  Fase de origem: 2D.2

---

## 9. Geração do documento (painel no fim da montagem, modo documento)

- [ ] **64. Geração — escolha de processo e do cliente com o papel**
  Passos: 1) modo documento; 2) escolher o processo "Inventário e Partilha de
  Bens"; 3) abrir o seletor de cliente.
  Esperado: o seletor de cliente só habilita **depois** de escolher o processo,
  e lista os participantes com **nome — papel**, dizendo qual é o
  **(principal)** e o CPF/CNPJ. Processo com um participante só já vem
  escolhido; com dois, nenhum vem marcado.
  Fase de origem: 2D.2

- [ ] **65. Geração — cliente PF gera**
  Passos: gerar a procuração de pessoa física para um cliente PF com cadastro
  completo (ex.: Joao Paulo Oliveira).
  Esperado: toast de sucesso e a tela vai para o **editor de texto final**.
  Fase de origem: 2D.2

- [ ] **66. Geração — cliente PJ gera pela interface** ⭐
  Passos: escolher o modelo **"Procuração Ad Judicia — Pessoa Jurídica"**,
  processo com cliente PJ (ex.: Tech Solutions Brasil S.A.), e gerar.
  Esperado: gera. O texto final traz razão social, CNPJ, sede e o representante
  legal — **não** os campos de pessoa física.
  Por que importa: este caminho nunca havia sido exercitado pela interface.
  Fase de origem: 2D.2

- [ ] **67. Geração — 422 mostra o RÓTULO, nunca a chave crua** ⭐
  Passos: gerar a procuração de pessoa física para **Beatriz Ramos Pereira**
  (o seed a deixa sem profissão de propósito).
  Esperado: bloco de aviso dizendo **"Falta um dado no cadastro"**, e o item
  traz em destaque **"Profissão"** — o rótulo — com a orientação
  **"Preencha «Profissão» no cadastro do cliente"**. A chave
  `{{profissaoCliente}}` aparece **discreta e por último**, em cinza. **Não pode
  aparecer JSON**, nem a chave no lugar do nome.
  Fase de origem: 2D.2

- [ ] **68. Geração — escolha de honorário oferecida na própria tela** ⭐
  Passos: gerar o **"Contrato de Prestação de Serviços Advocatícios"** para
  "Indenizacao por Danos Morais" / Ana Lima Santos (o processo tem 2 honorários
  ativos).
  Esperado: bloco azul com a orientação do backend e a **lista de honorários
  para escolher**, cada um com valor, descrição, tipo e vencimento. Abaixo, a
  nota de que **"6 variáveis de honorário estão esperando esta escolha"** e que
  se resolvem sozinhas — elas **não** aparecem na lista de dados faltando.
  Escolhendo um e clicando em "Gerar com este honorário", gera.
  Fase de origem: 2D.2

- [ ] **69. Geração — diálogo do 409 ao regerar texto revisado** ⭐
  Pré-condição: ter um documento gerado e **editado à mão** (passo 70).
  Passos: 1) voltar à montagem no modo documento, mesmo modelo, mesmo processo
  e mesmo cliente; 2) gerar de novo.
  Esperado: **não gera direto.** Abre diálogo dizendo explicitamente que o
  texto revisado será **SUBSTITUÍDO** e que o documento atual **sai da lista**,
  com a data do atual. "Manter o texto revisado" cancela e nada muda.
  "Regerar e substituir" gera o novo — e o anterior desaparece da listagem.
  Fase de origem: 2D.2

---

## 10. Texto final do documento (`/dashboard/documentos/:id/texto`)

- [ ] **70. Texto final — editar e salvar marca "editado à mão"**
  Passos: 1) abrir um documento gerado; 2) acrescentar um parágrafo no fim;
  3) "Salvar texto".
  Esperado: enquanto há mudança pendente aparece "alterações não salvas" e o
  botão habilita. Depois de salvar, toast de sucesso e o selo dourado
  **"editado à mão"** no cabeçalho. F5 mantém o texto novo.
  Fase de origem: 2D.2

- [ ] **71. Texto final — seções de origem são rastreabilidade, não conteúdo** ⭐
  Passos: 1) no documento editado do passo 70, olhar o cartão "Seções de
  origem"; 2) ir a Seções e **editar o texto** de uma delas; 3) voltar ao
  documento e dar F5.
  Esperado: o cartão lista as seções na ordem, com um aviso dizendo que o texto
  **já não vem delas**. Depois de editar a seção, **o texto do documento não
  muda** — é isso que garante que a revisão dela não é descartada.
  Fase de origem: 2D.2

- [ ] **72. Texto final — aviso de lacuna com contexto, sem bloquear**
  Passos: abrir o documento que contém `[...]` (o seed cria um).
  Esperado: faixa amarela dizendo quantos trechos faltam preencher, cada um com
  o **rótulo**, a **linha** e o **trecho de contexto** ao redor. "ir até o
  trecho" leva o cursor até lá e o seleciona. O texto diz que é aviso, não
  impedimento — e **o download funciona** mesmo assim.
  Fase de origem: 2D.2 (a lacuna vem da 2C)

- [ ] **73. Texto final — download em PDF pela interface**
  Passos: clicar em "PDF".
  Esperado: o arquivo baixa com o nome vindo do servidor
  (`procuracao-nome-do-cliente-aaaa-mm-dd.pdf`), e o toast informa nome e
  tamanho. Abrindo, é o **texto editado** que está lá, com o timbrado.
  Fase de origem: 2D.2

- [ ] **74. Texto final — download em DOCX pela interface**
  Passos: clicar em "DOCX".
  Esperado: mesmo comportamento, extensão `.docx`. Conferir a abertura no Word
  e no LibreOffice é o passo 43.
  Fase de origem: 2D.2

- [ ] **75. Texto final — alternar a visibilidade no portal**
  Passos: 1) clicar no botão de portal; 2) dar F5; 3) clicar de novo; 4) F5.
  Esperado: começa **"Oculto do portal"** (padrão desligado). Ligando, fica
  verde com "Visível no portal" e **persiste depois do F5**. Desligando,
  volta — e também persiste. O portal em si é a Fase 3; aqui só o interruptor.
  Fase de origem: 2D.2

---

## 11. Lista de Documentos, revisada (`/dashboard/documentos`)

- [ ] **76. Documentos — a lista mostra só documentos gerados**
  Passos: abrir a lista.
  Esperado: **nenhum modelo** aparece (modelo tem tela própria) e **não há
  coluna de arquivo nem link de URL** — upload está fora da interface. As
  colunas são Nome, Tipo, Processo, Gerado em, Situação e Ações. O tipo sai por
  extenso ("Procuração", "Contrato de prestação de serviços"), nunca o
  identificador cru.
  Fase de origem: 2D.2

- [ ] **77. Documentos — selos de situação e download direto da lista**
  Passos: 1) localizar o documento editado à mão e um com portal ligado;
  2) clicar em "PDF" e em "DOCX" na linha.
  Esperado: os selos "editado à mão" e "no portal" aparecem na coluna Situação;
  os demais mostram "gerado". Os dois downloads funcionam **direto da lista**,
  sem precisar abrir o documento. "Abrir" leva ao editor de texto final.
  Fase de origem: 2D.2

---

## 12. Fase 2E.1 — atualização de dependências e correções

> Estes 6 passos entraram na Fase 2E.1. **Só entrou aqui o que script não
> consegue verificar** — formato de resposta, chave de erro, envelope e
> ausência de `__v` foram verificados por HTTP na própria fase e ficaram de
> fora de propósito.
>
> Cada passo traz `[automatizável]` (a Fase 2E.2 vai convertê-lo em teste e
> removê-lo daqui) ou `[só olho humano]`.
>
> **Resultado da Fase 2E.2:** os 4 `[automatizável]` (79, 80, 81, 83) viraram
> teste e foram para `## Automatizado`. O 78 foi executado e foi para
> `## Validado`. Sobra o 82, que é `[só olho humano]` — e entra o 84, que a
> própria 2E.2 criou ao mexer em CSS.

- [ ] **82. Aparência das telas depois da remoção das classes CSS**
  `[só olho humano]`
  Pré-condição: logada.
  Passos: 1) abrir **Processos** e o **detalhe de um processo** (a tela que
  usava `ProcessTabs.css`); 2) percorrer as telas que carregam
  `utilities.css`, que é global — Dashboard, Clientes, Financeiro; 3) olhar os
  botões em geral (`Button.css` perdeu `--ghost` e `--lg`).
  Esperado: **nada mudou visualmente**. Foram removidas 12 classes e 3 tokens
  que nenhuma tela aplicava, mais `Card.css` inteiro. Procurar especificamente
  por: bloco sem borda, botão sem cor de fundo, texto sem cor, espaçamento
  colapsado.
  Por que só olho humano: remoção de CSS não quebra `lint` nem `build` — o
  sintoma é visual e só aparece na tela.
  Fase de origem: 2E.1

---

## 13. Fase 2E.2 — o que a suíte não alcança

> A Fase 2E.2 foi de testes, não de funcionalidade, e por isso **só gerou um
> passo**. Ele existe porque a Parte 8 daquela fase mexeu em CSS de produção,
> e mudança de CSS é a única coisa ali que a própria suíte não consegue
> conferir: a varredura prova que a regra **chega** na tela, nunca que o
> resultado **está bonito**.

- [ ] **84. Aparência depois da correção do `ui-btn` e das remoções da 2E.2**
  `[só olho humano]`
  Pré-condição: logada, base recém-seedada.
  Passos: 1) abrir **Montagem de documento**, **Texto final do documento** e
  **nova Seção** — as três telas cujos botões `ui-btn` **estavam sem estilo** e
  passaram a receber `Button.css`; 2) abrir qualquer **modal de confirmação**
  (excluir uma seção, por exemplo) e olhar o botão vermelho de confirmar; 3)
  percorrer **Cadastro** (as duas etapas do assistente) e o **breadcrumb** do
  topo em três telas diferentes; 4) abrir o **detalhe de um processo**, que
  usava `.btn-action.btn-cancel`.
  Esperado: nos passos 1 e 2, os botões agora **têm** aparência de botão —
  é mudança visual **intencional**, e o que se confere é que ficou coerente
  com os botões das demais telas, não que nada mudou. Nos passos 3 e 4,
  **nada mudou**: foram removidas 5 classes que não casavam com seletor
  nenhum (`wizard-step`, `breadcrumb-item`, `text-muted`, `text-secondary`,
  `.btn-action.btn-cancel`) e o arquivo `utilities.css` inteiro.
  Por que só olho humano: a varredura de `tests/css/appliedClasses.test.js`
  garante que toda classe aplicada tem regra alcançável, e `npm run build`
  garante que compila. **Nenhum dos dois enxerga o resultado.** Botão que
  ganhou estilo errado e bloco que colapsou passam limpos nos dois.
  Fase de origem: 2E.2

---

## 14. Fase 3.2 — Portal do cliente

> **O portal é a primeira interface do LEX usada por alguém que não é a
> advogada, num aparelho que não é o dela, numa rede que não é a do
> escritório.** Aparência, legibilidade e fluxo não têm substituto
> automatizado aqui: a suíte prova que a classe tem regra e que o import não
> atravessa, nunca que um leigo de 60 anos consegue entrar com um código
> ditado por telefone.
>
> Por isso esta fase faz o roteiro crescer, e está certo. Cresce com
> disciplina: cada passo diz o que se confere e por que script nenhum
> conferiria.

- [ ] **85. ⭐🚨 BLOQUEANTE — a demonstração NÃO roda com `NODE_ENV=production`**
  `[automatizável]`
  Pré-condição: nenhuma. **Fazer isto ANTES de qualquer demonstração
  pública**, e antes dos demais passos desta seção.
  Passos: 1) conferir o `NODE_ENV` do processo do backend
  (`echo $NODE_ENV`, ou o `.env` em uso); 2) confirmar que **não** é
  `production`.
  Esperado: fora de produção, o teto do rate limit do portal é multiplicado
  por **20** (`portalRoutes.js:34,44-47`) — 5 vira 100 tentativas por janela.
  Por que é bloqueante: **o `express-rate-limit` conta por IP.** Numa banca,
  três professores tentando o portal do mesmo wifi saem do mesmo IP: com o
  teto de produção (5), o terceiro bate em **429 sem ninguém atacar nada**, e
  a demonstração morre com uma mensagem de bloqueio na tela. É conferir uma
  variável, **não mudar código**.

- [ ] **86. Entrar no portal com o código ditado por telefone — minúsculas e
  com espaço** `[automatizável]`
  Pré-condição: base recém-seedada; o código de acesso de Maria Aparecida
  Costa ("Inventario e Partilha de Bens") sai no resumo do seed.
  Passos: 1) abrir `/portal` **no celular**; 2) digitar o código **todo em
  minúsculas e com um espaço sobrando no fim** (`lex-xxxx-xxxx `); 3) senha
  `MinhaSenha2026`; 4) entrar.
  Esperado: **entra normalmente.** A tela não recusa, não reclama de formato e
  não "corrige" o que foi digitado enquanto se digita.
  Por que este passo existe: a advogada dita o código por telefone e o cliente
  o recebe por WhatsApp ou num papel. **A tela nunca pode ser mais rígida que
  a API** — o backend normaliza caixa e espaço de propósito, e uma máscara na
  tela recusaria o que o servidor aceita, deixando o cliente de fora do
  próprio processo por causa de uma letra minúscula.
  Fase de origem: 3.2

- [ ] **87. Código errado e excesso de tentativas dizem coisas DIFERENTES**
  `[só olho humano]`
  Passos: 1) errar o código uma vez e ler a mensagem; 2) errar a senha de um
  código válido e ler a mensagem; 3) insistir até estourar o limite.
  Esperado: **1 e 2 dão a mesma mensagem, palavra por palavra** — a tela não
  diz se o código existe, se a senha está errada ou se o acesso foi revogado.
  O 3 dá uma mensagem **visivelmente diferente**, em amarelo, explicando que
  houve muitas tentativas e para aguardar.
  Por que só olho humano: o teste estático prova que os dois caminhos existem
  e escrevem em estados distintos; **não prova que a pessoa percebe a
  diferença ao ler.** É a percepção que evita o cliente insistir e estender o
  próprio bloqueio.
  Fase de origem: 3.2

- [ ] **88. A troca de senha é inescapável** `[automatizável]`
  Pré-condição: entrar como **Ana Lima Santos**, senha provisória
  `Portal2026`.
  Passos: 1) entrar; 2) tentar ir a `/portal/processo` **pela barra de
  endereço**; 3) voltar e ler a explicação da tela de troca; 4) trocar a senha.
  Esperado: o passo 2 **cai de volta na tela de troca**, sempre. A tela
  explica em uma frase por que a troca é obrigatória. Depois de trocar, segue
  para o processo, e a senha antiga não serve mais.
  Fase de origem: 3.2

- [ ] **89. Processo e documentos legíveis no celular** `[só olho humano]`
  Pré-condição: sessão do portal, **num celular de verdade**, não no
  redimensionador do navegador.
  Passos: 1) ler a tela do processo inteira sem dar zoom; 2) conferir que
  "Em andamento" e "Autor" aparecem em português comum, com a explicação do
  papel; 3) tocar nos botões de download **com o polegar**, em pé.
  Esperado: uma coluna, fonte legível sem zoom, botões que o dedo acerta de
  primeira. **Nenhum valor financeiro em lugar nenhum**, e nenhum outro
  participante do processo.
  Por que só olho humano: alvo de toque, contraste e comprimento de linha são
  exatamente o que nenhuma análise estática enxerga. E o emulador mente sobre
  o tamanho do dedo.
  Fase de origem: 3.2

- [ ] **90. Baixar PDF e DOCX no aparelho** `[só olho humano]`
  Passos: 1) baixar o PDF pelo portal, no celular; 2) baixar o DOCX; 3)
  **abrir os dois** no aparelho.
  Esperado: os arquivos baixam com o nome vindo do servidor
  (`procuracao-<cliente>-<data>.pdf`), abrem sem erro, e o conteúdo é o mesmo
  que a advogada baixa pela tela dela.
  Por que só olho humano: o download depende de `Content-Disposition`, de
  `URL.createObjectURL` e do gerenciador de downloads do celular. Script
  nenhum abre um DOCX no Word do Android para ver se corrompeu.
  Fase de origem: 3.2

- [ ] **91. Ler primeiro, confirmar depois — e o recibo com a hora certa**
  `[só olho humano]`
  Passos: 1) percorrer a tela do processo **de cima a baixo**; 2) observar
  onde o bloco de confirmação aparece; 3) ler a declaração; 4) confirmar; 5)
  conferir a data e a hora do recibo contra o relógio.
  Esperado: **nenhum modal bloqueia a leitura.** O botão de confirmar está no
  FIM, depois do processo e dos documentos. A declaração aparece **inteira**,
  sem "ver mais". O recibo traz data e hora no formato brasileiro e no fuso de
  Brasília — confira contra o relógio, **não contra o que a tela diz**.
  Por que só olho humano: que o bloco esteja depois do conteúdo é a decisão
  probatória inteira desta fase, e ela se verifica rolando a tela. E o fuso
  errado só aparece comparando com um relógio de verdade.
  Fase de origem: 3.2

- [ ] **92. Confirmar de novo não apaga a primeira** `[automatizável]`
  Passos: 1) confirmar; 2) confirmar outra vez; 3) olhar a lista.
  Esperado: **duas confirmações**, cada uma com a sua data e hora. A última em
  destaque, a anterior na lista. A tela diz, em texto, que confirmar de novo
  não apaga a anterior.
  Fase de origem: 3.2

- [ ] **93. Sair, num aparelho emprestado** `[só olho humano]`
  Passos: 1) achar o botão de sair **sem procurar**; 2) sair; 3) apertar
  *voltar* no navegador.
  Esperado: o botão está visível na barra, sem menu escondendo. Depois de
  sair, *voltar* **não** devolve a sessão.
  Por que só olho humano: "achar sem procurar" é o passo, e ele não se mede
  por script.
  Fase de origem: 3.2

- [ ] **94. Advogada: definir, entregar, redefinir e revogar** `[automatizável]`
  Passos: 1) no cadastro de um cliente sem acesso, definir uma senha inicial;
  2) conferir que o estado passa a "senha provisória, aguardando o cliente";
  3) no processo, abrir **Entregar acesso** e copiar o código e a mensagem
  pronta; 4) **conferir que a mensagem pronta NÃO contém a senha**; 5) gravar
  outra senha e conferir que o estado volta a provisória; 6) revogar o acesso
  e conferir que o cliente não entra mais.
  Esperado: o estado é sempre legível em português; a senha **nunca** é
  exibida; a mensagem pronta traz endereço e código, e diz que a senha vai por
  outro canal. Tentar gravar o CPF do cliente como senha traz a mensagem
  específica do servidor, não uma genérica.
  Fase de origem: 3.2

- [ ] **95. O código cabe numa ligação** `[só olho humano]`
  Passos: 1) abrir **Entregar acesso**; 2) **ditar o código em voz alta** para
  alguém do outro lado da linha, olhando a tela.
  Esperado: o código é grande o bastante para ser lido de relance, e nenhum
  caractere se confunde com outro ao ditar.
  Por que só olho humano: é literalmente um teste de voz e de vista. Nenhuma
  outra coisa nesta lista chega perto de verificar isto.
  Fase de origem: 3.2

- [ ] **96. Litisconsórcio: um confirmou, o outro não** `[automatizável]`
  Pré-condição: processo "Inventario e Partilha de Bens", base recém-seedada.
  Passos: 1) abrir o detalhe do processo; 2) olhar os **dois** participantes.
  Esperado: Maria Aparecida Costa com o selo **Confirmou a leitura** e a data;
  Joao Paulo Oliveira com **Acessou, não confirmou**, em amarelo, com o último
  acesso. A diferença entre **acessar** e **confirmar** fica visível sem
  precisar de explicação — só a segunda é recibo.
  Fase de origem: 3.2

- [ ] **97. O contador do dashboard zera ao olhar** `[automatizável]`
  Passos: 1) no dashboard, anotar **Confirmações Novas**; 2) abrir o processo
  do litisconsórcio; 3) clicar em **Ver confirmações**; 4) voltar ao
  dashboard.
  Esperado: o contador baixa exatamente no número de confirmações não vistas
  daquele processo. Abrir o processo **sem** clicar em "Ver confirmações"
  **não** zera nada — o que marca como vista é olhar a lista, não passar pela
  tela.
  Fase de origem: 3.2

- [ ] **98. Aviso de visibilidade nas DUAS regerações** `[só olho humano]`
  Pré-condição: base recém-seedada. Um documento gerado **editado à mão** e um
  **não editado**, ambos tornados visíveis no portal.
  Passos: 1) escolher modelo, processo e cliente de um documento visível e
  **não editado** e ler o aviso que aparece **antes** de clicar em gerar; 2)
  gerar e ler o painel que aparece depois; 3) repetir com o documento
  **editado à mão**, que dispara o 409, e ler o diálogo.
  Esperado: os **dois** caminhos avisam, e **os textos são diferentes**,
  porque o efeito é diferente:
  - **não editado**: o anterior **continua ativo e visível**, o novo nasce
    invisível **ao lado dele**, e o cliente continuaria vendo a versão
    **antiga**. Liberar a nova pelo painel também tira a antiga do portal.
  - **editado à mão**: o anterior é **substituído** e sai do portal; o cliente
    fica sem nenhuma das duas até alguém liberar a nova.
  Por que só olho humano: o que se confere é se a advogada **entende o que vai
  acontecer** antes de clicar. Os dois textos estarem presentes é
  automatizável; serem compreendidos, não.
  Fase de origem: 3.2

---

## 15. Fase 4.2 — Financeiro na tela

> **Nenhuma tela financeira jamais foi validada por olho humano.** O roteiro
> chegou a 98 passos sem um único item de honorário, parcela ou pagamento — o
> módulo mais antigo do projeto, e o único que mexe com dinheiro de verdade.
>
> A Fase 4.1 fechou o backend; a suíte prova que a conta está certa, que o `PUT`
> não voltou e que o saldo chega à mensagem. **O que ela não prova é que a
> advogada entende o que está vendo** — e num módulo onde o número sai impresso
> num contrato assinado, essa distância é a que importa.
>
> Numeração: o roteiro tem **93 passos pendentes**, mas o maior número já usado
> é **98** (cinco saíram para `Validado` e `Automatizado` sem renumerar o
> resto). Os novos continuam a partir de **99** — reaproveitar 94 a 98 criaria
> dois passos com o mesmo número, e passo é coisa que se cita por número numa
> conversa.

- [ ] **99. Criar honorário fixo — o caminho que não mudou** `[automatizável]`
  Pré-condição: base recém-seedada, logada como `demo@lex.dev`.
  Passos: 1) `/dashboard/honorarios/novo`; 2) escolher um processo, descrição,
  tipo **Fixo**, valor `3000`, vencimento; 3) salvar.
  Esperado: os campos **Percentual** e **Valor base** **não aparecem** em
  momento nenhum, e o campo **Valor** é editável. Não há `<select>` de status na
  tela. Salva e volta para a listagem.
  Por que este passo existe: é a linha de base contra a qual os dois seguintes
  se comparam. Se o formulário fixo tiver regredido, os outros dois não dizem
  nada.
  Fase de origem: 4.2

- [ ] **100. ⭐ Honorário percentual: ver o valor mudar enquanto se digita**
  `[só olho humano]`
  Pré-condição: nenhuma além do login.
  Passos: 1) novo honorário, tipo **Percentual**; 2) digitar percentual `10` e
  valor base `50000`, e **ler o bloco "Valor do honorário"**; 3) mudar o valor
  base para `80000` **sem sair do campo** e ler de novo; 4) apagar o percentual
  e ler de novo; 5) salvar com percentual `10` e base `50000`.
  Esperado: o valor exibido é **R$ 5.000,00**, vira **R$ 8.000,00** ao trocar a
  base, e volta a **"—"** (não a "R$ 0,00") quando o percentual é apagado. O
  percentual aparece como **"10%"**, com o símbolo colado. Depois de salvar, a
  listagem mostra o valor calculado — **não o que foi digitado**, porque não se
  digitou valor nenhum.
  Por que só olho humano: a suíte prova que a conta está certa
  (`tests/financial/honorario.test.js`). **Não prova que a advogada percebe que
  o número se atualiza sozinho** — e é essa percepção que a impede de procurar
  um campo de valor que não existe e concluir que o formulário está quebrado.
  O `"—"` em vez de `"R$ 0,00"` é o detalhe a conferir: zero parece um valor
  combinado.
  Fase de origem: 4.2

- [ ] **101. ⭐ Trocar o tipo em edição — de percentual para fixo**
  `[automatizável]`
  Pré-condição: o honorário percentual criado no passo 100.
  Passos: 1) editá-lo; 2) mudar o tipo para **Fixo**; 3) observar que
  Percentual e Valor base **somem** e o campo Valor **aparece**; 4) digitar
  `4000` e salvar; 5) reabrir a edição.
  Esperado: salva **sem erro**, e ao reabrir o honorário é fixo, vale
  R$ 4.000,00, e as colunas Percentual e Valor base da listagem mostram **"—"**.
  Por que este passo existe: é o caminho onde a Fase 4.1 esperava quebra. Os
  dois campos vão no PATCH como **`null`** — não omitidos. Omitidos, o
  percentual antigo continuaria gravado e o hook recusaria com "honorário do
  tipo fixo não admite percentual", **sobre um campo que nem está mais na
  tela** — erro que a advogada não teria como entender nem corrigir.
  Fase de origem: 4.2

- [ ] **102. O backend é a última palavra** `[automatizável]`
  Pré-condição: DevTools aberto na aba Network.
  Passos: 1) criar honorário percentual com percentual `10` e base `50000`;
  2) **antes de salvar**, sem usar a tela, forçar um percentual inválido (por
  exemplo `150`) e submeter; 3) ler a mensagem e olhar o campo destacado.
  Esperado: a mensagem é **"O percentual deve ser maior que zero e no máximo
  100"** — a mesma frase, venha ela da validação local ou do 400 do servidor —
  e o input de **Percentual** fica com a borda de erro.
  Por que este passo existe: a validação de tela existe para poupar uma viagem,
  **nunca para ser a autoridade**. Duas redações para a mesma regra fariam a
  advogada ler um texto ao errar offline e outro ao errar contra o servidor,
  sobre exatamente o mesmo erro.
  Fase de origem: 4.2

- [ ] **103. Criar parcelas e ver o que já foi recebido** `[automatizável]`
  Pré-condição: um honorário ativo.
  Passos: 1) `/dashboard/parcelas/novo`, criar a parcela 1; 2) tentar criar
  **outra parcela 1** no mesmo honorário; 3) abrir a edição de uma parcela que
  já tenha pagamento (o seed tem várias).
  Esperado: a duplicada é recusada com o campo **Nº da Parcela** destacado. Na
  edição, o bloco **"Situação da parcela"** mostra status, valor, **já
  recebido** e **em aberto** — nenhum deles editável, e **sem `<select>`
  desabilitado**. A listagem tem as colunas Recebido e Em aberto.
  Por que este passo existe: `valorPago` tem um único ponto de escrita no
  backend e é recusado com 400 se enviado. Exibir sem oferecer edição é o
  ponto — o caminho para mudar aquele número é registrar um pagamento.
  Fase de origem: 4.2

- [ ] **104. Registrar um pagamento** `[automatizável]`
  Pré-condição: uma parcela pendente.
  Passos: 1) `/dashboard/pagamentos/novo`; 2) escolher a parcela e ler a caixa
  com valor, já recebido e saldo; 3) registrar um pagamento **parcial**;
  4) voltar à parcela e ao honorário.
  Esperado: o pagamento entra, a parcela vira **Parcial**, o **já recebido**
  sobe, e o honorário vira **Parcialmente pago** — sem ninguém ter tocado em
  campo de status nenhum.
  Por que este passo existe: é a cadeia da DEC-028 vista de fora. Se algum dos
  três não se mover, o status derivado parou de derivar.
  Fase de origem: 4.2

- [ ] **105. ⭐🚨 Pagamento excedente — a mensagem diz QUANTO ainda cabe**
  `[só olho humano]`
  Pré-condição: a parcela do passo 104, com pagamento parcial já registrado.
  Passos: 1) novo pagamento na **mesma** parcela; 2) digitar um valor
  claramente maior que o saldo; 3) salvar e **ler a mensagem inteira**.
  Esperado: a mensagem diz que excede **e informa o saldo exato que ainda cabe
  e o valor total da parcela**, em reais formatados. O campo **Valor a
  registrar** fica destacado. Corrigir para o saldo exato salva normalmente.
  Por que só olho humano: **é o caso de maior valor prático da fase.** A suíte
  prova que o número chega à mensagem
  (`tests/financial/erros.test.js`). O que ela não prova é se a advogada, lendo
  a frase sob pressão de um cliente esperando, **sai dali sabendo qual valor
  digitar** — ou se apenas entende que deu errado e tenta na tentativa e erro.
  A diferença entre as duas coisas é a fase inteira.
  Fase de origem: 4.2

- [ ] **106. ⭐ Baixar o recibo e conferir contra o timbrado real**
  `[só olho humano]`
  Pré-condição: o logo real da advogada carregado em `/dashboard/perfil`, e um
  pagamento ativo.
  Passos: 1) na listagem de pagamentos, clicar em **Baixar recibo**; 2) abrir o
  PDF; 3) comparar lado a lado com o PDF de um **documento gerado** do mesmo
  escritório; 4) conferir o nome do arquivo salvo.
  Esperado: o recibo sai com **o mesmo timbrado** do documento — mesmo logo,
  mesmo cabeçalho, mesmo rodapé —, nomeia o participante **principal** do
  processo, e o arquivo salvo tem o **nome que o backend sugeriu**, não
  "recibo.pdf" nem um id.
  Por que só olho humano: o timbrado é compartilhado
  (`letterheadService.js`) justamente para não divergir, e nenhum script compara
  a **aparência** de dois PDFs. Em seis meses o cabeçalho do documento e o do
  recibo podem deixar de ser o mesmo papel, e **ninguém notaria até alguém pôr
  os dois lado a lado** — que é exatamente o que este passo faz.
  Fase de origem: 4.2

- [ ] **107. ⭐ Ficha financeira do processo — os totais fecham**
  `[só olho humano]`
  Pré-condição: base recém-seedada. Usar um processo com mais de um honorário.
  Passos: 1) abrir `/dashboard/processos/detalhe/:id` e rolar até
  **Financeiro**; 2) somar **na calculadora** os honorários vigentes e conferir
  contra **Contratado**; 3) conferir que **Contratado − Recebido = Em aberto**;
  4) abrir um processo **sem honorário** e ler o estado vazio.
  Esperado: os três totais fecham, a contagem de honorários traz "(1 cancelado)"
  quando houver, e o cancelado aparece na árvore **atenuado**, com aviso de que
  está fora do contratado — e **o valor dele não entra na soma**.
  Por que só olho humano: a tela **exibe** os totais e não os recalcula, de
  propósito. Isso significa que um erro de soma do backend chegaria intacto à
  tela, e nenhum teste de frontend o pegaria — o teste conferiria a tela contra
  o mesmo número errado. **A calculadora na mão é a única verificação
  independente que existe** deste número.
  Fase de origem: 4.2

- [ ] **108. Cancelar um honorário e ver o total encolher** `[automatizável]`
  Pré-condição: o processo do passo 107, com o Contratado anotado.
  Passos: 1) editar um honorário vigente e marcar **"Cancelar este
  honorário"**; 2) salvar; 3) voltar à ficha do processo; 4) reabrir a edição e
  **desmarcar**.
  Esperado: o Contratado **cai** exatamente o valor do honorário cancelado, a
  contagem de cancelados sobe, e ele continua na lista, atenuado. Ao desmarcar,
  o status volta a ser **derivado das parcelas** — não fica preso em
  "Pendente".
  Por que este passo existe: `cancelado` é o único status que a tela escreve e
  o único que o recálculo nunca sobrescreve. Descancelar precisa devolver o
  registro à derivação; sem isso a guarda deixaria o honorário preso para
  sempre.
  Fase de origem: 4.2

- [ ] **109. Excluir com dependente — a mensagem diz quantos**
  `[automatizável]`
  Pré-condição: um honorário **com** parcelas e uma parcela **com** pagamentos.
  Passos: 1) tentar excluir o honorário; 2) ler a mensagem; 3) tentar excluir a
  parcela; 4) ler a mensagem.
  Esperado: as duas são recusadas, e cada mensagem diz **quantos** dependentes
  existem e de que tipo ("3 parcelas ativas", "2 pagamentos ativos"), no
  singular quando for um só. **Nenhum campo do formulário é destacado** —
  não há input errado, há registro gravado.
  Por que este passo existe: é o contrato do 409 de integridade
  (`dependencia` + `quantidade`, sem `campo`), que existia desde a Fase 2E.1 e
  **nunca tinha sido consumido por tela nenhuma**.
  Fase de origem: 4.2


---

## 16. Fase 4.3 — Tabelas, gráficos, indicadores do mês e moeda

> Numeração contínua a partir do 109, que era o maior número já usado.
> Dezesseis passos novos: **110 a 125**. O total pendente vai de **104 para
> 120**.
>
> **A fase nasceu de uma sessão de validação visual**, e é por isso que este
> bloco tem tanto passo de olho humano. Os três defeitos que a abriram —
> texto atravessando célula, donut sem legenda e "R$ 0,00" que parecia bug —
> passaram por `lint`, `build` e pelas duas suítes sem que nada acusasse. Não
> eram erros de lógica; eram erros de LEITURA, e leitura só se confere lendo.

### Tabelas

- [ ] **110. ⭐ Biblioteca de Seções — nada atravessa célula (desktop)**
  `[só olho humano]`
  Pré-condição: `npm run seed:fresh`, janela maximizada, `/dashboard/secoes`.
  Passos: 1) percorrer as 11 linhas da tabela; 2) olhar especificamente a
  fronteira entre "Trecho inicial" e "Variáveis", e entre "Variáveis" e
  "Ações".
  Esperado: o trecho termina em **reticências** dentro da própria coluna; o
  número de variáveis fica isolado na coluna dele; os três botões (Ver,
  Editar, Desativar) não recebem texto por cima e não são cortados.
  Clicar em "Ver" abre o modal com o texto **inteiro** da seção.
  Por que só olho humano: é o defeito de origem da fase. `max-width` numa
  tabela de layout automático encolhe a caixa e não a frase — o texto sai por
  cima da célula vizinha, e **nenhuma varredura de CSS pega isso**, porque as
  duas regras existem, são válidas e se alcançam. Só o desenho na tela mostra.
  Fase de origem: 4.3

- [ ] **111. ⭐ As mesmas tabelas em 360 px — a rolagem é do container**
  `[só olho humano]`
  Pré-condição: DevTools em 360 px de largura (ou celular real).
  Passos: 1) abrir `/dashboard/secoes`; 2) arrastar a tabela para a direita;
  3) repetir em `/dashboard/clientes`, `/dashboard/processos`,
  `/dashboard/documentos` e nas três listas de `/dashboard/financeiro`.
  Esperado: a tabela rola **dentro da própria moldura**. O cabeçalho do app, o
  breadcrumb e a barra inferior de navegação **ficam parados**. A página não
  ganha barra de rolagem horizontal própria.
  Por que só olho humano: o sintoma de `min-width: 0` faltando num ancestral é
  a página inteira deslizando junto — comportamento de layout, invisível para
  qualquer asserção que não seja um navegador de verdade.
  Fase de origem: 4.3

- [ ] **112. As sete listagens truncam com reticências, e não com corte seco**
  `[só olho humano]`
  Pré-condição: seed carregado.
  Passos: percorrer as sete listagens (`clientes`, `processos`, `secoes`,
  `documentos`, e honorários/cobranças/recebimentos em `financeiro`) e olhar as
  colunas de texto livre: nome, e-mail, endereço, título, descrição e
  **observações** do pagamento.
  Esperado: onde o texto não cabe, ele termina em `…`. Passar o mouse sobre a
  célula mostra o conteúdo completo no `title` do navegador. Nenhuma coluna de
  ações fica espremida a ponto de os botões se sobreporem.
  Por que este passo existe: a correção do 110 foi extraída para classes
  reutilizáveis (`data-table--fixed`, `col-*`, `cell-truncate`) e aplicada nas
  outras seis. Uma largura de coluna mal escolhida em qualquer uma delas
  reintroduz o defeito **naquela tela só**, e nenhuma das outras acusaria.
  Fase de origem: 4.3

### Gráficos

- [ ] **113. ⭐ Legenda dos donuts — a cor confere com a do badge**
  `[só olho humano]`
  Pré-condição: `/dashboard`, seed carregado (tem os quatro estados de
  honorário, inclusive `parcialmente_pago` e `cancelado`).
  Passos: 1) ler a legenda dos três donuts — cada linha tem bolinha, rótulo e
  quantidade; 2) abrir `/dashboard/financeiro` numa segunda aba; 3) comparar,
  **cor a cor**, a bolinha da legenda com o badge do mesmo status na listagem.
  Esperado: "Vencido" é vermelho nos dois; "Pago", verde nos dois; "Pendente",
  âmbar nos dois; "Parcialmente pago" e "Parcial", azuis nos dois; "Encerrado"
  e "Nunca acessou", cinzas. O rótulo é o mesmo texto do badge — **nunca** a
  chave crua do enum (`parcialmente_pago` com sublinhado).
  Por que só olho humano: a suíte prova que as duas pontas leem o mesmo módulo
  e que cada tom tem regra CSS. Não prova que a variável `--color-info`
  resolve para a cor que a pessoa chama de azul, nem que o contraste da
  bolinha de 9 px é suficiente no tema claro.
  Fase de origem: 4.3

- [ ] **114. Tooltip do donut traz quantidade e percentual**
  `[só olho humano]`
  Passos: passar o mouse sobre cada fatia dos três donuts.
  Esperado: aparece o rótulo do status e algo como `3 (27,3%)`. Os percentuais
  das fatias de um mesmo donut somam 100%.
  Por que este passo existe: o percentual é calculado na série e não dentro do
  tooltip — o tooltip do Recharts recebe uma fatia por vez e não conhece o
  total. Um erro de fiação sairia como `undefined%` em todas as fatias.
  Fase de origem: 4.3

- [ ] **115. Barras com rótulo de valor e sem buraco no eixo**
  `[só olho humano]`
  Pré-condição: `/dashboard`, seção "Honorários contratados por mês de
  cadastro".
  Passos: 1) contar as colunas do eixo X; 2) ler o rótulo sobre cada barra;
  3) passar o mouse sobre uma barra.
  Esperado: **seis** meses no eixo, sempre, em português abreviado
  (`mar/2026`); mês sem honorário aparece com barra zerada e **sem** rótulo
  flutuando; a barra com valor traz o compacto (`R$ 12,5 mil`) por cima; o
  tooltip traz o valor **por extenso** (`R$ 12.500,00`) e o mês por extenso.
  O eixo Y não diz mais "R$12k".
  Por que só olho humano: a suíte prova a série (seis meses, zeros nos
  vazios). Não prova que o rótulo sobre a barra **cabe** sem encostar no
  vizinho quando dois meses seguidos têm valor alto.
  Fase de origem: 4.3

- [ ] **116. Estado vazio de cada gráfico tem frase própria**
  `[só olho humano]`
  Pré-condição: **usuário recém-registrado**, sem nenhum dado. É o único jeito
  de ver este estado — no seed nenhum gráfico fica vazio.
  Passos: registrar um usuário novo em `/registrar` e abrir `/dashboard`.
  Esperado: cada donut mostra "Sem dados no período" no lugar do anel; a área
  de barras mostra o cartão de estado vazio com "Nenhum honorário contratado
  nos últimos 6 meses". **Não** aparece anel cinzento nem eixo em branco.
  Por que este passo existe: donut vazio e gráfico carregando são
  indistinguíveis, e o segundo faz a pessoa esperar por algo que não vem.
  Fase de origem: 4.3

### Cartões do mês e próximos vencimentos

- [ ] **117. ⭐ Os cartões do mês dizem QUAL mês**
  `[automatizável]`
  Pré-condição: `/dashboard`, seed carregado.
  Passos: ler o título da faixa e os dois primeiros cartões.
  Esperado: a faixa diz "No mês — agosto/2026" (o mês do **servidor**), e os
  cartões dizem "A receber em agosto/2026" e "Recebido em agosto/2026" — com
  o mesmo mês, sem abreviação, e **nunca** um mês diferente do da faixa.
  Por que este passo existe: o rótulo vem de `mesReferencia`, que o backend
  calcula. Se a tela voltasse a usar `new Date()` do navegador, o cartão
  diria "setembro" sobre o número de agosto em qualquer máquina com o relógio
  adiantado — e ninguém desconfiaria do rótulo.
  Fase de origem: 4.3

- [ ] **118. ⭐ "Recebido em {mês}" zerado diz por extenso que é zero**
  `[só olho humano]`
  Pré-condição: seed recém-carregado (todos os pagamentos são de meses
  passados — é o cenário exato que abriu esta fase).
  Passos: ler o cartão "Recebido em agosto/2026".
  Esperado: "R$ 0,00" e, logo abaixo, **"nenhum recebimento no mês"**. O
  cartão antigo "Pagamentos do Mês" **não existe mais**.
  Por que só olho humano: o defeito original não era o número — era a
  ambiguidade. "R$ 0,00" sem contexto foi lido como bug numa sessão de
  validação real. O que se confere aqui é se a frase **desfaz** a dúvida, e
  isso é julgamento de quem lê.
  Fase de origem: 4.3

- [ ] **119. Total vencido — valor e contagem no mesmo cartão**
  `[automatizável]`
  Passos: ler o cartão "Total vencido" no dashboard e comparar com a coluna
  "Em aberto" das parcelas vencidas em `/dashboard/financeiro`.
  Esperado: o cartão traz o **valor** (soma do que falta nas parcelas
  vencidas) e, como texto secundário, "6 parcelas vencidas". Uma parcela
  vencida com pagamento **parcial** entra pelo que falta, não pelo valor
  cheio. O cartão de contagem "Parcelas Vencidas" **não existe mais** — os
  dois números moram juntos.
  Por que este passo existe: até a Fase 4.2 havia só a contagem, e o painel
  respondia "quantas" a uma advogada que perguntava "quanto".
  Fase de origem: 4.3

- [ ] **120. ⭐ Próximos vencimentos levam à parcela**
  `[só olho humano]`
  Pré-condição: `/dashboard`, seed carregado.
  Passos: 1) ler a lista "Próximos vencimentos"; 2) clicar na descrição do
  primeiro item; 3) voltar e repetir com o último.
  Esperado: no máximo **cinco** itens, do vencimento mais próximo para o mais
  distante, cada um com descrição do honorário, número da parcela, número do
  processo, data e **valor em aberto**. O clique abre o formulário **daquela**
  parcela. Parcela já quitada e parcela de honorário **cancelado** não
  aparecem.
  Por que só olho humano: a suíte prova a lista e o isolamento por usuário.
  Não prova que a descrição parece clicável — sem sublinhado no hover, cinco
  linhas de texto comum não convidam ninguém a clicar, e a lista vira enfeite.
  Fase de origem: 4.3

### Entrada de dinheiro

- [ ] **121. ⭐ Digitar valor com vírgula nos três formulários**
  `[só olho humano]`
  Pré-condição: `/dashboard/honorarios/novo`, `/dashboard/parcelas/novo` e
  `/dashboard/pagamentos/novo`.
  Passos: em cada um, no campo de dinheiro, digitar `1500,50` tecla a tecla;
  depois apagar e digitar `1500` seguido da tecla **ponto** do teclado
  numérico e `50`.
  Esperado: o campo mostra `R$ 1.500,50` nos dois casos — o "R$" fica fixo à
  esquerda e não é apagável, o milhar ganha ponto sozinho, e a tecla de ponto
  vira vírgula. Sair do campo com `1500,5` completa para `1.500,50`. Salvar e
  reabrir mostra `1.500,50`.
  Por que só olho humano: o defeito que este componente fecha é o
  `<input type="number">` **descartando a vírgula em silêncio** em parte dos
  navegadores — o campo ficava vazio para o React e a advogada reenviava sem
  entender. Reproduzir isso exige um navegador; a suíte só alcança a máscara.
  Fase de origem: 4.3

- [ ] **122. ⭐🚨 Colar valor nos dois formatos — o erro de fator 100**
  `[só olho humano]`
  Pré-condição: um dos três formulários financeiros aberto.
  Passos: 1) copiar `1.234,56` de qualquer lugar e colar no campo; 2) apagar
  e colar `1234.56`; 3) apagar e colar `1.234`; 4) salvar em cada caso e
  conferir o valor gravado na listagem.
  Esperado: os dois primeiros gravam **R$ 1.234,56**. O terceiro grava
  **R$ 1.234,00** — ponto seguido de três dígitos é separador de milhar.
  Nenhum dos três grava R$ 123.456,00 nem R$ 1,23.
  Por que é bloqueante: este é o único passo do roteiro em que o erro é de
  **fator 100** e **não tem sintoma**. O número aparece formatado e correto na
  listagem; a cobrança é que está cem vezes errada.
  Fase de origem: 4.3

- [ ] **123. Apagar o valor não vira R$ 0,00**
  `[automatizável]`
  Passos: 1) abrir um honorário existente para edição; 2) apagar todo o
  conteúdo do campo de valor; 3) tentar salvar.
  Esperado: o campo fica vazio (não mostra `0,00`), e salvar é recusado com
  "valor é obrigatório", com o input destacado. No honorário **percentual**,
  apagar o valor base faz o "Valor do honorário" exibir **"—"**, e não
  "R$ 0,00".
  Por que este passo existe: `Number(null)` é `0`. Um campo vazio que virasse
  zero gravaria um honorário de R$ 0,00 sem erro nenhum — e zero parece um
  valor combinado.
  Fase de origem: 4.3

- [ ] **124. Teclado numérico no celular**
  `[só olho humano]`
  Pré-condição: **celular real** (ou emulação com teclado virtual), qualquer
  formulário financeiro.
  Passos: tocar no campo de valor.
  Esperado: abre o teclado **numérico com vírgula**, e não o alfabético.
  Por que só olho humano: `inputMode="decimal"` é uma dica ao sistema
  operacional. Nenhum script deste ambiente observa qual teclado o aparelho
  decidiu abrir — e no iOS o valor errado (`numeric`) abre um teclado **sem
  vírgula**, deixando o campo impossível de preencher com centavos.
  Fase de origem: 4.3

### Navegação

- [ ] **125. Breadcrumb da Biblioteca de Seções e do Financeiro**
  `[automatizável]`
  Passos: abrir `/dashboard/secoes`, `/dashboard/secoes/nova`,
  `/dashboard/secoes/editar/:id` e `/dashboard/financeiro`, lendo a trilha no
  cabeçalho em cada uma.
  Esperado: "LEX › Biblioteca de Seções", "LEX › Nova Seção",
  "LEX › Biblioteca de Seções › Editar" e "LEX › Financeiro". Em 360 px a
  trilha **encurta com reticências** em vez de empurrar o nome da usuária para
  fora da tela.
  Por que este passo existe: as quatro telas caíam no `return ['LEX']` do fim
  de `buildBreadcrumb` — ficavam sem trilha nenhuma, e são justamente aquelas
  em que se navega para dentro.
  Fase de origem: 4.3


---

## 17. Fase 4.4 — Módulo de documentos: a folha, o editor e o gráfico

> Numeração contínua a partir do 125. Dez passos novos: **126 a 135**.
> O total pendente vai de **120 para 130**.
>
> **Estes passos existem porque um bug real passou por tudo.** A folha da
> montagem não atualizava ao adicionar seção, e nem `lint`, nem `build`, nem as
> 182 asserções do frontend acusaram — a suíte não tem DOM, e o defeito era do
> ciclo de vida de um efeito do React. O backend estava correto o tempo todo.

### A folha da montagem

- [ ] **126. ⭐🚨 BLOQUEANTE — adicionar seção e vê-la na folha NA HORA**
  `[só olho humano]`
  Pré-condição: `npm run seed:fresh`, `/dashboard/documentos/montar?modo=modelo`,
  um modelo novo criado, **e o app rodando em `npm run dev`** (é em
  desenvolvimento que o `<React.StrictMode>` está ativo — foi ele que expôs o
  bug, e é nele que a correção precisa ser conferida).
  Passos: 1) na biblioteca à esquerda, clicar **Adicionar** numa seção;
  2) olhar a folha A4 **sem recarregar a página**; 3) repetir com uma segunda e
  uma terceira seção.
  Esperado: cada seção aparece na folha **imediatamente**, no fim, numerada em
  sequência, com o título e o trecho do texto. A miniatura correspondente na
  biblioteca passa a exibir o selo "no documento". O indicador do cabeçalho
  mostra "salvando…" e depois "salvo às HH:MM:SS".
  Por que é bloqueante: era exatamente isto que estava quebrado. A ação
  concluía sem erro nenhum e nada acontecia na tela — a advogada clicava,
  clicava de novo, e concluía que o sistema não funcionava.
  Fase de origem: 4.4

- [ ] **127. ⭐ Remover e reordenar refletem na hora**
  `[só olho humano]`
  Pré-condição: a mesma folha do 126, com três seções.
  Passos: 1) usar ↑ e ↓ para trocar a ordem de dois blocos; 2) **Remover** um
  bloco; 3) recarregar a página (F5) e conferir que o que se vê é o que ficou.
  Esperado: a folha reordena e remove **na hora**, sem piscar nem esperar
  requisição; a numeração dos blocos se refaz em 1..N sem buraco; o F5 mostra
  exatamente o mesmo estado. O indicador passa por "salvando…" → "salvo às".
  Por que só olho humano: reordenar e remover são **otimistas** — a tela muda
  antes da resposta. O que se confere é se o estado que sobrevive ao F5 é o
  mesmo que ela viu, e nenhum script sem DOM alcança isso.
  Fase de origem: 4.4

- [ ] **128. O rollback aparece quando a gravação falha**
  `[só olho humano]`
  Pré-condição: DevTools → Network → **Offline**, com três seções na folha.
  Passos: 1) ficar offline; 2) reordenar dois blocos; 3) voltar ao online.
  Esperado: a ordem **volta sozinha** para a anterior (rollback visível), com
  a mensagem "não salvo — a ordem anterior foi restaurada" no cabeçalho e um
  toast de erro. Nada fica com a ordem que o servidor não aceitou.
  Por que este passo existe: o rollback compartilhava a cadeia quebrada do 126
  — a mensagem aparecia mas a folha **não voltava**, deixando a tela mostrando
  uma ordem que o servidor tinha recusado.
  Fase de origem: 4.4

- [ ] **129. Arrastar e soltar continua funcionando (desktop)**
  `[só olho humano]`
  Passos: arrastar uma seção da biblioteca para um ponto no meio da folha; e
  arrastar um bloco da folha para outra posição.
  Esperado: a faixa de destino se destaca durante o arraste; ao soltar, a seção
  entra **naquela** posição e empurra as seguintes. O resultado é o mesmo do
  botão "Inserir aqui".
  Por que só olho humano: eventos de arraste do HTML5 não existem sem
  navegador, e o LEX não pode depender de o arrastar funcionar na primeira
  tentativa numa banca — o caminho por botões é o principal, este é o atalho.
  Fase de origem: 4.4

### O editor pós-geração

- [ ] **130. ⭐ Editar o texto gerado e ver o indicador**
  `[automatizável]`
  Pré-condição: um documento **gerado** aberto em
  `/dashboard/documentos/:id/texto`.
  Passos: 1) alterar o texto na caixa; 2) reparar em "alterações não salvas";
  3) clicar **Salvar texto**; 4) dar F5.
  Esperado: depois de salvar, aparece o selo **"editado à mão"** no cabeçalho,
  o aviso de não salvo some, e o F5 traz o texto editado. A lista de lacunas se
  recalcula sobre o texto novo.
  Fase de origem: 4.4

- [ ] **131. ⭐🚨 Regerar documento EDITADO → diálogo de confirmação**
  `[só olho humano]`
  Pré-condição: o documento do passo 130, já com o selo "editado à mão".
  Passos: 1) no cartão **Regerar**, à direita, ler o aviso em âmbar; 2) clicar
  **Regerar a partir das seções**; 3) ler o diálogo; 4) cancelar em
  "Manter o texto atual"; 5) conferir que nada mudou; 6) repetir e confirmar em
  **Substituir e regerar**.
  Esperado: o diálogo diz que o texto editado será substituído, **cita a data**
  em que a versão atual foi gerada e afirma que ela fica recuperável. Cancelar
  não altera nada. Confirmar leva para o documento **novo**, sem o selo
  "editado à mão", e o anterior sai da lista de documentos.
  Por que é bloqueante: é a única ação do módulo que **apaga trabalho da
  advogada**. Um 409 tratado como toast de erro em vez de pergunta faria a
  regeração parecer quebrada; um 409 ignorado apagaria a revisão sem perguntar.
  Fase de origem: 4.4

- [ ] **132. Regerar documento NÃO editado vai direto**
  `[só olho humano]`
  Pré-condição: um documento gerado e **não** editado à mão.
  Passos: clicar **Regerar a partir das seções**.
  Esperado: regenera **sem diálogo nenhum** — não há texto revisado a proteger.
  A tela passa a mostrar o documento novo.
  Por que este passo existe: o 409 só dispara para documento editado. Pedir
  confirmação sempre treinaria a advogada a clicar "sim" sem ler — e aí o
  aviso do 131 não protegeria nada.
  Fase de origem: 4.4

- [ ] **133. Texto não salvo avisa ANTES de regerar**
  `[automatizável]`
  Passos: 1) alterar o texto e **não** salvar; 2) clicar em Regerar.
  Esperado: diálogo dizendo que as alterações não salvas serão descartadas e
  **não são recuperáveis**, com "Voltar e salvar" como saída. É um diálogo
  diferente do 131.
  Por que este passo existe: o servidor não sabe da edição que ainda está na
  caixa — não haveria 409 nenhum, e o texto se perderia em silêncio. O aviso
  tem de vir da tela.
  Fase de origem: 4.4

- [ ] **134. ⭐ PDF e DOCX trazem o texto EDITADO**
  `[só olho humano]`
  Pré-condição: documento editado à mão e salvo (passo 130).
  Passos: 1) baixar em **PDF**; 2) baixar em **DOCX**; 3) abrir os dois e
  comparar com o que está na caixa de texto.
  Esperado: os dois arquivos trazem o **texto editado**, e não o recomposto das
  seções. O timbrado está no lugar nos dois.
  Por que só olho humano: a suíte do backend já extrai o texto do PDF e do
  DOCX e prova que é o editado. O que ela **não** prova é que o arquivo abre
  no Word e no LibreOffice sem reclamar, e que a diagramação continua legível
  — e é assim que o documento chega ao cliente.
  Fase de origem: 4.4

### O gráfico

- [ ] **135. Barra do mês sem o honorário cancelado**
  `[automatizável]`
  Pré-condição: seed carregado (tem 1 honorário cancelado, de R$ 800).
  Passos: 1) no dashboard, ler a soma das barras de "Honorários contratados por
  mês de cadastro"; 2) comparar com o cartão "Valor Contratado (total)";
  3) abrir a ficha financeira do processo do honorário cancelado e conferir que
  ele aparece na lista, atenuado, e **fora** do total contratado.
  Esperado: a soma das barras **bate** com o "Valor Contratado (total)". O
  cancelado não está em nenhum dos dois, e continua visível na ficha.
  Por que este passo existe: era um achado reportado na Fase 4.3 e não
  corrigido — o gráfico somava o cancelado enquanto o cartão logo acima o
  excluía. Dois números do mesmo assunto, na mesma tela, sem nada explicando a
  diferença.
  Fase de origem: 4.4



## 18. Fase 4.5 — Auditoria Geral nº 2: reativação, PWA, foco e produção

> Numeração contínua a partir do 135. Sete passos novos: **136 a 142**.
> O total pendente vai de **130 para 137**.
>
> Cinco dos sete são `[só olho humano]` — e não por preguiça de automatizar. O
> PWA precisa de um navegador de verdade (instalabilidade e ciclo de vida do
> service worker não existem fora dele) e o foco visível precisa de um olho que
> enxergue o anel. A suíte cobre o que dá: `tests/pwa/pwa.test.js` executa o SW
> num `self` falso e prova que `/api/*` nunca é cacheado; `tests/css/foco.test.js`
> prova que nenhum `outline: none` voltou.

### Reativação

- [ ] **136. Reativar pagamento e ver o status recalcular**
  `[automatizável]` — coberto por `tests/integrity/reativacao.test.js`
  Pré-condição: `npm run seed:fresh`; um honorário com parcela integralmente
  paga (status `pago`).
  Passos: 1) em `/dashboard/pagamentos`, remover o pagamento dessa parcela;
  2) conferir em `/dashboard/honorarios` que o honorário virou `pendente`;
  3) marcar **Mostrar desativados** na lista de pagamentos; 4) clicar
  **Reativar** na linha do pagamento removido.
  Esperado: a linha some da lista de desativados, o toast confirma, e o
  honorário volta a `pago` — sem recarregar nada além da própria listagem.
  Por que este passo existe: reativar é escrita que muda o CONJUNTO, não o valor
  de um registro. É a classe de operação em que uma soma desnormalizada
  (`valorPago`) se perde sem ninguém notar.
  Fase de origem: 4.5

- [ ] **137. Reativar parcela**
  `[automatizável]` — coberto por `tests/integrity/reativacao.test.js`
  Pré-condição: uma parcela sem pagamentos ativos, excluída.
  Passos: 1) em `/dashboard/parcelas`, marcar **Mostrar desativadas**;
  2) clicar **Reativar**.
  Esperado: a parcela volta ao honorário, o status do honorário é recalculado, e
  a linha some da lista de desativadas.
  Fase de origem: 4.5

- [ ] **138. ⭐ Reativar pagamento de parcela inativa — a mensagem de dependência**
  `[só olho humano]`
  Pré-condição: um pagamento desativado **cuja parcela também está desativada**
  (remova o pagamento, depois a parcela).
  Passos: 1) em `/dashboard/pagamentos`, marcar **Mostrar desativados**;
  2) clicar **Reativar** no pagamento.
  Esperado: nada é reativado, e o toast diz **"Não é possível reativar este
  pagamento: a parcela dele está desativada. Reative a parcela antes."**
  O que se confere aqui: se a advogada **sai da mensagem sabendo o que fazer**.
  O 409 traz `dependencia: "parcela"`, mas quem lê a tela lê a frase — e a frase
  precisa apontar a porta certa, não apenas recusar. É a mesma régua que a Fase
  4.6 aplica às pendências do módulo de documentos.
  Fase de origem: 4.5

### PWA

- [ ] **139. ⭐ Instalar o app pelo navegador**
  `[só olho humano]`
  Pré-condição: `npm run build && npm run preview` (o SW **não** roda em
  `npm run dev`, de propósito — ver o `CLAUDE.md` do frontend).
  Passos: 1) abrir `http://localhost:4173`; 2) DevTools → Application →
  **Manifest**: conferir nome, ícones 192 e 512, `standalone` e
  `start_url: /dashboard`; 3) Application → **Service Workers**: conferir
  `sw.js` **activated and is running**; 4) usar o botão de instalar do navegador.
  Esperado: o app instala, abre em janela própria (sem barra de endereço), com o
  ícone dourado do LEX e a barra do sistema na cor do tema.
  Fase de origem: 4.5

- [ ] **140. ⭐🚨 Recarregar OFFLINE e ver a casca do app**
  `[só olho humano]`
  Pré-condição: passo 139 feito, app já aberto uma vez (o SW precisa ter
  instalado e cacheado os assets).
  Passos: 1) DevTools → Network → **Offline**; 2) recarregar a página.
  Esperado: a **casca do app sobe** — layout, menu, tipografia. A primeira
  chamada de API falha e a tela mostra o erro **no padrão do próprio app**, não
  no dinossauro do navegador nem numa página de erro do service worker.
  Por que este passo existe: é a única prova de que o precache pegou os assets
  com hash. E o comportamento do erro é deliberado — uma tela "sem conexão"
  genérica do SW jogaria fora o estado e a navegação do React.
  Conferir também, em Application → Cache Storage: **nenhuma entrada de
  `/api/`**. Se houver, é vazamento — resposta autenticada em cache compartilhado
  com o próximo usuário do navegador.
  Fase de origem: 4.5

### Foco visível

- [ ] **141. ⭐ Navegar o formulário de honorário só pelo teclado**
  `[só olho humano]`
  Pré-condição: `/dashboard/honorarios/novo`, **tema escuro** (o padrão — é onde
  o anel dourado precisa se destacar do fundo verde).
  Passos: 1) sem tocar no mouse, percorrer o formulário inteiro com `Tab`,
  incluindo o `<select>` de tipo, os campos de dinheiro e os botões;
  2) repetir na biblioteca de seções (filtros e busca), na montagem e nos
  diálogos de regeração; 3) abrir um diálogo e fechá-lo com `Esc`.
  Esperado: **em todo controle** há um anel dourado visível, deslocado da borda.
  Nenhum ponto do percurso deixa o foco invisível. `Esc` continua fechando o
  modal.
  O que se confere aqui: a suíte prova que nenhum `outline: none` sobreviveu;
  ela **não** prova que o anel é visível contra o fundo daquele componente. Dois
  dos seis casos removidos estavam dentro de regras `:focus-visible` — a regra
  que desenhava o foco era a que o apagava.
  Fase de origem: 4.5

### Produção

- [ ] **142. Conferir os cabeçalhos no preview de produção**
  `[automatizável]` — coberto por `tests/infra/producao.test.js`
  Pré-condição: backend rodando com `NODE_ENV=production`.
  Passos: DevTools → Network → qualquer requisição → **Headers**.
  Esperado: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` e
  `Strict-Transport-Security` presentes; **`X-Powered-By` ausente**.
  Em desenvolvimento, **o HSTS não pode aparecer** — se aparecer, o navegador
  passa a exigir HTTPS de `localhost` por um ano, e o efeito sobrevive a
  desinstalar o servidor.
  Fase de origem: 4.5

---

## Validado

> Passo **executado por olho humano e aprovado**, com data. Continua sendo
> verificação manual — só não está mais pendente. Não se apaga: daqui a três
> fases ninguém lembra o que foi verificado de fato.
>
> Isto **não é** a mesma coisa que `## Automatizado`. Lá o passo virou teste e
> nunca mais precisa de olho humano; aqui ele foi olhado uma vez, naquela
> versão do código, e uma mudança grande no assunto pede que volte à lista.

- [x] **78. ⭐🚨 BLOQUEANTE — login real e navegação completa após a subida do
  `axios` e do `react-router-dom`** `[só olho humano]`
  **Validado em 30/07/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run dev` nos dois repositórios, navegador limpo (sem
  cookie de sessão anterior).
  Passos: 1) fazer login de verdade em `/login` com `demo@lex.dev`; 2) abrir,
  **uma a uma, todas as portas do menu**: Dashboard, Clientes, Processos,
  Seções, Documentos, Financeiro (Honorários, Cobranças, Recebimentos),
  Perfil; 3) recarregar (F5) em duas telas diferentes; 4) sair e entrar de
  novo.
  Esperado: o login autentica, o cookie httpOnly `lex-token` é emitido e
  reenviado (o F5 **não** derruba a sessão), e **nenhuma rota quebra**.
  Por que só olho humano: o `axios` subiu de 1.13.2 para 1.19.0 e o
  `react-router-dom` de 7.9.5 para 7.18.2. **Nenhum script deste ambiente
  detecta quebra de roteamento no navegador nem falha de envio do cookie** —
  `lint` e `build` passam limpos com o app quebrado. **Se este passo falhar,
  nada mais neste roteiro importa:** reverter a atualização e reportar.
  Fase de origem: 2E.1

---

## Automatizado

> Passo que **virou teste na suíte** e por isso saiu da lista pendente. Cada
> entrada diz o arquivo e o nome do teste que o substitui, para que a
> substituição seja auditável — e para que apagar o teste devolva o passo à
> lista, em vez de sumir com a verificação.
>
> Preenchido a partir da Fase 2E.2.

**O que os testes destes 4 passos provam, e o que não provam.** São análise
estática de arquivo, sem navegador: não pintam pixel e não clicam. Provam a
**regressão específica** que cada passo existia para pegar — a mensagem fixa
voltando por cima do helper, o formulário deixando de ler `campo`, os rótulos
voltando a ser literal repetido. É essa volta que um refactor distraído causa,
e era ela que não tinha guarda nenhuma.

No passo 81 a cadeia é coberta por três testes em dois repositórios, e é isso
que torna a conversão honesta em vez de teatro: o backend emite `campo` no 409,
o formulário lê `campo` e aplica `input-erro`, e `input-erro` tem regra
alcançável por aquela página — este último sendo justamente o elo que estava
quebrado na 2E.1 e fazia o destaque sair inerte.

- [x] **79. Detalhe de cliente mostra o erro real, não a mensagem fixa**
  Substituído por: `lex-frontend/tests/regressions/telas2E1.test.js`
  → `passos 79 e 80: detalhe mostra o erro real, não a mensagem fixa`
  → `ClientDetailPage.jsx passa o erro por getApiErrorMessage`
  → `ClientDetailPage.jsx: a mensagem antiga só sobrevive como fallback`
  Fase de origem: 2E.1 · Automatizado na 2E.2

- [x] **80. Detalhe de processo mostra o erro real, não a mensagem fixa**
  Substituído por: `lex-frontend/tests/regressions/telas2E1.test.js`
  → `ProcessDetailPage.jsx passa o erro por getApiErrorMessage`
  → `ProcessDetailPage.jsx: a mensagem antiga só sobrevive como fallback`
  Fase de origem: 2E.1 · Automatizado na 2E.2

- [x] **81. Destaque do campo no 409 dos quatro formulários**
  Substituído por três testes, em dois repositórios:
  1. o backend emite `campo` — `lex-backend/tests/financial/chain.test.js`
     → `4.2 409 de pagamento que excede a parcela`
     → `as 4 chaves, com \`saldoDisponivel\` numericamente certo`
  2. o formulário lê `campo` e aplica a classe —
     `lex-frontend/tests/regressions/telas2E1.test.js`
     → `passo 81: os formulários leem \`campo\` do 409 e destacam o input`
     (4 formulários: Processo, Parcela, Pagamento, Honorário)
  3. a classe tem regra alcançável pela página — mesmo arquivo,
     → `<Formulário>.jsx alcança a regra .input-erro`, e a varredura de
     `lex-frontend/tests/css/appliedClasses.test.js`
  O caso 4 do passo original (honorário sem `campo`) fica travado em
  → `o honorário continua SEM campo destacado, e isso está correto`.
  Quando a Fase 4 fizer o `feeService` emitir `campo` (DEC-027, item 3), esse
  teste cai e obriga a revisar — em vez de a mudança passar despercebida.
  Fase de origem: 2E.1 · Automatizado na 2E.2

- [x] **83. Rádios de tipo de pessoa vindos do enum**
  Substituído por: `lex-frontend/tests/regressions/telas2E1.test.js`
  → `passo 83: os rádios de tipo de pessoa saem do enum`
  → `ClientFormPage monta os rádios a partir de TIPO_PESSOA_OPTIONS`
  → `utils/enums.js tem os dois valores, com os rótulos certos`
  Fase de origem: 2E.1 · Automatizado na 2E.2

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
navegador. ⭐ item central da fase. 🚨 bloqueante — falhando ele, o resto do
roteiro não tem sentido.

**Marcação `[automatizável]` / `[só olho humano]` (a partir da Fase 2E.1).**
Os passos 78 a 83 trazem a marcação porque a **Fase 2E.2** vai converter os
automatizáveis em teste e removê-los desta lista. Os passos 1 a 77, anteriores
à convenção, **não foram remarcados** — remarcar 77 passos sem executá-los
seria adivinhação. Dos 6 novos, **4 são automatizáveis** (79, 80, 81, 83) e
**2 são só olho humano** (78, 82).

**A conta da Fase 2E.2.** O roteiro entrou com **83** passos pendentes e saiu
com **79**:

| Movimento | Passos | Para onde |
|---|---|---|
| Executados e aprovados | 78 | `## Validado`, em 30/07/2026 |
| Convertidos em teste | 79, 80, 81, 83 | `## Automatizado` |
| Criados pela própria fase | 84 | lista pendente |

83 − 1 − 4 + 1 = **79**.

**Por que os passos 1 a 77 resistiram à automação.** Não por falta de tentativa:
por serem, quase todos, exatamente o que o roteiro manual deve guardar. Eles se
dividem em quatro grupos, e nenhum cabe em `node --test` sem navegador:

1. **Aparência** — timbrado, canvas em A4, rodapé "página X de Y", ausência de
   buraco no layout sem logo, selos de situação. É julgamento visual: um teste
   que afirmasse "está bonito" não estaria verificando nada.
2. **Gesto** — arrastar da barra para a folha, arrastar bloco para reordenar,
   inserção por toque. Depende de eventos de ponteiro reais.
3. **API só existente no navegador** — `FileReader` e `canvas` no
   redimensionamento do logo, `clipboard` no código de acesso, foco de teclado
   e `Esc` no modal, abertura de DOCX no Word e no LibreOffice.
4. **Comportamento de tela sobre regra já testada no backend** — 422 mostrando
   o rótulo, 409 de sobrescrita, seção em uso recusada, cliente com processo
   ativo recusado. A **regra** está travada na suíte do backend; o que sobra no
   passo manual é a tela reagir a ela, e isso pede DOM renderizado.

O grupo 4 é o único candidato futuro real, e o caminho seria uma dependência de
render — que esta fase proibiu, com razão: 77 passos de tela não justificam
`jsdom` e uma biblioteca de testing-library entrando no projeto agora.
**Baixar o número inventando automação frágil seria pior que o passo manual
honesto.**

**Tela de Clientes (passos 15 a 20).** A Fase 2D.1 registrou que
`ClientPage.css` usava três tokens inexistentes (`--bg-button`, `--text-button`,
`--bg-color`) e que por isso a tela estaria visualmente errada. **A Fase 2D.2
conferiu e o achado não se reproduz:** os três estão definidos em
`variables.css`, no bloco "Legado", tanto em `:root` quanto em
`body.light-mode`, e resolvem nos dois temas. A varredura completa dos `.css` e
`.jsx` do frontend encontrou **63 tokens consumidos e 0 inexistentes**. Nada foi
alterado, e portanto **nenhuma regressão visual foi introduzida** nestes passos
— eles seguem valendo como estão. Continuam pendentes de execução, como o resto
do roteiro, mas não por causa de correção de CSS.

---

**A conta da Fase 3.2.** O roteiro entrou com **79** passos pendentes e saiu
com **93**:

| Movimento | Passos | Para onde |
|---|---|---|
| Criados pela própria fase | 85 a 98 | lista pendente |

79 + 14 = **93**. Nada saiu: esta fase não executou nem automatizou passo
antigo, e mover passo sem executá-lo seria adivinhação.

Dos 14 novos, **7 são `[automatizável]`** (85, 86, 88, 92, 94, 96, 97) e
**7 são `[só olho humano]`** (87, 89, 90, 91, 93, 95, 98).

**Por que a metade é só olho humano, e por que isso é o esperado aqui.** O
portal é a primeira interface do LEX operada por alguém que não é a advogada,
num aparelho que não é o dela. Os 7 irredutíveis se dividem em três grupos:

1. **Percepção** (87, 91) — se a pessoa *nota* que a mensagem de 429 é
   diferente da de credencial inválida; se ela *percebe* que a confirmação vem
   depois do conteúdo. A suíte prova que os dois caminhos existem e escrevem em
   estados distintos. Não prova que alguém lendo entende a diferença, e é a
   compreensão que muda o comportamento.
2. **Aparelho físico** (89, 90, 93, 95) — alvo de toque com o polegar, abrir um
   DOCX no Word do Android, achar o botão de sair sem procurar, ditar o código
   por telefone sem confundir caractere. O emulador mente sobre o tamanho do
   dedo, e nenhum script abre um arquivo no aplicativo do celular.
3. **Compreensão de consequência** (98) — se a advogada entende, *antes* de
   clicar, o que vai acontecer com o documento no portal. Que os dois textos
   estejam presentes é automatizável e está travado em
   `tests/portal/isolamento.test.js`; que sejam compreendidos, não.

**O passo 85 é bloqueante e vem antes de todos.** Ele não testa código: confere
uma variável de ambiente. Está aqui porque o `express-rate-limit` conta por IP,
e numa banca vários avaliadores saem do mesmo wifi — com o teto de produção, o
terceiro a tentar o portal bate em 429 sem ninguém atacar nada, e a
demonstração morre com uma mensagem de bloqueio na tela.

---

**A conta da Fase 4.2.** O roteiro entrou com **93** passos pendentes e saiu
com **104**:

| Movimento | Passos | Para onde |
|---|---|---|
| Criados pela própria fase | 99 a 109 | lista pendente |

93 + 11 = **104**. Nada saiu: esta fase não executou nem automatizou passo
antigo, e mover passo sem executá-lo seria adivinhação.

**Por que a numeração começa em 99 e não em 94.** O roteiro tem 93 passos
**pendentes**, mas o maior número já **usado** é 98 — cinco passos saíram para
`Validado` e `Automatizado` sem que o resto fosse renumerado, de propósito.
Continuar em 94 criaria dois passos com o mesmo número, e passo é coisa que se
cita por número numa conversa ("o 96 falhou").

Dos 11 novos, **7 são `[automatizável]`** (99, 101, 102, 103, 104, 108, 109) e
**4 são `[só olho humano]`** (100, 105, 106, 107).

**Por que estes quatro são irredutíveis.** Ao contrário dos do portal, nenhum
deles depende de aparelho físico. Todos dependem de **conferência
independente** ou de **compreensão sob pressão**:

1. **O valor derivado atualizando ao vivo (100).** A suíte prova que
   `derivarValorHonorario(10, 80000)` é 8000. Não prova que a advogada
   **percebe** o número se atualizar sozinho — e sem perceber, ela procura um
   campo de valor que não existe e conclui que o formulário quebrou.
2. **A mensagem do excedente (105).** O teste prova que o saldo chega ao texto.
   O que se confere aqui é se ela **sai da mensagem sabendo qual valor
   digitar**, com um cliente esperando do outro lado, em vez de apenas entender
   que deu errado e ir por tentativa e erro.
3. **O timbrado do recibo (106).** Nenhum script compara a **aparência** de dois
   PDFs. O recibo e o documento saem do mesmo `letterheadService.js`
   justamente para não divergirem, e a divergência, se vier, só aparece com os
   dois lado a lado.
4. **Os totais da ficha (107).** É o único dos quatro em que o olho humano é
   **mais forte** que um teste, e não apenas diferente. A tela **exibe** os
   totais e não os recalcula — de propósito. Isso significa que um erro de soma
   do backend chegaria intacto à tela, e um teste de frontend conferiria a tela
   contra o mesmo número errado. **A calculadora na mão é a única verificação
   independente que existe deste número.**

**O passo 106 depende do logo real.** Sem o logo carregado em
`/dashboard/perfil`, o timbrado usa só texto e continua bem diagramado — o
passo passaria sem exercitar o caminho que interessa. Carregar o logo antes é
pré-condição, não detalhe.
