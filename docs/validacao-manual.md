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

- [ ] **4. Cadastro — e-mail duplicado volta para a etapa 1**
  **Executado em 17/08/2026 — REPROVOU: campo de e-mail não foi destacado.
  Achado V-1.** Permanece pendente até a correção.
  Pré-condição: usar `demo@lex.dev` na etapa 1 e completar a etapa 2.
  Passos: enviar o formulário.
  Esperado: erro dizendo que o e-mail já está cadastrado, a tela **volta para
  a etapa 1**, o campo de e-mail fica destacado e nada do que foi digitado se
  perde.
  Fase de origem: 1

---

## 2. Login (`/login`)

---

## 3. Perfil (`/dashboard/perfil`)

- [ ] **12. Perfil — troca de senha**
  **Executado em 17/08/2026 — REPROVOU: 401 de senha atual incorreta derruba
  a sessão. Achado V-2.** Tentar trocar a senha informando a senha atual
  errada levou para a tela de login em vez de mostrar o erro no formulário.
  **CORRIGIDO na F-2a (DEC-050)** — a senha atual errada passou a responder
  **422**, e o interceptor só desloga em **401**. Continua pendente: a correção
  precisa ser **olhada**, e quem faz isso é o passo **191**, que exercita
  exatamente este caminho. Executar o 191 antes deste.
  Passos: trocar a senha para `Lex654321`, sair, entrar com a nova; depois
  voltar a senha para `Lex123456`.
  Esperado: a troca exige a senha atual; senha atual errada é recusada; o
  login com a nova funciona.
  Fase de origem: 1

- [ ] **13. Perfil — logo de 800 KB é redimensionado e aceito** ⚠️
  **Não executado na sessão de 17/08/2026** — exige um arquivo de ~800 KB à
  mão, que não estava disponível. Permanece pendente, sem veredito.
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


---

## 4. Clientes (`/dashboard/clientes`)

---

## 5. Processos (`/dashboard/processos`)

---

## 6. Biblioteca de Seções (`/dashboard/secoes`)

---

## 7. Documentos (`/dashboard/documentos`)

---

## 8. Montagem de documento (`/dashboard/documentos/montar`)

---

## 9. Geração do documento (painel no fim da montagem, modo documento)

---

## 10. Texto final do documento (`/dashboard/documentos/:id/texto`)

---

## 11. Lista de Documentos, revisada (`/dashboard/documentos`)

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

---

## 13. Fase 2E.2 — o que a suíte não alcança

> A Fase 2E.2 foi de testes, não de funcionalidade, e por isso **só gerou um
> passo**. Ele existe porque a Parte 8 daquela fase mexeu em CSS de produção,
> e mudança de CSS é a única coisa ali que a própria suíte não consegue
> conferir: a varredura prova que a regra **chega** na tela, nunca que o
> resultado **está bonito**.

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
  **Emenda da F-5a (28/08/2026): este passo precisa ser REEXECUTADO depois do
  deploy.** O service worker se comporta diferente em HTTPS real — escopo,
  ciclo de vida e atualização não são os mesmos que em `localhost` —, e nada do
  que se conferir aqui vale como prova do que vai acontecer no domínio de
  produção. A F-5a acrescentou o IndexedDB ao lado do Cache Storage: quando
  este passo for refeito, conferir **as duas** áreas em Application, e o passo
  **236** é quem diz o que procurar no banco.
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


## 19. Fase 4.6 — Mensagens que orientam

> Numeração contínua a partir do 142. Cinco passos novos: **143 a 147**.
> O total pendente vai de **137 para 142**.
>
> Todos são `[só olho humano]`, e o motivo é o mesmo nos cinco: a suíte prova
> que a mensagem CONTÉM o texto certo e que a ação sugerida leva ao 201
> (`tests/documents/mensagens.test.js` do backend, blocos ANTI-BECO). Nenhum
> teste prova que a advogada **entende** a mensagem e sabe o que fazer — e esse
> era exatamente o defeito: as frases antigas estavam gramaticalmente corretas.

- [ ] **143. ⭐ Gerar modelo de PJ para cliente PF e LER a pendência**
  Pré-condição: `npm run seed:fresh`; um modelo com a seção "Qualificação da
  outorgante — pessoa jurídica"; o processo "Execucao Fiscal - IPTU", cujo
  participante é pessoa física.
  Passos: montar/gerar esse modelo para o cliente PF.
  Esperado: a tela mostra um bloco **separado** e em cor de impedimento —
  "3 variáveis não se aplicam a esta combinação" —, com a frase
  "Esta variável é de pessoa jurídica e Joao Paulo Oliveira é pessoa física.
  Vincule um cliente pessoa jurídica a este processo e gere para ele, ou use um
  modelo para pessoa física."
  O que se confere: se ela entende que **não adianta ir preencher cadastro**.
  Antes a frase era "Preencha 'CNPJ' no cadastro do cliente" — e o cadastro de
  um cliente PF não tem CNPJ, nem passaria a ter.
  Fase de origem: 4.6

- [ ] **144. ⭐ O aviso preventivo, ao ESCOLHER o cliente**
  Pré-condição: a mesma do 143, sem clicar em Gerar.
  Passos: no painel de geração, escolher o processo e depois o cliente PF.
  Esperado: **antes de qualquer clique em Gerar**, aparece o aviso vermelho
  dizendo quantas variáveis não servem e **em quais seções** elas estão. O botão
  Gerar continua **habilitado** — é aviso, não bloqueio.
  Por que continua habilitado: a advogada pode querer gerar e apagar o trecho
  incompatível no texto final, que é o poder moderador dela desde a Fase 2C.
  Fase de origem: 4.6

- [ ] **145. ⭐🚨 Regerar com pendência e ver a LISTA na tela do documento**
  Pré-condição: um documento gerado cujo cadastro passou a ter uma pendência
  (por exemplo, apague a profissão do cliente depois de gerar).
  Passos: abrir `/dashboard/documentos/:id/texto` e clicar em **Regerar a partir
  das seções**.
  Esperado: a **lista completa** aparece no cartão de regeração, com rótulo e
  orientação item a item — a mesma lista da tela de montagem.
  Antes desta fase: um toast dizendo "há informações faltando no cadastro",
  **sem dizer quais**, e a advogada tinha de voltar à montagem e refazer a
  escolha de processo e cliente para descobrir.
  Fase de origem: 4.6

- [ ] **146. Digitar `{{nomeAdvogado}}` numa seção e receber a sugestão**
  Passos: em `/dashboard/secoes/nova`, escrever um texto com `{{nomeAdvogado}}`
  (o nome ANTIGO da chave, anterior à Fase 2D.2) e salvar.
  Esperado: 400 com "Variáveis inválidas no texto: {{nomeAdvogado}} (você quis
  dizer {{nomeAdvogada}}?)".
  Conferir também que `{{xptoQualquer}}` **não** recebe sugestão inventada.
  Fase de origem: 4.6

- [ ] **147. ⭐ Seguir uma orientação de ponta a ponta até gerar**
  Passos: com um honorário do tipo **fixo** e uma seção usando
  `{{percentualHonorario}}`, tentar gerar; ler a orientação; **fazer exatamente
  o que ela manda** (mudar o tipo do honorário para percentual, informando
  percentual e valor base); gerar de novo.
  Esperado: o documento é gerado, com o percentual no texto.
  Por que este passo é o mais importante da fase: é a régua. Se em algum momento
  a orientação mandar fazer algo que a tela não permite, o beco voltou — e
  nenhum teste de texto pegaria isso.
  Fase de origem: 4.6


## 20. Fase F-0 — Faxina: build, filtros, paginação e carregamento

> Numeração contínua a partir do 147. Sete passos novos: **148 a 154**.
> O total pendente vai de **142 para 149**.
>
> Três dos quatro defeitos desta fase eram invisíveis para `lint`, `build` e
> para as duas suítes — não havia erro no código, havia comportamento errado.
> Os passos abaixo cobrem o que a varredura estática não alcança: o que a
> advogada vê.

- [ ] **148. ⭐🚨 BLOQUEANTE — o build de produção falha sem `VITE_API_URL`**
  Pré-condição: nenhum `.env.production` no repositório do frontend.
  Passos: 1) `npm run build`; 2) ler a mensagem; 3)
  `cp .env.production.example .env.production`, editar a URL, e
  `npm run build` de novo.
  Esperado: a primeira execução **aborta** com a mensagem nomeando
  `VITE_API_URL` e dizendo como resolver; a segunda conclui. Depois do build
  bem-sucedido, `grep -r localhost:3001 dist/` precisa devolver **zero**.
  Por que só olho humano: o que se avalia aqui é se a mensagem de erro é
  **acionável** por quem for publicar — provavelmente o Daniel, no dia da
  defesa, sem tempo de ler código. Até esta fase o build saía com sucesso
  embutindo `http://localhost:3001/api`, e o deploy subia e falhava em toda
  requisição, sem nada acusando.
  Fase de origem: F-0

- [ ] **149. Abrir a edição de cada formulário e ver o spinner**
  Passos: abrir para EDIÇÃO um registro de cada um dos cinco formulários —
  honorário, pagamento, parcela, cliente e processo. Se a rede local for rápida
  demais para ver, usar o `throttling` do DevTools (Network → Slow 3G).
  Esperado: o spinner do projeto (`<Loading />`) enquanto o registro é lido, e
  os campos aparecendo já preenchidos. **Nunca** o formulário vazio primeiro.
  O que se confere: que não dá para começar a digitar num campo que o GET vai
  sobrescrever alguns instantes depois.
  Fase de origem: F-0

- [ ] **150. A leitura que FALHA não deixa o spinner girando**
  Passos: abrir a edição de um registro e, com o backend derrubado (ou o id
  trocado por um inexistente na URL), recarregar.
  Esperado: o spinner some e a **mensagem de erro** da tela aparece. Spinner
  eterno é o modo de falha que o passo 149 poderia introduzir.
  Fase de origem: F-0

- [ ] **151. ⭐ Filtro de recebimentos por processo E por parcela, juntos**
  Pré-condição: `npm run seed:fresh`; um processo com pagamentos em mais de
  uma parcela.
  Passos: abrir a aba financeira do processo, conferir a lista de recebimentos;
  depois restringir também por parcela.
  Esperado: a lista com os dois filtros é **menor ou igual** à de cada um
  isolado. Se ficar maior, o segundo filtro foi descartado — era o defeito:
  `?processoId=X&installmentId=Y` devolvia 3 onde `?installmentId=Y`
  devolvia 1.
  Fase de origem: F-0

- [ ] **152. O aviso de lista incompleta aparece quando precisa**
  Pré-condição: um processo com **mais de 100** parcelas ou pagamentos. Não há
  no seed — precisa ser montado à mão (ou por script) para este passo.
  Esperado: acima da tabela, "Mostrando 100 de N …". Sem ele, a lista truncada
  pareceria completa e a advogada somaria valores que não estão todos ali.
  Se o processo tiver 100 ou menos, o aviso **não** pode aparecer.
  Por que só olho humano: a suíte prova que o aviso existe e que a condição
  está escrita; não prova que ele é legível no lugar onde está.
  Fase de origem: F-0

- [ ] **153. Um link com id quebrado dá mensagem de campo, não lista errada**
  Passos: editar a URL à mão para um `?processoId=` inválido (por exemplo
  `/dashboard/recebimentos?processoId=xyz`) e carregar.
  Esperado: a tela mostra a mensagem de erro do backend nomeando o filtro —
  **não** a listagem inteira, e **não** uma lista vazia com cara de "não há
  nada aqui". Antes desta fase, `/documents` e `/fees` devolviam TUDO e
  `/installments` e `/payments` devolviam VAZIO, para a mesma URL torta.
  O que se confere: se a tela trata o 400 novo sem quebrar o layout.
  Fase de origem: F-0

- [ ] **154. As duas mensagens reescritas, lidas por quem não escreveu o código**
  Passos: 1) tentar salvar um honorário com `status` inválido **e** sem data
  de vencimento — ler a mensagem; 2) gerar um modelo de PJ para um cliente PF —
  ler o **título** do erro, não a lista.
  Esperado: em (1), a lista de status válidos não se funde com o erro seguinte
  (o separador é `;`); em (2), o topo diz que o modelo não serve para o tipo
  de pessoa — e **não** "há informações faltando no cadastro", que mandava
  procurar um campo que não existe.
  Fase de origem: F-0

---

## 21. Fase F-1a.1 — as correções do smoke test

> Numeração contínua a partir do 154. Três passos novos: **155 a 157**, mais o
> **158** acrescentado pela F-1a.2.
>
> **Atualizado em 17/08/2026 pela Fase F-1a.2.** O Daniel executou o 155, o 156
> e o 157. O **155 e o 157 passaram** e estão em `## Validado`. O **156
> REPROVOU** — e reprovou três vezes, com os achados A-1, A-2 e A-3 —, então
> continua pendente, agora com a lista de casos **corrigida**: a versão
> original mandava abrir dois pagamentos que **não existem** no seed, e foi
> parte do que fez a leitura render menos do que devia.
>
> A F-1a.2 acrescenta o **158** (contradição do badge com o "Recebido", achado
> A-4): saem o 155 e o 157, entra o 158, e o 156 continua na lista.
>
> **Correção de 18/08/2026 (F-1b.2).** A frase original terminava com "o total
> pendente vai de 152 para 151", e o número estava errado. Ele vinha de uma
> cadeia de afirmações cumulativas que atravessa as seções 16 a 21
> (104 → 120 → 130 → 137 → 142 → 149 → 152 → 151), cada uma somando os passos
> que a sua fase criava — e nenhuma subtraindo os que iam para `## Validado`. A
> contagem real por checkbox nunca foi essa: fechada a F-1b.2, o roteiro tem
> **171 passos**, dos quais **77 pendentes** — e a fonte é `npm run roteiro`,
> que conta os `- [ ]` do arquivo em vez de somar prosa.
>
> A frase foi corrigida onde ela é local (os passos que ESTA seção movimenta) e
> a afirmação cumulativa foi removida. As seções novas não voltam a fazê-la: um
> total escrito na prosa envelhece no primeiro passo que muda de lugar, e um
> número errado com cara de contagem é pior que nenhum. Quem quiser o total roda
> o script.
>
> **Esta seção NÃO é a seção do Financeiro 2.0.** A validação visual completa
> do módulo — extrato na tela, preview de alocação, reparcelamento ponta a
> ponta — continua sendo da **F-1c**, quando as telas existirem. O que entra
> aqui são só os passos que estas quatro correções exigem, e que nenhuma
> varredura estática alcança.
>
> Dois deles são de **texto entregue a terceiro** (o recibo) e de **foco de
> teclado** — as duas coisas que só olho humano confere.

- [ ] **156. ⭐ Ler os recibos: o texto descreve o que foi quitado**
  **REPROVOU em 17/08/2026** (achados A-1, A-2 e A-3 — ver o CLAUDE.md do
  backend). Corrigido na F-1a.2; **precisa ser reexecutado** com a lista abaixo.
  Pré-condição: `npm run seed:fresh`.

  > ── A LISTA ANTIGA MANDAVA ABRIR PAGAMENTO QUE NÃO EXISTE ──────────────
  > A versão original pedia "o de 3.500 do recurso administrativo" e "o de
  > 2.500 da ação de cobrança que quita a parcela única". O de 3.500 existe, mas
  > está na **"Ação de Cobrança de Dívida"** e não num processo de recurso; e o
  > pagamento de 2.500 que quita parcela única está em **"Disputas Contratuais
  > com Fornecedor"** — o de 2.500 que aparece na área de cobrança é o do
  > **usucapião**, que é líquido de estorno. O Daniel procurou um recibo que,
  > pelo nome dado, não existia. A lista abaixo sai dos pagamentos **reais** do
  > seed, cada um nomeado pelo processo em que de fato está.

  Passos: baixar o recibo de cada um destes pagamentos e **ler o parágrafo
  "Recebi de…" e o de quitação**, do começo ao fim. A coluna da direita diz
  qual estado da **DEC-042** o caso exercita — se dois recibos do mesmo estado
  disserem coisas diferentes, é defeito.

  | # | Pagamento | Onde está | Estado da DEC-042 |
  |---|---|---|---|
  | 1 | **R$ 4.500,00** — Carlos Eduardo, divórcio litigioso | "Divorcio Litigioso" | **PARCIAL** (atravessa duas parcelas; a 2ª continua devendo) |
  | 2 | **R$ 3.500,00** — Agro Campos, "Honorários complementares — recurso administrativo" | "Acao de Cobranca de Divida" | **PLENA COM CRÉDITO** — é o defeito **A-1** |
  | 3 | **R$ 800,00** — Agro Campos, "Custas administrativas — taxas e emolumentos" | "Acao de Cobranca de Divida" | **PLENA SEM CRÉDITO** — contraprova: a redação não pode ter mudado |
  | 4 | **R$ 5.000,00** — Maria Aparecida, adiantamento do inventário | "Inventario e Partilha de Bens" | **PARCIAL**, e é o defeito **A-2** (auto-alocação nomeada) |
  | 5 | **R$ 4.000,00** — Beatriz, usucapião (estornado em 1.500) | "Usucapiao de Imovel Urbano" | **PARCIAL**, e é o defeito **A-3** (sai por 2.500, líquido) |
  | 6 | **R$ 1.500,00** — Agro Campos, "Assessoria tributária" | "Acao de Cobranca de Divida" | **PARCIAL** (honorário reparcelado) |
  | 7 | **R$ 2.500,00** — Construtora Horizonte, "Honorários advocatícios — ação de cobrança" | "Disputas Contratuais com Fornecedor" | **PLENA SEM CRÉDITO** ("pagamento único") |

  Esperado, caso a caso:
  1. o valor **de cada parcela** por extenso: "R$ 3.000,00 na parcela 1 de 2 e
     R$ 1.500,00 na parcela 2 de 2"; quitação **PARCIAL**, e a palavra
     "devido" **pode** aparecer — aqui ela é verdade.
  2. ⭐ **o caso que reprovou.** O corpo nomeia os R$ 500,00 como crédito para
     abatimento futuro, e o pé dá **"plena e geral quitação"** das parcelas
     alcançadas, dizendo que os R$ 500,00 restantes **não correspondem a
     obrigação em aberto**. A palavra **"devido" não pode aparecer em lugar
     nenhum**: quem pagou a mais não deve nada. Era exatamente o contrário
     antes da DEC-042.
  3. "pagamento único" e **"plena e geral quitação do valor acima em relação à
     obrigação a que se refere"** — a redação da 4.1, palavra por palavra.
     Nenhuma menção a crédito, nenhuma a saldo.
  4. ⭐ **A-2.** Precisa dizer **"R$ 5.000,00 na parcela 1 de 1"**. Dizer só
     "pagamento único" é o defeito: quem recebe o papel não consegue ligar o
     dinheiro à obrigação. A quitação é PARCIAL — a parcela vale R$ 12.000,00.
  5. ⭐ **A-3.** O número em destaque é **R$ 2.500,00** (o líquido), e o corpo
     traz a frase **"Este recibo é do valor líquido: do pagamento de
     R$ 4.000,00 foi estornado R$ 1.500,00 em 18/05/2026, restando os
     R$ 2.500,00 acima."** Sair só por 2.500, em silêncio, é o defeito.
     O **motivo** do estorno **não** aparece, e é de propósito: o campo pode
     estar vazio, e inventar motivo em documento assinado é pior que omiti-lo.
  6. quitação PARCIAL. **Observação conhecida, não é defeito desta fase:** a
     referência diz "na parcela 1 de **5**" porque o honorário foi reparcelado
     e as duas parcelas substituídas continuam contando no total. Registrado
     como pendência de leitura para a **F-1c**.
  7. "pagamento único" e quitação plena, igual ao 3.

  Por que só olho humano: é **texto jurídico assinado pela advogada e entregue
  ao cliente**. A suíte confere que as palavras estão lá; se a frase **soa**
  como quitação de mais — ou de menos — do que se recebeu, quem percebe é quem
  lê. Foi assim nas duas vezes: o A-2 da F-1a.1 quitava a obrigação inteira com
  texto gramaticalmente perfeito, e o A-1 da F-1a.2 afirmava dívida inexistente
  contra o cliente que pagou a mais.
  **A redação é PROVISÓRIA (DEC-041 e DEC-042) e precisa passar pela Laís**
  antes de qualquer recibo ir a cliente real.
  Fase de origem: F-1a.1 · lista corrigida na F-1a.2

- [ ] **158. O honorário reparcelado não pode dizer "Pendente" com dinheiro recebido**
  Pré-condição: `npm run seed:fresh`.
  Passos: abrir a aba financeira do processo **"Ação de Cobrança de Dívida"** e
  olhar a **linha do honorário "Assessoria tributária — processo
  administrativo"** — só ela, e as duas informações lado a lado.
  Esperado: onde se lê **"Recebido: R$ 1.500,00"**, o badge diz
  **"Parcialmente pago"**. Nunca **"Pendente"**.
  Por que só olho humano: a contradição é **visual e de leitura** — os dois
  valores estão certos cada um por si, e o defeito só existe quando os dois
  aparecem na mesma linha. Nenhuma asserção de valor pega isso; foi assim que o
  A-4 sobreviveu à suíte inteira da F-1a. A suíte agora trava a causa
  (`derivacao.test.js`, seção 9), e este passo fecha a outra metade.
  Fase de origem: F-1a.2

## 22. Fase F-1b — a UX do dinheiro

> Numeração contínua a partir do 158. Seis passos novos: **159 a 164**.
>
> Esta é a seção que a F-1a.1 adiou dizendo "a validação visual do Financeiro
> 2.0 é da fase em que as telas existirem". As telas existem agora: a **página
> do honorário** (`/dashboard/honorarios/:id`), o **extrato** na linha do
> tempo, o **preview de alocação** e o **modal de estorno**.
>
> Os seis passos têm uma coisa em comum: nenhum deles falha por valor errado —
> a suíte cobre os números, inclusive a prova de que o preview e a criação
> produzem o mesmo plano. O que se confere aqui é se a tela **é compreendida**:
> se a advogada lê o extrato e entende de onde saiu cada movimento, se ela
> confia no preview a ponto de confirmar, e se ela consegue **chegar** à página
> a partir de onde estava.
>
> **O que NÃO está aqui.** O reparcelamento ponta a ponta continua sendo da
> **F-1c** (o botão está na tela, desabilitado, dizendo isso). O paginador
> real, os filtros e o badge de "estornado integralmente" são da **F-1b.2**.

