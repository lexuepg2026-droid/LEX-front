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

- [ ] **78. ⭐🚨 BLOQUEANTE — login real e navegação completa após a subida do
  `axios` e do `react-router-dom`** `[só olho humano]`
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

- [ ] **79. Detalhe de cliente mostra o erro real, não a mensagem fixa**
  `[automatizável]`
  Pré-condição: logada, com um cliente aberto.
  Passos: 1) desligar a rede (DevTools → Network → Offline, ou derrubar o
  backend); 2) abrir `/dashboard/clientes/:id` de um cliente qualquer.
  Esperado: a mensagem **não** é mais o "Cliente não encontrado." fixo — é o
  erro real da falha de rede. Repetir com o backend no ar e um id inexistente:
  aí sim a mensagem do servidor sobre não encontrar aparece.
  Fase de origem: 2E.1

- [ ] **80. Detalhe de processo mostra o erro real, não a mensagem fixa**
  `[automatizável]`
  Pré-condição: logada, com um processo aberto.
  Passos: mesmos do passo 79, em `/dashboard/processos/:id`.
  Esperado: a mensagem **não** é mais o "Falha ao carregar dados do processo."
  fixo em toda situação. Com a rede desligada aparece o erro de rede; com id
  inexistente, a mensagem do servidor.
  Fase de origem: 2E.1

- [ ] **81. Destaque do campo no 409 dos quatro formulários** `[automatizável]`
  Pré-condição: logada, base recém-seedada.
  Passos: 1) **Processo**: criar um processo repetindo o `numeroProcesso` de
  um existente; 2) **Parcela**: criar uma parcela com um número que já existe
  no mesmo honorário; 3) **Pagamento**: registrar um pagamento com valor maior
  que o saldo da parcela; 4) **Honorário**: salvar e observar (hoje o backend
  não emite `campo` para honorário — o formulário está ligado, mas nada deve
  ser destacado).
  Esperado: nos casos 1, 2 e 3 o input responsável fica com a borda vermelha
  (`numeroProcesso`, `numeroParcela`, `valorPago`) **além** da mensagem no
  rodapé. No caso 4, mensagem sem destaque, e isso está correto.
  Fase de origem: 2E.1

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

- [ ] **83. Rádios de tipo de pessoa vindos do enum** `[automatizável]`
  Pré-condição: `/dashboard/clientes/novo`.
  Passos: 1) olhar os dois rádios; 2) alternar entre eles; 3) salvar um PF e
  um PJ; 4) abrir um cliente existente em edição.
  Esperado: os rótulos são "Pessoa Física" e "Pessoa Jurídica", alternar troca
  os campos do formulário como antes, os dois salvam, e na **edição** o texto
  "Tipo: Pessoa Física/Jurídica" aparece certo. Os rádios agora saem de
  `TIPO_PESSOA_OPTIONS`, e não de literais repetidos na tela.
  Fase de origem: 2E.1

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