> **Executada em 18/08/2026 pelo Daniel. Os seis passos PASSARAM** e estão em
> `## Validado`. Dois deles vieram com anotação: o **159** (*"responsividade da
> tela não adequada"*) e o **163** (*"rever responsividade"*). Nenhuma das duas
> é erro de conta — as duas são de **caber na tela**, e foi delas que nasceu a
> **F-1b.2**, cuja seção é a **23**. As anotações ficam no corpo dos passos, em
> `## Validado`, como registro de onde a fase seguinte veio.


---

## 23. Fase F-1b.2 — ler e caber

> Numeração contínua a partir do 164. Sete passos novos: **165 a 171**.
>
> Esta seção não existe por defeito de conta. Os seis passos da seção 22
> **passaram** em 18/08/2026, e mesmo assim duas anotações do Daniel apontaram
> para o mesmo lugar: *"responsividade da tela não adequada"* (159) e *"rever
> responsividade"* (163). Somando-se a isso, a leitura humana do extrato achou
> duas linhas sem contexto que fazem a soma **parecer** errada estando certa.
>
> São as duas metades da fase: **ler** (DEC-044 — toda linha que deixou de
> valer diz que deixou de valer) e **caber** (LEX é PWA; tela nova que não cabe
> em celular é defeito, não polimento).
>
> **O que a suíte já cobre, e por que estes passos existem mesmo assim.** O
> backend prova que o contrato carrega os campos novos (`f1b2.test.js`, 13
> testes) e o frontend prova que a tela os escreve, que nenhuma coluna de
> dinheiro trunca e que os mecanismos de responsividade estão nas folhas
> (`f1b2.test.js`, 57 testes). Nada disso prova **aparência**: a varredura de
> CSS alcança regra, não pixel. Os passos abaixo são exatamente o que sobra.
>
> **O que NÃO está aqui.** O paginador real, o filtro por honorário, a barra de
> busca em pagamentos e o filtro por período são da **F-1b.3**. O
> reparcelamento ponta a ponta continua na **F-1c**.

## 24. Fase F-1b.3 — achar o lançamento

> Numeração contínua a partir do 171. Nove passos novos: **172 a 180**.
>
> A fase fecha o ciclo F-1b com a pergunta que faltava: **achar um lançamento
> sem precisar lembrar de qual honorário ele é.** Paginador de verdade,
> filtros, busca e período nas três listagens financeiras; a referência do
> pagamento reescrita (DEC-045); e as ações de cada linha saindo de uma coluna
> que cortava.
>
> **O que a suíte já cobre, e por que estes passos existem mesmo assim.** O
> backend prova cada filtro isolado, os filtros combinados em AND, o 400 com
> `campo` do id e da data torta, e a paginação sem id repetido com filtro
> aplicado (`tests/financial/f1b3.test.js`, 25 testes; `dec045.test.js`, 4). O
> frontend prova as contas do paginador, os presets de período, a frase do
> recorte, a identidade do pagamento da DEC-045, e — por varredura estática —
> que nenhuma listagem com filtro voltou a ter `return <Loading/>` antecipado,
> que o menu fecha com Esc e devolve o foco, e que nenhuma coluna de moeda
> ganhou truncamento (`tests/regressions/f1b3.test.js`, 34 testes).
>
> **Nada disso prova as três coisas que só olho humano vê**: que o foco
> permanece no input enquanto a lista se atualiza; que a pessoa **entende** por
> que a lista está curta; e que nenhuma ação ficou fora da tela nas larguras
> reais.
>
> **Restrição de projeto que enquadra estes passos.** O layout das páginas deve
> mudar, por decisão externa ao Daniel. Estes passos verificam **comportamento**
> — foco, navegação, recorte, teclado —, e não beleza: o que for julgamento de
> aparência vai ser refeito com o desenho novo, e o passo **167** já está
> marcado para reexecução.

- [ ] **180. O extrato pagina em vez de acumular**
  **⚠️ INVERIFICÁVEL com os dados atuais — não reprovado. Número corrigido em
  20/08/2026.**

  **O que foi afirmado sem conferir, e é falso:** que executar o **passo 165**
  encheria o extrato o bastante para haver segunda página. **Conferido na tela
  em 20/08/2026:** depois de executar o 165, o extrato do honorário de
  **divórcio litigioso** mostra **"10 movimentações"**. O paginador é de **20
  por página**, então **não há segunda página** e não há o que verificar. A
  afirmação anterior ficou registrada aqui em vez de apagada, para a próxima
  pessoa não repetir a tentativa.

  **As duas saídas honestas**, à escolha de quem for executar:

  **(a) Encher o extrato à mão.** Cada **pagamento** gera duas linhas
  (pagamento + alocação) e cada **estorno** gera duas (estorno + desalocação).
  De 10 para além de 20 são cerca de **6 operações** — registrar 3 pagamentos e
  estornar 3, por exemplo. Só então o paginador tem duas páginas.

  **(b) Reavaliar depois da F-1c.2.** A aposta era que o reparcelamento pela
  tela geraria linhas de extrato suficientes sozinho.

  **🔴 MEDIDO na F-1c.2 (21/08/2026): a aposta (b) NÃO se confirma. O passo
  segue inverificável, e agora se sabe por quê.**

  Contagem real no banco, para o honorário do divórcio litigioso logo depois do
  `seed:fresh`: **1 pagamento, 0 estornos, 2 alocações, 0 desalocações, 0
  reparcelamentos = 3 movimentações**. Depois do passo 165, sobe para as **10**
  observadas em 20/08/2026.

  Um reparcelamento acrescenta **pouco**: 1 linha de reparcelamento, mais as
  alocações automáticas do saldo adiantado (só se houver crédito) e as mudanças
  de status. Na prática, **1 a 3 linhas** — de 10 para 11 ou 13, e o paginador é
  de **20 por página**. **Não há segunda página**, e não haverá por este
  caminho.

  **A única saída que resta é a (a): encher o extrato à mão.** Cada pagamento
  gera duas linhas (pagamento + alocação) e cada estorno gera duas (estorno +
  desalocação) — de 10 para além de 20 são cerca de **6 operações**: registrar
  3 pagamentos e estornar 3.

  **Não altere o seed para acomodar o passo** — pela mesma razão do passo 172:
  o passo é que foi escrito contra dados que não existem.

  Pré-condição: `npm run seed:fresh`, o passo **165** executado, **e** as ~6
  operações da saída (a) registradas à mão.
  Passos: registrar as ~6 operações; depois abrir a página do honorário de
  **divórcio litigioso** e ir ao **Extrato**.
  Esperado: no lugar do botão **"Carregar mais (N restantes)"**, há o **mesmo
  paginador** das listagens — "1–20 de N movimentações", "Página 1 de X", e os
  dois botões. Avançar e **voltar** funciona: com o acúmulo não havia como
  voltar, porque não existia posição para onde voltar.
  Conferir: depois de registrar um **estorno** pelo extrato, a lista volta para
  a **página 1** — ficar na página 4 de uma história que acabou de mudar de
  tamanho mostraria uma janela deslocada.
  Conferir o **singular** (F-1b.3.1): num honorário com uma movimentação só, o
  rodapé diz **"1 movimentação"**.
  Fase de origem: F-1b.3, número corrigido na F-1b.3.2
## 25. Fase F-1b.3.1 — o menu de ações sai da tela

> Numeração contínua a partir do 180. Dois passos novos: **181 e 182**.
>
> Fase corretiva, só frontend, nascida da validação manual da F-1b.3: os passos
> **173, 174, 176 e 177 passaram**; os **178 e 179 falharam**. O botão **⋮**
> recebia o foco e abria o painel — o painel é que **saía da tela**, nas três
> listagens.
>
> **A causa (DEC-046).** Todo ancestral com `overflow` diferente de `visible`
> recorta descendente posicionado. Havia três, aninhados, e o mais interno era
> a própria célula: `.data-table--fixed td` (`overflow: hidden`),
> `.table-wrapper` (`overflow-x: auto` — e um eixo `auto` faz o outro computar
> `auto` junto) e `.main-content` (`overflow-y: auto`). Recorte não é ordem de
> pintura: nenhum `z-index` atravessa isso. O painel passou a ser renderizado
> em **portal** no `document.body`, com `position: fixed` e coordenadas do
> gatilho.
>
> **O que a suíte já cobre.** Que o painel é criado por `createPortal` no
> `body` e que nenhuma listagem declara painel dentro da tabela; que a conta do
> posicionamento acerta as duas viradas e **nunca** devolve coordenada fora do
> viewport (varredura de toda a tela em 360 e 1024 px); que os ouvintes de
> `scroll` (em captura) e `resize` são postos e devolvidos; e a pluralização
> nas quatro palavras (`tests/regressions/f1b31.test.js`, 31 testes).
>
> **O que continua exigindo olho humano** é exatamente o que falhou: que o
> painel apareça **inteiro** na tela, nas larguras reais. Nenhuma varredura
> estática vê um retângulo cortado.

## 26. Fase F-1b.3.2 — o teclado no menu em portal, e o ⋮ nas outras listagens

> Numeração contínua a partir do 182. Dois passos novos: **183 e 184**.
>
> Fase corretiva, só frontend, nascida da validação manual da F-1b.3.1: os
> passos **172, 175, 179, 181 e 182 passaram**; o **178 falhou — por causa da
> própria correção anterior**; o **180** continua inverificável, agora com o
> número real conhecido (10 movimentações).
>
> **O defeito do 178.** O menu abria com Enter, mas o painel **só era acessível
> pelo mouse**. `createPortal` propaga *eventos* pela árvore do React, mas a
> ordem de tabulação é a do **DOM real**: o painel é o último filho do `body` e
> o gatilho está numa célula no meio da tabela. **Tirar o painel do contêiner
> que recortava tirou junto a ordem de foco natural** — é o custo conhecido do
> portal, e a partir dele o foco precisa ser conduzido explicitamente.
>
> **A DEC-047.** O Daniel também apontou que o ⋮ existia só no Financeiro:
> Clientes, Processos, Documentos e Seções ainda tinham a fileira de botões. A
> razão de padronizar não é estética — a advogada aprendia um gesto numa tela e
> ele não valia nas outras.
>
> **O que a suíte já cobre.** Que o foco é conduzido por chamada explícita e
> **depois** do cálculo de posição; que o `Tab` é interceptado com
> `preventDefault` nos dois sentidos e circula nas duas pontas; que não há
> `autoFocus` no projeto inteiro; que as **sete** listagens renderizam
> `ActionMenu` e **nenhuma** tem botão solto na célula; e que nenhuma ação se
> perdeu na migração, item a item (`tests/regressions/f1b32.test.js`, 22
> testes).
>
> **O que continua exigindo olho humano** é o de sempre com foco: **não há DOM
> em `node --test`**. Que o Tab realmente circule, e que ele realmente não
> escape para a tabela, só se vê tabulando.

## 27. Fase F-1c.1 — "Parcela 1 de 3": o número depois do reparcelamento

> Numeração contínua a partir do 184. Três passos novos: **185, 186 e 187**.
>
> Primeira metade da F-1c: **backend e exibição**. A tela do reparcelamento é a
> **F-1c.2** e não entra aqui.
>
> **O defeito (DEC-048).** O reparcelamento CONTINUAVA a numeração: um
> honorário de 2 parcelas que virava 3 ficava com 1, 2 (canceladas) e **3, 4,
> 5** (vivas). Para quem lê, "parcela 3" de um plano de três é a **primeira** —
> e a advogada, ao telefone com o cliente, precisa dizer "são três parcelas,
> esta é a primeira".
>
> **A decisão.** O plano vigente numera de 1. As canceladas guardam o número
> que tinham, com "Reparcelada" ao lado. O **"de N" é congelado** no momento em
> que o plano deixa de ser editável, e nunca mais é recalculado — recibo que
> muda de significado depois de entregue ao cliente é o defeito mais grave que
> este projeto já corrigiu.
>
> **O problema que a decisão cria.** Renumerar faz existirem **duas parcelas nº
> 1** no mesmo honorário. É o defeito que a DEC-045 resolveu para pagamentos, e
> a solução é a mesma: **referência por atributo**, não por ordinal — "parcela
> 1 de 3, vencendo 15/09/2026" e "parcela 1 de 2, vencendo 10/05/2026
> (reparcelada)".
>
> **O que a suíte já cobre.** Que o reparcelamento numera de 1 e congela o
> "de N" das duas gerações; que `planoId` (quem me criou) e `reparcelamentoId`
> (quem me cancelou) são campos distintos; que duas parcelas nº 1 produzem
> frases diferentes; que nenhuma tela monta o rótulo por conta própria
> (`tests/financial/dec048.test.js` no backend, `tests/regressions/dec048.test.js`
> no frontend).
>
> **⚠️ A NUMERAÇÃO ANTIGA NÃO FOI REESCRITA.** A migração preencheu o "de N" das
> parcelas já gravadas, mas **não renumerou nada** — renumerar dado gravado
> quebraria a referência de recibos já emitidos. Um honorário reparcelado
> **antes** de 21/08/2026 continua com 1, 2 (canceladas) e 3, 4, 5 (vivas), só
> que agora dizendo "de 2" e "de 3" corretamente. **Para ver a renumeração é
> preciso reparcelar de novo**, e é isso que os passos abaixo fazem.

> ---
>
> ## ▶ ORDEM DE EXECUÇÃO E CONSUMO DE DADOS (185 a 190)
>
> **Pré-condição de TODOS os seis, sem exceção:**
>
> ```
> npm run seed:fresh
> ```
>
> **Uma linha só, desde a F-2a.** Até então era preciso rodar também
> `node scripts/migrarTotalParcelas.js`, porque o seed criava as parcelas uma a
> uma e `totalParcelas` nascia vazio — e sem o congelamento o rótulo era
> calculado na leitura e mudava se você acrescentasse uma parcela no meio do
> caminho, fazendo o passo seguinte encontrar um número diferente do que este
> roteiro promete.
>
> O seed passou a gravar `planoId` e `totalParcelas` no ato da criação
> (`criarPlanoDeParcelas`, em `services/installmentService.js`): ele conhece o
> tamanho do plano, e agora o grava. O estado nasce determinístico.
>
> **A migração continua no repositório e continua necessária** — para bancos
> gravados ANTES da DEC-048, que o `seed:fresh` não toca. O que ela deixou de
> ser é pré-condição de reset.
>
> **Cada passo tem alvo PRÓPRIO. Nenhum consome o alvo de outro** — foi assim
> que os alvos foram escolhidos, justamente para você **não precisar rodar o
> seed de novo no meio da sequência**.
>
> | Passo | Honorário alvo | O que ele faz com o alvo |
> |---|---|---|
> | **185** | Honorários advocatícios — **usucapião urbano** | **CONSOME**: reparcela. Depois deste passo, o honorário não tem mais as 2 parcelas originais em aberto |
> | **186** | **Assessoria tributária** — processo administrativo | Registra **1 pagamento**. Não reparcela — o seed **já** deixou este honorário reparcelado |
> | **187** | Honorários advocatícios — **fase inicial** | **CONSOME**: reparcela **duas vezes** |
> | **188 → 190** | Um honorário **criado por você**, no processo *Execução Fiscal – IPTU* | Cria e consome o próprio alvo. Não toca em nada do seed |
>
> **A ordem entre eles é livre** — mas se for executar em sequência, siga
> 185 → 186 → 187 → 188 → 189 → 190, que é a ordem em que os passos se
> referenciam.
>
> **Nenhum reset é necessário no meio.** Se ainda assim você rodar
> `seed:fresh` de novo por outro motivo, **os passos já executados não precisam
> ser refeitos** — eles ficam marcados como validados, e o reset só devolve os
> alvos ao estado inicial.
>
> **Nunca navegue por URL com id.** Os ids mudam a cada `seed:fresh`; os nomes
> e os números de processo, não. Todo caminho abaixo é por **menu e busca**.

> **Executada em 21/08/2026 pelo Daniel. Os três passos PASSARAM** e estão em
> `## Validado`. A pré-condição desta seção mudou depois da execução: era
> `npm run seed:fresh` **e** `node scripts/migrarTotalParcelas.js`, e a **F-2a**
> fez o seed gravar `planoId` e `totalParcelas` sozinho. A linha da migração foi
> retirada dos seis passos; o script continua no repositório, para bancos
> gravados antes da DEC-048.

---

## 28. Encerramento do Financeiro 2.0 — a travessia do módulo inteiro

> Numeração contínua a partir do 187. Três passos novos: **188, 189 e 190**.
>
> **Nota sobre o número da seção.** O prompt da F-1c.2 pediu "a seção 21". O
> `## 21` deste roteiro já é a **F-1a.1** desde julho, e renumerar seções
> mudaria a referência de tudo que veio depois. A seção de encerramento é esta,
> a **28** — o número mudou, o conteúdo é o pedido.
>
> **O que esta seção é, e o que ela não é.** É um roteiro de **travessia**: o
> fluxo financeiro inteiro percorrido numa sentada só, do honorário vazio ao
> extrato lido de cima a baixo. **Não é uma cópia do roteiro** — os passos
> isolados continuam onde estão e são referenciados **pelo número**.
>
> **O que ela prova, e nenhum passo isolado prova:** que **os números fecham
> entre si no fim da travessia**. Cada passo anterior verifica uma tela; este
> verifica que as telas concordam depois de nove operações encadeadas, que é
> quando a divergência aparece.
>
> **Ordem da travessia:** criar honorário → criar parcelas → registrar
> pagamento → conferir alocação → estornar → anular o estorno → reparcelar →
> emitir recibo → ler o extrato inteiro.
>
> ---
>
> **▶ O ALVO DESTES TRÊS PASSOS É CRIADO POR VOCÊ**, e de propósito: assim a
> travessia não disputa honorário com os passos 185 a 187 e não depende de
> nenhum estado do seed além de um processo vazio.
>
> **Pré-condição:** `npm run seed:fresh`.
>
> **Onde criar:** o processo **0006789-60.2024.8.16.0004** — *Execução Fiscal –
> IPTU*, cliente **João Paulo Oliveira**. Ele é um dos **dois processos do seed
> sem honorário nenhum** (o outro é a *Ação Trabalhista*), então nada do que
> você fizer aqui se mistura com dado existente.
>
> **Os números da travessia foram escolhidos para fechar exatos** — nenhuma
> conferência sua vai esbarrar em centavo de arredondamento:
>
> | Momento | Contratado | Recebido | Em aberto |
> |---|---|---|---|
> | depois de criar as 2 parcelas | R$ 6.000,00 | R$ 0,00 | R$ 6.000,00 |
> | depois do pagamento de R$ 3.000,00 | R$ 6.000,00 | R$ 3.000,00 | R$ 3.000,00 |
> | depois do estorno parcial de R$ 1.000,00 | R$ 6.000,00 | R$ 2.000,00 | R$ 4.000,00 |
> | depois de anular o estorno | R$ 6.000,00 | R$ 3.000,00 | R$ 3.000,00 |
> | depois do reparcelamento em 3 | R$ 6.000,00 | R$ 3.000,00 | R$ 3.000,00 |
>
> No reparcelamento, o saldo de **R$ 3.000,00 divide exato por 3**:
> **R$ 1.000,00** em cada, **sem sobra** — a primeira parcela **não** deve
> exibir a marca "inclui a sobra da divisão".

> **Executada em 21/08/2026 pelo Daniel. Os três passos PASSARAM** e estão em
> `## Validado`, encerrando o ciclo **Financeiro 2.0** (DEC-032 a DEC-049).
>
> **Duas coisas saíram desta execução**, e as duas ficam no corpo do passo 188:
>
> | | O quê |
> |---|---|
> | **defeito do passo** | o **elo 6** era o único sem número a conferir. Uma anulação sem efeito passaria despercebida até o elo 8. O passo ganhou os valores esperados e um **PARE** |
> | **caso novo** | anular o estorno **depois** do reparcelamento realoca o valor numa parcela do **plano novo**, e a linha desfeita ganha a nota de anulada. O roteiro não previa o cenário; ele **passou**, e fica registrado como caso conhecido |

---

## 29. Fase F-2a — o 401 que desloga, e as pendências que o Financeiro deixou

> Numeração contínua a partir do 190. Cinco passos novos: **191 a 195**.
>
> Primeira fase do módulo de **Processos** — mas o **status do processo não
> entra aqui**: o vocabulário da Laís ainda não chegou, e inventar enum que ela
> vai trocar é retrabalho garantido. Esta seção é o que **não depende dela**.
>
> **O defeito que a fase existe para corrigir (V-2, DEC-050).** Errar a **senha
> atual** na tela de troca de senha devolvia **401**, e o interceptor do axios
> trata todo 401 como sessão perdida: a advogada era **expulsa do sistema** por
> um erro de digitação. É o defeito com mais chance de aparecer numa
> demonstração — basta uma tecla errada.
>
> **A correção não foi no interceptor**, e é isso que os passos conferem: o 401
> passou a significar **uma coisa só** — sessão ausente ou inválida. Credencial
> conferida dentro de sessão válida responde **422**. Uma lista de exceção de
> rotas no frontend resolveria este caso e apodreceria no próximo.
>
> **Pré-condição de todos:** `npm run seed:fresh`. **Uma linha só** — ver a nota
> da seção 27.

> **Executada em 21/08/2026 pelo Daniel. Os cinco passos PASSARAM** e estão em
> `## Validado`.
>
> **Reportado SEM CAPTURAS.** Fica registrado no corpo de cada passo, e não só
> aqui: um passo arquivado sem evidência precisa dizer que foi assim, para quem
> reabrir a discussão daqui a três meses saber o peso desta validação. Os cinco
> foram conferidos por olho e relatados verbalmente — é o mesmo peso das
> sessões anteriores, e menos que o de um passo com imagem anexada.
>
> **O achado V-2 fecha aqui.** O passo **191** exercitou exatamente o caminho
> que o derrubava — senha atual errada, e a advogada continua logada — e
> passou. O passo **12**, que foi quem reprovou em 17/08/2026, **continua
> pendente**: ele cobre mais que o V-2 (a troca de senha ponta a ponta, com
> logout e login pela senha nova), e essa parte ainda não foi olhada.

---

## 30. Fase F-2b — reativar sem adivinhar, e o pré-voo da demonstração

> Numeração contínua a partir do 195. Cinco passos novos: **196 a 200**.
>
> **O achado que esta fase resolve.** Desativar um processo derruba os vínculos
> dele junto — e até a F-2b essa cascata gravava **o mesmo `ativo: false`** que
> uma remoção manual grava. Depois do fato, os dois estados eram
> **indistinguíveis**, e reativar não tinha saída correta: ressuscitar todos
> devolve gente que a advogada tirou de propósito; não ressuscitar nenhum
> devolve um processo vazio.
>
> Era isso que bloqueava a Parte 4 da F-2a. A **DEC-052** resolve registrando:
> a cascata marca o que derrubou, e a reativação restaura só isso.
>
> **A regra que a fase repete pela terceira vez:** *estado passado não se
> infere, se registra.* O estorno guarda que desfez, a linha do extrato que
> deixou de valer DIZ que deixou (DEC-044), e agora a cascata marca o que
> derrubou.
>
> **Onde as ações estão.** Menu **⋮** das listagens de **Clientes** e de
> **Processos** (DEC-047). "Desativar" e "Reativar" são **mutuamente
> exclusivas**: aparece a que o estado do registro permite. **"Excluir" não
> existe mais nessas duas listagens** — a ação sempre foi soft delete, e com a
> volta existindo o nome antigo mentia.
>
> **Como chegar a um registro desativado.** As duas listagens ganharam um
> seletor de **situação** (Somente ativos / Somente desativados / Ativos e
> desativados), ao lado da busca. Sem ele os desativados não apareciam em lugar
> nenhum — e um menu com "Reativar" não teria linha onde existir. **O padrão
> continua sendo "Somente ativos"**: quem não mexer no seletor vê a listagem de
> sempre.
>
> **Pré-condição de 196 a 199:** `npm run seed:fresh`.

- [ ] **197. ⭐ 🚨 Reativar devolve SÓ quem a cascata derrubou**
  > **Executado em 22/08/2026 pelo Daniel. CONTINUA ABERTO — achado o
  > órfão da DEC-053.** O que este passo pede funcionou: a cascata
  > devolveu só quem ela derrubou, e o removido à mão continuou fora.
  > **Mas foi possível reativar um processo cujo CLIENTE estava
  > desativado**, e o resultado é um órfão visível — o processo volta às
  > listagens, o cliente não, e clicar no nome do cliente cai num registro
  > que o sistema trata como arquivado.
  >
  > A DEC-052 governava só a DESCIDA (reativar o pai não reativa os
  > filhos). Nada dizia sobre a SUBIDA. A **DEC-053** (F-2c) fechou as duas
  > bocas — reativar e criar sob pai inativo — e a recusa NOMEIA o pai.
  >
  > **Continua aberto até a revalidação**, que inclui os passos novos
  > **201 a 204**. Reexecutar este passo INTEIRO, e não só a parte nova: a
  > guarda da DEC-053 entra no mesmo caminho que este passo percorre.
  Pré-condição: `npm run seed:fresh`. **É o passo que a fase existe para ter.**
  **▶ ONDE IR.** Menu lateral → **Processos** → o mesmo processo com
  litisconsórcio do passo 196 (se já o desativou, reative-o primeiro, ou use
  outro com mais de um participante).
  **A ordem importa e é o ponto do passo.** Sem remover um participante à mão
  **antes**, "restaurar tudo" e "restaurar só a cascata" dão o mesmo resultado —
  e o passo passaria em cima do defeito.
  Passos:
  1) abrir **Gerenciar** → aba/bloco de **participantes**;
  2) **remover à mão** um participante que **não** seja o principal — anote o
     nome dele;
  3) voltar à listagem e **desativar** o processo (passo 196);
  4) trocar o seletor de situação para **Somente desativados**;
  5) no ⋮ da linha, escolher **Reativar**;
  6) **ler o modal**: ele diz quantos voltam, e que os removidos à mão **não**
     voltam;
  7) confirmar;
  8) abrir **Gerenciar** → participantes.
  Esperado: os participantes que caíram pela desativação **voltaram**. O que
  você removeu à mão no passo 2 **NÃO voltou** — e é essa ausência que prova a
  DEC-052.
  **Se ele voltar, PARE** — a reativação está restaurando tudo, e a advogada
  perdeu a decisão que tomou de propósito.
  Conferir também o número do modal do passo 6: ele conta **só** os da cascata,
  então é **menor** que o total de participantes desativados.
  Por que só olho humano: a suíte cobre exatamente este cenário. O que ela não
  cobre é o **caminho da interface** — que a remoção manual e a desativação
  sejam alcançáveis nesta ordem, e que a advogada consiga conferir o resultado
  sem ir ao banco.
  Fase de origem: F-2b


---

## 32. Fase F-2c — nada fica ativo debaixo de coisa inativa

> **A F-2b devolveu a reativação; a F-2c descobriu que ela subia sozinha.** O
> passo 197 achou o defeito: era possível reativar um processo cujo cliente
> estava desativado, e o resultado é um **órfão visível** — o processo volta às
> listagens, o cliente não, e clicar no nome do cliente cai num registro que o
> sistema trata como arquivado.
>
> A **DEC-052** governa a DESCIDA (reativar o pai não reativa os filhos). A
> **DEC-053** governa a SUBIDA (o filho não sobe sem o pai). São a mesma regra
> vista dos dois lados, e quem mexer numa precisa ler a outra.
>
> A regra é **geral**, e não "Processo→Cliente": o caso achado era instância de
> um princípio, e escrever só o caso teria deixado as outras portas abertas.
> Ela tem duas bocas — **reativar** e **criar** sob pai inativo — e os passos
> abaixo percorrem as duas.
>
> **Os quatro passos desta seção (201–204) foram executados em 24/08/2026 e
> estão em `## Validado`.** O **204** achou um órfão real, e ele virou a Parte 5
> da F-2d.

## 33. Fase F-2d — as fases do processo, no vocabulário da Laís

> **O vocabulário chegou em 23/08/2026, e é o que destravava este módulo.** Ela
> disse, textualmente:
>
> > *"Fase inicial (fase de conhecimento) / Sentença / Execução / Recursos"*
> > *"Sim, pode voltar"*
> > *"Não precisa anotar o porquê, só se ela quiser mesmo"*
> > *"Liminar é um plus dentro das fases, você pede algo com urgência, mas não é
> > uma fase nova"*
> > *"Trânsito em julgado — processo encerrou completamente, acabou todos os
> > processos de recurso"*
> > *"Acordo cumprido — aí o processo finalizado e muda para trânsito em julgado"*
>
> **Ela não descreveu um status. Descreveu DUAS coisas ortogonais** (DEC-054):
>
> | Eixo | O que é | Como anda |
> |---|---|---|
> | **Fase** | onde o processo ESTÁ | nos dois sentidos, sem ordem |
> | **Encerramento** | se ele ACABOU | um carimbo: a data do trânsito em julgado |
>
> Um processo em recursos e um processo transitado em julgado **não estão em
> pontos diferentes da mesma régua**. Modelá-los como um enum só faria "trânsito
> em julgado" competir com "execução" numa lista onde as duas não se comparam.
>
> **Liminar é sinalizador**, não fase: um processo em qualquer fase pode tê-la.
>
> **A maior parte do que os passos abaixo verificam é uma AUSÊNCIA** — que a
> transição de volta funciona, que o motivo não é exigido, que o encerramento
> não pede fase nenhuma. São as regras que ela **não** pediu, e é justamente
> esse tipo de regra que volta sozinha na fase seguinte sob o nome de
> "coerência".
>
> **Pré-condição de 205 a 212:** `npm run seed:fresh`, **em todos, sem
> exceção.** Até a F-3 o 210 e o 212 eram exceções — contavam com estado
> acumulado no banco de desenvolvimento (o órfão do passo 204, e a base
> anterior à DEC-054). O `seed:fresh` da **F-4** apagou os dois, e os dois
> foram **reescritos para criar a própria pré-condição**. Passo que depende de
> dado que um reset apaga é passo que quebra sozinho. Ver a Parte 0 da F-4.
>
> Os passos **206** e **207** encadeiam no **205**: rodam **em sequência,
> depois de um único `seed:fresh`**. Isso é sequência dentro da mesma rodada
> semeada, não estado herdado de sessão anterior — não rode `seed:fresh` entre
> eles, ou o encadeamento se perde.
>
> ⚠️ **O nome da primeira fase está PENDENTE DE RATIFICAÇÃO.** Ela deu duas
> palavras — "fase inicial" e "fase de conhecimento". Adotada a segunda, porque
> "inicial" é posicional e deixa de valer no instante em que o processo volta.
> Se ela preferir a outra, muda-se o rótulo e nada é migrado.

- [ ] **207. 🚨 O histórico mostra `de → para`, com data — e é o passado da linha do tempo**
  Pré-condição: `npm run seed:fresh` **uma vez**, e os passos **205** e
  **206** executados depois dele, **no mesmo processo**. Os três formam uma
  sequência: um seed, depois 205 → 206 → 207, sem reset no meio.
  **Nota da F-5a (28/08/2026):** os passos **205** e **206** passaram e foram
  para `## Validado`, e a F-5a rodou `seed:fresh` depois disso — o histórico
  que eles gravaram não existe mais. Eles continuam sendo a **preparação**
  deste passo e são repetíveis: execute-os de novo, na mesma rodada semeada,
  antes de conferir o histórico aqui. Estar em `## Validado` diz que a regra
  deles passou, não que a base ainda carregue o efeito.
  **É o substrato da F-2e.** Ela pediu a linha do tempo (*"finalizado por etapa
  — fazer linha do tempo"*), e sem gravar agora a linha do tempo nasceria sem
  passado.
  **▶ ONDE IR.** A mesma seção **"Andamento do processo"**, bloco **"Histórico
  de fases"**.
  Esperado:
  - **uma entrada por mudança**, na ordem inversa (a mais recente no topo);
  - cada uma diz **`de → para`** com os dois rótulos por extenso, e a **data e
    hora**;
  - a **última da lista** (a mais antiga) diz **"Cadastrado em &lt;fase&gt;"**, e
    **não** `— → Fase de conhecimento`. O processo nasceu naquela fase; ele não
    veio de nenhuma, e escrever um travessão ali inventaria uma origem;
  - as mudanças **com** motivo mostram o motivo; as **sem** motivo não mostram
    linha vazia nenhuma.
  **Conferir a contagem:** o número de entradas tem de ser **1 (o nascimento) +
  o número de mudanças que você fez**. Faltando uma, a linha do tempo da F-2e
  vai nascer com buraco.
  Por que só olho humano: a suíte prova o conteúdo de cada entrada. O que ela
  não prova é se a lista **se lê como uma história** — que é o que a F-2e vai
  construir em cima.
  Fase de origem: F-2d

- [ ] **208. ⭐ A liminar: o selo, o filtro, e a lista que NÃO se reordena**
  Pré-condição: `npm run seed:fresh`.
  *"Liminar é um plus dentro das fases, você pede algo com urgência, mas não é
  uma fase nova."*
  **▶ ONDE IR.** **Processos** → **⋮ → Gerenciar** → **Editar Processo**, e
  depois a listagem.
  Passos:
  1) num processo que **não** seja o mais recente da lista, marcar **"Processo
     com liminar"**, pôr uma **data** e uma **observação**, e salvar;
  2) voltar à listagem de **Processos**;
  3) passar o mouse sobre o selo;
  4) pôr o filtro em **"Somente com liminar"**, depois **"Somente sem
     liminar"**, depois **"Com e sem liminar"**;
  5) **mudar a fase** desse processo e voltar à listagem.
  Esperado no passo 2: um selo **"Liminar"** ao lado do título, em **cor de
  atenção** (o mesmo tom de "Suspenso"), com a **palavra escrita** — cor sozinha
  não serve.
  Esperado no passo 3: a **observação** aparece na dica.
  Esperado no passo 4: o filtro **recorta** as três vezes, e as contagens batem.
  Esperado no passo 5: o selo **continua lá**. A liminar atravessa as fases —
  ela é um plus DENTRO delas.
  **🚨 O QUE NÃO PODE ACONTECER, e é o ponto do passo:** o processo com liminar
  **não pode subir na lista**. Ele foi escolhido de propósito por não ser o mais
  recente — se ele aparecer no topo, a lista se reordenou. Ela pediu
  **destaque**, não **prioridade**: reordenar muda o que a advogada espera
  encontrar onde deixou. **Se subir, é reprovação.**
  Conferir também no **detalhe** do processo: o mesmo selo, com a mesma palavra
  e a mesma cor. Dois desenhos para o mesmo fato fazem duvidar se são o mesmo
  fato.
  Por que só olho humano: a suíte prova que a ordenação é por data de criação e
  que a classe do selo tem cor de atenção. O que ela não prova é se o selo **se
  vê num relance** numa tabela cheia — que é o que "destaque" significa.
  Fase de origem: F-2d

- [ ] **209. ⭐ Encerrar por trânsito em julgado A PARTIR DE FASES DIFERENTES**
  Pré-condição: `npm run seed:fresh`. **O encerramento é o OUTRO eixo.**
  *"Acordo cumprido — aí o processo finalizado e muda para trânsito em
  julgado."* Acordo se cumpre em conhecimento, em execução, em qualquer lugar.
  Passos, em **três processos diferentes**:
  1) num que esteja em **Fase de conhecimento**, preencher **"Trânsito em
     julgado"** com uma data e o motivo **"acordo cumprido"**, e salvar;
  2) num que esteja em **Execução**, o mesmo;
  3) num que esteja em **Recursos**, o mesmo.
  Esperado: **os três funcionam**, e em nenhum deles o campo aparece
  desabilitado, cinza ou com aviso de "mude a fase primeiro".
  **Se algum exigir que o processo esteja em "Recursos", é reprovação** — alguém
  inventou um caminho único onde ela descreveu vários.
  Conferir no detalhe, na seção **"Andamento do processo"**:
  - a linha **"Trânsito em julgado"** mostra a data e o motivo;
  - a **fase continua sendo a que era**. O encerramento **não** a apaga — senão
    se perderia a informação de onde o processo parou;
  - **ainda dá para mudar a fase** de um processo já transitado (a advogada
    errou o registro e está corrigindo).
  Conferir por último: **apagar a data** e salvar **desfaz** o encerramento. É
  como se corrige um carimbo posto por engano.
  Por que só olho humano: a suíte prova as quatro combinações pela API. O que
  ela não prova é se a tela **deixa chegar** ao campo a partir de cada fase.
  Fase de origem: F-2d

- [ ] **210. 🚨 A lacuna do Documento, fechada nas duas bocas**
  Pré-condição: `npm run seed:fresh`. **O passo cria o próprio órfão.**
  Até a F-3 ele usava o órfão que vivia no banco de desenvolvimento — a
  *Peticao de Suspensao da Execucao* sob a *Execucao Fiscal - IPTU*, achada no
  passo **204**. O `seed:fresh` da **F-4** apagou aquele banco. O par, porém, o
  próprio seed reconstrói: a *Execucao Fiscal - IPTU* nasce com a *Peticao de
  Suspensao da Execucao* pendurada nela. Basta **desativar o processo** para o
  órfão nascer de novo, pelo caminho do produto — que é como ele nasceu da
  primeira vez.
  **▶ ONDE IR.** **Processos**, depois o terminal do backend, depois
  **Documentos**.
  Passos:
  1) em **Processos**, achar a *Execucao Fiscal - IPTU* e conferir em
     **Documentos** que a *Peticao de Suspensao da Execucao* está lá, **ativa**;
  2) **desativar o processo**, pelo **⋮**, confirmando;
  3) rodar **`npm run auditar:orfaos`** e conferir que **o órfão é achado**,
     nominalmente;
  4) em **Processos**, com o filtro em **"Somente desativados"**, achar a
     *Execucao Fiscal - IPTU*;
  5) tentar **criar um documento novo** apontando para ela — pela lista de
     Documentos, ou pela geração a partir de um modelo;
  6) tentar **mover** um documento existente para ela, pela edição do documento.
  Esperado no passo 2: a desativação **passa**, e o documento **continua
  ativo** debaixo do processo inativo. **O órfão NASCE da desativação** — a
  cascata não o alcança, por decisão da **DEC-052**: `deleteProcess` derruba os
  vínculos processo↔cliente e mais nada. Se o documento for desativado junto,
  alguém ampliou a cascata sem registrar, e **isso é reprovação do passo**.
  Esperado no passo 3: o órfão **aparece**, como `Documento → Processo`, com o
  **filho ATIVO nomeado** e o **pai INATIVO nomeado**. A auditoria continua
  fazendo o trabalho dela; a correção é escolha da advogada, e ninguém a fez
  por ela. **A URI não pode aparecer** — nem inteira, nem mascarada.
  Esperado nos passos 5 e 6: a criação e a mudança são **recusadas**, e a
  mensagem **NOMEIA o processo** — *"Não é possível criar: o processo Execucao
  Fiscal - IPTU está desativado. Reative o processo primeiro."*
  **🚨 O que NÃO pode aparecer:** *"Processo não encontrado"*. **Era exatamente
  o que Documento respondia**, e é a frase que a DEC-053 nomeia como o defeito:
  ela manda procurar um registro que a advogada está vendo na tela com a tag
  "Desativado".
  Conferir também que **reativar o processo** e então criar o documento
  **funciona** — uma guarda que fechasse o caminho legítimo trocaria um órfão
  por um módulo inutilizado.
  **Ao terminar, NÃO conserte o órfão por script.** A escolha entre desativar o
  filho e reativar o pai é da advogada, e essa regra não muda — o que mudou é
  que o órfão deixou de ser relíquia guardada no banco e passou a ser
  **fabricado pelo próprio passo**, toda vez.
  Por que só olho humano: a suíte prova as três portas e a ausência de
  reativação de documento. O que ela não prova é **por onde a advogada chega**
  à tentativa, nem se a tela a deixa chegar.
  Fase de origem: F-2d — **reescrito na F-4** (Parte 0), para deixar de depender
  do órfão do passo 204.

- [ ] **211. Desativar um cliente que é LITISCONSORTE no processo de outra pessoa**
  Pré-condição: `npm run seed:fresh`. **Fecha o relato do passo 201.**
  Passos:
  1) em **Processos**, escolher um processo e **acrescentar um segundo cliente**
     a ele, com o papel **"Litisconsorte"** — alguém que **não** seja o
     principal;
  2) em **Clientes**, tentar **desativar** esse segundo cliente.
  Esperado: a desativação é **recusada**, e a mensagem:
  - diz **"desativar"**, e **não "excluir"** — a ação em Clientes mudou de nome
    na F-2b;
  - **NOMEIA o processo** que está bloqueando;
  - mostra o **papel** — *"(litisconsorte)"* —, que é o que explica por que o
    processo de um terceiro está na lista;
  - diz **"não é preciso desativar o processo"**.
  Depois: **desvincular** o cliente daquele processo (⋮ → Gerenciar → Editar →
  **Remover** o participante) e tentar de novo. Agora **funciona**, e o processo
  do terceiro **continua ativo e intacto**.
  **O relato do 201 foi:** *"tive que desativar todos os processos que o cliente
  estava vinculado"*. **A rigidez fica** — afrouxá-la criaria órfão de vínculo,
  e o veredito está no passo 201. O que muda é a mensagem saber dizer o
  caminho.
  Por que só olho humano: a suíte prova a recusa, os nomes e o papel. O que ela
  não prova é se a advogada, lendo a frase, **vai desvincular em vez de
  desativar** — que é o comportamento que o relato mostrou estar errado.
  Fase de origem: F-2d

- [ ] **212. A migração da DEC-054, rodada duas vezes**
  Pré-condição: `npm run seed:fresh`.
  ⚠️ **Leia antes, porque o esperado MUDOU.** Até a F-3 este passo dizia
  "**sem** `seed:fresh` antes": ele contava com o banco de desenvolvimento
  **anterior à DEC-054**, em que havia processo sem `fase`. Esse banco não
  existe mais — o `seed:fresh` da **F-4** o apagou —, e **não há caminho no
  produto que crie processo sem `fase`**: o schema tem `default` e o seed grava
  o campo nos dez processos. Portanto **`fase preenchida agora` sai `0` já na
  PRIMEIRA execução, e isso é o ESPERADO, não falha.** O que o passo continua
  provando é a guarda, o relatório lido contra a base real, e a idempotência.
  Ver a Parte 0 da F-4.
  Passos:
  1) rodar **`npm run migrar:fase -- --dry-run`**;
  2) rodar **`npm run migrar:fase`**;
  3) **ler o relatório**;
  4) rodar **de novo**, o mesmo comando;
  5) abrir **Processos** e conferir que a coluna **Fase** está preenchida em
     todos.
  Esperado no passo 1: **não pergunta nada e não grava nada** — o cabeçalho diz
  `(DRY RUN — nada será gravado)`. `--dry-run` existe para olhar antes de agir,
  e por isso **não** leva a guarda. Se ELE perguntar o nome do banco, alguém pôs
  guarda onde não precisa.
  Esperado no passo 2: a guarda de banco da F-2b **PARA e pergunta** o nome do
  banco — este script escreve. **A URI não pode aparecer**, nem mascarada.
  Esperado no passo 3: o relatório lista os **valores reais de `status`
  encontrados no banco**, com a contagem de cada um, e diz **em voz alta** que
  **nenhum deles carrega informação de fase**. Diz também quais processos estão
  com `status: "encerrado"`, **nominalmente**, como candidatos à revisão dela —
  no seed são **dois**: *Acao Trabalhista - Verbas Rescisorias* e *Acao de
  Cobranca de Divida*.
  **O script NÃO carimba trânsito em julgado em nenhum.** "Encerrado" diz que
  acabou, e não diz **como** nem **quando** — e uma data inventada é pior que
  nenhuma.
  Esperado no passo 4: **exatamente o mesmo relatório do passo 3**, sem
  diferença nenhuma — *"nada a fazer — a migração já havia sido aplicada
  (idempotente)"*, **`fase preenchida agora : 0`** e **`fase já tinha : 10`**
  nas duas execuções. A idempotência aqui se prova pela **igualdade das duas
  saídas**, e não mais pela queda de um número para zero.
  Esperado no passo 5: nenhum processo com a coluna Fase vazia, e o campo
  **`status` continua lá** — é outro eixo, e a listagem filtra por ele desde a
  Fase 2.
  Por que só olho humano: a suíte roda a migração duas vezes contra o banco de
  teste e compara documento por documento. O que ela não prova é o **texto do
  relatório contra a base real** — e é ele que a advogada vai ler para decidir o
  que fazer com os "encerrado".
  Fase de origem: F-2d — **reescrito na F-4** (Parte 0), para deixar de depender
  de um banco pré-DEC-054 que o reset apaga.

## 34. Fase F-3 — O calendário: o que vem, e o que já aconteceu

> **A fase criou uma ENTIDADE NOVA** — a primeira desde o Financeiro 2.0 — e
> uma tela que junta, no mesmo lugar, duas naturezas de coisa:
>
> | | O quê | Vem de |
> |---|---|---|
> | **Evento próprio** | audiência, prazo, reunião | a coleção nova (`events`) |
> | **Data derivada** | vencimento de parcela, vencimento de honorário | o financeiro, **lido na consulta** |
>
> **DEC-055, e é o coração da fase: data derivada NUNCA é gravada como evento.**
> Gravá-la criaria duas fontes para o mesmo vencimento, e as duas divergem no
> primeiro reparcelamento — o calendário continuaria mostrando as cinco parcelas
> antigas, com o mesmo peso visual de uma audiência.
>
> **O risco número um da fase é o FUSO.** Este projeto já teve defeito de fuso
> (o recibo do portal, passo 91). Um evento gravado como instante UTC e lido no
> navegador **muda de dia**: a audiência de terça aparece na segunda, e ninguém
> desconfia do calendário — desconfia da própria memória. **O passo 221 é o mais
> importante desta fase.**
>
> **Pré-condição de 213 a 225:** `npm run seed:fresh`. O seed cria nove eventos
> — um de cada tipo, um atrasado, dois de hoje, um concluído e um solto —, com
> as datas calculadas **no momento da semeadura**, para o seed não envelhecer.
>
> ⚠️ **Os tipos de evento estão PENDENTES DE RATIFICAÇÃO DA LAÍS.** Audiência,
> prazo, reunião e outro saíram do enunciado da fase, **não dela**. Perícia,
> diligência e despacho são candidatos óbvios, e nenhum entrou — adivinhar o
> vocabulário dela e depois migrar dado gravado sob um valor que ela nunca usou
> é o que não se faz. Mesma marca da DEC-039 e da DEC-054.
>
> ⚠️ **O que esta fase NÃO faz, e não é para procurar:** recorrência (evento que
> se repete), contagem de prazo processual (dias úteis, feriados, suspensão
> forense), Web Push (notificação com o app fechado) e convite/integração com
> Google ou Outlook. Os quatro são subsistemas inteiros e nenhum foi pedido.
> **O "prazo" desta fase é uma data que a advogada digita, não uma data que o
> sistema calcula.**

- [ ] **213. ⭐ As duas vistas em 1024 px — a grade abre, e a agenda está a um clique**
  Pré-condição: `npm run seed:fresh`. Janela em **1024 px de largura**.
  **▶ ONDE IR.** Menu lateral → **Agenda**.
  Passos:
  1) conferir o que **abre** sem tocar em nada;
  2) clicar em **Agenda** no seletor de vistas, e depois em **Mês**;
  3) reparar no cabeçalho da grade e no mês escrito no topo.
  Esperado no passo 1: abre na **grade do mês**, com sete colunas e o mês
  corrente.
  Esperado no passo 2: as duas vistas trocam, e o botão da vista ativa fica
  visivelmente marcado.
  Esperado no passo 3: os dias da semana começam em **dom** e terminam em
  **sáb**; o mês aparece **por extenso** ("agosto/2026"), e não como "08/2026".
  Por que só olho humano: a suíte prova que `vistaPadrao(1024)` é `'mes'` e que
  a grade tem as semanas certas. O que ela não prova é se a grade **se lê** —
  se o olho acha o dia que procura sem contar colunas.
  Fase de origem: F-3

- [ ] **214. ⭐ 🚨 Em 360 px a AGENDA é o padrão — e a grade continua alcançável**
  Pré-condição: `npm run seed:fresh`. Janela (ou DevTools) em **360 px de
  largura**, e recarregar a
  página com `/dashboard/agenda` **sem query string** (é a query que guarda a
  vista; com ela, o teste não vale).
  **▶ ONDE IR.** **Agenda**, em 360 px.
  Passos:
  1) conferir o que **abre**;
  2) trocar para **Mês** e olhar a grade em 360 px;
  3) voltar para **Agenda**.
  Esperado no passo 1: abre na **vista de agenda** — lista por dia, em ordem de
  data.
  Esperado no passo 2: a grade **existe e é alcançável**. Ela fica apertada, e
  é por isso que não é o que abre: sete colunas em 360 px dão **51 px por dia**.
  **🚨 O QUE NÃO PODE ACONTECER:** o seletor de vistas **sumir** em 360 px.
  A advogada escolhe; o sistema só decide o que **abre**. Esconder a grade
  tiraria dela uma vista que ela pode querer, mesmo apertada. **Se sumir, é
  reprovação.**
  Também não pode: a agenda listar os **trinta dias do mês** para mostrar três
  compromissos. Só os dias que **têm** alguma coisa viram linha.
  Por que só olho humano: a suíte prova `vistaPadrao(360) === 'agenda'` e que o
  CSS não esconde o seletor. O que ela não prova é se a agenda **cabe e se lê**
  num telefone de verdade — que é a tela em que esta fase foi desenhada para
  ser usada.
  Fase de origem: F-3

- [ ] **215. ⭐ Criar um compromisso CLICANDO NUM DIA**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** **Agenda**, vista **Mês**.
  Passos:
  1) clicar no **número** de um dia qualquer que esteja vazio;
  2) conferir o formulário que abre, **sem digitar nada**;
  3) preencher **Título**, escolher o **Tipo**, salvar;
  4) voltar à agenda e achar o compromisso;
  5) repetir na vista **Agenda**, pelo botão **+** do cabeçalho de um dia.
  Esperado no passo 2: o campo **Data já vem preenchido** com o dia clicado.
  Sem isso, criar a partir da grade custaria redigitar a data que ela acabou de
  clicar.
  Esperado no passo 4: o compromisso está **no dia certo** — o mesmo em que ela
  clicou.
  Esperado no passo 5: o mesmo comportamento.
  Conferir também: o campo **Processo** oferece **"Sem processo"** e é
  **opcional**. Nem toda reunião é de um processo — exigir vínculo obrigaria a
  advogada a inventar um para registrar o que ela de fato tem na agenda.
  Fase de origem: F-3

- [ ] **216. ⭐ 🚨 A DERIVADA não é editável, e clicar nela LEVA À PARCELA**
  Pré-condição: `npm run seed:fresh`. **É o passo que a DEC-055 existe para
  ter.**
  **▶ ONDE IR.** **Agenda**, no mês em que houver **vencimento de parcela** (o
  seed põe parcelas nos meses próximos — navegue até achar uma linha marcada
  como **Vencimento**).
  Passos:
  1) achar uma linha de **vencimento de parcela** na agenda;
  2) **clicar nela**;
  3) conferir para onde foi;
  4) voltar à agenda e clicar num **compromisso** (audiência, prazo, reunião).
  Esperado no passo 3: vai para o **formulário da parcela**, e uma mensagem
  explica que *o vencimento vem do financeiro e não se edita na agenda*.
  **Mudar vencimento se faz onde o vencimento mora.**
  Esperado no passo 4: vai para o **formulário do compromisso**, onde a data
  **é** editável.
  **🚨 O QUE NÃO PODE ACONTECER, e é o ponto do passo:** a linha de vencimento
  abrir um **formulário de compromisso** com a data editável. Isso seria a
  segunda fonte voltando pela porta da interface — e no primeiro reparcelamento
  o calendário e o financeiro passariam a discordar sobre a mesma dívida. **Se
  abrir, é reprovação.**
  Também não pode: a linha de vencimento **sumir** da agenda. Ela precisa
  aparecer — o que não pode é ser editada ali.
  Por que só olho humano: a suíte prova que `destinoDoItem` de uma derivada
  aponta para `/parcelas/editar/:id` e nunca para a agenda. O que ela não prova
  é se a advogada **entende** por que uma linha a leva embora e a outra abre um
  formulário — que é o que a mensagem e a legenda existem para responder.
  Fase de origem: F-3

- [ ] **217. ⭐ As duas naturezas se distinguem NUM RELANCE, e a legenda diz qual é qual**
  Pré-condição: `npm run seed:fresh`, e então **navegar até um mês que tenha
  as duas coisas** — pelo menos um compromisso e pelo menos um vencimento de
  parcela. O seed põe os compromissos em torno de **hoje**; o mês do
  vencimento é o mesmo que o passo **216** já manda achar. Se o mês corrente
  não tiver as duas, use aquele.
  **▶ ONDE IR.** **Agenda**, nas duas vistas.
  Passos:
  1) olhar a tela por **três segundos** e tentar dizer quais linhas são
     compromisso e quais são vencimento, **sem ler a legenda**;
  2) depois, ler a legenda;
  3) repetir no **tema claro** e no **tema escuro**.
  Esperado no passo 1: dá para distinguir. O compromisso tem barra **cheia**;
  o vencimento tem barra **listrada** e borda **tracejada**.
  Esperado no passo 2: a legenda tem as **duas**, com **nome** ("Compromisso",
  "Vencimento") e **explicação** — inclusive que o vencimento vem do financeiro
  e que para mudar a data é preciso abrir a parcela.
  Esperado no passo 3: a distinção sobrevive aos dois temas.
  **A cor sozinha não basta**, e é por isso que há três sinais somados: cor,
  forma da barra e borda. Quem não distingue as duas cores é a mesma pessoa que
  não receberia a informação de que uma das linhas não se edita.
  Por que só olho humano: a suíte prova que as classes são diferentes e que há
  `repeating-linear-gradient` e borda tracejada. **Se a distinção se vê num
  relance** é exatamente o que nenhum teste mede.
  Fase de origem: F-3

- [ ] **218. O "+N" de um dia cheio, e a célula que NÃO estica**
  Pré-condição: `npm run seed:fresh`, e então **criar quatro compromissos no
  mesmo dia** pelo caminho do passo **215**. Criar sempre, sem conferir antes
  se o seed já deixou um dia cheio: o passo precisa de um dia com **mais de
  três** itens, e depender do que o seed *por acaso* produziu é depender de
  estado que muda sem aviso.
  **▶ ONDE IR.** **Agenda**, vista **Mês**.
  Passos:
  1) olhar a linha da semana que contém o dia cheio;
  2) conferir o número que aparece no **"+N"**;
  3) clicar no **"+N"**.
  Esperado no passo 1: a célula do dia cheio tem **a mesma altura** das outras.
  As demais semanas **não** foram empurradas para fora da tela.
  Esperado no passo 2: o **N é quantos ficaram de fora**, e não o total. Com 8
  itens e 3 visíveis, o botão diz **"+5"** — um "+8" mandaria procurar oito
  itens dos quais três já estão à vista.
  Esperado no passo 3: abre um painel com o **dia inteiro**, todos os itens.
  Fase de origem: F-3

- [ ] **219. O estado vazio tem FRASE PRÓPRIA — e não é uma grade muda**
  Pré-condição: `npm run seed:fresh`, e então navegar até um mês **sem nada**
  (dois ou três anos à frente).
  **▶ ONDE IR.** **Agenda**.
  Passos:
  1) navegar até um mês vazio, nas **duas** vistas;
  2) reparar no que aparece **enquanto carrega**, num mês qualquer (recarregue
     a página para ver).
  Esperado no passo 1: **"Nenhum compromisso em março/2029"** — com o **nome do
  mês**, e um botão para criar. Não uma grade em branco.
  Esperado no passo 2: enquanto carrega aparece o **indicador de carregamento**,
  e não a grade vazia. **Grade vazia e grade carregando são indistinguíveis, e
  a segunda faz esperar por algo que não vem** (regra do passo 116).
  Sem o nome do mês, a advogada não sabe se está vendo o mês que pediu.
  Fase de origem: F-3

- [ ] **220. ⭐ A virada de MÊS e de ANO, sem perder a vista escolhida**
  Pré-condição: `npm run seed:fresh`. O passo não depende de dado nenhum em
  especial — a virada de mês e de ano é de navegação —, mas declara o seed
  como todos os outros, para o roteiro poder ser rodado do início ao fim sem
  que ninguém precise decidir onde resetar.
  **▶ ONDE IR.** **Agenda**.
  Passos:
  1) escolher a vista **Agenda**;
  2) clicar em **›** cinco vezes seguidas;
  3) navegar de **dezembro** para **janeiro** (e de janeiro para dezembro, com
     **‹**);
  4) usar o **"voltar" do navegador**;
  5) clicar em **Hoje**.
  Esperado no passo 2: a vista **continua sendo Agenda**. Ela não volta para a
  grade a cada mês.
  Esperado no passo 3: o **ano** vira junto — dezembro/2026 → janeiro/**2027**,
  e janeiro/2027 → dezembro/**2026**. A grade de dezembro mostra os primeiros
  dias de janeiro esmaecidos, e vice-versa.
  Esperado no passo 4: o "voltar" **desfaz a navegação de mês**, uma de cada
  vez. É o que alguém espera depois de clicar cinco vezes em ›.
  Esperado no passo 5: volta para o mês corrente, e o **dia de hoje está
  visualmente distinto** — com contorno próprio, mesmo que não tenha
  compromisso nenhum.
  Fase de origem: F-3

- [ ] **222. ⭐ O compromisso COM HORA, e o compromisso do dia inteiro**
  Pré-condição: `npm run seed:fresh`, e então **criar os dois compromissos**
  que o passo compara — um **com hora** e um **de dia inteiro** —, em vez de
  procurar no que o seed deixou.
  **▶ ONDE IR.** **Agenda**.
  Passos:
  1) criar dois compromissos no **mesmo dia**: um **com hora** (14:30) e um
     **sem hora**;
  2) olhar a ordem deles na vista **Agenda**;
  3) conferir a hora exibida.
  Esperado no passo 2: o **sem hora vem primeiro**. "Sem hora" é o compromisso
  do dia inteiro, e pô-lo depois do das 14h30 sugeriria que ele acontece à
  noite.
  Esperado no passo 3: **14:30**, exatamente o que foi digitado — a hora é
  **hora de parede do escritório** e não se converte.
  Conferir também: o **vencimento de parcela nunca tem hora**, e cai no grupo
  do dia inteiro. Um vencimento é o dia todo.
  Fase de origem: F-3

- [ ] **223. ⭐ 🚨 O sino conta certo, e SOME no zero**
  Pré-condição: `npm run seed:fresh`. O seed deixa **dois compromissos de
  hoje**, **um atrasado**, **um concluído no passado** e as parcelas do
  financeiro.
  **▶ ONDE IR.** O **sino** no canto superior direito do cabeçalho, em
  qualquer tela.
  Passos:
  1) conferir o **número** no badge;
  2) clicar no sino e conferir as **três seções**: *Hoje*, *Atrasados*,
     *Parcelas vencidas*;
  3) somar as três à mão e comparar com o badge;
  4) procurar o compromisso **concluído** nas listas;
  5) **concluir** um dos compromissos de hoje (Agenda → abrir → *Marcar como
     concluído*) e voltar ao sino;
  6) **fechar e reabrir** o sino, várias vezes.
  Esperado no passo 3: o badge é **exatamente a soma das três**.
  Esperado no passo 4: **o concluído NÃO está lá.** É a linha que faz o número
  significar alguma coisa.
  Esperado no passo 5: o número **baixou em um**. Resolver o item é o que baixa
  a contagem.
  Esperado no passo 6: o número **não muda** por abrir. Não há "marcar como
  lido" — um contador que só zera com clique treina a pessoa a zerar sem olhar,
  e aí ele deixa de significar qualquer coisa.
  **🚨 O QUE NÃO PODE ACONTECER:** o badge aparecer com **"0"** quando não há
  nada pendente. Um badge com zero ocupa o mesmo espaço e a mesma cor de um
  badge que significa alguma coisa, e a pessoa aprende a ignorar os dois.
  Para conferir o zero: concluir **todos** os compromissos de hoje e os
  atrasados, e quitar (ou não ter) parcela vencida. **O badge tem de sumir por
  inteiro** — não ficar cinza, não ficar com zero. **Se aparecer "0", é
  reprovação.**
  Conferir também em **360 px**: o painel do sino cabe na tela, sem sair pela
  esquerda.
  Fase de origem: F-3

- [ ] **224. O sino leva ao lugar certo, e NÃO pede permissão de notificação**
  Pré-condição: `npm run seed:fresh`, **e este passo antes do 223** — ou um
  `seed:fresh` novo depois dele. O seed entrega as três seções cheias (dois
  compromissos de hoje, um atrasado, e as parcelas vencidas do financeiro);
  o passo **223 conclui e quita itens**, e ao terminá-lo o sino pode já não
  ter mais um item de cada tipo. **É a ordem que garante a pré-condição, e
  por isso ela está escrita aqui.**
  **▶ ONDE IR.** O **sino**.
  Passos:
  1) clicar num item da seção **Hoje**;
  2) voltar, clicar numa **parcela vencida**;
  3) reparar se o navegador pediu **permissão para notificações** em algum
     momento desde o login.
  Esperado no passo 1: abre o **compromisso**.
  Esperado no passo 2: abre a **parcela** — o mesmo destino do calendário.
  Esperado no passo 3: **nenhum pedido de permissão.** Web Push está **fora**
  desta fase (decisão do Daniel, 24/08/2026): aviso é sino com contador
  **dentro** do sistema. Notificação no celular com o app fechado exigiria
  service worker novo, permissão e chaves VAPID.
  **Se o navegador pedir permissão de notificação, é reprovação** — significa
  que entrou código que a fase excluiu por escrito.
  Fase de origem: F-3

- [ ] **225. ⭐ A linha do tempo do processo — e o financeiro que NÃO está nela**
  Pré-condição: `npm run seed:fresh`, e então **mudar a fase de um processo**
  agora, pelo **⋮ → Gerenciar → "Andamento do processo"** — o passo precisa
  de pelo menos uma mudança gravada. Mude aqui mesmo, sem contar com o passo
  **205**: o seed nasce com `fase` preenchida e `historicoFase` **vazio**, e
  um passo que dependa de outro ter rodado quebra quando o roteiro é feito
  fora de ordem.
  **▶ ONDE IR.** **Processos** → **⋮ → Gerenciar** num processo com honorário
  → rolar até **"Linha do tempo"**, **abaixo** da ficha financeira.
  Passos:
  1) conferir as entradas, de cima para baixo;
  2) achar a marca de **"hoje"**;
  3) procurar, na linha do tempo, qualquer coisa de **dinheiro**;
  4) clicar num compromisso listado.
  Esperado no passo 1: em **ordem de data**, com quatro tipos distinguíveis:
  **Fase** (de → para, com o motivo quando houver), **Encerramento**,
  **Liminar** e **Compromisso**. A primeira entrada diz *"Processo cadastrado
  em Fase de conhecimento"* — é o **nascimento**, e sem ele um processo criado
  direto em "execução" pareceria sempre ter estado lá.
  Esperado no passo 2: uma **linha tracejada** atravessando a régua, escrita
  **"hoje"**. Os compromissos **futuros** ficam **abaixo** dela, esmaecidos e
  com marca tracejada.
  Esperado no passo 3: **nada.** Nenhum honorário, nenhuma parcela, nenhum
  pagamento, nenhum valor em reais.
  Esperado no passo 4: abre o compromisso.
  **Por que o financeiro não entra, e é decisão:** o extrato do honorário
  responde outra pergunta — "quanto foi cobrado, quanto entrou, o que voltou" —
  e já a responde bem. Cinco entradas de fase somem debaixo de quarenta linhas
  de um plano parcelado em doze. **A ficha financeira continua na mesma página,
  em seção própria, logo acima.**
  Por que só olho humano: a suíte prova que o serviço não importa nenhum model
  financeiro e que nenhum valor vaza na resposta. O que ela não prova é se a
  régua **se lê como tempo** — se o olho encontra o "hoje" sem percorrer a
  lista.
  Fase de origem: F-3


## 35. Fase F-4 — o campo que sugere, e o painel que diz o que fazer

> **A fase tem uma regra só, e ela é o passo 227.** O campo **SUGERE, NÃO
> OBRIGA**. Autocomplete que recusa valor fora da tabela trava trabalho real no
> dia em que a tabela está desatualizada — e ela vai estar: as quatro tabelas
> são de **22/08/2026** e envelhecem sozinhas a partir daí. O TJPR cria comarca,
> a CBO ganha ocupação, o CNJ muda assunto.
>
> **Grava-se o TEXTO**, exatamente como está na tabela. Não há campo de código,
> nada foi migrado, e `{{comarca}}` continua sendo texto. O que a fase resolve é
> a divergência de grafia **daqui em diante** — "Ponta Grossa", "ponta grossa",
> "PG" —, e não o que já está gravado.
>
> ⚠️ **A tabela do CNJ veio de dump de terceiro**, não do SGT oficial, que
> estava bloqueado. A ressalva está no `RELATORIO.md` do Davi, ao lado dos
> arquivos em `public/tabelas/`.
>
> **Pré-condição de 226 a 234:** `npm run seed:fresh`.
>
> **Vara ficou de FORA de propósito** — a lista varia por comarca, muda com
> frequência e não foi coletada. Continua texto livre, e não é defeito.

- [ ] **226. ⭐ A comarca sugere SEM ACENTO, e se escolhe PELO TECLADO**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** Menu lateral → **Processos** → **Novo processo** → campo
  **Comarca**.
  Passos:
  1) digitar **`sao jose`** — tudo minúsculo, sem acento nenhum;
  2) conferir a lista que abre;
  3) **sem tocar no mouse**, descer com **↓** até *São José dos Pinhais*;
  4) apertar **Enter**;
  5) digitar de novo, agora **`GROSSA`** em maiúsculas, e escolher com o mouse;
  6) abrir a lista outra vez e apertar **Esc**.
  Esperado no passo 2: *São José dos Pinhais* aparece — **acentuada e com as
  maiúsculas certas**, como está na tabela do TJPR. Se digitar sem acento não
  achar, o campo não serve para nada: ninguém digita "ã" com pressa.
  Esperado no passo 3: o item destacado **anda com a seta**, e o destaque é
  visível. A lista **rola junto** se o item sair da área visível.
  Esperado no passo 4: o campo fica com **"São José dos Pinhais"**, escrito
  exatamente como na tabela, e a lista fecha. **O Enter NÃO pode salvar o
  formulário** enquanto havia item escolhido na lista.
  Esperado no passo 5: `GROSSA` acha **Ponta Grossa** — casa **no meio da
  palavra**, e não só no começo.
  Esperado no passo 6: **Esc fecha a lista e o texto digitado FICA no campo.**
  Esc que apaga o que se digitou é reprovação do passo.
  Conferir também que **a lista nunca passa de oito itens** — digitar apenas
  `a` não pode despejar 161 comarcas na tela.
  Por que só olho humano: a suíte prova o filtro (sem acento, sem caixa, no
  meio, com teto) como função pura, e prova que as teclas estão tratadas. O que
  ela não prova é se **o destaque é visível** e se a lista cobre o campo
  seguinte.
  Fase de origem: F-4

- [ ] **228. ⭐ Profissão pela CBO, e a nacionalidade FLEXIONADA pelo sexo**
  Pré-condição: `npm run seed:fresh`. **A procuração é quem lê isto** —
  *"brasileira, casada, professora"*.
  **▶ ONDE IR.** Menu lateral → **Clientes** → **Novo cliente** → **Pessoa
  física**.
  Passos:
  1) **sem escolher o sexo ainda**, digitar `brasil` no campo **Nacionalidade**;
  2) escolher **Sexo: Feminino**;
  3) digitar `brasil` de novo em Nacionalidade;
  4) trocar para **Sexo: Masculino** e digitar `brasil` mais uma vez;
  5) no campo **Profissão**, digitar `advog`;
  6) digitar `medico hematologista` — sem acento.
  Esperado no passo 1: aparecem **as duas formas** — *brasileiro* e
  *brasileira*. Sem sexo escolhido o sistema **não decide por ela**. Deve haver
  uma dica dizendo que escolher o sexo faz a sugestão vir já flexionada.
  Esperado no passo 3: sugere **`brasileira`**, e **não** `brasileiro`.
  Esperado no passo 4: sugere **`brasileiro`**.
  Esperado no passo 5: aparecem ocupações da CBO com "advog" no nome.
  Esperado no passo 6: acha **Médico hematologista** — acentuado na tabela,
  achado sem acento.
  **A nacionalidade continua UM campo de texto**, como sempre foi. O que mudou
  é a sugestão. Se a tela passar a ter **dois campos** de nacionalidade, ou se
  a geração de documento começar a flexionar sozinha, alguém mexeu no modelo —
  e isso **não foi feito nesta fase, de propósito** (ver o relatório da F-4).
  Por que só olho humano: a suíte prova a flexão pelo sexo como função pura. O
  que ela não prova é se a dica aparece na hora certa e se a troca de sexo
  **atualiza a sugestão** sem limpar o que já estava escrito.
  Fase de origem: F-4

- [ ] **229. ⭐ A classe e o assunto do CNJ no processo**
  Pré-condição: `npm run seed:fresh`.
  ⚠️ **Leia antes:** a fase pediu um campo **Assunto** alimentado pela tabela de
  assuntos do CNJ, e mandou **não tocar no backend**. `Process` **não tem**
  campo `assunto`, e criá-lo seria schema, lista de campos permitidos,
  validação e testes no servidor. O assunto foi então para o campo **`area`**,
  que já existia e guarda a mesma coisa — os assuntos de primeiro nível do CNJ
  são literalmente *"DIREITO TRIBUTÁRIO"*, *"DIREITO PREVIDENCIÁRIO"*, que é o
  que a advogada hoje digita à mão como "Tributario". **É decisão registrada**,
  não descuido. Ver o relatório da F-4.
  **▶ ONDE IR.** **Processos** → **Novo processo**.
  Passos:
  1) no campo **Tipo de Ação (classe do CNJ)**, digitar `embargos`;
  2) escolher um item pelo teclado;
  3) no campo **Área / assunto (CNJ)**, digitar `tributar`;
  4) escolher um item;
  5) salvar e reabrir o processo.
  Esperado no passo 1: aparecem classes do CNJ — *Embargos de Declaração* entre
  elas.
  Esperado no passo 3: aparecem assuntos do CNJ — *DIREITO TRIBUTÁRIO* entre
  eles.
  Esperado no passo 5: os dois valores gravados **em texto**, exatamente como
  na tabela.
  Conferir também que **Vara continua texto livre, SEM sugestão** — ficou de
  fora de propósito, porque a lista varia por comarca e não foi coletada.
  Ausência de sugestão na Vara **não é defeito**; sugestão na Vara **é**.
  Por que só olho humano: a suíte prova que os campos usam o componente e que
  as tabelas carregam. O que ela não prova é se o nome do CNJ, que é longo e
  todo em maiúsculas nos níveis de cima, **cabe e se lê** no campo.
  Fase de origem: F-4

- [ ] **230. ⭐ 🚨 A TELA ABRE SEM ATRASO — a tabela do CNJ não trava o formulário**
  Pré-condição: `npm run seed:fresh`. **É a Parte 1 da fase inteira, e ela só
  se vê aqui.** A tabela do CNJ tem **674 KB**.
  **▶ ONDE IR.** DevTools → aba **Network**, filtro em **Fetch/XHR** e em
  **Doc/Other**. Depois: **login**, **Dashboard**, **Financeiro**,
  **Processos → Novo processo**.
  Passos:
  1) com o Network aberto e **limpo**, fazer login e olhar o dashboard;
  2) passar por **Financeiro** e por **Clientes**;
  3) conferir a lista de requisições;
  4) abrir **Processos → Novo processo** e **não tocar em nenhum campo**;
  5) **clicar no campo Comarca**;
  6) **clicar no campo Tipo de Ação**;
  7) clicar em **Área / assunto** logo em seguida.
  Esperado nos passos 1 a 3: **nenhuma requisição a `/tabelas/*.json`.** Login,
  dashboard, financeiro e clientes **não** baixam tabela nenhuma. 🚨 Se
  `classes-assuntos-cnj.json` aparecer aqui, os 674 KB voltaram para o caminho
  de toda tela — é **reprovação do passo**.
  Esperado no passo 4: **ainda nenhuma.** Abrir o formulário não basta; é o
  **uso do campo** que dispara.
  Esperado no passo 5: baixa **`comarcas-pr.json`** (12 KB) — e **só ele**.
  Esperado no passo 6: baixa **`classes-assuntos-cnj.json`**. O formulário
  **não congela** enquanto isso: dá para continuar digitando nos outros campos,
  e o campo mostra que está carregando.
  Esperado no passo 7: **nenhuma requisição nova.** Classe e assunto vêm do
  mesmo arquivo, e ele já está em memória — **um download, não dois**.
  Conferir também, voltando ao formulário uma segunda vez na mesma sessão: **as
  tabelas não são baixadas de novo**.
  Por que só olho humano: a suíte prova pelo build que nenhuma tabela está
  dentro dos chunks. O que ela não prova é o **atraso percebido** — se o campo
  demora a ficar útil no primeiro clique, num computador comum.
  Fase de origem: F-4

- [ ] **231. ⭐ Os blocos do painel abrem, fecham, e a escolha é LEMBRADA**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** **Dashboard**.
  Passos:
  1) olhar quais blocos estão **abertos** e quais estão **fechados** ao chegar;
  2) fechar **"Precisa de atenção"** e abrir **"Resumo Geral"**;
  3) navegar para outra tela e **voltar**;
  4) **recarregar a página** (F5);
  5) fechar e abrir um bloco **só pelo teclado** — Tab até o cabeçalho, depois
     **Enter** e **espaço**.
  Esperado no passo 1: **"Precisa de atenção", "No mês" e "Próximos
  vencimentos" ABERTOS**; **"Acumulado do escritório", "Resumo Geral" e
  "Distribuição por Status" FECHADOS**. O que exige atenção primeiro;
  estatística depois. Um painel que abre tudo obriga a rolar para achar o que
  importa.
  Esperado nos passos 3 e 4: **a escolha do passo 2 continua valendo.**
  Esperado no passo 5: o cabeçalho **recebe foco com Tab**, tem **anel de foco
  visível**, e responde **a Enter e a espaço** — porque é um botão de verdade.
  Conferir também que **cada bloco mostra a ação que ele sugere**: "Registrar
  pagamento" no de atenção, "Nova parcela" no do mês, "Ver honorários", "Ver
  processos" — e que **os botões têm aparência de botão** (se saírem como texto
  cru, faltou o CSS).
  Por que só olho humano: a suíte prova a ordem dos blocos, quais nascem
  abertos, e que a preferência sobrevive a `localStorage` bloqueado. O que ela
  não prova é se **a primeira olhada do dia cai no lugar certo**.
  Fase de origem: F-4

- [ ] **232. ⭐ 🚨 O PAINEL E O SINO DIZEM O MESMO NÚMERO**
  Pré-condição: `npm run seed:fresh`. **É o defeito que o passo 135 pegou uma
  vez** — dois números diferentes para a mesma coisa na mesma tela.
  **▶ ONDE IR.** **Dashboard**, com o **sino** visível no cabeçalho.
  Passos:
  1) ler a contagem do **sino** e abrir a lista dele;
  2) contar quantos itens há em **"Parcelas vencidas"**;
  3) ler a contagem ao lado de **"Precisa de atenção"** e a lista de vencidas
     dentro do bloco;
  4) ler a nota do cartão **"Total vencido"**, em "No mês";
  5) **registrar o pagamento** de uma parcela vencida, quitando-a;
  6) voltar ao dashboard e **recarregar**;
  7) reler os três lugares.
  Esperado nos passos 2, 3 e 4: **o mesmo número de parcelas vencidas nos
  três.** A contagem do bloco de atenção soma vencidas **e** as que vencem em
  7 dias, então ela pode ser maior — mas a **lista de vencidas** dentro dele e
  a nota do "Total vencido" têm que bater com o sino, item por item.
  Esperado no passo 7: **os três caíram juntos**, na mesma quantidade.
  🚨 **Qualquer divergência é reprovação**, mesmo de um. Não existe "arredonda
  diferente": os três leem a mesma lista, da mesma requisição.
  Conferir também que **as parcelas vencidas NÃO aparecem duas vezes** dentro
  do bloco de atenção — uma como vencida e outra como "vence nos próximos 7
  dias". As duas listas são disjuntas.
  Por que só olho humano: a suíte prova que painel e sino chamam a mesma função
  e a mesma rota, e que o painel não filtra por status por conta própria. O que
  ela não prova é o número **na tela**, depois de um pagamento real.
  Fase de origem: F-4

- [ ] **233. Os cartões do painel em 360 px — os três empilhados**
  Pré-condição: `npm run seed:fresh`, e janela (ou DevTools) em **360 px de
  largura**. **Fecha a pendência do passo 181.**
  **▶ ONDE IR.** **Dashboard**, com todos os blocos **abertos**.
  Passos:
  1) abrir os seis blocos;
  2) percorrer a página **de cima a baixo**;
  3) tentar **deslizar a página para o lado**.
  Esperado no passo 2: os cartões de **"No mês"**, de **"Acumulado do
  escritório"** e de **"Resumo Geral"** estão **os três em uma coluna só**,
  empilhados do mesmo jeito. Nenhum valor cortado, nenhum "R$" separado dos
  dígitos.
  Esperado no passo 3: **não desliza.** A página não tem rolagem horizontal
  nenhuma.
  Conferir também com um valor **grande** — se o seed não tiver, criar um
  honorário de **R$ 1.234.567,89**: era o valor comprido que estourava a
  trilha, porque `Intl` em pt-BR faz de "R$ 1.234.567,89" um token indivisível.
  Por que só olho humano: a suíte prova que a regra de uma coluna existe e que
  os três blocos usam a mesma grade. O que ela não prova é a **página em
  360 px**, que é onde o defeito aparecia.
  Fase de origem: F-4

- [ ] **234. A tabela que NÃO carrega, e o campo que continua servindo**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** DevTools → **Network** → **Offline** (ou bloquear
  `/tabelas/*`). Depois **Processos → Novo processo**.
  Passos:
  1) com a rede da tabela bloqueada, clicar no campo **Comarca**;
  2) ler o que a tela diz;
  3) **digitar uma comarca e salvar**;
  4) restaurar a rede, recarregar, e clicar no campo de novo.
  Esperado no passo 2: uma frase discreta dizendo que **não deu para carregar
  as sugestões** e que **pode digitar normalmente**. Sem tela de erro, sem
  toast vermelho, sem campo bloqueado.
  Esperado no passo 3: **salva.** Sugerir é serviço; falhar em sugerir não pode
  virar impedimento de cadastrar.
  Esperado no passo 4: **tenta de novo e funciona.** Uma falha de rede não pode
  condenar o campo a ficar mudo pelo resto da sessão.
  Por que só olho humano: a suíte prova que o erro não fica memoizado. O que
  ela não prova é se a mensagem **tranquiliza** em vez de assustar.
  Fase de origem: F-4


## 36. Fase F-5a — ler sem sinal

> **Pré-condição de toda a seção:** `npm run seed:fresh` e **dois usuários**
> cadastrados (a advogada do seed e um segundo, criado em `/registrar`). Sem o
> segundo usuário, o passo mais importante da fase não tem como ser executado.
>
> **Onde se olha o banco:** DevTools → **Application** → **Storage** →
> **IndexedDB** → **`lex-offline`** → as duas stores, `entradas` e `indice`.
> É a mesma gaveta onde o passo **140** confere o Cache Storage, uma prateleira
> ao lado — e são **dois lugares diferentes**, com o mesmo risco.
>
> **O modo offline** é DevTools → **Network** → **Offline** (ou, no Chrome,
> **Application → Service Workers → Offline**). Desligar o Wi-Fi de verdade
> também serve, e é o teste mais honesto dos dois.

- [ ] **235. ⭐ 🚨 O VAZAMENTO ENTRE USUÁRIOS — o passo que a fase inteira existe para ter**
  `[só olho humano]`
  Pré-condição: dois usuários, e o navegador **sem** o `lex-offline` (se
  existir, apague o banco pelo DevTools antes de começar).
  **▶ ONDE IR.** O sistema inteiro, e depois DevTools → Application → IndexedDB.
  Passos:
  1) entrar como o **usuário A** e **navegar de verdade**: Clientes, um cliente
     pelo "Ver", Processos, um processo pelo "Gerenciar", Honorários, Parcelas,
     Pagamentos, Financeiro e Agenda;
  2) abrir o DevTools e **conferir que há entradas** em `lex-offline` →
     `entradas`, e que **toda chave** começa com `lex-offline|u:<id do A>`;
  3) **sair** pelo menu (Sair / Logout);
  4) **sem fechar o navegador**, conferir o banco de novo;
  5) entrar como o **usuário B** e navegar por duas ou três telas;
  6) conferir o banco mais uma vez.
  Esperado no passo 2: as chaves carregam **o id do usuário A**. Nenhuma chave
  sem `u:`, nenhuma com `u:` vazio, nenhuma com `anonimo`, `comum` ou coisa
  parecida.
  Esperado no passo 4: **as duas stores VAZIAS.** O logout apaga — não marca
  como inválido, não expira, não esconde na leitura. 🚨 Se sobrar **uma
  entrada que seja**, é **reprovação da fase**, não observação do passo.
  Esperado no passo 6: só chaves com **o id do B**. **Nada do A.**
  🚨 **O que NÃO pode acontecer, em nenhum momento:** uma chave sem id de
  usuário; uma chave do A visível depois do login do B; conteúdo do A dentro de
  um registro do B. Qualquer um desses é o vazamento, e o vazamento é o que
  esta fase existe para impedir.
  Repetir uma variação: com A logado, **entrar direto como B** (sem passar pelo
  logout, pela tela de login) — o banco tem de ficar só com o B. É o caminho de
  quem senta no computador do escritório e troca de conta.
  Por que só olho humano: a suíte prova a montagem da chave, a escolha do que
  apagar e que o `logout` chama a limpeza. O que ela **não** pode fazer é olhar
  o IndexedDB de verdade — `node --test` não tem navegador, e a fase proíbe
  dependência nova. Este passo é a única prova de que o banco ficou vazio.
  Fase de origem: F-5a

- [ ] **236. ⭐ 🚨 SEM SINAL, A TELA DIZ DE QUANDO É O DADO**
  `[só olho humano]`
  Pré-condição: passo **235** feito (as telas precisam ter passado pela tela
  com sinal — guarda-se o que se consultou, não o banco inteiro).
  **▶ ONDE IR.** Clientes, Processos, Honorários, Parcelas, Pagamentos,
  Financeiro e Agenda, com o DevTools em **Offline**.
  Passos:
  1) **anotar a hora** em que cada tela foi carregada com sinal;
  2) pôr o DevTools em **Offline**;
  3) navegar pelas mesmas telas;
  4) ler o aviso no **topo** de cada uma.
  Esperado: a lista continua na tela — a mesma que ela viu — e acima dela a
  frase **"Sem conexão. Dados de hoje às HH:MM."**, com a hora do passo 1.
  Conferir também que o aviso aparece **em cada tela**, e não uma vez só no
  cabeçalho do sistema: a idade é **daquele dado**, e duas telas carregadas em
  horas diferentes têm idades diferentes.
  🚨 **O que NÃO pode acontecer:** a tela mostrar os dados **sem** o aviso.
  Dado guardado exibido como dado ao vivo é o defeito que a Parte 3 da fase
  existe para impedir — e é o que faz a advogada dizer um número errado ao
  cliente ao telefone.
  Por que só olho humano: a suíte prova a frase e o cálculo da idade, e prova
  que toda tela convertida renderiza o aviso. O que ela não prova é se o aviso
  **é visto** antes do número que ele qualifica.
  Fase de origem: F-5a

- [ ] **237. 🚨 A hora do aviso é a da ÚLTIMA ATUALIZAÇÃO, não a de agora**
  `[só olho humano]`
  Pré-condição: a mesma do **236**.
  Passos:
  1) carregar a tela de **Financeiro** com sinal e **anotar a hora do relógio**;
  2) **esperar dois ou três minutos** (ou mais — quanto mais, melhor);
  3) pôr em **Offline** e abrir a tela de novo;
  4) comparar a hora do aviso com a hora **atual**.
  Esperado: o aviso diz a hora do **passo 1**. Se ele disser a hora do passo 4,
  a tela está carimbando o dado guardado com a hora de agora — **é reprovação
  do passo**, e é a mentira exata que a fase proíbe.
  Conferir também a virada do dia, se houver oportunidade: um dado carregado
  ontem tem de aparecer como **"ontem às HH:MM"**, e não como "hoje".
  Por que só olho humano: a suíte prova o formato com instantes fixos. O que
  ela não pode fazer é **esperar** e comparar com o relógio da parede.
  Fase de origem: F-5a

- [ ] **238. ⭐ Os botões que gravam ficam desabilitados, COM o motivo ao lado**
  `[só olho humano]`
  Pré-condição: DevTools em **Offline**.
  **▶ ONDE IR.** Clientes, Processos, Honorários, Parcelas, Pagamentos, Agenda.
  Passos:
  1) olhar o botão do cabeçalho de cada listagem (**Novo Cliente**, **Novo
     Processo**, **+ Novo Honorário**, …);
  2) abrir o menu **⋮** de uma linha qualquer;
  3) tentar **clicar** nos itens que gravam.
  Esperado no passo 1: o botão **continua na tela**, atenuado, com a frase
  *"Sem conexão — você pode consultar, mas não registrar. Tente de novo quando
  o sinal voltar."* ao lado. **Ele não some** — botão ausente faz procurar;
  botão desabilitado com explicação ensina (DEC-053).
  Esperado no passo 2: "Editar", "Excluir", "Desativar", "Reativar" e
  "Estornar" aparecem desabilitados **com o motivo**.
  Esperado no passo 3: **nada acontece** — nenhum modal abre, nenhuma
  navegação, nenhum erro.
  Conferir também com o **teclado**: percorrer o menu com `Tab`. O item
  bloqueado **tem de receber foco** e ser anunciado como desabilitado — se ele
  for pulado, o motivo ficou invisível justamente para quem depende de leitor
  de tela, e isso é defeito.
  Por que só olho humano: a suíte prova que os arquivos passam o motivo e
  barram o clique. O que ela não prova é se a frase é **lida** e se o foco
  chega nela.
  Fase de origem: F-5a

- [ ] **239. 🚨 Nenhum formulário aceita envio que vai falhar**
  `[só olho humano]`
  Pré-condição: um formulário **aberto com sinal** (por exemplo,
  `/dashboard/clientes/novo`).
  Passos:
  1) com sinal, abrir o formulário e **preencher alguns campos**;
  2) **cair a conexão** (DevTools → Offline) com o formulário aberto;
  3) olhar o topo do formulário e o botão **Salvar**;
  4) clicar em **Salvar**;
  5) voltar o sinal e clicar em **Salvar** de novo.
  Esperado no passo 3: a frase da fase aparece **no topo do formulário**, e o
  botão fica anunciado como desabilitado.
  Esperado no passo 4: **nada é enviado e nada se perde** — os campos
  preenchidos continuam preenchidos, exatamente como estavam.
  Esperado no passo 5: salva normalmente, **com o que foi digitado no passo 1**.
  🚨 O que NÃO pode acontecer: o envio partir e voltar com erro de rede; o
  formulário limpar; um "Erro ao salvar" genérico aparecer. Deixar salvar para
  dar erro depois **perde o que foi digitado**, e é isso que a Parte 4 proíbe.
  Por que só olho humano: a suíte prova as três barreiras no código. O que ela
  não prova é que o texto digitado **sobrevive** ao clique recusado.
  Fase de origem: F-5a

- [ ] **240. ⭐ Ao voltar o sinal, a tela se atualiza SOZINHA**
  `[só olho humano]`
  Passos:
  1) com o DevTools em **Offline**, abrir uma listagem e ver o aviso;
  2) **sem tocar em nada na página**, voltar o Network para **Online**;
  3) esperar alguns segundos, olhando a tela.
  Esperado: o aviso **some sozinho** e a lista se refaz — sem recarregar a
  página, sem F5, sem clicar em "tentar de novo".
  Conferir também que o dado exibido depois é o **do servidor**: se alguma
  coisa mudou por outro caminho enquanto estava offline, é a versão nova que
  tem de aparecer.
  🚨 Se for preciso recarregar a página para o aviso sumir, é reprovação do
  passo: um aviso de "sem conexão" que permanece com conexão é pior que
  nenhum — ele ensina a advogada a ignorá-lo.
  Por que só olho humano: a suíte prova que o sinal é dependência do
  carregamento. O que ela não prova é que a transição acontece **sem gesto**.
  Fase de origem: F-5a

- [ ] **241. 🚨 NENHUM PDF, NENHUM DOCX, guardado no aparelho**
  `[só olho humano]`
  Pré-condição: com sinal, **baixar** um recibo em Pagamentos e um documento em
  PDF e em DOCX na tela de Documentos.
  Passos:
  1) baixar os três arquivos, com sinal;
  2) abrir DevTools → Application → IndexedDB → `lex-offline` → `entradas` e
     **percorrer as chaves e os valores**;
  3) pôr em **Offline** e abrir o menu **⋮** de um pagamento e de um documento.
  Esperado no passo 2: **nenhuma entrada** de PDF, DOCX ou binário. As chaves
  são de listagem e de detalhe (`r:clients`, `r:fees`, `r:process`…), e não há
  nada com `documents`, `download` ou conteúdo binário dentro.
  Esperado no passo 3: "Baixar recibo", "Baixar PDF" e "Baixar DOCX" aparecem
  desabilitados com a frase do **download** — *"o arquivo é gerado pelo servidor
  e não fica guardado neste aparelho"* —, que é **diferente** da frase da
  escrita, porque é outro motivo.
  Por que só olho humano: a suíte prova que binário é recusado e que a lista do
  que se guarda não tem documento nenhum. O que ela não prova é que **nada**
  entrou no banco durante um uso real.
  Fase de origem: F-5a

- [ ] **242. A tela que ela NUNCA abriu diz isso — e não "falha ao carregar"**
  `[só olho humano]`
  Pré-condição: um usuário **recém-criado**, que entrou e ficou na tela
  inicial, sem abrir mais nada.
  Passos:
  1) pôr o DevTools em **Offline**;
  2) abrir uma tela que nunca foi aberta com sinal (Agenda, por exemplo, num
     mês que nunca foi visitado);
  3) ler a mensagem.
  Esperado: a tela diz que **está sem conexão** e que **esta tela ainda não foi
  aberta com sinal neste aparelho**, e sugere tentar quando o sinal voltar.
  🚨 O que NÃO pode aparecer: "Falha ao carregar", "Erro de rede", "Network
  Error" ou uma tela vazia sem explicação. **Se o app sabe que está offline,
  ele diz isso.** Uma lista vazia sem aviso se lê como "não há nada", que é
  outra coisa — e é o pior dos dois erros.
  Conferir também numa tela **fora** das convertidas (Seções, por exemplo): a
  mensagem também tem de falar em falta de sinal, e não em falha genérica — é o
  interceptor que garante isso.
  Por que só olho humano: a suíte prova as duas mensagens e a decisão entre
  elas. O que ela não prova é **qual delas a tela mostra** em cada caso real.
  Fase de origem: F-5a

- [ ] **243. 🚨 O PORTAL DO CLIENTE não guarda NADA**
  `[só olho humano]`
  Pré-condição: um código de acesso de portal válido (passo **90** ou a entrega
  de acesso na tela do processo).
  **▶ ONDE IR.** `/portal`, **no navegador do cliente** (ou numa janela
  anônima, que é o mais próximo disso).
  Passos:
  1) entrar no portal como cliente e navegar pelo processo e pelos documentos;
  2) abrir DevTools → Application → **IndexedDB**;
  3) conferir também o **Cache Storage**.
  Esperado: **não existe** banco `lex-offline` — e, se existir por causa de um
  uso anterior do sistema da advogada no mesmo navegador, **nenhuma entrada
  nova** apareceu por causa do portal.
  A razão, e ela é de privacidade e não de desempenho: **o aparelho do cliente
  pode ser emprestado** (é o passo 93), e guardar dado jurídico nele é uma
  decisão que ninguém tomou. A F-5a **não toca no portal**, de propósito.
  Por que só olho humano: a suíte prova que nenhum arquivo do portal importa o
  espelho local. O que ela não prova é o que sobra no aparelho depois de um uso
  real.
  Fase de origem: F-5a

## Validado


> Passo **executado por olho humano e aprovado**, com data. Continua sendo
> verificação manual — só não está mais pendente. Não se apaga: daqui a três
> fases ninguém lembra o que foi verificado de fato.
>
> Isto **não é** a mesma coisa que `## Automatizado`. Lá o passo virou teste e
> nunca mais precisa de olho humano; aqui ele foi olhado uma vez, naquela
> versão do código, e uma mudança grande no assunto pede que volte à lista.

> **Sessão de 17/08/2026 — passos 1 a 89.** O Daniel percorreu a interface inteira
> das telas de cadastro, login, perfil, clientes, processos, seções, documentos
> (biblioteca, montagem, geração, texto final e listagem) e as cinco primeiras
> do portal. **81 passos passaram** e estão abaixo, ao lado do 78, validado em
> 30/07/2026. Três não entraram: os **4** e **12** REPROVARAM (achados V-1 e
> V-2, registrados no CLAUDE.md do frontend) e o **13** não foi executado — os
> três continuam na lista pendente, cada um com o motivo escrito no próprio
> passo.
>
> A validação dos passos **90 a 157 foi adiada conscientemente**. Dois prazos
> ficam registrados: o passo **85** (`NODE_ENV` do rate limit) é pré-voo de
> **toda** demonstração pública, e não vale "uma vez só" — está aqui como
> executado, não como resolvido para sempre; e os **90 a 98** precisam
> acontecer **antes de qualquer cliente real usar o portal**.
>
> **Os passos 155 a 157 (Fase F-1a.1) nasceram de um SMOKE TEST**, não do
> roteiro: o Daniel exercitou o Financeiro 2.0 à mão em 17/08/2026, na main
> mergeada, e achou quatro defeitos que as duas suítes não pegavam. Os três
> passos novos são o que impede cada um de voltar sem ninguém notar.
>
> **Duas verificações daquele smoke test continuam PENDENTES** e não têm passo
> próprio ainda, porque dependem de tela que a F-1b vai redesenhar:
>
> | | O quê | Por que ainda aberta |
> |---|---|---|
> | **S-5** | os cartões do dashboard, com os números da DEC-040 | o painel muda na F-1b; validar agora seria validar duas vezes |
> | **S-7** | a imutabilidade do pagamento **na tela** — que o formulário de edição não oferece valor, data nem forma | o fluxo de estorno, que é o caminho alternativo que a tela precisa oferecer, é da F-1b |
>
> As duas estão registradas no `CLAUDE.md` como pendência de verificação
> manual do Daniel. Não são defeitos conhecidos: são verificações não feitas, e
> a diferença está escrita para ninguém as tomar por validadas.

> **Sessão de 19/08/2026 — passos 165 a 171 (Fase F-1b.2).** Os sete passaram.
> Três deles produziram trabalho na F-1b.3, e as anotações que o originaram
> ficam preservadas no corpo de cada passo abaixo, palavra por palavra:
>
> | Passo | O que ele previu | O que virou |
> |---|---|---|
> | **165** | "a correção é a linha dizer o que é" | a DEC-044 passou na leitura humana: somando só as alocações vivas, o total fecha. **Nada mudou na F-1b.3** — o extrato ficou como está, e o agrupamento por operação não entrou |
> | **166** | "se os seis caracteres não servirem para casar as linhas na tela, eles são ruído e a decisão precisa ser revista" | **DEC-045**: os dois pagamentos saíram `#e66b7a` e `#e66b7c`, diferindo no ÚLTIMO caractere. A referência passou a ser **valor e forma**; o id continua, como desempate |
> | **168** | a coluna de ações da listagem de pagamentos | o terceiro botão ("Editar") ficava **fora da tela**. As ações foram para um **menu de três pontos** (Parte 6 da F-1b.3) |
>
> O passo **167** (responsividade em 360/768/desktop) passou, mas **precisa ser
> reexecutado quando o novo desenho das páginas chegar** — ver a restrição de
> projeto registrada no `CLAUDE.md` do frontend.

> **Sessão de 22/08/2026 — passos 196 a 200 (Fase F-2b).** O Daniel percorreu
> a desativação e a reativação de processo e de cliente, o ciclo completo, e a
> guarda dos comandos destrutivos. **Quatro passaram** e estão abaixo.
>
> **O 197 NÃO passou, e continua na lista pendente.** Ele achou o que a F-2b
> não tinha fechado: era possível **reativar um processo cujo cliente estava
> desativado**, criando um órfão visível. A **DEC-053** (F-2c) fechou a regra
> nas duas bocas — reativar e criar sob pai inativo —, e o passo continua
> aberto até a revalidação, junto com os passos novos **201 a 204**.
>
> O motivo de o 198 estar aqui mesmo dependendo do 197: os dois foram
> executados, e o ciclo do 198 se comportou como previsto. O que falhou no 197
> é uma porta que o 198 não abre.

- [x] **1. Cadastro — assistente de duas etapas**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: deslogado.
  Passos: 1) abrir `/registrar`; 2) preencher a etapa 1 (nome, e-mail, senha,
  confirmação); 3) avançar; 4) preencher a etapa 2 (CPF, telefone, OAB,
  escritório, endereço); 5) enviar.
  Esperado: as duas etapas aparecem separadas, com o botão de voltar
  preservando o que já foi digitado.
  Fase de origem: 1

- [x] **2. Cadastro — máscaras de CPF, telefone e CEP**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: etapa 2 do cadastro aberta.
  Passos: digitar apenas dígitos em CPF, telefone e CEP.
  Esperado: CPF vira `000.000.000-00`, telefone vira `(00) 00000-0000`, CEP
  vira `00000-000`, enquanto se digita.
  Fase de origem: 1

- [x] **3. Cadastro — ViaCEP preenche o endereço**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: etapa 2 do cadastro aberta.
  Passos: digitar um CEP válido (ex.: `84010-330`) e sair do campo.
  Esperado: logradouro, bairro, cidade e UF chegam preenchidos; o foco vai
  para o número.
  Fase de origem: 1

- [x] **5. Cadastro leva direto ao sistema autenticado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: dados novos e válidos nas duas etapas.
  Passos: concluir o cadastro.
  Esperado: **não passa pela tela de login**. Cai em `/dashboard` já
  autenticada, com o nome no cabeçalho, e o toast diz "Conta criada com
  sucesso. Bem-vinda ao LEX!". Recarregar a página (F5) continua autenticada —
  o cookie `lex-token` foi emitido no cadastro.
  Fase de origem: 2D.1

- [x] **6. Login com o usuário do seed**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: deslogado.
  Passos: entrar com `demo@lex.dev` / `Lex123456`.
  Esperado: vai para `/dashboard`; o cabeçalho mostra o nome; F5 mantém a
  sessão.
  Fase de origem: 1

- [x] **7. Login com senha errada**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: entrar com `demo@lex.dev` e uma senha qualquer errada.
  Esperado: mensagem "Credenciais inválidas" — a mesma para e-mail
  inexistente, sem dizer qual dos dois falhou.
  Fase de origem: 1

- [x] **8. Sessão expirada redireciona**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: autenticada, em qualquer tela interna.
  Passos: apagar o cookie `lex-token` pelo DevTools e clicar em algo que
  chame a API.
  Esperado: toast "Sessão expirada" e volta para `/login`, sem tela quebrada.
  Fase de origem: 1

- [x] **9. Perfil — os 5 blocos**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir o perfil.
  Esperado: os cinco blocos aparecem preenchidos com os dados do seed —
  dados pessoais, OAB, escritório, endereço e segurança.
  Fase de origem: 1

- [x] **10. Perfil — salvar alterações**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: alterar o telefone e salvar.
  Esperado: toast de sucesso e o valor persiste após F5. O cabeçalho reflete a
  mudança na hora, sem recarregar.
  Fase de origem: 1

- [x] **11. Perfil — campo apagado grava de fato**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: apagar o conteúdo do Instagram (ou da chave PIX), salvar, dar F5.
  Esperado: o campo continua vazio depois do F5. Se voltar com o valor antigo,
  o backend ignorou a limpeza — que é exatamente o bug que a Fase 1.3 corrigiu.
  Fase de origem: 1

- [x] **14. Perfil — remover o logo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: ter um logo salvo (passo 13).
  Passos: remover o logo e salvar; dar F5.
  Esperado: a miniatura some e não volta depois do F5. O documento gerado
  depois disso continua baixando normalmente, com cabeçalho só de texto
  (conferir no passo 30).
  Fase de origem: 2C / 2D.1

- [x] **15. Cliente PF — cadastro completo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: criar um cliente pessoa física preenchendo todos os campos.
  Esperado: máscaras de CPF, telefone e CEP funcionando; ViaCEP preenchendo o
  endereço; salva e aparece na lista.
  Fase de origem: 1

- [x] **16. Cliente PJ — cadastro completo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: criar um cliente pessoa jurídica, com representante legal.
  Esperado: ao trocar para PJ o formulário troca os campos (razão social,
  nome fantasia, CNPJ com máscara `00.000.000/0000-00`, bloco de representante
  legal). Salva e aparece na lista.
  Fase de origem: 1

- [x] **17. Cliente — CPF duplicado destaca o campo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: cadastrar um cliente com um CPF que já existe.
  Esperado: erro 409 com mensagem clara e **o campo CPF destacado em
  vermelho** — não uma mensagem genérica no topo. Nada do que foi digitado se
  perde.
  Fase de origem: 1

- [x] **18. Cliente — campo apagado grava de fato**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: editar um cliente, apagar o RG (ou a profissão), salvar, dar F5.
  Esperado: o campo continua vazio depois do F5.
  Fase de origem: 1

- [x] **19. Cliente — busca**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: digitar parte de um nome no campo de busca.
  Esperado: a lista filtra sozinha depois de uma pausa curta (debounce), sem
  botão de buscar.
  Fase de origem: 1

- [x] **20. Cliente — excluir com processo ativo é recusado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: tentar excluir "Maria Aparecida Costa" (tem processo).
  Esperado: recusa com 409 dizendo quantos processos impedem. O cliente
  continua na lista.
  Fase de origem: 2B

- [x] **21. Processo — lista de participantes no formulário**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: criar processo novo.
  Passos: 1) abrir o formulário; 2) acrescentar dois clientes como
  participantes; 3) dar um papel a cada um (autor, litisconsorte...); 4)
  marcar um como principal; 5) salvar.
  Esperado: o seletor é uma **lista de participantes**, não um cliente único.
  O principal é escolhido por **rádio** — marcar um desmarca o outro. Salvar
  sem participante nenhum, ou sem principal, é barrado antes de chamar a API.
  Fase de origem: 2B *(reconstruído — ver nota no fim)*

- [x] **22. Processo — litisconsórcio visível na listagem**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir a lista de processos e localizar "Inventário e Partilha de
  Bens".
  Esperado: mostra o cliente principal seguido de **"+1"**, indicando que há
  outro participante.
  Fase de origem: 2B *(reconstruído)*

- [x] **23. Processo — detalhe mostra todos os participantes**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir o detalhe de "Inventário e Partilha de Bens".
  Esperado: seção com os dois participantes, cada um com nome, tipo de pessoa
  e papel; o principal aparece destacado.
  Fase de origem: 2B *(reconstruído)*

- [x] **24. Processo — código de acesso é buscado sob demanda e copiado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: no detalhe do processo, clicar no botão de código de acesso de um
  participante.
  Esperado: o código **não aparece antes do clique** (não vem na listagem).
  Ao clicar, aparece no formato `LEX-XXXX-XXXX` (13 caracteres) e é copiado
  para a área de transferência — colar em algum lugar confirma. Toast
  confirmando a cópia.
  Fase de origem: 2B *(reconstruído)*

- [x] **25. Processo — trocar o principal e remover participante**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) editar um processo com dois participantes; 2) marcar o outro como
  principal; 3) remover o que deixou de ser principal; 4) salvar.
  Esperado: salva sem erro. O backend recusa remover o principal enquanto
  houver outros, e a tela promove o novo **antes** de remover — se a ordem
  estiver errada, aparece um 409.
  Fase de origem: 2B *(reconstruído)*

- [x] **26. Seções — entrada no menu e lista**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "Seções" no menu lateral.
  Esperado: o item existe entre "Documentos" e "Perfil". A lista traz as 10
  seções do seed com título, tipo (badge), trecho inicial do texto e a
  contagem de variáveis.
  Fase de origem: 2D.1

- [x] **27. Seções — filtro por tipo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: escolher "Qualificação" no filtro de tipo.
  Esperado: sobram só as 3 seções de qualificação. Voltar para "Todos os
  tipos" traz as 10 de volta.
  Fase de origem: 2D.1

- [x] **28. Seções — busca por título, com e sem acento**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: digitar `qualificacao` (sem acento), depois `qualificação` (com).
  Esperado: **os dois** trazem as mesmas 3 seções. A lista filtra sozinha após
  uma pausa curta (debounce). `HONORARIOS` em maiúsculas também acha a
  cláusula de honorários.
  Fase de origem: 2D.1

- [x] **29. Seções — estado vazio útil**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: buscar por algo inexistente, ex.: `zzzz`.
  Esperado: **não é tela em branco** — traz texto explicativo e um botão
  "Limpar filtros" que devolve a lista completa.
  Fase de origem: 2D.1

- [x] **30. Seções — pré-visualização (modal)**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "Ver" numa seção que use variáveis (ex.: a de
  qualificação).
  Esperado: modal com título e tipo no topo; o texto aparece **cru**, em fonte
  monoespaçada, com as quebras de linha preservadas e as chaves `{{...}}`
  **destacadas em cor**, sem nada resolvido. O rodapé diz quantas variáveis o
  texto tem.
  Fase de origem: 2D.1

- [x] **31. Seções — o modal fecha por Esc, clique fora e prende o foco**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: modal de pré-visualização aberto.
  Passos: 1) apertar **Esc**; 2) reabrir e clicar **fora** do modal; 3)
  reabrir e apertar **Tab** várias vezes.
  Esperado: fecha nos dois primeiros. No terceiro, o foco **circula apenas
  dentro do modal** e não escapa para a página atrás. Ao fechar, o foco volta
  para o botão "Ver" que o abriu.
  Fase de origem: 2D.1

- [x] **32. Seções — criar seção com inserção de variável no cursor** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) "Nova Seção"; 2) título e tipo; 3) no texto, escrever
  `Eu, , portador do CPF.` ; 4) **clicar entre a vírgula e o espaço**, no meio
  da frase; 5) no painel da direita, clicar em "Nome completo" (grupo
  Cliente).
  Esperado: `{{nomeCliente}}` entra **exatamente onde o cursor estava**, não
  no fim do texto. O foco volta para o textarea com o cursor **logo depois**
  do que foi inserido — dá para continuar digitando sem clicar de novo.
  Fase de origem: 2D.1

- [x] **33. Seções — o seletor mostra nomes legíveis, não a chave**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: olhar o painel de variáveis.
  Esperado: cada item mostra em destaque o **rótulo em português**
  ("Nome completo", "CPF", "Estado civil"), abaixo a **descrição** dizendo de
  onde o dado vem, e só então a chave `{{...}}` em cinza e monoespaçada.
  **Não pode aparecer "Nome Cliente" ou "Cpf Cliente"** — se aparecer, o
  rótulo está sendo derivado da chave. Os grupos são "Cliente", "Processo",
  "Advogada e escritório", "Honorário" e "Sistema", com o total de 47 no topo.
  Fase de origem: 2D.1

- [x] **34. Seções — busca dentro do seletor de variáveis**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: digitar `cpf` no campo de busca do painel.
  Esperado: sobram as entradas de CPF (cliente, representante legal,
  advogada), agrupadas. Buscar por `extenso` acha "Valor por extenso".
  Fase de origem: 2D.1

- [x] **35. Seções — variável inexistente é recusada pelo backend**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: escrever `{{naoExiste}}` no texto e salvar.
  Esperado: erro 400 com a mensagem do backend dizendo que a variável é
  desconhecida. A tela apenas exibe — não inventa validação própria.
  Fase de origem: 2D.1

- [x] **36. Seções — título duplicado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: criar uma seção com um título que já existe.
  Esperado: erro 409 dizendo que já existe seção com esse título.
  Fase de origem: 2D.1

- [x] **37. Seções — editar**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: editar uma seção, mudar o texto e salvar.
  Esperado: volta para a lista com toast de sucesso; o trecho inicial na lista
  reflete o texto novo; a contagem de variáveis acompanha.
  Fase de origem: 2D.1

- [x] **38. Seções — desativar pede confirmação**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "Desativar" numa seção **não usada** por documento.
  Esperado: modal de confirmação nomeando a seção. Confirmando, ela sai da
  lista.
  Fase de origem: 2D.1

- [x] **39. Seções — desativar seção em uso é recusado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: tentar desativar uma seção que compõe um modelo (ex.: a de
  qualificação).
  Esperado: recusa com 409, e a mensagem **nomeia os documentos** que a usam.
  A seção continua na lista.
  Fase de origem: 2D.1

- [x] **40. Documento — download em PDF abre com acentuação correta**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: baixar um contrato gerado em PDF e abrir.
  Esperado: acentuação correta em "ação", "inventário", "cônjuge",
  "supérstite", "domiciliado(a)" e "nº" — sem quadradinhos nem letras trocadas.
  Margens de 2,5 cm, A4, corpo justificado, parágrafos preservados.
  Fase de origem: 2C

- [x] **41. Documento — timbrado com e sem logo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: baixar o mesmo documento **com** logo salvo no perfil e depois
  **sem** logo (passo 14).
  Esperado: com logo, ele aparece no cabeçalho. Sem logo, o cabeçalho usa só
  texto e continua bem diagramado — **sem buraco** no lugar da imagem.
  Fase de origem: 2C / 2D.1

- [x] **42. Documento — rodapé "página X de Y"**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: um documento com várias páginas (o contrato longo).
  Passos: abrir o PDF e conferir o rodapé em três páginas diferentes.
  Esperado: numeração correta e coerente em todas — não "página 1 de 1"
  repetido.
  Fase de origem: 2C

- [x] **43. DOCX abre no Word e no LibreOffice sem aviso de reparo** ⚠️
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: baixar o mesmo documento em DOCX e abrir **no Microsoft Word** e
  **no LibreOffice Writer**.
  Esperado: abre nos dois **sem caixa de diálogo de reparo/recuperação**, com
  o mesmo timbrado, as mesmas margens e a mesma acentuação do PDF.
  Por que só aqui: a estrutura OOXML foi validada por script, mas a abertura
  nos aplicativos reais nunca foi.
  Fase de origem: 2C

- [x] **44. Documento editado à mão baixa o texto editado**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: o seed marca um contrato como editado à mão.
  Passos: baixar esse documento.
  Esperado: o arquivo traz o **texto editado**, não o recomposto a partir das
  seções. Se o parágrafo acrescentado à mão sumir, a edição está sendo
  descartada.
  Fase de origem: 2C

- [x] **45. Documento com lacuna avisa mas não bloqueia**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir o documento que contém `[...]` e baixá-lo.
  Esperado: a tela avisa da lacuna, e **o download acontece mesmo assim** —
  lacuna é aviso, não impedimento.
  Fase de origem: 2C

- [x] **46. Geração com pendência é bloqueada e orienta**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: gerar documento para o processo "Usucapião de Imóvel Urbano"
  (a cliente Beatriz não tem profissão).
  Esperado: recusa com 422 apontando `{{profissaoCliente}}` e dizendo **onde
  preencher** ("no cadastro do cliente"). Não gera documento pela metade.
  Fase de origem: 2C

- [x] **47. Montagem — duas portas de entrada no menu**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: olhar o menu lateral, no grupo de Documentos.
  Esperado: existem **dois** itens novos entre "Documentos" e "Seções":
  **"Gerar documento"** e **"Montar modelo"**. Levam à mesma tela. Estando numa
  delas, **só a porta correspondente fica acesa** no menu — não as duas.
  Fase de origem: 2D.2

- [x] **48. Montagem — o modo MODELO fica visível o tempo todo** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) "Montar modelo"; 2) dar nome e tipo; 3) "Começar a montar";
  4) acrescentar uma seção; 5) rolar a tela.
  Esperado: o cabeçalho traz o selo **"Montando um MODELO"** e a faixa lateral
  dourada, e eles **continuam ali** depois de montar, não só na entrada. O
  subtítulo diz "reutilizável, sem processo e sem cliente". **Não aparece**
  painel de geração.
  Fase de origem: 2D.2

- [x] **49. Montagem — o modo DOCUMENTO fica visível o tempo todo** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) "Gerar documento"; 2) escolher um modelo da lista.
  Esperado: selo **"Montando um DOCUMENTO"**, faixa lateral verde, e o painel
  "Gerar o documento" no fim da tela. Em nenhum momento fica dúvida sobre qual
  dos dois modos está aberto.
  Fase de origem: 2D.2

- [x] **50. Montagem — canvas em A4 com timbrado e logo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: ter logo salvo no perfil (passo 13).
  Passos: abrir a montagem de um modelo com seções.
  Esperado: a folha é **branca nos dois temas** (é papel), em proporção A4, com
  margens visíveis de 2,5 cm. O cabeçalho traz o logo à esquerda e, à direita,
  nome do escritório, `Nome — OAB/UF nº`, endereço em uma linha e
  `telefone · e-mail`. Rodapé no pé da folha.
  Fase de origem: 2D.2

- [x] **51. Montagem — timbrado sem logo não abre buraco** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: **remover** o logo no perfil (passo 14).
  Passos: voltar à montagem.
  Esperado: o bloco de texto do timbrado passa a ocupar a **largura inteira**.
  **Não sobra espaço reservado** onde a imagem estava. Mesma regra da Fase 2C.
  Fase de origem: 2D.2

- [x] **52. Montagem — biblioteca com filtro e busca sem acento**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: na barra lateral, 1) escolher "Qualificação" no filtro; 2) limpar;
  3) digitar `qualificacao` sem acento; 4) digitar `qualificação` com acento.
  Esperado: o filtro deixa só as de qualificação; as duas buscas trazem o
  **mesmo** resultado. Cada miniatura mostra título, tipo e trecho inicial.
  Fase de origem: 2D.2 (reusa a busca da 2D.1)

- [x] **53. Montagem — inserir pelo botão "Adicionar"**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "Adicionar" numa miniatura.
  Esperado: a seção entra **no fim** do documento, numerada na sequência. O
  indicador mostra "salvando…" e depois "salvo às HH:MM:SS".
  Fase de origem: 2D.2

- [x] **54. Montagem — inserir arrastando da barra para a folha**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: **mouse** (o arrastar não dispara em toque — ver passo 55).
  Passos: arrastar uma miniatura e soltar **entre dois blocos** da folha.
  Esperado: uma faixa tracejada marca onde vai cair, e a seção entra
  **exatamente naquela posição**, não no fim.
  Fase de origem: 2D.2

- [x] **55. Montagem — inserir na posição por TOQUE, sem arrastar** ⚠️ ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **56. Montagem — soltar em posição ocupada empurra as demais**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: inserir uma seção na **posição 2**, com o documento já tendo 4 ou
  mais.
  Esperado: a nova fica na 2, e quem estava na 2 vai para a 3, e assim por
  diante. A numeração continua **1, 2, 3… sem repetir e sem pular**. O empurrão
  é regra do backend — a tela só mostra o resultado.
  Fase de origem: 2D.2

- [x] **57. Montagem — seção já usada aparece marcada e não entra de novo**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) olhar na barra lateral uma seção que já está na folha; 2) tentar
  arrastá-la.
  Esperado: a miniatura fica esmaecida, com o selo verde **"no documento"** em
  vez do botão "Adicionar", e **não é arrastável**. A restrição real é o índice
  único do banco; a tela só antecipa.
  Fase de origem: 2D.2

- [x] **58. Montagem — reordenar por ↑ e ↓**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em ↑ e ↓ na barra de um bloco.
  Esperado: o bloco troca de lugar, a numeração acompanha na hora, e o
  indicador vai a "salvando…" e volta a "salvo". O ↑ do primeiro bloco e o ↓ do
  último ficam **desabilitados**.
  Fase de origem: 2D.2

- [x] **59. Montagem — reordenar arrastando bloco na folha**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: mouse.
  Passos: arrastar um bloco pela folha e soltar em outra posição.
  Esperado: mesmo resultado do ↑/↓. O bloco arrastado fica translúcido durante
  o arraste.
  Fase de origem: 2D.2

- [x] **60. Montagem — remover bloco**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "Remover" num bloco.
  Esperado: sai da folha na hora, a numeração dos demais **fecha sem buraco**,
  e a miniatura correspondente **volta a ficar disponível** na barra lateral.
  Fase de origem: 2D.2

- [x] **61. Montagem — recarregar mantém a ordem**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: depois de montar e reordenar, dar **F5**.
  Esperado: a mesma sequência volta, na mesma ordem. Não há botão "Salvar" em
  nenhum momento — cada operação já persistiu.
  Fase de origem: 2D.2

- [x] **62. Montagem — rollback visível quando a rede falha** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) montar com 4 seções; 2) no DevTools, aba Network, marcar
  **Offline**; 3) clicar em ↓ num bloco; 4) observar.
  Esperado: o bloco **desce na hora** (atualização otimista) e em seguida
  **volta para o lugar de origem** — o rollback é visível. Aparece toast de
  erro, a faixa vermelha "não salvo — a ordem anterior foi restaurada" no
  cabeçalho, e a mensagem do erro abaixo. Voltando a rede, a próxima
  reordenação funciona normalmente.
  Fase de origem: 2D.2

- [x] **63. Montagem — cinco reordenações rápidas não embaralham** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em ↑/↓ **cinco vezes seguidas, o mais rápido que conseguir**,
  em blocos diferentes.
  Esperado: a ordem final na tela é exatamente a que se vê depois do último
  clique, e o **F5 confirma a mesma**. As chamadas são serializadas — se
  embaralhar, a fila não está funcionando.
  Fase de origem: 2D.2

- [x] **64. Geração — escolha de processo e do cliente com o papel**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) modo documento; 2) escolher o processo "Inventário e Partilha de
  Bens"; 3) abrir o seletor de cliente.
  Esperado: o seletor de cliente só habilita **depois** de escolher o processo,
  e lista os participantes com **nome — papel**, dizendo qual é o
  **(principal)** e o CPF/CNPJ. Processo com um participante só já vem
  escolhido; com dois, nenhum vem marcado.
  Fase de origem: 2D.2

- [x] **65. Geração — cliente PF gera**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: gerar a procuração de pessoa física para um cliente PF com cadastro
  completo (ex.: Joao Paulo Oliveira).
  Esperado: toast de sucesso e a tela vai para o **editor de texto final**.
  Fase de origem: 2D.2

- [x] **66. Geração — cliente PJ gera pela interface** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: escolher o modelo **"Procuração Ad Judicia — Pessoa Jurídica"**,
  processo com cliente PJ (ex.: Tech Solutions Brasil S.A.), e gerar.
  Esperado: gera. O texto final traz razão social, CNPJ, sede e o representante
  legal — **não** os campos de pessoa física.
  Por que importa: este caminho nunca havia sido exercitado pela interface.
  Fase de origem: 2D.2

- [x] **67. Geração — 422 mostra o RÓTULO, nunca a chave crua** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: gerar a procuração de pessoa física para **Beatriz Ramos Pereira**
  (o seed a deixa sem profissão de propósito).
  Esperado: bloco de aviso dizendo **"Falta um dado no cadastro"**, e o item
  traz em destaque **"Profissão"** — o rótulo — com a orientação
  **"Preencha «Profissão» no cadastro do cliente"**. A chave
  `{{profissaoCliente}}` aparece **discreta e por último**, em cinza. **Não pode
  aparecer JSON**, nem a chave no lugar do nome.
  Fase de origem: 2D.2

- [x] **68. Geração — escolha de honorário oferecida na própria tela** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: gerar o **"Contrato de Prestação de Serviços Advocatícios"** para
  "Indenizacao por Danos Morais" / Ana Lima Santos (o processo tem 2 honorários
  ativos).
  Esperado: bloco azul com a orientação do backend e a **lista de honorários
  para escolher**, cada um com valor, descrição, tipo e vencimento. Abaixo, a
  nota de que **"6 variáveis de honorário estão esperando esta escolha"** e que
  se resolvem sozinhas — elas **não** aparecem na lista de dados faltando.
  Escolhendo um e clicando em "Gerar com este honorário", gera.
  Fase de origem: 2D.2

- [x] **69. Geração — diálogo do 409 ao regerar texto revisado** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: ter um documento gerado e **editado à mão** (passo 70).
  Passos: 1) voltar à montagem no modo documento, mesmo modelo, mesmo processo
  e mesmo cliente; 2) gerar de novo.
  Esperado: **não gera direto.** Abre diálogo dizendo explicitamente que o
  texto revisado será **SUBSTITUÍDO** e que o documento atual **sai da lista**,
  com a data do atual. "Manter o texto revisado" cancela e nada muda.
  "Regerar e substituir" gera o novo — e o anterior desaparece da listagem.
  Fase de origem: 2D.2

- [x] **70. Texto final — editar e salvar marca "editado à mão"**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) abrir um documento gerado; 2) acrescentar um parágrafo no fim;
  3) "Salvar texto".
  Esperado: enquanto há mudança pendente aparece "alterações não salvas" e o
  botão habilita. Depois de salvar, toast de sucesso e o selo dourado
  **"editado à mão"** no cabeçalho. F5 mantém o texto novo.
  Fase de origem: 2D.2

- [x] **71. Texto final — seções de origem são rastreabilidade, não conteúdo** ⭐
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) no documento editado do passo 70, olhar o cartão "Seções de
  origem"; 2) ir a Seções e **editar o texto** de uma delas; 3) voltar ao
  documento e dar F5.
  Esperado: o cartão lista as seções na ordem, com um aviso dizendo que o texto
  **já não vem delas**. Depois de editar a seção, **o texto do documento não
  muda** — é isso que garante que a revisão dela não é descartada.
  Fase de origem: 2D.2

- [x] **72. Texto final — aviso de lacuna com contexto, sem bloquear**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir o documento que contém `[...]` (o seed cria um).
  Esperado: faixa amarela dizendo quantos trechos faltam preencher, cada um com
  o **rótulo**, a **linha** e o **trecho de contexto** ao redor. "ir até o
  trecho" leva o cursor até lá e o seleciona. O texto diz que é aviso, não
  impedimento — e **o download funciona** mesmo assim.
  Fase de origem: 2D.2 (a lacuna vem da 2C)

- [x] **73. Texto final — download em PDF pela interface**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "PDF".
  Esperado: o arquivo baixa com o nome vindo do servidor
  (`procuracao-nome-do-cliente-aaaa-mm-dd.pdf`), e o toast informa nome e
  tamanho. Abrindo, é o **texto editado** que está lá, com o timbrado.
  Fase de origem: 2D.2

- [x] **74. Texto final — download em DOCX pela interface**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: clicar em "DOCX".
  Esperado: mesmo comportamento, extensão `.docx`. Conferir a abertura no Word
  e no LibreOffice é o passo 43.
  Fase de origem: 2D.2

- [x] **75. Texto final — alternar a visibilidade no portal**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) clicar no botão de portal; 2) dar F5; 3) clicar de novo; 4) F5.
  Esperado: começa **"Oculto do portal"** (padrão desligado). Ligando, fica
  verde com "Visível no portal" e **persiste depois do F5**. Desligando,
  volta — e também persiste. O portal em si é a Fase 3; aqui só o interruptor.
  Fase de origem: 2D.2

- [x] **76. Documentos — a lista mostra só documentos gerados**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir a lista.
  Esperado: **nenhum modelo** aparece (modelo tem tela própria) e **não há
  coluna de arquivo nem link de URL** — upload está fora da interface. As
  colunas são Nome, Tipo, Processo, Gerado em, Situação e Ações. O tipo sai por
  extenso ("Procuração", "Contrato de prestação de serviços"), nunca o
  identificador cru.
  Fase de origem: 2D.2

- [x] **77. Documentos — selos de situação e download direto da lista**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: 1) localizar o documento editado à mão e um com portal ligado;
  2) clicar em "PDF" e em "DOCX" na linha.
  Esperado: os selos "editado à mão" e "no portal" aparecem na coluna Situação;
  os demais mostram "gerado". Os dois downloads funcionam **direto da lista**,
  sem precisar abrir o documento. "Abrir" leva ao editor de texto final.
  Fase de origem: 2D.2

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

- [x] **82. Aparência das telas depois da remoção das classes CSS**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **84. Aparência depois da correção do `ui-btn` e das remoções da 2E.2**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **85. ⭐🚨 BLOQUEANTE — a demonstração NÃO roda com `NODE_ENV=production`**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **86. Entrar no portal com o código ditado por telefone — minúsculas e
  com espaço** `[automatizável]`
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **87. Código errado e excesso de tentativas dizem coisas DIFERENTES**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **88. A troca de senha é inescapável** `[automatizável]`
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Pré-condição: entrar como **Ana Lima Santos**, senha provisória
  `Portal2026`.
  Passos: 1) entrar; 2) tentar ir a `/portal/processo` **pela barra de
  endereço**; 3) voltar e ler a explicação da tela de troca; 4) trocar a senha.
  Esperado: o passo 2 **cai de volta na tela de troca**, sempre. A tela
  explica em uma frase por que a troca é obrigatória. Depois de trocar, segue
  para o processo, e a senha antiga não serve mais.
  Fase de origem: 3.2

- [x] **89. Processo e documentos legíveis no celular** `[só olho humano]`
  **Validado em 17/08/2026 pelo Daniel. Passou.**
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

- [x] **155. O campo de busca não perde o foco ao digitar**
  **Validado em 17/08/2026 pelo Daniel. Passou.**
  Passos: abrir `/dashboard/clientes`, clicar no campo de busca e digitar um
  nome **inteiro, sem parar**, com pelo menos 8 letras. Repetir em
  `/dashboard/honorarios` e `/dashboard/processos`.
  Esperado: o cursor permanece no campo do começo ao fim, e o texto sai
  completo e na ordem. **Nunca** perder o foco no meio, nem precisar clicar de
  novo.
  Conferir também, no mesmo caminho: mudar o `<select>` de forma de pagamento
  em `/dashboard/pagamentos` e o de status em `/dashboard/parcelas` — o
  controle continua focado depois de a lista atualizar.
  Por que só olho humano: a suíte é `node --test` sem DOM e **não tem como ler
  `document.activeElement`**. `tests/regressions/f1a1.test.js` trava a CAUSA
  (nenhuma listagem com filtro pode ter `return <Loading/>` antecipado), e este
  passo fecha a outra metade. Inventar um teste de foco frágil seria pior.
  Fase de origem: F-1a.1

- [x] **157. A ficha do processo: dívida real, crédito nomeado, sem fantasma**
  **Validado em 17/08/2026 pelo Daniel. Passou.**

  > ── PROCESSO CORRIGIDO NA F-1a.2 ──────────────────────────────────────
  > A versão original mandava abrir o **"Processo Administrativo Tributario"**,
  > que tem **um honorário só** — os três casos juntos (crédito, reparcelamento
  > e dívida) estão na **"Ação de Cobrança de Dívida"**. Os valores esperados
  > abaixo são os que o seed produz de fato.

  Pré-condição: `npm run seed:fresh`.
  Passos: abrir a aba financeira do processo **"Ação de Cobrança de Dívida"**
  (tem os três casos juntos) e conferir, na tela:
  1) **"Honorários complementares — recurso administrativo"**: em aberto
     **R$ 0,00**, com o crédito **nomeado** na linha "Saldo adiantado:
     **R$ 500,00**" — nunca um valor negativo em lugar nenhum;
  2) o **"Em aberto" do processo é R$ 6.000,00**, e é a **soma** dos "em
     aberto" dos honorários (0,00 + 6.000,00; o de custas está cancelado e fica
     fora) — confira na calculadora;
  3) as parcelas **1 e 2** de **"Assessoria tributária — processo
     administrativo"** aparecem com o rótulo **"Reparcelada"**, **sem** o "em
     aberto", atenuadas, com a linha dizendo por qual operação saíram — e
     **com** valor e recebido à vista (a parcela 1 mostra recebido
     **R$ 1.500,00**).
  Por que só olho humano: o item 2 é a única verificação **independente** da
  soma. A tela não recalcula nada (decisão da 4.2), então um erro de soma do
  backend chegaria intacto — e foi assim que o defeito A-1 da F-1a.1 sobreviveu
  à suíte inteira da F-1a, com um teste que recomputava a mesma fórmula que
  estava errada.
  Fase de origem: F-1a.1 · processo e valores corrigidos na F-1a.2

> **Sessão de 18/08/2026 — passos 159 a 164 (Fase F-1b).** O Daniel executou os
> seis passos da seção 22 na main mergeada. **Os seis passaram**, e dois vieram
> com anotação sobre o que o passo NÃO media: o **159** (*"responsividade da
> tela não adequada"*) e o **163** (*"rever responsividade"*). As anotações
> estão no corpo dos passos, abaixo.
>
> Elas não contradizem o veredito. O 159 mede se o previsto e o realizado dizem
> a mesma coisa, e diziam; o 163 mede se os seis caminhos chegam à mesma
> página, e chegavam. O que não cabia era a tela em 360 px — LEX é PWA, e tela
> nova que não cabe em celular é defeito. Foi daí que nasceu a **F-1b.2**, com
> a varredura de responsividade das cinco telas da F-1b (passo **167**).

- [x] **159. ⭐ O preview bate com o realizado, depois de salvar**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  **Anotação do Daniel, registrada no ato:** *"responsividade da tela não
  adequada"*. O plano de alocação e o quadro de leitura do honorário
  estouravam a largura em tela estreita. Passou no que o passo mede (o
  previsto e o realizado dizem a mesma coisa) e reprovou no que ele não
  media. **Originou a Parte 3 da F-1b.2** e o passo **167**.
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos › Novo Pagamento**, escolher o honorário
  **"Assessoria tributária — processo administrativo"** (Agro Campos, em "Ação
  de Cobrança de Dívida") e digitar **5.000,00**. Antes de salvar, **anotar num
  papel** o que o bloco "O que vai acontecer" diz — parcela por parcela, valor
  por valor. Só então clicar em **Salvar**.
  Esperado: o bloco vira **"O que foi feito com o dinheiro"** e diz **a mesma
  coisa que estava no papel**: R$ 2.000,00 na parcela 3 (quita), R$ 2.000,00 na
  parcela 4 (quita) e R$ 1.000,00 na parcela 5 (abate parcialmente). A tela
  **não navega sozinha** para a listagem — o previsto e o realizado precisam
  poder ser comparados.
  Conferir também: enquanto o valor está incompleto (campo vazio, ou "0"), o
  bloco **não aparece de jeito nenhum** — nem como "R$ 0,00".
  Por que só olho humano: a suíte já prova que os dois planos são **iguais**
  (`tests/financial/f1b.test.js`, bloco 1 — é a asserção central da fase). O
  que ela não prova é que a advogada **reconhece** que são o mesmo plano quando
  os dois passam pela tela em momentos diferentes, com títulos diferentes. Se
  ela não reconhecer, o preview não serve para decidir — e decidir é para o que
  ele existe.
  Fase de origem: F-1b

- [x] **160. ⭐ Os vínculos do extrato se leem sem explicação**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Não execute o 159 antes deste** — ele
  acrescenta eventos ao mesmo honorário.
  Passos: abrir **Honorários**, clicar no nome **"Honorários advocatícios — fase
  inicial"** (o nome agora é link) e ler o bloco **Extrato** de cima para baixo,
  **sem consultar esta página**.
  Esperado: para cada linha, conseguir responder em voz alta **de onde aquilo
  veio**. O estorno diz de qual pagamento saiu e por quê; a alocação diz de qual
  pagamento veio e para qual parcela foi; a **desalocação** diz por qual estorno
  a parcela voltou a dever. Entradas de dinheiro e saídas têm faixa de cor
  diferente.
  Esperado também: a linha **"Mudança de status"** aparece **sem valor em
  reais** — nunca "R$ 0,00".
  Por que só olho humano: a suíte prova que a frase **contém** o vínculo
  (`f1b.test.js`, bloco 1). Não prova que a frase é **suficiente**: o extrato é
  a única tela do sistema que responde "por que este dinheiro voltou", e a
  resposta precisa caber na cabeça de quem lê sem ter o modelo de dados na
  frente. É a razão de o Financeiro 2.0 ter sido modelado com estorno,
  alocação e desalocação separados — se o extrato não comunicar isso, o modelo
  custou caro por nada.
  Fase de origem: F-1b

- [x] **161. O modal de estorno diz o efeito antes de confirmar**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, na linha do pagamento de **R$ 4.500,00** (Carlos
  Eduardo, divórcio litigioso — o que atravessa duas parcelas), clicar em
  **Estornar**. **Ler o quadro do efeito antes de tocar em qualquer campo.**
  Esperado: o campo de valor já vem preenchido com o **líquido restante**
  (R$ 4.500,00), o quadro diz **quais parcelas voltam a ficar em aberto**, e o
  botão só conclui com **motivo preenchido** — apagar o motivo e tentar salvar
  precisa recusar.
  Depois: **trocar o valor para R$ 1.000,00** e reler o quadro. Ele passa a
  falar em ordem ("da mais recente para a mais antiga") e **não afirma quanto
  sai de cada parcela** — isso é conta do backend, e a tela não a repete.
  Por fim: tentar estornar **R$ 9.000,00** (acima do líquido). A mensagem
  precisa dizer **o valor máximo em reais**, vindo do servidor.
  **Cancelar sem salvar** — o passo 162 precisa deste pagamento intacto.
  Por que só olho humano: o que se mede é se ela **entende o que vai
  acontecer** antes de mexer em dinheiro já registrado. Estorno não se desfaz
  apagando: desfaz-se com outro registro (a anulação), e por isso a hora de
  entender é antes.
  Fase de origem: F-1b

- [x] **162. A anulação pelo extrato, e a confirmação do efeito**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  Pré-condição: o passo **161 cancelado sem salvar**.
  Passos: registrar um estorno de verdade — na linha do pagamento de
  **R$ 4.500,00**, estornar **R$ 1.000,00** com motivo "teste de anulação".
  Depois abrir a página do honorário **"Honorários advocatícios — divórcio
  litigioso"** (pelo nome, na listagem de pagamentos) e olhar o **Extrato**.
  Esperado: aparecem as linhas novas — o **estorno** e a **desalocação** que
  ele causou —, e a linha do estorno tem o botão **"Anular estorno"**. Clicar
  nele: o texto precisa dizer, **por extenso**, que o valor **volta a ser
  considerado recebido e é realocado**, e que um estorno só se anula **uma
  vez**. Confirmar.
  Esperado depois: o "Recebido" do cabeçalho volta ao valor de antes, o extrato
  ganha a linha **"Anulação de estorno"**, e a linha do estorno original passa
  a dizer que **foi anulado**. Tentar anular de novo: o botão **não existe
  mais** naquela linha.
  Por que só olho humano: a anulação é a operação mais rara e a mais fácil de
  fazer por engano. A suíte prova as recusas (409 de anulação dupla); o que ela
  não prova é que a advogada **sabe o que está desfazendo** ao clicar.
  Fase de origem: F-1b

- [x] **163. A página do honorário é alcançável de todos os pontos**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  **Anotação do Daniel, registrada no ato:** *"rever responsividade"*. Os
  seis caminhos chegam à mesma página e a trilha encurta como o passo
  exige — o que não cabia era o resto da página do honorário em 360 px.
  **Originou a Parte 3 da F-1b.2** e o passo **167**.
  Pré-condição: `npm run seed:fresh`.
  Passos: chegar à página do honorário **"Assessoria tributária — processo
  administrativo"** partindo, uma de cada vez, de **cada um** destes seis
  lugares — sempre clicando no **nome do honorário**, sem usar o botão Voltar
  do navegador nem a URL:

  | # | De onde | O que clicar |
  |---|---|---|
  | 1 | **Honorários** (listagem) | o nome na coluna Honorário |
  | 2 | **Parcelas** (listagem) | o nome na coluna Honorário |
  | 3 | **Pagamentos** (listagem) | o nome na coluna Honorário |
  | 4 | **Processos › "Ação de Cobrança de Dívida" › aba financeira** | o nome do honorário na ficha |
  | 5 | **Início** (dashboard), lista de próximos vencimentos | o nome, **antes** do travessão |
  | 6 | **Pagamentos › Editar** um pagamento dele | o nome no quadro de leitura |

  Esperado: os seis caminhos chegam à **mesma página**. No dashboard e nas
  listagens de parcela, o nome e o **"— Parcela N"** levam a lugares
  **diferentes** (a cobrança e a parcela) — e isso precisa ficar claro ao
  passar o mouse.
  Esperado também: a **trilha** do topo diz **"LEX › Honorários › Assessoria
  tributária — processo administrativo"**, e não "Detalhe". Estreitando a
  janela para **360 px**, a descrição encurta com **reticências** e o bloco do
  usuário continua na tela.
  E: **não** apareceu item novo no menu lateral.
  Por que só olho humano: é a fase inteira em um passo. O ponto da F-1b é
  **reduzir cliques**, e clique se conta navegando — não há asserção estática
  que prove que o caminho existe *e* é óbvio. A suíte prova que os seis
  arquivos têm o link (`f1b.test.js`, bloco 5); só a navegação real prova que
  ele está **onde a mão vai**.
  Fase de origem: F-1b

- [x] **164. O pagamento estornado por inteiro não deixa buraco mudo**
  **Validado em 18/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, achar o pagamento de **R$ 2.500,00** de
  **Construtora Horizonte** que está **estornado por inteiro** (líquido zerado,
  em "Honorários advocatícios — fase inicial") e olhar a **coluna Ações**.
  Esperado: onde as outras linhas têm **"Baixar recibo"**, esta tem o texto
  **"estornado integralmente — sem recibo"**. Não pode haver **espaço em
  branco** no lugar do botão.
  Por que só olho humano: um vazio não se distingue de uma falha de
  carregamento. A suíte prova que o texto está no arquivo; o que se confere
  aqui é que ele **ocupa o lugar** e é lido como explicação, e não como rótulo
  solto de uma coluna quebrada.
  **Observação:** o **badge** "estornado integralmente" na coluna do valor é da
  **F-1b.2**, junto do resto do trabalho de listagem. Aqui basta o buraco não
  ser mudo.
  Fase de origem: F-1b

---

- [x] **165. ⭐ 🚨 O extrato se lê de cima a baixo sem dar um total que o sistema não reconhece**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. É o **caso que originou a DEC-044** —
  reproduza-o exatamente.
  Passos:
  1) em **Pagamentos**, na linha do pagamento de **R$ 4.500,00** (Carlos
     Eduardo, "Honorários advocatícios — divórcio litigioso"), clicar em
     **Estornar** e registrar **R$ 1.000,00**, motivo "teste da DEC-044";
  2) abrir a página do honorário pelo nome e, no **Extrato**, na linha do
     estorno, clicar em **Anular estorno** e confirmar;
  3) **pegar papel e caneta** e somar, de cima para baixo, **só o valor das
     linhas de Alocação**.
  Esperado: as linhas de alocação são **quatro** — R$ 3.000,00, R$ 1.500,00,
  R$ 500,00 e R$ 1.000,00 —, e a soma ingênua delas dá **R$ 6.000,00** para um
  pagamento de R$ 4.500,00. **Isso é o que a fase corrige, e a correção é a
  linha dizer o que é.** Conferir, uma a uma:
  - a de **R$ 1.500,00** está **atenuada**, com o **valor riscado**, e a frase
    diz **"Esta alocação foi desfeita em … pelo estorno de R$ 1.000,00 — não
    entra na soma."**;
  - a de **R$ 500,00** diz que **"É o que restou de uma alocação maior,
    desfeita pelo estorno de R$ 1.000,00 — não é uma alocação nova do dia do
    pagamento."** (ela aparece no dia **08/05**, junto das originais, e sem essa
    frase parecia que aquele dia alocou mais do que entrou);
  - a de **R$ 1.000,00** (a que a anulação criou, datada de hoje) diz **"Do
    pagamento de 08/05/2026"** — a data do **pagamento**, não a de hoje;
  - a **desalocação** de R$ 1.500,00 diz que aquele estorno **foi anulado
    depois** e que o valor voltou.
  Esperado, então: **somando só as alocações que NÃO estão marcadas como
  desfeitas, o total é R$ 4.500,00** — exatamente o pagamento. E o "Recebido"
  do cabeçalho diz o mesmo número.
  Por que só olho humano: a suíte prova que a soma das vivas é 4.500 e que toda
  desfeita tem marca (`tests/financial/f1b2.test.js`, backend, bloco 1). O que
  ela **não** prova é que quem lê **percebe a marca antes de somar**. A regra
  da DEC-044 é sobre leitura, e leitura só se verifica lendo. Se o Daniel somar
  6.000 de novo, a fase falhou mesmo com a suíte verde.
  Fase de origem: F-1b.2

- [x] **166. Dois pagamentos no mesmo dia se distinguem no extrato**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Pode ser feito depois do 165**, no
  mesmo honorário.
  Passos: em **Honorários**, abrir **"Honorários advocatícios — divórcio
  litigioso"** e registrar **dois pagamentos com a MESMA data** — R$ 300,00 em
  dinheiro e R$ 200,00 por PIX, ambos em **10/06/2026**. Voltar ao **Extrato** e
  achar as duas alocações que nasceram deles.
  *(É este honorário, e não outro: a parcela 2 dele ainda tem saldo em aberto,
  então os dois pagamentos viram **alocação**. Num honorário já quitado eles
  virariam saldo adiantado e não haveria linha de alocação para comparar.)*
  Esperado: as duas linhas de alocação **não dizem a mesma coisa**. As duas
  caem na **parcela 2** e no **mesmo dia**; antes desta fase as duas frases eram
  idênticas ("Do pagamento de 10/06/2026, aplicado na parcela 2."). Agora cada
  uma traz a data **e** uma referência curta entre parênteses — "Do pagamento de
  10/06/2026 (#52f195), aplicado na parcela 2." —, com **sufixos diferentes**.
  Conferir também: a referência é **o mesmo formato** que a linha do próprio
  pagamento exibe ("Pagamento #a1b2c3"), e dá para casar uma com a outra
  olhando.
  Por que só olho humano: a suíte prova que os sufixos **não colidem** e que as
  frases saem diferentes. O que ela não prova é que a advogada consegue
  **ligar** a alocação ao pagamento certo — que é a única razão de a referência
  existir. Se os seis caracteres não servirem para casar as linhas na tela,
  eles são ruído e a decisão precisa ser revista.
  Fase de origem: F-1b.2

- [x] **167. ⭐ As cinco telas da F-1b em 360 px, 768 px e desktop**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Este passo nasce das anotações do
  Daniel nos passos 159 e 163.**
  Como medir: no navegador, ferramentas de desenvolvedor → modo dispositivo →
  largura **360**, depois **768**, depois janela cheia. Em cada largura,
  percorrer as cinco telas abaixo.
  **A verificação que vale para todas:** *não pode existir barra de rolagem
  **horizontal da página***. Tabela larga rola **dentro do próprio container**
  (a mesma regra do passo 111) — isso é certo. A **página** rolando de lado é
  defeito.

  | # | Tela | Onde | O que olhar em 360 px |
  |---|---|---|---|
  | 1 | **Formulário de pagamento com preview** | Pagamentos › Novo, honorário "Assessoria tributária", valor 5.000,00 | o bloco "O que vai acontecer" ocupa a **largura inteira** (não uma coluna estreita); **nenhum valor em reais quebra no meio** ("R$ 3.0" numa linha e "00,00" na outra) |
  | 2 | **Página do honorário** | Honorários › "Honorários advocatícios — divórcio litigioso" | os **quatro números** (Contratado, Recebido, Em aberto, e Saldo adiantado quando houver) **empilham** um sob o outro em vez de espremer; nenhum trunca |
  | 3 | **Extrato** | o bloco Extrato da mesma página | o **valor desce para linha própria**, à esquerda ou abaixo — não espreme a descrição nem colide com ela |
  | 4 | **Modal de estorno** | na linha de um pagamento, "Estornar" | o modal **cabe na largura** (sem borda cortada); **tocando no campo de valor para o teclado virtual abrir**, os botões "Cancelar" e "Registrar estorno" continuam **alcançáveis** (rolando dentro do modal), e o **quadro do efeito continua legível** — ele é o ponto do modal |
  | 5 | **Modal de anulação** | no extrato, "Anular estorno" | o mesmo: cabe, rola, e o texto do efeito se lê inteiro |

  Esperado também: a **trilha** do topo encurta com reticências e o **bloco do
  usuário** continua na tela (é o que o 163 já exigia).
  E: navegando **só pelo teclado**, todo botão e campo que recebe foco mostra o
  **anel dourado** — nenhuma tela desta fase pode tê-lo perdido.
  Por que só olho humano: a suíte varre as **folhas** e prova que as regras
  existem — `auto-fit`/`minmax` no cabeçalho, `100dvh` no modal, `span-*`
  voltando à coluna única em 767 px, `overflow-wrap: break-word` no plano. Ela
  **não renderiza nada**: não há navegador, não há layout, não há teclado
  virtual. Largura que estoura, botão embaixo do teclado e texto ilegível são,
  por definição, o que só o olho vê.
  Fase de origem: F-1b.2

- [x] **168. Nenhuma coluna de dinheiro trunca, em nenhuma listagem**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: abrir, uma a uma, **Honorários**, **Parcelas** e **Pagamentos**, e ler
  **todas** as colunas que contêm "R$" — Valor, Valor base, Líquido, Recebido,
  Em aberto. Repetir com a janela em **1024 px** e em **1366 px**.
  Esperado: **nenhum valor termina em reticências.** O defeito nominal da fase
  era a coluna **Líquido** de Pagamentos exibindo "R$ 3.50…" e "R$ 1.20…" — ela
  precisa mostrar **R$ 3.500,00** por extenso. Conferir também as **datas**
  (Vencimento, Data, Quitação): "18/08/2026" inteiro, nunca "18/08/20…".
  Esperado, na coluna **Honorário** de Pagamentos e de Parcelas: as linhas
  **se distinguem**. Antes, quase toda linha dizia "Honorári…"; agora cada uma
  mostra o **trecho distintivo** ("divórcio litigioso", "usucapião urbano",
  "10% sobre o valor da causa"). Passando o mouse, o `title` traz a
  **descrição inteira**, com o prefixo.
  Conferir por último: se a tabela não couber, quem rola é **o container**, e
  quem cede largura é a coluna de **texto livre** (Processo, Aplicado em,
  Forma) — nunca a de número.
  Por que só olho humano: a suíte prova que nenhuma célula tem `cell-num` junto
  de `cell-truncate` e que as colunas de dinheiro usam `col-money`. Ela **não
  mede texto renderizado**: numa tabela `table-layout: fixed`, largura
  insuficiente trunca sozinha, sem classe nenhuma — foi exatamente assim que o
  defeito passou. Só medindo com a fonte real se sabe se 150 px bastam.
  Fase de origem: F-1b.2

- [x] **169. O badge "Estornado integralmente" cabe e explica**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, achar o pagamento de **R$ 2.500,00** de
  **Construtora Horizonte** (estornado por inteiro, em "Honorários advocatícios
  — fase inicial") e olhar a **coluna Líquido**.
  Esperado: abaixo do **R$ 0,00** aparece o badge **"Estornado integralmente"**,
  em vermelho, **quebrado em duas linhas** dentro da coluna — e **sem estourar
  a largura dela** nem cortar palavra. Na coluna **Ações** da mesma linha, onde
  as outras têm "Baixar recibo", há a nota **"sem recibo"**; o lugar **não fica
  vazio**.
  Conferir a diferença: numa linha de estorno **parcial**, o líquido aparece em
  **laranja** e **sem badge**. Os dois estados precisam se distinguir num
  relance — parcial é "parte do dinheiro voltou", integral é "o lançamento
  inteiro deixou de valer".
  Repetir em **360 px**: o badge continua legível dentro do container que rola.
  Por que só olho humano: a suíte prova que o rótulo sai do `statusVisual` e que
  a folha manda o badge quebrar linha. Se ele **cabe** em 150 px com a fonte
  real, e se a distinção laranja/vermelho é perceptível, só olhando.
  Fase de origem: F-1b.2

- [x] **170. O modal avisa antes de o servidor recusar**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, na linha do pagamento de **R$ 4.500,00**, clicar em
  **Estornar** e observar o **quadro do efeito** enquanto muda o valor:
  1) com o valor que já vem preenchido (**R$ 4.500,00**);
  2) trocando para **R$ 1.000,00**;
  3) trocando para **R$ 9.000,00**;
  4) **apagando o campo**.
  Esperado, na ordem: (1) quadro na cor de sempre, dizendo **"Estorno
  integral"**; (2) quadro na cor de sempre, falando em **ordem** ("da mais
  recente para a mais antiga") e **sem afirmar quanto sai de cada parcela**;
  (3) o quadro **muda de cor** (tom de aviso) e diz que **o valor passa do que
  ainda é estornável (R$ 4.500,00)** — **não** pode continuar dizendo "Estorno
  integral"; (4) o quadro volta ao normal, **sem alarme** — apagar para digitar
  outro número não é erro.
  Esperado ainda no caso (3): o botão **continua habilitado**. Clicando nele, é
  o **servidor** que recusa, com a mensagem dele e o limite em reais. A tela
  avisa, **não bloqueia** — quem decide o que é estornável é o backend, no
  instante do envio (padrão do passo 102).
  Por que só olho humano: a suíte prova as quatro frases e prova que o submit
  não ganhou condição de valor. O que ela não prova é que a mudança de cor é
  **notada** antes do clique — que é a única coisa que o aviso preventivo tem de
  fazer.
  Fase de origem: F-1b.2

- [x] **171. Os formulários antigos não regrediram com o CSS compartilhado**
  **Validado em 19/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Este passo existe porque a Parte 3
  mexeu em folha compartilhada** — `pages/clients/ClientPage.css` e
  `components/ui/Modal.css` são usadas por telas que a F-1b não criou.
  O que mudou: as larguras de grade deixaram de ser escritas por par
  (`.form-group.span-3`) e passaram a valer para a **classe** (`.span-3`), e o
  afastamento do modal saiu da margem dele para o padding da moldura. A
  varredura de `appliedClasses.test.js` prova **alcance de regra**, não
  aparência — a conferência do layout destes formulários é **inteiramente olho
  humano**, e é este passo.
  Passos: abrir cada formulário abaixo em **desktop**, **768 px** e **360 px**:

  | # | Tela | O que olhar |
  |---|---|---|
  | 1 | **Clientes › Novo** (PF e PJ) | as três colunas em desktop, duas em 768, uma em 360; o fieldset do representante legal acompanha; **sem rolagem horizontal da página** |
  | 2 | **Processos › Novo** | idem |
  | 3 | **Honorários › Novo** (tipo percentual) | o quadro de leitura com o valor calculado ocupa a **largura inteira** nas três larguras |
  | 4 | **Parcelas › Editar** | o quadro de leitura do "já recebido", idem |
  | 5 | **Cadastro** (`/registrar`), as duas etapas | os campos lado a lado em desktop, empilhados em 360 |
  | 6 | **Qualquer modal de confirmação** (ex.: excluir um cliente) | cabe na largura em 360 px, com as bordas visíveis dos dois lados |

  Esperado: nenhuma dessas telas ficou **pior** que antes. Especificamente: o
  quadro de leitura (o retângulo com fundo mais claro dentro do formulário) que
  antes ficava espremido numa coluna passa a ocupar a linha inteira — isso é
  **melhora esperada**, não regressão. O que seria regressão: campo saindo da
  caixa, coluna vazia sobrando à direita, ou a página rolando de lado.
  Por que só olho humano: é o preço declarado de mexer em CSS compartilhado.
  Não há teste de aparência neste projeto, e inventar um frágil aqui seria pior
  que o passo honesto.
  Fase de origem: F-1b.2

- [x] **172. ⭐ Paginar não perde o filtro nem a busca**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  **Reescrito na F-1b.3.1: o passo mudou de Pagamentos para PARCELAS, e o
  filtro mudou de preset para intervalo personalizado.** Contagens conferidas
  no banco depois de `npm run seed:fresh` em 20/08/2026: o seed gera **15
  pagamentos** e **23 parcelas**. Com 15 registros e um paginador de 20 por
  página, Pagamentos **nunca tem segunda página** — não havia "Próxima ›" para
  clicar, e o passo era **inverificável como estava escrito**, não reprovado.
  As 23 parcelas dão duas páginas, a segunda com 3 linhas, que é exatamente o
  caso que expõe o off-by-one do último item.
  O **preset também precisou mudar**: "Últimos 6 meses" recorta as parcelas
  para **17** (conferido no banco), e 17 volta a caber numa página só. O
  **intervalo personalizado de 01/01/2026 a 31/12/2026** mantém as **23** e
  ainda assim é um filtro visível — que é o que este passo precisa: um recorte
  ativo E mais de uma página. **O seed não foi alterado para acomodar o passo**
  — o passo é que estava mal escolhido.
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Parcelas**, 1) escolher **Intervalo personalizado** no seletor de
  período e digitar **01/01/2026** a **31/12/2026**; 2) conferir o rodapé da
  lista; 3) clicar em **Próxima ›**; 4) olhar os controles no topo; 5) clicar em
  **‹ Anterior**.
  Esperado: no passo 2, o rodapé diz **"1–20 de 23 parcelas"** e **"Página 1 de
  2"**, com **‹ Anterior desabilitado**. No passo 4, depois de avançar: os
  **dois campos de data continuam preenchidos** com 01/01/2026 e 31/12/2026, a
  barra **"Filtros aplicados:"** continua visível, e o rodapé diz **"21–23 de 23
  parcelas"** — **o mesmo 23** — com **Próxima › desabilitado**.
  Conferir que o total **não muda** ao virar página: 23 é o tamanho do conjunto
  filtrado, não o da página. Conferir que a última página mostra **3 linhas**,
  e não 20 nem 23.
  Conferir o **singular** (F-1b.3.1): filtrando por um honorário que tenha
  **uma** parcela só, o rodapé diz **"1 parcela"** — nunca "1 parcelas".
  Por que só olho humano: a suíte prova que a página é mais um campo do mesmo
  objeto de consulta e que o total vem do envelope. O que ela não prova é que a
  pessoa **vê** o filtro continuar ali depois de virar a página — que é a única
  razão de ele continuar.
  Fase de origem: F-1b.3, reescrito na F-1b.3.1
- [x] **173. ⭐ 🚨 A busca não rouba o foco (regressão do passo 155)**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, clicar no campo de busca e digitar
  **`inventário`**, letra por letra, **sem tirar a mão do teclado**. Esperar a
  lista se atualizar (o debounce é de 300 ms). Continuar digitando ** e
  partilha**. Repetir em **Parcelas** e em **Honorários**.
  Esperado: **o cursor nunca sai do campo.** A lista se atualiza embaixo, o
  indicador de carregamento aparece **abaixo dos controles** — nunca no lugar
  deles — e o que já foi digitado permanece. Nenhuma letra se perde.
  Esperado ainda: os resultados **casam a descrição do honorário**; digitando
  um **número de processo** (ex.: `0000123-01.2025.8.16.0008`), casam também; e
  em **Pagamentos**, digitando uma palavra que está só nas **observações** de um
  pagamento, aquele pagamento aparece.
  Por que só olho humano: **não há como provar foco sem DOM.** A suíte trava a
  CAUSA (nenhum `return <Loading/>` antecipado, nenhuma barra de filtro
  declarada dentro do render da página, nenhum `autoFocus`). O sintoma —
  cursor sumindo no meio da palavra — só aparece digitando. Foi assim que o
  defeito da F-1a.1 foi descoberto, e é assim que ele voltaria.
  Fase de origem: F-1b.3

- [x] **174. Filtrar por honorário e por período, combinados**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Pagamentos**, 1) escolher um **honorário** no seletor; 2) anotar
  quantos pagamentos aparecem; 3) acrescentar **Mês atual** no período; 4)
  acrescentar uma **forma de pagamento**; 5) trocar para **Intervalo
  personalizado** e digitar **01/01/2026** a **31/12/2026**.
  Esperado: cada controle novo **estreita** o conjunto — nunca alarga. A barra
  **"Filtros aplicados:"** cresce junto e nomeia os três recortes em português
  ("do honorário X, pagos em pix e neste mês"). No passo 5, os **dois campos de
  data** aparecem; nos presets, eles **não** aparecem (seriam campos
  preenchidos que não se pode editar).
  Conferir: invertendo as datas (de 31/12 para 01/01), a tela mostra a
  **mensagem do servidor** dizendo que o início é posterior ao fim — e **não**
  uma lista vazia. Lista vazia para um período impossível é indistinguível de
  "não há lançamentos", e faria procurar o pagamento em vez de olhar as datas.
  Fase de origem: F-1b.3

- [x] **175. ⭐ Mudar filtro volta para a página 1**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **É o defeito mais fácil de introduzir e
  o mais difícil de perceber**, porque a tela não erra — ela mostra,
  corretamente, a página 4 de um conjunto de duas.
  Passos: em **Pagamentos**, 1) avançar até a **última página**; 2) sem voltar,
  escolher um **honorário** no seletor.
  Esperado: a lista volta para a **página 1** do conjunto novo, e o rodapé diz
  "1–N de N". **Não** pode aparecer lista vazia com "Página 4 de 2".
  Repetir com: o campo de **busca**, o **período** e o botão **Limpar filtros**.
  Fase de origem: F-1b.3

- [x] **176. A lista curta diz se está filtrada**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  Passos: em **Parcelas**, digitar na busca algo que **não existe** (ex.:
  `zzz`). Depois, limpar e escolher um **honorário** com poucas parcelas.
  Esperado, no primeiro caso: o estado vazio **não** diz apenas "Nenhuma
  cobrança encontrada" — ele diz **o que está filtrando** ("Nenhuma parcela com
  "zzz"…") e oferece **Limpar filtros**. No segundo: a lista curta vem
  acompanhada da barra **"Filtros aplicados:"**, nomeando o honorário.
  Por que só olho humano: a frase é montada por função pura e a suíte prova o
  texto. O que ela não prova é que a pessoa, diante de três linhas, **sabe** que
  a lista é curta por causa do filtro — que é a única razão de a barra existir.
  Fase de origem: F-1b.3

- [x] **177. ⭐ 🚨 Os dois pagamentos do mesmo dia se casam com as linhas de pagamento (DEC-045)**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **É a revisão do passo 166**, que
  originou a DEC-045 — reproduza-o exatamente.
  Passos: em **Honorários**, abrir **"Assessoria tributária — processo
  administrativo"** (ou outro com parcela em aberto) e registrar **dois
  pagamentos com a MESMA data**: **R$ 300,00 em dinheiro** e **R$ 750,00 por
  PIX**, ambos em **10/06/2026**. Abrir o **Extrato** e achar as duas alocações.
  Esperado: as duas frases de vínculo dizem
  **"Do pagamento de R$ 300,00 em dinheiro (10/06/2026, #…), aplicado na parcela
  N."** e **"Do pagamento de R$ 750,00 em pix (10/06/2026, #…), aplicado na
  parcela N."** — e **dá para distingui-las cobrindo o sufixo do id com o
  dedo**. Era exatamente isso que a referência da DEC-044 não permitia: os dois
  sufixos diferiam no **último** caractere (`#e66b7a` / `#e66b7c`).
  Esperado ainda, e é o ponto do passo: ir à listagem de **Pagamentos**, achar
  as duas linhas, e **casar cada uma com a sua alocação** — a linha do
  pagamento no extrato exibe **a mesma frase** ("Pagamento R$ 300,00 em
  dinheiro (10/06/2026, #…)"). Se a advogada precisar comparar caracteres
  hexadecimais para fazer isso, a DEC-045 falhou mesmo com a suíte verde.
  Conferir o caso **degenerado**: registrar **dois pagamentos iguais** (mesmo
  valor, mesma forma, mesmo dia). Aí — e só aí — o que distingue é o **sufixo do
  id**, que continua na frase justamente para isto.
  **Não testado: o caso DEGENERADO.** Os dois pagamentos registrados na
  validação diferiam em valor e forma, e por isso a frase da DEC-045 os separou
  sem precisar do id. O par **idêntico** — mesmo valor, mesma forma, mesmo dia
  — **não foi executado**, e é justamente ele que exercita o desempate: os ids
  observados (`#698600` / `#698602`) diferem no **último** caractere, que é a
  razão de existir da DEC-045. Os hex finais do ObjectId são **contador
  sequencial** e colidem no prefixo, e é por isso que a referência humana do
  pagamento é **valor e forma**, com o id curto só como desempate. No caso
  degenerado o desempate é tudo o que resta — daí a pendência.
  Fase de origem: F-1b.3

- [x] **178. ⭐ O menu de ações abre e fecha pelo teclado**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  **🔴 REPROVADO em 20/08/2026 (validação da F-1b.3.1) — reaberto pela segunda
  vez.** Relato do Daniel: *"a janela aberta ao clicar enter nos ⋮ não foi
  possível de se acessar navegando pelo tab, apenas pelo mouse"*.

  **O que PASSOU na tentativa de 20/08/2026**, e vale registrar porque delimita
  o defeito: Enter **abre** o menu; o **anel de foco dourado aparece** no ⋮; as
  ações **funcionam ao clique**; e **o painel ficou dentro da tela** — a
  DEC-046 fez o que prometeu. O que falhou foi **só** o Tab.

  **A causa real, e ela é filha da própria correção anterior:** o painel em
  portal é o **último filho do `body`**, e a ordem do Tab é a do **DOM real** —
  não a da árvore do React, que é por onde o `createPortal` propaga *eventos*.
  Tab a partir do gatilho ia para a **próxima célula da tabela**, não para
  dentro do menu. Antes da DEC-046 o painel era irmão imediato do gatilho e o
  Tab caía nele de graça: **tirar o painel do contêiner que recortava tirou
  junto a ordem de foco natural.**

  **Corrigido na F-1b.3.2** conduzindo o foco explicitamente — entra no
  primeiro item ao abrir (depois de a posição estar calculada), circula dentro
  do painel com Tab e Shift+Tab, e volta ao gatilho no Esc. **Reexecutar este
  passo por inteiro**, junto com o passo **183**.
  **🔴 REPROVADO em 20/08/2026 (validação da F-1b.3).** O botão **⋮** existe,
  **recebe o anel de foco dourado** por Tab e **abre** o painel ao clique — o
  comportamento estava certo. **O painel saía da tela, cortado, nas TRÊS
  listagens.** A causa foi diagnosticada na F-1b.3.1 e é estrutural: três
  ancestrais com `overflow` diferente de `visible` recortavam o painel
  absoluto — a própria célula (`.data-table--fixed td`, `overflow: hidden`), a
  `.table-wrapper` (`overflow-x: auto`) e a `.main-content`. Corrigido pela
  **DEC-046**: o painel passou a ser renderizado em **portal** no
  `document.body`, com `position: fixed` e coordenadas do gatilho. **Reexecutar
  este passo por inteiro.**
  Pré-condição: `npm run seed:fresh`. **Sem usar o mouse em nenhum momento.**
  Passos: em **Pagamentos**, 1) navegar por **Tab** até o botão **⋮** de uma
  linha; 2) abrir com **Enter**; 3) percorrer os itens com **Tab**; 4) fechar
  com **Esc**; 5) conferir onde o foco está; 6) reabrir e escolher **Editar**
  com **Enter**. Repetir em **Parcelas** e **Honorários**.
  Esperado: o botão **⋮** recebe o **anel de foco dourado** ao ser alcançado
  (não pode ser invisível). Enter abre o menu. Esc fecha — e o foco **volta
  para o botão ⋮ que o abriu**, não para o início da página. Enter em "Editar"
  navega para o formulário.
  Conferir também com o mouse: clicando **fora** do menu, ele fecha.
  Conferir a distinção: **Excluir** aparece em **vermelho**, visivelmente
  diferente das demais.
  Por que só olho humano: a suíte prova que o componente registra `keydown`,
  reconhece `Escape`, guarda a referência do gatilho e a chama no fechamento —
  e que nenhuma regra apaga o `outline`. **Não há como provar sem DOM** que o
  foco realmente voltou nem que o anel é visível no tema escuro.
  Fase de origem: F-1b.3, reaberto na F-1b.3.1 e de novo na F-1b.3.2

- [x] **179. ⭐ 🚨 Nenhuma ação ficou fora da tela, em 1024 px e em 360 px**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  **🔴 REPROVADO em 20/08/2026 (validação da F-1b.3).** O botão **⋮** existe,
  **recebe o anel de foco dourado** por Tab e **abre** o painel ao clique — o
  comportamento estava certo. **O painel saía da tela, cortado, nas TRÊS
  listagens.** A causa foi diagnosticada na F-1b.3.1 e é estrutural: três
  ancestrais com `overflow` diferente de `visible` recortavam o painel
  absoluto — a própria célula (`.data-table--fixed td`, `overflow: hidden`), a
  `.table-wrapper` (`overflow-x: auto`) e a `.main-content`. Corrigido pela
  **DEC-046**: o painel passou a ser renderizado em **portal** no
  `document.body`, com `position: fixed` e coordenadas do gatilho. **Reexecutar
  este passo por inteiro.**
  Pré-condição: `npm run seed:fresh`. **É o defeito nominal da Parte 6**: a
  coluna Ações de Pagamentos tinha três botões numa largura para dois, e o
  terceiro ("Editar") ficava fora da tela — ação escondida atrás de rolagem que
  ninguém percebe é ação que não existe.
  Passos: abrir **Pagamentos**, **Parcelas** e **Honorários** com a janela em
  **1024 px** e depois em **360 px**. Em cada uma, na **última coluna**, abrir o
  menu **⋮** de uma linha e listar o que ele contém.
  Esperado, por listagem:

  | Listagem | O menu contém |
  |---|---|
  | **Pagamentos** | "Baixar recibo" e "Estornar" (só enquanto sobra líquido) + "Editar" |
  | **Parcelas** | "Editar" + "Excluir" (em vermelho) |
  | **Honorários** | "Editar" + "Excluir" (em vermelho) |

  Esperado ainda: **nenhum item do menu fica fora da tela** em 360 px — o painel
  abre **para a esquerda** do botão. A tabela pode rolar horizontalmente; o
  **menu, não**.
  Conferir que as EXPLICAÇÕES continuam fora do menu, na própria célula: a nota
  **"sem recibo"** do pagamento integralmente estornado (ela é explicação, não
  ação — escondê-la faria a advogada abrir um menu para descobrir por que falta
  um botão) e o **"Reparcelada"** da parcela cancelada.
  Fase de origem: F-1b.3, reaberto na F-1b.3.1

- [x] **181. ⭐ 🚨 O menu abre inteiro em 360 px, inclusive na última linha**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **É o passo que fecha o defeito da
  fase** — reexecutar junto com o 178 e o 179.
  Passos: abrir **Pagamentos**, **Parcelas** e **Honorários** com a janela em
  **360 px**. Em cada uma: 1) rolar até a **última linha visível** da tabela e
  abrir o menu **⋮** dela; 2) abrir o menu de uma linha do **meio**; 3) com o
  menu aberto, **rolar a página**; 4) com o menu aberto, **rolar a tabela de
  lado**; 5) com o menu aberto, **redimensionar** a janela.
  Esperado: nos passos 1 e 2, **o painel aparece inteiro** — nenhuma borda
  cortada, nenhum item fora da tela, nada exigindo rolagem para ser lido. Na
  última linha, o painel **abre para CIMA** do botão, porque abaixo não cabe.
  Em 360 px ele **alinha pela esquerda** do botão (alinhado pela direita ele
  sairia pela borda esquerda). Nos passos 3, 4 e 5, **o menu FECHA** — não
  acompanha, não fica flutuando descolado da linha. Um menu apontando para a
  linha errada é pior que menu nenhum.
  Repetir tudo em **1024 px**: lá o painel alinha pela **direita** do botão e
  abre para baixo, exceto nas últimas linhas.
  Conferir que a **tabela ainda rola de lado** e o **menu não** — são coisas
  separadas desde que ele saiu para o `body`.
  Por que só olho humano: a suíte prova que a conta nunca devolve coordenada
  fora do viewport, varrendo a tela inteira. **Não há como provar sem DOM** que
  o retângulo pintado coube — a conta pode estar certa e um `overflow` novo em
  qualquer ancestral cortaria o painel de novo, calado.
  **Duas ressalvas registradas, nenhuma reprova o passo:**
  1. Em **360 px**, os cartões do **resumo do mês** (agosto/2026) e do
     **acumulado do escritório** exigem **deslize horizontal** em vez de
     empilhar como o resumo geral. **Estético, adiado por decisão do Daniel** —
     está nas pendências, não neste passo.
  2. A **inconsistência do ⋮ entre módulos** — Clientes, Processos, Documentos
     e Seções ainda com a fileira de botões enquanto o Financeiro já tinha o
     menu. Foi o que **originou a DEC-047**, resolvida na F-1b.3.2 e verificada
     pelo passo **184**.
  Fase de origem: F-1b.3.1

- [x] **182. As notas "Reparcelada" e "sem recibo" cabem inteiras**
  **Validado em 20/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. Conferido no banco em 20/08/2026: o seed
  traz **2 parcelas canceladas** por reparcelamento e **1 pagamento
  integralmente estornado** (de 2 pagamentos com estorno — o outro é parcial e
  ainda tem líquido, então continua oferecendo recibo).
  Passos: 1) em **Parcelas**, achar uma linha com status **cancelado** e ler a
  última coluna; 2) em **Pagamentos**, achar a linha do pagamento
  **integralmente estornado** (líquido R$ 0,00, com o badge "Estornado
  integralmente") e ler a última coluna. Fazer os dois em **1024 px** e em
  **360 px**.
  Esperado: lê-se **"Reparcelada"** e **"sem recibo"** — as palavras
  **inteiras**, nas duas larguras. **Não** pode aparecer "Reparcelad", nem
  reticências, nem a palavra quebrada em duas linhas. A nota fica **acima** do
  botão **⋮**, empilhada, e não ao lado dele.
  Conferir a regressão da F-1b.2 no mesmo par de telas: **nenhuma coluna de
  dinheiro trunca**. Os 24 px que a coluna de ações ganhou saíram da coluna de
  **texto livre** (a descrição do honorário), que trunca com reticências por
  projeto e tem o texto inteiro no `title` e no link da própria linha — nunca
  da coluna de valores.
  Por que só olho humano: a suíte trava a largura declarada da coluna e o
  `nowrap` das notas. O que ela não mede é a largura **pintada** do texto, que
  depende da fonte instalada — e foi exatamente assim que "Reparcelada" coube
  na medida e não coube na tela.
  Fase de origem: F-1b.3.1

- [x] **183. ⭐ 🚨 O Tab circula dentro do painel e não escapa para a tabela**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Sem usar o mouse em nenhum momento.**
  **É o passo que fecha o defeito do 178** — executar os dois juntos.
  Passos: em **Pagamentos**, 1) navegar por **Tab** até o ⋮ de uma linha do
  **meio** da tabela; 2) abrir com **Enter**; 3) conferir **onde o foco está**
  assim que o menu abre; 4) tabular **item por item até passar do último**;
  5) do primeiro item, dar **Shift+Tab**; 6) fechar com **Esc** e conferir onde
  o foco parou. Repetir em **Parcelas** e em **Honorários**.
  Esperado: no passo 3, o foco está **no primeiro item do menu** — não no ⋮ e
  não na tabela. No passo 4, ao passar do último item o foco **volta para o
  primeiro**: ele **não vai para a linha de baixo da tabela**, que é
  exatamente o que acontecia antes. No passo 5, Shift+Tab no primeiro item vai
  para o **último**. No passo 6, Esc fecha e o foco volta **para o ⋮ que
  abriu** — com o Tab preso dentro do painel, **Esc é o único caminho de
  volta**, e se ele falhar a pessoa fica presa.
  Conferir em **Pagamentos** com um recibo **baixando**: o item "Baixando…"
  está desabilitado e o Tab **pula por cima dele** — o ciclo não trava.
  Por que só olho humano: a suíte prova a mecânica (o `preventDefault`, a
  ordem da chamada de foco, o ciclo nas duas pontas). **Não há DOM em
  `node --test`**, então que o foco esteja mesmo onde se pensa é coisa de
  tabular e olhar.
  Fase de origem: F-1b.3.2

- [x] **184. ⭐ O ⋮ em Clientes, Processos, Documentos e Seções (DEC-047)**
  > **REABERTO na F-2c.** Passou em 21/08/2026, e a validação continua
  > valendo para o que ela olhou. O que mudou foi a **expectativa escrita
  > no próprio passo**: a F-2b renomeou **"Excluir" → "Desativar"** em
  > **Clientes** e **Processos**, porque a ação sempre foi soft delete e,
  > com a reativação existindo, o nome antigo passou a mentir. A tabela
  > abaixo ainda pede a palavra velha em duas linhas — e um passo que
  > confere contra a expectativa errada reprova o código certo.
  >
  > A F-2c acrescenta um segundo motivo para reexecutar: em **Processos**,
  > o item **"Reativar"** agora pode aparecer **desabilitado com o motivo
  > ao lado** (DEC-053). É um estado de item que este passo nunca viu.
  Pré-condição: `npm run seed:fresh`.
  Passos: abrir as quatro listagens em **1024 px** e em **360 px**. Em cada
  uma, abrir o menu **⋮** da última coluna e conferir **item a item** contra a
  tabela abaixo — que é a lista levantada do código **antes** da migração.

  | Listagem | O menu contém, nesta ordem |
  |---|---|
  | **Clientes** | "Ver", "Editar", **"Desativar"** (vermelho) — ou **"Reativar"**, se a linha estiver desativada |
  | **Processos** | "Gerenciar", **"Desativar"** (vermelho) — ou **"Reativar"**, se a linha estiver desativada |
  | **Documentos** | "Abrir", "Baixar PDF", "Baixar DOCX", **"Excluir"** (vermelho) |
  | **Seções** | "Ver", "Editar", **"Desativar"** (vermelho) |

  Esperado: **nenhuma ação se perdeu** e nenhuma mudou de efeito. Em
  particular: "Ver" de **Seções** abre o **modal de pré-visualização** (não
  navega); "Gerenciar" de **Processos** leva ao detalhe, com o mesmo nome de
  antes; "Baixar PDF" e "Baixar DOCX" **baixam o arquivo** — os ícones saíram
  de propósito, porque dentro do menu o item é uma linha de texto e o rótulo
  por extenso diz mais que um ícone de 13 px.
  Conferir o estado de download: clicando "Baixar PDF", o item vira
  **"Baixando…"** e fica **desabilitado** até terminar.
  Conferir que **"Desativar"** de Seções continua **desativando** e não
  apagando — o verbo não mudou junto com a forma.
  Conferir em **360 px** que o painel **não sai da tela** nas quatro (é a
  DEC-046 valendo para as listagens novas) e que a coluna de ações encolheu
  para a largura de **um botão**.
  Por que só olho humano: a suíte prova que as sete listagens renderizam
  `ActionMenu`, que nenhuma tem botão solto e que cada rótulo esperado está no
  arquivo. O que ela **não** prova é que o clique no item ainda faz o que
  fazia — que a rota é a mesma, que o modal abre, que o arquivo baixa.
  **Acrescentado na F-2c:** conferir que o item **"Reativar"** de um
  processo cujo **cliente está desativado** aparece **desabilitado, com o
  motivo ao lado nomeando o cliente** — e não some do menu. Botão ausente
  faz procurar; botão desabilitado com explicação ensina.
  Fase de origem: F-1b.3.2 — **reaberto na F-2c**

  **Validado em 22-24/08/2026 pelo Daniel. Passou.**
  > **Anotação dele, e ela virou a Parte 6.1 da F-2d:** *"sobrou 'excluir' em
  > mensagem de aviso."* Os menus estavam certos — a tabela acima confere. O
  > que ficou com a palavra velha foram DUAS mensagens de recusa do servidor,
  > nos dois módulos que a F-2b renomeou:
  >
  > • `deleteClient`: *"Não é possível **excluir** este cliente…"* — a ação em
  >   Clientes é "Desativar" desde a F-2b;
  > • remoção do único participante: *"…ou **exclua** o processo"* — idem em
  >   Processos.
  >
  > As duas foram corrigidas na F-2d. **Documentos, Honorários e Parcelas
  > continuam com "Excluir"** — a ação deles não virou desativação, e um verbo
  > único faria a mensagem discordar do botão em três telas para concordar em
  > duas. Travado por teste nos dois repos.

- [x] **185. ⭐ Depois do reparcelamento, a primeira parcela do plano novo diz "1 de 3"**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.

  **▶ ONDE IR.** Menu lateral → **Honorários** → buscar **`usucapião`** → abrir
  **"Honorários advocatícios — usucapião urbano"**
  (cliente **Beatriz Ramos Pereira**, processo **0007890-70.2025.8.16.0005** —
  *Usucapião de Imóvel Urbano*).

  **▶ ESTADO ESPERADO AO ABRIR** (conferido no banco em 21/08/2026):

  | | |
  |---|---|
  | Contratado | **R$ 8.000,00** |
  | Recebido | **R$ 2.500,00** |
  | Em aberto | **R$ 5.500,00** |
  | Parcelas | **2**, ambas em aberto |
  | Parcela 1 de 2 | R$ 4.000,00 · recebido R$ 2.500,00 · vence **30/04/2026** · **Parcial** |
  | Parcela 2 de 2 | R$ 4.000,00 · recebido R$ 0,00 · vence **30/06/2026** · **Vencida** |

  **Se os números não baterem, PARE**: ou o `seed:fresh` não foi rodado, ou a
  migração não foi aplicada, ou este honorário já foi consumido por uma
  execução anterior deste passo. Rode as duas pré-condições e comece de novo.

  **Por que este honorário:** é o único do seed com **exatamente 2 parcelas em
  aberto** e uma delas **parcial com dinheiro alocado** — a parcial é o caso
  que prova que o valor já recebido continua onde está depois do
  reparcelamento, e é ela que aparece na lista "o que sai" com o "já recebido".

  **▶ O QUE DIGITAR.** Clicar em **Reparcelar**. No gerador, deixar
  **3 parcelas**, **mensal**, e o primeiro vencimento sugerido. A tela deve
  propor **R$ 1.833,34 · R$ 1.833,33 · R$ 1.833,33** — a primeira maior, com a
  marca *"inclui a sobra da divisão"*, porque R$ 5.500,00 não divide exato por
  3 (DEC-049). A soma corrente deve dizer **"A soma fecha com o saldo."**
  Confirmar.

  **Reescrito na F-1c.2: o disparo é pela TELA.** Até aqui este passo mandava
  usar a API direto, porque o reparcelamento não tinha interface — e a
  validação por curl **foi dispensada por decisão do Daniel**, já que
  conferência de contrato a suíte faz sozinha.
  Passos: depois do reparcelamento, abrir 1) a **página do honorário**; 2) a
  listagem de **Parcelas** filtrada por ele; 3) o **extrato** do honorário;
  4) o **recibo** do pagamento de **R$ 2.500,00** que este honorário já tem —
  pelo ⋮ da linha, em **Recebimentos**. Ele **não quitou** a parcela (era
  R$ 4.000,00), então o recibo enumera o destino: deve dizer **"R$ 2.500,00 na
  parcela 1 de 2"**.
  Esperado: as **três parcelas novas** aparecem como **"Parcela 1 de 3"**,
  **"Parcela 2 de 3"** e **"Parcela 3 de 3"** — nas quatro telas, com o mesmo
  texto. As **duas canceladas** aparecem como **"Parcela 1 de 2"** e **"Parcela
  2 de 2"** — o rótulo **congelado**, dizendo "de 2" e não "de 3" — com o badge
  **"Reparcelada"** ao lado, **fora do menu de ações** (DEC-047: é explicação,
  não ação).
  Conferir que o **recibo emitido ANTES** do reparcelamento continua dizendo o
  que dizia. É o ponto inteiro do congelamento.
  **Sobre o portal do cliente:** ele **não mostra parcela nenhuma** — DEC-029
  ponto 8 mantém o portal sem nada financeiro, e há teste travando isso
  (`tests/portal/isolamento.test.js`). Não há rótulo a conferir lá, e se
  aparecer número de parcela no portal **isso é o defeito**, não a validação.
  Fase de origem: F-1c.1

- [x] **186. ⭐ 🚨 Duas parcelas nº 1: dá para dizer qual é qual sem olhar id nenhum**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  **NÃO depende do passo 185** — mudou na F-1c.2.1. O seed **já entrega** um
  honorário reparcelado, com alocação na parcela cancelada; usá-lo tira a
  dependência de ordem e faz o passo valer por si.

  **▶ ONDE IR.** Menu lateral → **Honorários** → buscar **`assessoria`** →
  abrir **"Assessoria tributária — processo administrativo"**
  (cliente **Agro Campos Gerais Ltda**, processo **0008901-80.2025.8.16.0006** —
  *Ação de Cobrança de Dívida*).

  **▶ ESTADO ESPERADO AO ABRIR** (conferido no banco em 21/08/2026):

  | | |
  |---|---|
  | Contratado | **R$ 7.500,00** |
  | Recebido | **R$ 1.500,00** |
  | Em aberto | **R$ 6.000,00** |
  | Parcelas | **5** — duas reparceladas, três vivas |
  | **Parcela 1 de 2** | R$ 3.750,00 · recebido **R$ 1.500,00** · vence **10/05/2026** · **Reparcelada** |
  | **Parcela 2 de 2** | R$ 3.750,00 · vence 15/08/2026 · **Reparcelada** |
  | **Parcela 1 de 3** | R$ 2.000,00 · vence **15/07/2026** · Vencida |
  | Parcela 2 de 3 | R$ 2.000,00 · vence 15/08/2026 · Vencida |
  | Parcela 3 de 3 | R$ 2.000,00 · vence 15/09/2026 · Pendente |

  **Se os números não baterem, PARE** e rode as duas pré-condições.
  (Detalhe conferido em 21/08/2026: as **canceladas já dizem "de 2" sem a
  migração** — quem congelou o "de N" delas foi o próprio reparcelamento do
  seed, que passa pelo serviço. A migração continua na pré-condição porque
  congela os **outros** planos e deixa o estado determinístico, não porque estes
  rótulos dependam dela.)

  **Por que este honorário:** é o único do seed que **já nasce reparcelado**, e
  a parcela **cancelada nº 1 tem R$ 1.500,00 alocados**. Sem alocação na
  cancelada não existem as duas frases para comparar, que é o ponto do passo.
  Repare que ele já exibe **duas parcelas nº 1** — uma "de 2" reparcelada e uma
  "de 3" viva — antes de você fazer qualquer coisa.

  **▶ O QUE DIGITAR.** Falta a segunda frase: uma alocação na parcela **nova**.
  Na página do honorário, **Registrar pagamento** de **R$ 2.000,00**, forma
  **PIX**, data de hoje. Ele deve se alocar sozinho na **parcela 1 de 3**, que
  é a primeira em aberto por vencimento.

  **É a revisão da DEC-045 aplicada a parcelas**, e o teste real da DEC-048: a
  renumeração criou de propósito duas parcelas nº 1 no mesmo honorário.
  Passos: no **extrato**, achar 1) a **alocação na parcela cancelada** (os
  R$ 1.500,00 que entraram antes do reparcelamento) e 2) a **alocação na
  parcela nova** (os R$ 2.000,00 que você acabou de registrar). Ler as duas
  frases **cobrindo qualquer id com o dedo**.
  Esperado: as duas frases dizem **"parcela 1 de …"** e mesmo assim **não se
  confundem** — o **"de N"** difere (de 2 × de 3), o **vencimento** difere, e a
  cancelada leva **"(reparcelada)"** no fim. As duas frases exatas que devem
  aparecer, com os dados deste honorário:
  **"R$ 1.500,00 alocados na parcela 1 de 2, vencendo 10/05/2026
  (reparcelada)"** e **"R$ 2.000,00 alocados na parcela 1 de 3, vencendo
  15/07/2026"**.
  **Se for preciso comparar id para casar a frase com a linha, a DEC-048
  falhou** — mesmo com a suíte verde. É o mesmo critério do passo 177.
  Fase de origem: F-1c.1

- [x] **187. Dois reparcelamentos seguidos: a terceira geração também numera de 1**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  **NÃO depende do passo 185** — mudou na F-1c.2.1: este passo tem **alvo
  próprio**, para poder ser executado sozinho e para não disputar o honorário
  do 185.

  **▶ ONDE IR.** Menu lateral → **Honorários** → buscar **`fase inicial`** →
  abrir **"Honorários advocatícios — fase inicial"**
  (cliente **Ana Lima Santos**, processo **0001234-10.2025.8.16.0001** —
  *Indenização por Danos Morais*).

  **▶ ESTADO ESPERADO AO ABRIR** (conferido no banco em 21/08/2026):

  | | |
  |---|---|
  | Contratado | **R$ 5.000,00** |
  | Recebido | **R$ 0,00** |
  | Em aberto | **R$ 5.000,00** |
  | Parcelas | **2**, ambas em aberto |
  | Parcela 1 de 2 | R$ 2.500,00 · vence **30/04/2026** · **Vencida** |
  | Parcela 2 de 2 | R$ 2.500,00 · vence **31/07/2026** · **Vencida** |

  O "Recebido R$ 0,00" está certo: este honorário tem um pagamento **estornado
  por inteiro** no histórico, e é por isso que o em aberto é o contratado
  cheio. Se não bater, **PARE** e rode as pré-condições.

  **Por que este honorário:** saldo de R$ 5.000,00 **sem nenhuma alocação
  viva**, o que o deixa reparcelável **duas vezes seguidas** sem esbarrar em
  parcela paga. E R$ 5.000,00 divide **exato por 2** no segundo
  reparcelamento, o que torna a conferência dos rótulos direta.

  **É o caso que expõe qualquer recálculo escondido**: se algum ponto do código
  contar as parcelas do honorário em vez de ler o campo congelado, é aqui que
  o número muda sozinho.

  **▶ O QUE DIGITAR — são DOIS reparcelamentos seguidos, pela tela.**

  **Primeiro:** Reparcelar → **3 parcelas**, mensal. A tela deve propor
  **R$ 1.666,68 · R$ 1.666,66 · R$ 1.666,66** (a sobra na primeira). Confirmar.
  **Anote os rótulos das duas gerações agora** — é a anotação que torna a
  última conferência possível.

  **Segundo:** Reparcelar de novo → **2 parcelas**, mensal. A tela deve propor
  **R$ 2.500,00 · R$ 2.500,00**, exato. Confirmar.

  Depois, abrir a página do honorário e ler a lista inteira.
  (Reescrito na F-1c.2: era disparo por API. Alvo nomeado na F-1c.2.1.)
  Esperado: a **terceira geração** aparece como **"Parcela 1 de 2"** e
  **"Parcela 2 de 2"**. As duas gerações anteriores **continuam exatamente como
  estavam**: a primeira dizendo "Parcela 1 de 2" / "Parcela 2 de 2"
  (reparceladas) e a segunda, "Parcela 1 de 3" / "2 de 3" / "3 de 3" (também
  reparceladas agora).
  Conferir: agora existem **três** parcelas nº 1 no mesmo honorário — e **duas
  delas dizem "de 2"** (a primeira geração e a terceira). **Isso é esperado, não
  é defeito**: é justamente o caso mais difícil, e o que as separa é o
  **vencimento** — a primeira geração vencia em 30/04/2026, a terceira vence nas
  datas que você acabou de gerar. As três continuam distinguíveis pelo
  vencimento no extrato, que é o critério da DEC-048.
  Conferir também que **nenhum "de N" mudou** nas gerações antigas ao longo do
  segundo reparcelamento — anote os rótulos antes e compare depois.
  Fase de origem: F-1c.1

- [x] **188. ⭐ 🚨 A travessia: do honorário vazio ao extrato completo, sem sair da interface**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`. **Reserve uma sentada só** — o valor
  deste passo está em não interromper a cadeia. **Sem usar a API direto em
  nenhum momento.**
  **Anote os números conforme avança**: é a anotação que torna o passo 189
  executável.

  **▶ ONDE CRIAR.** Menu lateral → **Honorários** → **+ Novo Honorário** → no
  seletor de processo, escolher **0006789-60.2024.8.16.0004 — Execução Fiscal
  – IPTU** (cliente **João Paulo Oliveira**). É um processo **sem honorário
  nenhum** no seed, então a travessia começa de uma folha limpa.

  **▶ OS VALORES EXATOS, elo a elo:**

  | Elo | O que digitar |
  |---|---|
  | 1 | Honorário **fixo**, descrição **"Travessia F-1c.2"**, valor **R$ 6.000,00**, vencimento **31/12/2026** |
  | 2 | Parcela **1** de **R$ 3.000,00** vencendo **30/09/2026**; parcela **2** de **R$ 3.000,00** vencendo **31/10/2026** |
  | 3 | Pagamento de **R$ 3.000,00**, forma **PIX**, data de hoje |
  | 5 | Estorno **parcial** de **R$ 1.000,00** |
  | 7 | Reparcelar → **3 parcelas**, **mensal**. A tela deve propor **R$ 1.000,00** em cada, **sem sobra** |

  **Se o total do honorário não for R$ 6.000,00 ao fim do elo 2, PARE** — os
  números da tabela do cabeçalho não vão fechar, e o passo 189 fica
  inexecutável.

  | # | Operação | Como | Passo que detalha |
  |---|---|---|---|
  | 1 | Criar honorário | `+ Novo Honorário`, tipo **fixo**, **R$ 6.000,00** | — |
  | 2 | Criar 2 parcelas | R$ 3.000,00 cada, vencendo em dois meses seguidos | — |
  | 3 | Registrar pagamento | R$ 3.000,00, PIX, na data de hoje | **159** (preview bate com o realizado) |
  | 4 | Conferir a alocação | abrir o **Extrato** e ler o vínculo | **160** (vínculos se leem sem explicação) |
  | 5 | Estornar | pelo ⋮ da linha do pagamento, **R$ 1.000,00** parcial | **161** (o modal diz o efeito antes) |
  | 6 | Anular o estorno | pelo extrato | **162** (a anulação e a confirmação do efeito) |
  | 7 | Reparcelar | botão **Reparcelar**, 3 parcelas mensais | **185** (o rótulo "1 de 3") |
  | 8 | Emitir recibo | ⋮ da linha do pagamento → **Baixar recibo** | **156** (o texto descreve o que foi quitado) |
  | 9 | Ler o extrato inteiro | de cima a baixo | **165** (nenhum total que o sistema não confirma) |

  **▶ O ELO 6 PRECISA DE UM NÚMERO A CONFERIR.** Ele era o único elo sem um, e
  por isso uma anulação que não surtisse efeito passaria despercebida até o elo
  8 — dois elos adiante, onde o recibo sairia com um valor que ninguém saberia
  explicar.

  > Depois de anular o estorno, o cabeçalho **precisa** dizer **Recebido
  > R$ 3.000,00** e **Em aberto R$ 3.000,00**, e uma linha **"Anulação de
  > estorno"** precisa aparecer no extrato. **Se não aparecer, PARE** — os elos
  > seguintes vão partir de um saldo diferente do previsto e a tabela do
  > cabeçalho não vai fechar.

  **▶ CENÁRIO EXTRA, descoberto na validação de 21/08/2026.** O roteiro não o
  previa, e ele passou. Fica registrado como **caso conhecido**:

  > Anular o estorno **depois** do reparcelamento (ou seja, inverter os elos 6 e
  > 7) **realoca o valor numa parcela do PLANO NOVO** — não na parcela original,
  > que já não existe como dívida viva. A linha desfeita no extrato ganha a nota
  > de que foi anulada.
  >
  > É o comportamento certo: a anulação devolve o dinheiro ao honorário, e o
  > motor de alocação o coloca onde há dívida em aberto **hoje**. Quem esperasse
  > vê-lo voltar à parcela de origem estaria esperando que o sistema
  > ressuscitasse um plano que a advogada substituiu de propósito.

  Esperado, em cada elo: **a operação seguinte encontra a tela no estado que a
  anterior deixou.** Nenhum F5 deve ser necessário para os números baterem;
  nenhuma tela deve exigir que se navegue para fora e volte.
  Esperado ainda: no passo 7, a parcela **paga** aparece na lista **"O que
  fica"** da tela de reparcelamento, e a advogada consegue confirmar **antes de
  apertar o botão** que o pagamento não será apagado.
  Por que só olho humano: cada elo tem teste. **A cadeia não tem** — e é na
  cadeia que a divergência aparece, porque cada tela é recarregada com o
  resultado da anterior.
  Fase de origem: F-1c.2

- [x] **189. ⭐ 🚨 Os números fecham entre si no fim da travessia**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: o passo **188** completo, com os números anotados.
  **▶ ONDE IR.** Menu lateral → **Honorários** → buscar **`travessia`** → abrir
  **"Travessia F-1c.2"**, o honorário que você criou no passo 188.
  **É o passo que a seção existe para ter.** Cada tela isolada já foi
  verificada; o que nunca foi é se elas **concordam entre si** depois da cadeia.
  Conferir as **três igualdades**, com a calculadora na mão:

  | # | O que precisa fechar | Onde ler |
  |---|---|---|
  | 1 | **contratado − recebido = em aberto** (e o **saldo adiantado** aparece **nomeado à parte**, nunca dentro de "recebido" nem abatendo o "em aberto") | cabeçalho da página do honorário |
  | 2 | a **soma das movimentações do extrato** explica o "recebido" do cabeçalho | Extrato × cabeçalho |
  | 3 | o **recibo** diz da parcela o mesmo que a **lista de parcelas** diz | PDF × página do honorário |

  Esperado: as três fecham. Especificamente na (1), é a **DEC-040**: o crédito
  **não** entra em `recebido` e **não** abate o `em aberto` — foi exatamente
  esse desconto silencioso que o smoke test de 17/08/2026 pegou mentindo a favor
  do cliente.
  Na (3): depois do reparcelamento, o recibo emitido no elo 8 nomeia a parcela
  com o **"de N" congelado** (DEC-048) — se ele passar a dizer outro total, o
  congelamento quebrou. Cruzar com o passo **185**.
  Conferir também a ficha do **processo** (passo **157**): o honorário aparece
  lá com os mesmos números da página dele. Duas telas, uma fonte
  (`feeTotals.js`) — se divergirem, a fonte única deixou de ser única.
  Por que só olho humano: a suíte prova cada fórmula isoladamente. **Que os
  quatro lugares onde o mesmo número aparece digam a mesma coisa depois de nove
  operações** é conferência de leitura, não de unidade.
  Fase de origem: F-1c.2

- [x] **190. Nenhuma linha do extrato que deixou de valer aparece sem dizer que deixou (DEC-044)**
  **Validado em 21/08/2026 pelo Daniel. Passou.**
  Pré-condição: o passo **188** completo.
  **▶ ONDE IR.** Menu lateral → **Honorários** → buscar **`travessia`** → abrir
  **"Travessia F-1c.2"** → rolar até o **Extrato**.
  **É o fecho do ciclo Financeiro 2.0**, e a regra que ele confere é a que mais
  se perde numa tela que cresceu: uma linha que já não vale, exibida como se
  valesse, é pior que uma linha ausente.
  Passos: no extrato do honorário da travessia, percorrer **linha por linha** e
  achar as três que **deixaram de valer** ao longo dela: a **alocação
  desfeita** pelo estorno do elo 5, o **estorno anulado** no elo 6, e as
  **parcelas canceladas** pelo reparcelamento do elo 7.
  Esperado: **cada uma diz, na própria linha, que deixou de valer** — a
  alocação desfeita aparece **riscada ou marcada como desfeita**, o estorno
  anulado diz que foi anulado, e as parcelas canceladas aparecem como
  **"Reparcelada"**. Nenhuma delas pode aparecer com a mesma aparência de uma
  linha viva.
  Conferir o contrário também: **nenhuma linha viva** aparece marcada como
  desfeita. Cruzar com os passos **164** (o estornado por inteiro não deixa
  buraco mudo) e **169** (o badge cabe e explica).
  Por que só olho humano: a DEC-044 é sobre **aparência de validade**. A suíte
  prova que o campo existe e que a classe é aplicada; que a linha morta **se
  pareça** morta ao lado de uma viva só se vê olhando as duas juntas.
  Fase de origem: F-1c.2

- [x] **191. ⭐ 🚨 A senha atual errada NÃO desloga (V-2, DEC-050)**
  **Validado em 21/08/2026 pelo Daniel. Passou. Reportado sem capturas.**
  Pré-condição: logada, em qualquer tela interna.
  **É o passo que a fase existe para ter.** O defeito expulsava a advogada do
  sistema por um erro de digitação.
  **▶ ONDE IR.** Menu do usuário → **Meu Perfil** (`/dashboard/perfil`) → rolar
  até o bloco **Segurança**.
  Passos: 1) preencher **senha atual** com algo **errado** de propósito (ex.:
  `SenhaQueNaoEhAMinha1`); 2) preencher a nova senha e a confirmação com algo
  válido (ex.: `Lex654321`); 3) enviar.
  Esperado: a mensagem **"Senha atual incorreta"** aparece **ao lado dos
  campos**, no próprio bloco. E, o que importa:
  **a advogada CONTINUA na tela do perfil, logada.**
  **Não pode** haver toast "Sessão expirada", **não pode** ir para `/login`, e
  o cabeçalho **não pode** perder o nome.
  Conferir que a sessão está mesmo viva: sem recarregar, navegar para
  **Clientes** pelo menu lateral. A lista precisa carregar normalmente — se ela
  vier vazia ou jogar para o login, a sessão caiu e o defeito voltou.
  Conferir depois que **nada foi trocado**: voltar ao perfil e trocar a senha
  **com a senha atual certa** (`Lex123456` → `Lex654321`), sair, entrar com a
  nova, e voltar a senha para `Lex123456`.
  Por que só olho humano: a suíte prova que a rota responde **422** e que uma
  requisição autenticada logo depois funciona. O que ela não prova é que a
  **tela** não se redesenha — o redirecionamento era `window.location.href`,
  uma navegação de página inteira, e isso não existe em `node --test`.
  Cruzar com o passo **12**, que REPROVOU em 17/08/2026 por este defeito.
  Fase de origem: F-2a

- [x] **192. O login com senha errada continua mostrando o erro, sem laço**
  **Validado em 21/08/2026 pelo Daniel. Passou. Reportado sem capturas.**
  Pré-condição: **deslogada**.
  O contrapeso do 191: o 401 do login **continua sendo 401**, porque ali não há
  sessão — é o pedido para criar uma. O que não pode acontecer é o interceptor
  reagir a ele.
  **▶ ONDE IR.** `/login`.
  Passos: entrar com `demo@lex.dev` e uma senha errada.
  Esperado: mensagem **"Credenciais inválidas"** no formulário. A tela **não
  pisca**, **não recarrega** e **não** mostra o toast "Sessão expirada".
  Conferir também em `/registrar`: abrir a tela **deslogada** e conferir que ela
  **fica** — o cadastro não pode ser interrompido por um redirecionamento.
  (Era o risco de tirar a exceção de rota do interceptor: a sondagem de
  `/auth/me` na subida do app devolve 401 para quem não entrou.)
  Por que só olho humano: a suíte prova a função de decisão com `(401, false)`.
  Que a **tela** não se mexa é outra coisa.
  Fase de origem: F-2a

- [x] **193. O rótulo inteiro da parcela na listagem, em 1024 px e em 360 px**
  **Validado em 21/08/2026 pelo Daniel. Passou. Reportado sem capturas.**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** Menu lateral → **Financeiro** → aba **Cobranças previstas**
  (é a listagem de Parcelas embutida; a tela é a mesma).
  **O defeito:** a coluna **"Nº Parcela"** exibia **"Parce…"**. A DEC-048
  alargou o texto de "1" para "Parcela 1 de 3" e a coluna continuou com a
  largura de um número (80 px).
  Passos: abrir em **1024 px** e depois em **360 px**.
  Esperado: o rótulo aparece **inteiro** — "Parcela 1 de 3", "Parcela 2 de 3" —
  sem reticências, **em uma linha só**, nas duas larguras. Em 360 px a tabela
  **rola de lado** dentro do próprio quadro; isso é o esperado, e é como as
  demais colunas já se comportam.
  **Conferir que a largura NÃO saiu da coluna de dinheiro** (regressão da
  F-1b.2): "Valor", "Recebido" e "Em aberto" continuam mostrando o valor
  inteiro, sem "R$ 3.50…". É o ponto mais importante do passo — o defeito que a
  F-1b.2 corrigiu era exatamente esse, e a correção de agora alarga uma coluna
  vizinha.
  Conferir a mesma coisa em **Parcelas** pelo menu direto, se houver caminho.
  Por que só olho humano: a suíte prova que `.col-parcela` tem 160 px e que a
  tela a usa. **Largura em pixel não é o mesmo que texto que coube** — a fonte
  real do navegador é que decide, e é isso que se olha.
  Fase de origem: F-2a

- [x] **194. ⭐ As gerações agrupadas, o plano vigente primeiro (DEC-051)**
  **Validado em 21/08/2026 pelo Daniel. Passou. Reportado sem capturas.**
  Pré-condição: o passo **187** já executado, ou qualquer honorário com **três
  gerações** de parcelas. Se não houver, o alvo do passo 187 (*Honorários
  advocatícios — fase inicial*) é reparcelado **duas vezes** e serve.
  **▶ ONDE IR.** Menu lateral → **Honorários** → abrir o honorário reparcelado
  duas vezes → bloco **Parcelas**.
  **O defeito:** as parcelas vinham ordenadas por **número**, e com a DEC-048
  (cada plano numera a partir de 1) as gerações se **intercalavam** — três
  linhas dizendo "Parcela 1", e a advogada caçando quais valem.
  Esperado: as parcelas aparecem em **grupos**, com um título em cima de cada:
  **"Plano vigente"** primeiro, e depois **"Substituídas pelo reparcelamento de
  DD/MM/AAAA"**, um grupo por geração, **da mais antiga para a mais recente**.
  Dentro de cada grupo, ordem numérica.
  **Conferir que nada sumiu:** as parcelas canceladas **continuam visíveis**,
  com o rótulo congelado ("de 2" no plano de 2) e o badge **"Reparcelada"**, como
  a DEC-048 exige. Contar: o número de linhas precisa bater com a contagem que
  o título do bloco **Parcelas** exibe.
  Conferir que a nota "Substituída pelo reparcelamento…" **não se repete** em
  cada linha — ela subiu para o título do grupo, que é de quem ela sempre foi.
  Conferir num honorário **nunca reparcelado** (ex.: *Assessoria tributária*
  antes de qualquer operação) que **não aparece título nenhum**: um título sobre
  uma lista única é ruído.
  Por que só olho humano: a suíte prova a ordem com três gerações, em função
  pura. O que ela não prova é se a advogada **acha** o plano vigente ao abrir a
  página — que é a pergunta que a DEC-051 existe para responder.
  Fase de origem: F-2a

- [x] **195. O seed sozinho basta — o rótulo nasce completo, sem migração**
  **Validado em 21/08/2026 pelo Daniel. Passou. Reportado sem capturas.**
  Pré-condição: nenhuma. **Este passo É a pré-condição sendo testada.**
  Passos: 1) rodar **`npm run seed:fresh`** e **mais nada** (em particular,
  **não** rodar `node scripts/migrarTotalParcelas.js`); 2) abrir **Financeiro →
  Cobranças previstas**; 3) abrir também um honorário qualquer com mais de uma
  parcela.
  Esperado: os rótulos já saem **"Parcela 1 de 3"**, "Parcela 2 de 3" etc. —
  completos, sem passo extra.
  **Conferir o determinismo**, que é o motivo de o campo ser gravado: abrir um
  honorário de 3 parcelas, **acrescentar uma quarta parcela**, e conferir que as
  **três primeiras continuam dizendo "de 3"**. Antes da F-2a elas passariam a
  dizer "de 4", porque o número era calculado na leitura — e o passo seguinte do
  roteiro encontraria um estado diferente do prometido.
  Por que só olho humano: a suíte prova `criarPlanoDeParcelas` e prova que o
  seed o usa. Rodar o seed **de verdade** ela não faz — ele escreve no banco de
  **desenvolvimento**, que é remoto e compartilhado.
  Fase de origem: F-2a



- [x] **196. ⭐ Desativar um processo diz QUANTOS participantes caem junto**
  **Validado em 22/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  **▶ ONDE IR.** Menu lateral → **Processos** → escolher um processo **com mais
  de um participante**. No seed, *Inventário e Partilha de Bens* (cliente
  **Maria Aparecida Costa**) tem litisconsórcio; confira na coluna **Cliente**,
  que mostra "Nome +N" quando há mais de um.
  Passos: 1) abrir o menu **⋮** da linha; 2) escolher **Desativar**; 3) **ler o
  modal antes de confirmar**; 4) cancelar; 5) repetir e confirmar.
  Esperado no modal: ele diz **quantos participantes saem junto**, com o número
  certo — conferir contra a coluna "Cliente" (o "+N" mais um). Diz também que
  **nada é apagado** e que dá para reativar depois.
  **O que NÃO pode aparecer:** a frase *"esta ação não pode ser desfeita"*. Ela
  existia até a F-2a e virou mentira quando a reativação passou a existir —
  prometer irreversibilidade numa ação reversível faz a advogada evitar uma
  operação segura.
  Conferir que o menu ⋮ oferece **"Desativar"** e **não "Excluir"**.
  Depois de confirmar: o processo **some da listagem** (o filtro está em
  "Somente ativos") e o toast diz que dá para reativar.
  Por que só olho humano: a suíte prova a contagem e prova a frase. O que ela
  não prova é se a advogada **lê o número a tempo** — o modal é a última tela
  antes de uma operação que derruba vários registros.
  Fase de origem: F-2b

- [x] **198. O ciclo: desativar → reativar → desativar → reativar**
  **Validado em 22/08/2026 pelo Daniel. Passou.**
  Pré-condição: o passo **197** executado, com o participante removido à mão
  ainda fora.
  **É o caso que expõe marca de cascata não limpa.** Se a reativação não
  apagasse a marca, o vínculo restaurado a carregaria para sempre — e uma
  remoção manual posterior dele o traria de volta sozinho na reativação
  seguinte.
  Passos: com o mesmo processo, repetir **desativar** e **reativar** mais uma
  vez inteira, e conferir os participantes ao fim.
  Esperado: o resultado do **segundo** ciclo é idêntico ao do primeiro — os
  mesmos voltam, e o removido à mão **continua fora**. Nenhum participante
  aparece a mais.
  Conferir também que a contagem do modal é a **mesma** nas duas voltas.
  Por que só olho humano: a suíte trava o ciclo. O que ela não trava é o
  acúmulo de estado na TELA — a listagem recarregada, o seletor de situação
  mantendo o valor, o menu ⋮ oferecendo a ação certa depois de cada volta.
  Fase de origem: F-2b

- [x] **199. ⭐ Reativar um cliente NÃO reativa os processos dele**
  **Validado em 22/08/2026 pelo Daniel. Passou.**
  Pré-condição: `npm run seed:fresh`.
  **A regra que a tela precisa dizer em voz alta**, senão a advogada reativa o
  cliente e presume que voltou tudo.
  **▶ ONDE IR.** Menu lateral → **Processos** e depois **Clientes**.
  Passos:
  1) escolher um cliente que tenha **exatamente um** processo — no seed, *João
     Paulo Oliveira* (*Execução Fiscal – IPTU*) serve;
  2) **desativar o processo** dele (a desativação do cliente é recusada
     enquanto houver processo ativo — conferir que essa recusa acontece e que a
     mensagem explica o motivo);
  3) ir em **Clientes** e **desativar o cliente**;
  4) trocar o seletor para **Somente desativados** e **reativar o cliente**;
  5) **ler o modal antes de confirmar**;
  6) ir em **Processos**, seletor em **Ativos e desativados**.
  Esperado no modal do passo 5: ele diz, com todas as letras, que **os
  processos NÃO voltam** e que cada processo se reativa por si.
  Esperado no passo 6: o cliente está **ativo**; o processo dele continua
  **desativado**, com a tag **"Desativado"** e a linha esmaecida.
  Conferir que a linha desativada é distinguível **sem depender de cor**: a tag
  tem texto, e é ela que sustenta a leitura numa impressão em preto e branco ou
  para quem não distingue matizes.
  Por que só olho humano: a suíte prova que a API não cascateia e que a frase
  existe. O que ela não prova é se a advogada **sai da tela sabendo** que
  precisa reativar o processo à parte — que é a pergunta inteira deste passo.
  Fase de origem: F-2b

- [x] **200. ⭐ 🚨 O comando destrutivo PARA e pergunta, dizendo o nome do banco**
  **Validado em 22/08/2026 pelo Daniel. Passou.**
  Pré-condição: nenhuma. **Fazer isto antes de confiar em qualquer `seed:fresh`
  daqui em diante.**
  **O defeito:** `npm run seed:fresh` derruba treze coleções e
  `node scripts/migrarTotalParcelas.js` troca um índice único — os dois contra o
  banco de desenvolvimento, que é **Atlas remoto e compartilhado**. Só o banco
  de teste tinha guarda, e **já aconteceu de um `seed:fresh` apagar dados no
  meio de uma validação**.
  Passos: 1) no terminal do backend, rodar **`npm run seed:fresh`**; 2) **ler o
  aviso**; 3) responder **qualquer coisa errada** (por exemplo `s`, ou `sim`);
  4) rodar de novo e responder **o nome do banco** exatamente como exibido.
  Esperado no passo 2: o comando **PARA** e mostra um aviso que diz o **nome do
  banco alvo**, que ele **não é local**, e que a operação é destrutiva.
  **A URI não pode aparecer** — nem inteira, nem mascarada: ela carrega usuário
  e senha do cluster.
  Esperado no passo 3: o comando **CANCELA**, dizendo que nada foi alterado. Ir
  ao sistema e conferir que **os dados continuam lá**.
  Esperado no passo 4: aí sim ele roda.
  Conferir também `node scripts/migrarTotalParcelas.js --dry-run`: ele **não**
  pergunta, porque não escreve nada — é o modo que existe para olhar antes de
  agir.
  Por que só olho humano: a suíte prova a classificação local/remoto e prova que
  os scripts chamam a guarda. **Ela não pode rodar o comando de verdade** — ele
  escreve no banco de desenvolvimento, que é o que se está protegendo.
  Fase de origem: F-2b


> **Sessão de 22-24/08/2026 — os cinco passos que a F-2c deixou pendentes.**
> O Daniel executou **184, 201, 202, 203 e 204**. **Os cinco passaram**, e três
> vieram com anotação — as três viraram trabalho na F-2d:
>
> • o **184** achou a palavra velha em mensagem de aviso (Parte 6.1);
> • o **201** relatou a rigidez da desativação de cliente (Parte 6.2);
> • o **204** achou **um órfão real** no banco de desenvolvimento (Parte 5).
>
> As anotações estão preservadas no corpo de cada passo, com o veredito da
> F-2d ao lado.

- [x] **201. ⭐ 🚨 Reativar um processo cujo cliente está desativado é RECUSADO, e a recusa diz o nome**
  Pré-condição: `npm run seed:fresh`. **É o passo que a fase existe para ter.**
  **▶ ONDE IR.** Menu lateral → **Processos**, depois **Clientes**, depois
  **Processos** de novo.
  **A ordem importa**: o cliente só pode ser desativado quando não participa de
  processo ativo nenhum, então o processo sai primeiro. É exatamente esse
  caminho que produz o órfão.
  Passos:
  1) escolher um cliente com **um só** processo — no seed, *João Paulo
     Oliveira* (*Execução Fiscal – IPTU*) serve;
  2) em **Processos**, **desativar** o processo dele;
  3) em **Clientes**, **desativar** o cliente;
  4) voltar a **Processos** e pôr o seletor de situação em **Somente
     desativados**;
  5) abrir o menu **⋮** da linha do processo e **olhar o item "Reativar" sem
     clicar**.
  Esperado no passo 5: o item **"Reativar" aparece DESABILITADO, com o motivo
  ao lado**, e o motivo **nomeia o cliente**: *"O cliente João Paulo Oliveira
  está desativado. Reative o cliente primeiro."*
  **O item NÃO pode sumir do menu.** Botão ausente faz procurar — quem não acha
  "Reativar" conclui que o sistema perdeu a função. Botão desabilitado com
  explicação ensina.
  **Conferir pelo TECLADO:** chegar ao item com **Tab** a partir do gatilho ⋮.
  Ele precisa **receber foco** e ser anunciado como desabilitado — um motivo
  que só o mouse alcança não foi escrito para quem mais depende de texto.
  Conferir também que **Enter** e **Espaço** sobre ele **não fazem nada**.
  Por que só olho humano: a suíte prova que a frase nomeia o cliente e que o
  item nasce bloqueado. O que ela não prova é se a advogada **sai da tela
  sabendo o que fazer** — que é a pergunta inteira do passo.
  Fase de origem: F-2c

  **Validado em 22-24/08/2026 pelo Daniel. Passou.**
  > **Anotação dele, e ela virou a Parte 6.2 da F-2d:** *"tive que desativar
  > todos os processos que o cliente estava vinculado, mesmo o que ele não é o
  > principal, para poder desativar."*
  >
  > **Levantado, e o veredito foi MANTER a rigidez.** A guarda de
  > `deleteClient` olha QUALQUER vínculo ativo, sim — litisconsorte bloqueia
  > igual ao autor. Mas afrouxá-la para o principal criaria órfão, e pela porta
  > mais discreta: `ProcessoCliente` tem **dois pais**, e um cliente desativado
  > com vínculo de litisconsorte ainda ativo é registro ativo sob pai inativo —
  > o `auditarOrfaos.js` o listaria como `Vínculo processo-cliente → Cliente`.
  > A rigidez não é efeito colateral de olhar a junção: é o que a invariante da
  > DEC-053 exige de quem olha a junção.
  >
  > **O que ERA defeito, e foi corrigido:** a saída correta nunca foi desativar
  > o processo do terceiro — é **DESVINCULAR** o cliente dele, por
  > `DELETE /api/processes/:id/clientes/:clienteId`. A mensagem já mandava
  > desvincular, mas **não dizia de quais processos**, e por isso o caminho mais
  > curto pareceu ser desativar tudo. Agora ela **nomeia os processos**, diz o
  > **papel** do cliente em cada um (é ali que mora a surpresa do
  > litisconsórcio) e afirma que **não é preciso desativar o processo**.
  > Ver o passo **209**.

- [x] **202. ⭐ Reativar o cliente e ENTÃO o processo — o caminho correto continua aberto**
  Pré-condição: o passo **201** executado, com os dois desativados.
  **Tão importante quanto a recusa.** Uma guarda que fechasse a reativação
  legítima transformaria um órfão em dois registros mortos.
  Passos:
  1) em **Clientes**, seletor em **Somente desativados**, **reativar o
     cliente**;
  2) voltar a **Processos**, seletor em **Somente desativados**;
  3) abrir o **⋮** da linha do processo.
  Esperado no passo 3: **"Reativar" agora está habilitado**, sem motivo ao
  lado. Ao clicar, o modal abre normalmente, diz quantos participantes voltam,
  e a reativação **funciona**.
  Conferir ao fim: com o seletor em **Ativos e desativados**, o processo está
  **ativo** e sem a tag "Desativado".
  **Se "Reativar" continuar desabilitado depois de o cliente voltar, PARE** — a
  tela está lendo um estado velho, e a advogada não tem como sair dele.
  Por que só olho humano: a suíte prova a sequência pela API. O que ela não
  prova é que a **listagem se atualiza** entre as duas telas, que é onde um
  estado velho apareceria.
  Fase de origem: F-2c

  **Validado em 22-24/08/2026 pelo Daniel. Passou.**

- [x] **203. Criar um honorário num processo desativado é recusado, nomeando o processo**
  Pré-condição: `npm run seed:fresh`. **A segunda boca da DEC-053** — pela qual
  o órfão **nasce** em vez de ressuscitar.
  **▶ ONDE IR.** Menu lateral → **Processos**, depois **Financeiro** → **Nova
  Cobrança** / cadastro de honorário.
  Passos: 1) **desativar** um processo qualquer; 2) tentar **criar um
  honorário** apontando para ele.
  Esperado: a criação é **recusada**, e a mensagem **nomeia o processo** —
  *"Não é possível criar: o processo &lt;título&gt; está desativado. Reative o
  processo primeiro."*
  **O que NÃO pode aparecer:** *"Processo não encontrado"*. Ele existe, e a
  advogada acabou de vê-lo na listagem com a tag "Desativado" — mandar procurar
  o que não está perdido é o defeito que esta fase corrigiu.
  Conferir também, se a tela oferecer um seletor de processo: que o processo
  desativado **não apareça** entre os selecionáveis. Se aparecer, a recusa do
  servidor continua correta, mas a tela ofereceu o que seria recusado — anotar.
  Por que só olho humano: a suíte prova a recusa e a mensagem pela API. O que
  ela não prova é **por onde a advogada chega** à tentativa, nem se a tela a
  deixa chegar.
  Fase de origem: F-2c

  **Validado em 22-24/08/2026 pelo Daniel. Passou.**

- [x] **204. 🚨 O script de auditoria LISTA os órfãos e não altera nada**
  Pré-condição: uma base com pelo menos um órfão. Se não houver, o passo **201**
  cria um — pare-o no passo 3 (processo e cliente desativados) e **não** siga
  para o 202.
  **O script não conserta, e isso é decisão.** Corrigir automaticamente
  significaria escolher, sem saber, entre **desativar o filho** e **reativar o
  pai** — e as duas podem ser a errada. Essa escolha é da advogada.
  Passos:
  1) no terminal do backend, rodar **`npm run auditar:orfaos`**;
  2) **ler o cabeçalho**;
  3) **ler a lista**;
  4) **conferir no sistema** que nada mudou: abrir Processos e Clientes e ver
     que os mesmos registros continuam ativos e desativados como estavam.
  Esperado no passo 2: o cabeçalho diz o **nome do banco** e a frase *"Este
  script SOMENTE LÊ"*. **A URI não pode aparecer** — nem inteira, nem mascarada:
  ela carrega usuário e senha do cluster.
  Esperado no passo 3: cada órfão sai com a **relação** (`Processo → Cliente`),
  o **filho ATIVO nomeado** e o **pai INATIVO nomeado**. Um relatório de
  identificadores obrigaria a advogada a procurar cada um no banco, e aí não
  seria entregável.
  Esperado no passo 4: **nada mudou.** O script não pergunta nada, não pede
  confirmação e **não tem a guarda de banco** dos comandos destrutivos — porque
  não é destrutivo. Se ele PERGUNTAR o nome do banco, alguém pôs guarda onde
  não precisa; se ele ALTERAR alguma coisa, alguém tirou a guarda de onde
  precisa. **Os dois são defeito.**
  Conferir também que o mesmo processo desativado sob cliente desativado
  aparece **duas vezes** na lista: uma como `Processo → Cliente (principal)` e
  outra como `Vínculo processo-cliente → Cliente`. São dois registros ativos
  sob o mesmo pai inativo, e é a segunda — a que não vem à cabeça — que a
  auditoria existe para achar.
  Por que só olho humano: a suíte roda o script e compara o banco antes e
  depois. O que ela não prova é se o **relatório é legível** para quem vai
  decidir o que fazer com cada linha.
  Fase de origem: F-2c

  **Validado em 22-24/08/2026 pelo Daniel. Passou.**
  > **UM ÓRFÃO REAL ENCONTRADO**, e ele é insumo da F-2d:
  >
  > ```
  > Documento → Processo
  >   filho ATIVO   : Peticao de Suspensao da Execucao   [6a8c4965e2ed6915acce13fc]
  >   pai   INATIVO : Execucao Fiscal - IPTU             [6a8c4965e2ed6915acce13ec]
  > ```
  >
  > As outras seis relações estavam limpas. **Documento tinha ficado de fora** da
  > passagem da F-2c: a pergunta era se a cascata não o alcança ou se ele
  > escapou dela, e os carimbos do banco responderam — documento criado às
  > 13:38:45, processo desativado às 13:48:05 com `vinculosAfetados: 1`. **A
  > cascata não o alcança**: `deleteProcess` derruba os vínculos
  > processo↔cliente e mais nada, por decisão da DEC-052. O órfão NASCEU da
  > desativação.
  >
  > A lacuna real era outra: a criação sob processo inativo já era recusada, mas
  > com **404 "Processo não encontrado"** — literalmente a frase que a DEC-053
  > nomeou como o defeito. A F-2d passou as três portas do módulo para
  > `assertProcessoAtivoParaCriar`. Ver o passo **210**.
  >
  > **O órfão FICA no banco de desenvolvimento, de propósito.** Ele não é
  > consertado por script — a escolha entre desativar o filho e reativar o pai é
  > da advogada, e essa regra não muda. Ele fica como **caso vivo**: prova que a
  > auditoria continua achando, enquanto os testes provam que um novo não pode
  > mais nascer com a mensagem errada. **Quem for limpar o banco de
  > desenvolvimento, leia isto antes.**
  >
  > **ATUALIZAÇÃO — F-4 (25/08/2026).** Este órfão **não existe mais**: a F-4
  > roda `seed:fresh` e o banco de desenvolvimento foi refeito. Nada se perdeu.
  > O passo **210**, que era o único a depender dele, foi **reescrito para
  > fabricar o próprio órfão** — o seed reconstrói o mesmo par (*Peticao de
  > Suspensao da Execucao* sob a *Execucao Fiscal - IPTU*), e basta desativar o
  > processo para o órfão nascer de novo, pelo caminho do produto. A lição fica
  > registrada: **guardar caso de teste dentro do banco de desenvolvimento é
  > guardá-lo no lugar mais volátil que existe.** Ver a Parte 0 da F-4.

- [x] **205. ⭐ 🚨 A fase anda para a FRENTE e para TRÁS — recursos → conhecimento inclusive**
  Pré-condição: `npm run seed:fresh`. **É o passo que a fase existe para ter.**
  **▶ ONDE IR.** Menu lateral → **Processos** → **⋮ → Gerenciar** num processo
  qualquer → a seção **"Andamento do processo"**.
  Passos:
  1) conferir que o seletor **"Mudar a fase"** oferece **as quatro**: *Fase de
     conhecimento*, *Sentença*, *Execução*, *Recursos*;
  2) levar o processo até **Recursos** (pode ser em uma ou em várias mudanças);
  3) **voltar** para **Fase de conhecimento**;
  4) ir para **Execução**;
  5) voltar para **Sentença**.
  Esperado: **todas as cinco mudanças funcionam**, sem aviso, sem confirmação e
  sem nenhuma opção desabilitada no seletor.
  **NENHUMA opção pode aparecer cinza, riscada ou bloqueada.** Se alguma
  aparecer, alguém inventou uma máquina de estados — e ela disse *"sim, pode
  voltar"*. **Isso é reprovação do passo**, não observação.
  Conferir também que o **rótulo é o da lista**: nunca `conhecimento` cru, nunca
  `Sentenca` sem cedilha, nunca `Fase_de_conhecimento`.
  Por que só olho humano: a suíte prova as 16 transições pela API e prova que
  nenhuma opção do JSX é desabilitada. O que ela não prova é se a advogada
  **percebe que pode voltar** — que é a pergunta inteira do passo.
  Fase de origem: F-2d

  **Validado em 28/08/2026 pelo Daniel. Passou.**
- [x] **206. ⭐ Salvar a mudança de fase SEM motivo**
  Pré-condição: `npm run seed:fresh` **uma vez**, e o passo **205**
  executado depois dele. **Não rode `seed:fresh` entre o 205 e este** — o
  encadeamento é dentro da mesma rodada semeada.
  *"Não precisa anotar o porquê, só se ela quiser mesmo."*
  Passos: 1) escolher outra fase; 2) **deixar o campo "Motivo" totalmente
  vazio**; 3) clicar em **Mudar fase**.
  Esperado: a mudança **acontece**. Sem erro, sem asterisco vermelho, sem
  "campo obrigatório", sem o botão desabilitado enquanto o campo está vazio.
  Conferir que a etiqueta do campo diz **"Motivo (opcional)"** — um campo sem
  `required` mas sem aviso ainda parece obrigatório para quem está preenchendo.
  Depois: mudar de novo, **agora com motivo**, e conferir que ele é guardado
  como foi escrito.
  Por que só olho humano: a suíte prova que a API aceita as três formas do vazio.
  O que ela não prova é se a tela **parece** exigir — e um campo que parece
  obrigatório é obedecido como se fosse.
  Fase de origem: F-2d

  **Validado em 28/08/2026 pelo Daniel. Passou.**
- [x] **221. ⭐ 🚨 A DATA QUE NÃO MUDA DE DIA — o passo mais importante da fase**
  Pré-condição: `npm run seed:fresh`. **É o passo que a fase inteira existe
  para ter.**
  **▶ ONDE IR.** **Agenda** → criar compromisso.
  Passos:
  1) criar um compromisso com **Título** livre e **Data = 01/09/2026**, sem
     hora;
  2) salvar e voltar à agenda, em **setembro de 2026**;
  3) conferir **em que casa da grade** ele caiu;
  4) abrir o compromisso de novo e olhar o campo **Data**;
  5) **mudar o fuso do sistema operacional** para um fuso a **leste** (por
     exemplo, `Europe/Lisbon` ou `Asia/Tokyo`), **recarregar a página**, e
     repetir os passos 3 e 4;
  6) voltar o fuso para o de origem.
  **A DATA NOMEADA E O DIA DA SEMANA ESPERADO:**
  > **01/09/2026 é uma TERÇA-FEIRA.**
  Esperado no passo 3: o compromisso está na casa do **dia 1**, na coluna
  **ter**. Não no dia 31 de agosto (segunda), não no dia 2 (quarta).
  Esperado no passo 4: o campo mostra **01/09/2026**.
  Esperado no passo 5: **exatamente o mesmo**, no outro fuso. Nada se move.
  **🚨 O QUE NÃO PODE ACONTECER:** o compromisso aparecer em **31/08/2026,
  segunda-feira** (o modo de falha a oeste de Greenwich) ou em **02/09/2026,
  quarta-feira** (a leste). **Se mudar de dia, é reprovação, e a fase volta.**
  A razão: **data sem hora não é um instante, é uma casa do calendário.** Um
  instante precisa de um fuso para virar dia, e é o fuso inventado que produz o
  deslocamento. Por isso a data cruza a rede como texto `AAAA-MM-DD` e é
  gravada em meia-noite UTC, como `dataVencimento` já é desde a Fase 4.
  Repetir com uma parcela: conferir que o **vencimento** de uma parcela aparece
  na agenda **no mesmo dia** que aparece na tela de Parcelas. Se as duas telas
  discordarem sobre o mesmo vencimento, é o mesmo defeito visto de outro lado.
  Por que só olho humano: a suíte grava e lê 01/09/2026 em dois fusos e confere
  o instante no banco. O que ela não pode fazer é trocar o fuso do **sistema
  operacional e do navegador** — que é onde a advogada de fato está.
  Fase de origem: F-3

  **Validado em 28/08/2026 pelo Daniel. Passou.**
- [x] **227. ⭐ 🚨 UMA COMARCA QUE NÃO EXISTE, DIGITADA E SALVA ASSIM MESMO**
  Pré-condição: `npm run seed:fresh`. **É O PASSO QUE A FASE INTEIRA EXISTE
  PARA TER.** Se só um passo desta fase for executado, que seja este.
  **▶ ONDE IR.** **Processos** → **Novo processo** → campo **Comarca**.
  Passos:
  1) preencher o processo normalmente (título e cliente);
  2) no campo **Comarca**, digitar **`Comarca de Marte`** — que não está na
     tabela e nunca vai estar;
  3) ler o que a tela diz;
  4) **clicar fora do campo**, e voltar a olhá-lo;
  5) **salvar o processo**;
  6) abrir o processo salvo e conferir a comarca;
  7) repetir com **`Ponta Grosa`** (um "s" só) — um erro de digitação de
     verdade, que também tem que passar.
  Esperado no passo 3: aparece uma frase dizendo que **nada na lista casa** e
  que **pode salvar assim mesmo**. Nenhuma cor de erro, nenhum campo vermelho,
  nenhum aviso de valor inválido — **não há nada errado acontecendo**.
  Esperado no passo 4: **o texto continua lá, intacto.** 🚨 Se ao sair do campo
  ele **limpar**, **reverter** ou **trocar pela sugestão mais parecida**, é
  **reprovação do passo** — é exatamente a "melhoria" que a fase existe para
  impedir.
  Esperado no passo 5: **salva.** Sem erro de validação, sem mensagem, sem
  bloqueio do botão.
  Esperado no passo 6: a comarca gravada é **`Comarca de Marte`**, letra por
  letra.
  🚨 **O que NÃO pode acontecer, em nenhum dos sete passos:** o botão de salvar
  desabilitado; uma mensagem do tipo *"escolha uma opção da lista"*; o campo
  exigindo valor da tabela; o valor sumindo. **Qualquer um desses reprova a
  fase, não só o passo.**
  Conferir também o mesmo com **Profissão** ("Encantador de serpentes") e
  **Nacionalidade** ("marciana") no cadastro de cliente PF: a regra é do
  componente, e vale nos cinco campos.
  Por que só olho humano: a suíte prova que não existe caminho de recusa no
  código, e a mutação que introduz um `onBlur` de limpeza derruba o teste. O
  que ela não prova é se **a advogada percebe que pode salvar** — se a frase do
  estado vazio convida ou assusta.
  Fase de origem: F-4

  **Validado em 28/08/2026 pelo Daniel. Passou.**

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
