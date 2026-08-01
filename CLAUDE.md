# CLAUDE.md — LEX Frontend

> Contexto técnico fixo para sessões com Claude Code neste repositório.
> Leia antes de qualquer análise ou edição.
>
> **O contrato da API mora no `CLAUDE.md` do backend**, que é o documento
> principal do projeto. Este arquivo cobre o que é decisão de **interface**, e
> não repete o que já está lá.
>
> Criado na Fase 4.2. Até então as convenções de interface viviam espalhadas
> entre o `README.md` e o `docs/validacao-manual.md`, e o `CLAUDE.md` do backend
> registrava a ausência como dívida conhecida.

---

## Stack

React 19 + Vite 7 + React Router 7, **CSS puro** (sem Tailwind, sem CSS-in-JS).
`axios` para HTTP, `recharts` para os gráficos do dashboard, `lucide-react` para
ícones. Testes em `node --test`, **sem DOM e sem testing-library**.

Sessão da advogada por cookie httpOnly `lex-token`; portal do cliente por
`lex-portal-token`, com instância de axios, contexto e layout próprios.

---

## Convenções fixas

- Arquivos e funções em **inglês**; campos que vêm do banco em **português**.
- **Erro de API só pelos helpers de `utils/apiError.js`.** Nenhuma tela abre
  `err.response.data`. Roteamento por **status** HTTP é outra coisa, legítima, e
  está restrito a duas telas — travado em `tests/financial/estatica.test.js`.
- **Payload explícito, campo a campo.** Nunca `{ ...formData }`: é o spread que
  faz um campo somente-leitura entrar sozinho no dia em que alguém o
  acrescentar ao estado.
- **Campo apagado envia `null`**, nunca `undefined` nem string vazia.
- Máscaras (`utils/masks.js`), formatadores (`utils/formatters.js`) e
  vocabulários (`utils/enums.js`) são **fonte única**. Rótulo repetido em duas
  telas é rótulo que vai divergir.
- **A tela nunca é mais rígida que a API.** Formatar enquanto se digita é
  permitido; recusar o que o servidor aceitaria, não. Validação de tela existe
  para poupar uma viagem, não para inventar regra.
- **Toda classe CSS aplicada precisa de regra alcançável pela própria tela** —
  a folha é importada pelo componente que a usa, não pelo layout que o monta.
  Varredura em `tests/css/appliedClasses.test.js`.

---

## Módulo financeiro — o contrato consumido (Fase 4.2)

A Fase 4.1 reescreveu o contrato no backend; a 4.2 é a tela. **Nada aqui é
decisão do frontend** — é o que a API impõe, e está detalhado no `CLAUDE.md` do
backend (DEC-027 e DEC-028).

### O `tipo` do honorário comanda o formulário

| Tipo | `valor` | `percentual` / `valorBase` |
|---|---|---|
| `fixo`, `custas` | **entrada** | não renderizados, enviados como `null` |
| `percentual` | **exibição derivada** | entrada, obrigatórios |

A regra vive em **`utils/feeCalc.js`**, em função pura, e não dentro do JSX. Não
é organização: a suíte é `node --test` sem DOM, e regra dentro de componente só
se testaria por varredura de texto — que prova que a linha existe, não que a
conta está certa.

**`valor` derivado é exibição, não entrada, e nunca vai no payload.** A conta é
a mesma do hook: `Math.round(valorBase × percentual) / 100`. A ordem importa —
`valorBase` e `valor` estão em **reais** e `percentual` em pontos percentuais,
então `base × percentual` já é o valor em **centavos**; arredondar ali e dividir
depois faz 33,33% de 1.000 sair `333,30`, e não `333,3000000000001`. O backend
descarta o que vier em `valor` num honorário percentual, de propósito: ali o
valor não é opinião, é conta.

Conta impossível exibe **`"—"`**, nunca `"R$ 0,00"` — zero parece um valor
combinado.

**Trocar de `percentual` para `fixo`/`custas` envia `null` nos dois campos.**
Omiti-los deixaria o percentual antigo gravado, e o hook recusaria com
"honorário do tipo fixo não admite percentual" — sobre um campo que já não está
na tela, num erro que a advogada não teria como entender nem corrigir.

### `valorPago` da parcela é somente leitura

Um único ponto de escrita no backend, e **400 com `campo: "valorPago"`** para
quem o mandar no corpo. A tela o exibe (junto com o em aberto) e não o oferece
para edição: o caminho para mudar aquele número é registrar um pagamento.

### `cancelado` é o único status que a tela escreve

Os outros três (`pendente`, `parcialmente_pago`, `pago`) são **derivados das
parcelas** (DEC-028) e qualquer valor enviado é reconciliado. Por isso **não há
`<select>` de status** no formulário de honorário — ele existia e estava errado:
prometia um controle que não existe, e marcar "pago" à mão seria desfeito pelo
próximo recálculo, em silêncio. O cancelamento é ação deliberada, com o efeito
escrito ao lado; os demais são badge somente leitura.

Descancelar é escrita explícita e devolve o registro à derivação — sem isso a
guarda de `recalcularStatusFee` deixaria o honorário preso para sempre.

### As chaves estruturadas dos erros

`utils/financialErrors.js` compõe o que só as chaves sabem dizer, **nunca por
regex sobre a mensagem** (foi assim que a Fase 1.3 quebrou):

| Situação | Chaves | O que a tela acrescenta |
|---|---|---|
| 409 excedente | `regra`, `saldoDisponivel`, `valorParcela`, `campo` | **quanto ainda cabe** — a pergunta seguinte da advogada |
| 409 integridade | `dependencia`, `quantidade` (sem `campo`) | quantos dependentes, no singular certo |
| 422 pendências | `errors.pendencias[]` | o **rótulo** escrito pelo backend, nunca a chave técnica |
| 400 de campo | `campo` | destaca o input; a mensagem do hook já é a redação final |

Saldo zero tem frase própria: "ainda cabem R$ 0,00" convidaria a tentar de novo
com um centavo.

---

## O recibo

`GET /api/payments/:id/recibo`. Baixado por **blob + `<a download>` temporário**,
com o nome vindo do `Content-Disposition` — legível só porque a rota o expõe em
`Access-Control-Expose-Headers`.

**Não se abre a URL crua em nova aba.** O cookie é httpOnly e quem o carrega é o
axios; e um pagamento desativado mostraria a tela de erro do navegador em vez da
mensagem tratada.

**Pagamento desativado não mostra botão.** A rota responde 404 de propósito —
recibo de pagamento estornado é justamente o papel que não pode existir.

A extração do nome mora em **`utils/download.js`**, usada pelo recibo **e** pelo
download de documento. Vivia duplicada e ia ganhar uma terceira cópia.

---

## A ficha financeira EXIBE, não recalcula

`GET /api/financeiro/processos/:processoId`, em
`components/financeiro/ProcessFinancialSheet.jsx`.

Os totais vêm calculados do backend, nos três níveis. **Somar aqui seria somar o
que foi baixado**: no dia em que a ficha ganhar recorte ou paginação, o total
viraria o do recorte, continuaria batendo com as linhas visíveis e estaria
errado — sem ninguém notar. `emAberto` já vem pronto, inclusive por parcela.

**A resposta não usa o envelope de listagem.** É
`{ processo, totais, honorarios, geradoEm }`, sem `data`/`page`/`total`, porque
ali não há listagem: há um processo, uma árvore embaixo e três totais em cima.
Não escrever `res.data.data ?? res.data`.

**Honorário cancelado** fica fora de `totais.contratado` e dentro da lista,
atenuado, com contagem própria. Somá-lo faria a advogada ler como devido um
valor que ela mesma cancelou; escondê-lo apagaria o histórico.

Consequência prática, registrada no passo 107 do roteiro manual: como a tela não
recalcula, **um erro de soma do backend chegaria intacto** e nenhum teste de
frontend o pegaria. A conferência com calculadora é a única verificação
independente desse número.

---

## `PUT` foi eliminado das três rotas financeiras

`/fees`, `/installments` e `/payments` atualizam por **`PATCH`**. No backend o
`PUT` sobrevive como alias depreciado; mantê-lo vivo no cliente é o que faz um
alias "temporário" durar cinco fases. Varredura em
`tests/financial/estatica.test.js` — a regressão passaria despercebida
justamente porque voltar a usá-lo **não quebra nada**.

---

## Portal do cliente (Fase 3.2)

Mesmo app, sob `/portal/*`, tudo em `lazy()` com chunk próprio. **Instância de
axios separada** (`api/portalAxios.js`): o interceptor da advogada reage a
qualquer 401 com navegação de página inteira para `/login`, e o portal responde
401 em dois casos normais — um cliente que errasse a senha seria arremessado
para o login da advogada sem ver a própria mensagem.

**Sem nada financeiro no portal**, por decisão mantida na Fase 4.1.

Detalhes e os 12 pontos da DEC-029 estão no `CLAUDE.md` do backend.

---

## Tabela de largura estável — o padrão reutilizável (Fase 4.3)

**Nenhuma listagem do app pode ter texto atravessando célula.** O padrão vive
em `styles/modules.css` e se aplica em três peças:

| Peça | O que faz |
|---|---|
| `.data-table--fixed` | `table-layout: fixed` + `overflow: hidden` nas células |
| `<colgroup>` com `.col-*` | declara a largura de cada coluna |
| `.cell-truncate` | corta o texto com reticências |

**Quem aplica `data-table--fixed` PRECISA declarar o `<colgroup>`.** Sem ele,
o layout fixo divide a largura em partes iguais e a coluna de ações recebe o
mesmo tanto que a de status.

### O defeito que originou o padrão

A Biblioteca de Seções tinha `max-width: 40ch` na célula do trecho inicial,
junto com o `white-space: nowrap` que **toda** célula de `.data-table` herda.
Com `table-layout: auto` (o padrão), a coluna é dimensionada pelo conteúdo, e
conteúdo que não pode quebrar tem largura mínima igual à frase inteira. O
`max-width` não encolhe a frase: encolhe a **caixa**, e o texto sai por cima da
célula seguinte. Era por isso que o trecho invadia a coluna "Variáveis" e o
número encostava nos botões.

**`max-width` sozinho nunca resolve isso** — nem com `overflow: hidden`, porque
em layout automático a largura da coluna continua sendo negociada pelo conteúdo
de todas as linhas. Só `table-layout: fixed` decide a largura **antes** de ler
o conteúdo, e é isso que faz `text-overflow: ellipsis` passar a valer.

**As reticências precisam levar a algum lugar.** Na Biblioteca de Seções, o
texto completo está no "Ver" que já existia. Reticências que não levam a lugar
nenhum escondem informação.

**A rolagem horizontal é do `.table-wrapper`, nunca da página.** `max-width:
100%` no wrapper é o que impede a tabela de empurrar o container: sem ele,
`width: 100%` num filho mais largo que o pai faz o pai crescer junto, e quem
rola é o documento inteiro — com o cabeçalho e o menu saindo de vista.

As sete listagens usam o padrão: clientes, processos, seções, documentos,
honorários, parcelas e pagamentos.

---

## Cor de gráfico É cor de badge — `utils/statusVisual.js` (Fase 4.3)

Fonte **única** de rótulo e cor por status, consumida pelo `StatusBadge` **e**
pelos donuts do dashboard.

```
status → { label, tom }        tom → var(--color-…)
                               success → --color-success
                               warning → --color-warning
                               danger  → --color-danger
                               info    → --color-info
                               neutral → --color-text-secondary
```

**Havia dois mapas escritos à mão, e eles já tinham divergido:** `ativo` era
`success` (verde) no badge e `--color-accent` (dourado) no donut; `parcial` era
`info` (azul) no badge e dourado no donut. E os dois esqueceram
`parcialmente_pago`, que nasceu na DEC-028 — o badge do honorário exibia a
**string crua do enum**, com sublinhado, em cinza de "status desconhecido".

**A regra é: o gráfico se ajusta ao badge**, nunca o contrário. O badge é o que
a advogada vê o dia inteiro nas listagens; o donut é consulta ocasional.

**A cor da fatia é o TEXTO do badge, não o fundo.** O badge pinta fundo
esmaecido (`--color-*-bg`, 10% de alpha) e texto em cor plena. Numa fatia de
donut, um fundo de 10% seria cinza para qualquer olho — a cor que a pessoa
identifica como "a cor do Vencido" é a do texto.

`neutral` é o único tom sem `--color-neutral`: o cinza legível do projeto é o
do texto secundário, e é ele que o badge neutro já usa.

**A legenda é escrita à mão, não o `<Legend>` do Recharts.** Precisa de
quantidade ao lado do rótulo e das classes do projeto; o `<Legend>` daria um
`<ul>` com estilo próprio para sobrescrever peça a peça.

`tests/dashboard/graficos.test.js` trava as duas pontas — que cada tom tem
regra `.status-badge--<tom>` e variável CSS declarada — e varre o componente
de gráfico para que ele **não reintroduza um mapa de cor próprio**.

---

## `MoneyInput` — entrada de dinheiro em pt-BR (Fase 4.3)

`components/ui/MoneyInput.jsx`, com a regra em `utils/masks.js`. Substitui o
`<input type="number" step="0.01">` dos **quatro** campos de dinheiro:
`valor` e `valorBase` do honorário, `valor` da parcela, `valorPago` do
pagamento.

**O contrato não mudou nada no payload.** `value` entra como **Number em
reais** (ou `null`/`''`) e `onChange` devolve **Number em reais ou `null`** —
exatamente o que os formulários já guardavam. `montarPayloadHonorario`
continua fazendo `Number(form.valor)`.

**`onChange` devolve o número, não o evento.** Um componente de máscara que
devolvesse evento obrigaria cada formulário a saber que aquele campo é
diferente — que é justamente o acoplamento que ele existe para tirar da tela.
Por isso os formulários ganharam um `handleValorChange` ao lado do
`handleChange` genérico.

**Apagar tudo devolve `null`, nunca 0.** `null` é "não informado" — a convenção
do projeto para campo apagado — e 0 seria uma cobrança de zero real. É disso
que `validarHonorario` depende para acusar "valor é obrigatório".

### Os três caminhos de entrada, e por que são três

| Caminho | Quem resolve | Regra |
|---|---|---|
| digitar | `maskMoney` | ponto é **sempre** milhar; só a vírgula é decimal |
| tecla `.` | `onKeyDown` do componente | vira vírgula na posição do cursor |
| colar | `parseMoney` | aceita `1.234,56` **e** `1234.56` |

**Por que o ponto não é tratado dentro de `maskMoney`.** A máscara é reaplicada
sobre a própria saída a cada tecla: com "1.500" na tela, digitar mais um zero
entrega `"1.5000"` a ela. Qualquer regra que tentasse adivinhar se aquele ponto
é decimal erra em algum caminho real — apagar o último dígito de "1.500"
entrega `"1.50"`, que por "ponto seguido de duas casas" viraria **R$ 1,50** em
vez de R$ 150,00. No evento de tecla não há palpite: houve um `.` pressionado,
numa posição conhecida. Foi um defeito real desta fase, pego pelo teste
"a máscara é idempotente e sobrevive à própria saída".

**A ambiguidade da colagem tem regra escrita.** `"1.234"` colado de uma
planilha brasileira é **mil duzentos e trinta e quatro**, não R$ 1,23: ponto
seguido de três dígitos é milhar. Ponto único seguido de 1–2 dígitos é decimal.
Com vírgula presente, a vírgula decide e todo ponto é milhar.

**O erro que este componente evita é de fator 100 e não tem sintoma** — o
número aparece formatado e correto na listagem, e a cobrança é que está cem
vezes errada. É por isso que `tests/financial/moeda.test.js` varre todas as
escritas plausíveis do mesmo valor.

**O "R$" fica fora do campo editável**, posicionado sobre ele. Dentro, o cursor
pode ser levado para antes do símbolo e a advogada digitaria "1R$500".

**`inputMode="decimal"`**, e não `numeric`: no iOS o `numeric` abre um teclado
**sem vírgula**, e o campo ficaria impossível de preencher com centavos.

---

## Testes

`npm test` → `node --test tests/`. **Sem DOM e sem dependência de render**, por
decisão registrada na Fase 2E.2: 77 passos de tela não justificavam `jsdom` e
uma testing-library entrando no projeto, e baixar o número do roteiro manual
inventando automação frágil seria pior que o passo manual honesto.

A consequência é a divisão de trabalho que a Fase 4.2 firmou:

| Bloco | Prova |
|---|---|
| `tests/financial/honorario.test.js` | a **conta**, executada de verdade |
| `tests/financial/erros.test.js` | os **quatro erros**, com o corpo real da API |
| `tests/financial/estatica.test.js` | que a **tela continua chamando** aquelas funções |
| `tests/financial/moeda.test.js` | a **máscara de moeda**, nos três caminhos de entrada |
| `tests/dashboard/graficos.test.js` | a **série e a legenda** dos gráficos, e a paridade badge ↔ fatia |
| `tests/css/appliedClasses.test.js` | que toda classe aplicada **alcança** regra |

As varreduras estáticas limpam comentários antes de analisar. Sem isso, um
comentário explicando "não se lê `err.response` direto" derrubaria a própria
varredura que o explica, e a saída óbvia seria apagar o comentário.

Módulo que precise ser testado pela suíte usa **extensão explícita** nos imports
relativos (`'./enums.js'`): o Vite resolve sem ela, `node --test` não.

---

## Limites permanentes

- **Nenhuma dependência nova** sem decisão explícita e registrada.
- Não alterar o contrato das rotas — divergência encontrada se **reporta**.
- **Não reescrever histórico publicado.** Sem `rebase`, `reset --hard` ou
  `push --force` sobre `main`.
- `git push` só com confirmação explícita.
- Não expor secrets, tokens ou strings de conexão. Não alterar `.env`.

---

## Registro de sessões

### Fase 4.2 — Financeiro na tela: campos condicionais, ficha, recibo e PATCH

**Resumo:** as telas financeiras passam a conhecer o contrato que a Fase 4.1
criou. Formulário de honorário comandado pelo `tipo`, `valorPago` somente
leitura, o saldo do 409 chegando à mensagem, recibo por blob, ficha financeira
no detalhe do processo e `PUT` eliminado. Frontend 65 → 149 testes. **Backend
não tocado.**

**Arquivos novos:** `CLAUDE.md` (este), `utils/feeCalc.js`,
`utils/financialErrors.js`, `utils/download.js`,
`components/financeiro/ProcessFinancialSheet.jsx` + `.css`,
`tests/financial/honorario.test.js`, `tests/financial/erros.test.js`,
`tests/financial/recibo.test.js`, `tests/financial/estatica.test.js`.

**Decisões**, com o porquê nos blocos acima: a regra do honorário extraída para
função pura, porque a suíte não tem DOM; `null` explícito ao sair do tipo
percentual; o `<select>` de status substituído por badge + ação de cancelar; a
ficha exibindo sem recalcular; a extração de filename unificada em
`utils/download.js`.

**Três premissas do roteiro que não se reproduziram**, reportadas e não
forçadas:

1. **Não existe máscara de moeda "já existente no padrão do projeto".** Os três
   formulários financeiros usam `<input type="number" step="0.01">` desde a Fase
   1, e `utils/masks.js` tem CPF, CNPJ, CEP e telefone — nenhuma de moeda.
   Criar uma só para `valorBase` deixaria dois jeitos de digitar dinheiro na
   mesma tela. Mantido o padrão real.
2. **`valor` e `valorBase` estão em REAIS, não em centavos.** O que é feito em
   centavos é o **arredondamento** (`Math.round(base × percentual)`), antes de
   dividir por 100. O `formatCurrency` do projeto sempre tratou o campo como
   reais, e o seed confirma: 6% sobre 200.000 grava 12.000.
3. **A numeração do roteiro manual não continua em 94.** São 93 passos
   *pendentes*, mas o maior número *usado* é 98. Os novos começam em **99**.

**Um desvio deliberado, com motivo:** o dashboard recebeu os totais de
`/financeiro/resumo` com os rótulos "Valor Contratado (total)", "Recebido
(total)" e "Em Aberto (total)" — e **não** "a receber no mês" e "total vencido",
que o roteiro pedia. O backend não expõe recorte mensal de valor a receber nem
valor (só contagem) de vencidos. Rotular "Em aberto" como "A receber no mês"
seria mais bonito e estaria errado, do tipo de erro que ninguém percebe até a
advogada planejar o mês com o número de todos os tempos.

**Um achado de passagem, corrigido porque estava no caminho:** o filtro de
status da listagem de honorários não tinha `parcialmente_pago` — o valor nasceu
na DEC-028 e o filtro ficou com os três antigos, escondendo a maioria dos
honorários em andamento.

**Não tocado:** backend (nenhum commit), contrato das rotas do portal,
`axiosConfig.js`, catálogo de variáveis. **Nenhuma dependência nova** —
`package.json` idêntico a `main`.

---

### Fase 4.3 — Tabelas, gráficos legíveis, cartões do mês e moeda

**Resumo:** a primeira fase nascida de uma sessão de **validação visual**. Três
defeitos que passaram por `lint`, `build` e pelas duas suítes sem que nada
acusasse — porque não eram erros de lógica, eram erros de leitura. Frontend
149 → 182 testes. Roteiro manual 104 → 120 passos.

**Arquivos novos:** `utils/statusVisual.js`, `utils/chartSeries.js`,
`components/ui/MoneyInput.jsx` + `.css`, `tests/financial/moeda.test.js`,
`tests/dashboard/graficos.test.js`.

**Alterados:** `styles/modules.css` (o padrão de tabela), as **sete** listagens
(`<colgroup>` + truncamento), `pages/secoes/SecaoPage.css` (o `max-width`
defeituoso), `pages/dashboard/DashboardCharts.jsx` (reescrito),
`pages/dashboard/DashboardHomePage.jsx` (cartões do mês e próximos
vencimentos), `pages/dashboard/DashboardPage.css`,
`components/ui/StatusBadge.jsx` (passa a ler a fonte única),
`utils/masks.js` e `utils/formatters.js` (moeda e mês), os **quatro** campos de
dinheiro dos formulários financeiros, `components/layout/Header.jsx` + `.css`
(breadcrumb), `pages/financeiro/FinanceiroPage.jsx`,
`pages/clients/ClientDetailPage.jsx` e `pages/processes/ProcessDetailPage.jsx`
(padrão de loading), `docs/validacao-manual.md`.

**Decisões**, com o porquê nos blocos acima: `table-layout: fixed` com
`<colgroup>` como único jeito de o truncamento valer; a cor do gráfico se
ajustando à do badge; o ponto decimal tratado no evento de tecla e não na
máscara; `mesReferencia` vindo do servidor.

**Dois cartões foram REMOVIDOS do dashboard, e é deliberado:**

- **"Pagamentos do Mês"** virou **"Recebido em {mês}"**. Era o cartão que abriu
  a fase: exibia "R$ 0,00" com o seed inteiro quitado em meses passados, e não
  havia como distinguir "não entrou nada neste mês" de "o número quebrou". O
  rótulo com o mês resolve a ambiguidade na própria frase, e o zero real ganhou
  a linha "nenhum recebimento no mês".
- **"Parcelas Vencidas"** foi absorvido por **"Total vencido"**, que traz valor
  e contagem juntos. Manter os dois deixaria dois números do mesmo assunto lado
  a lado, vindos de rotas diferentes e livres para divergir.

**Três defeitos encontrados no caminho, corrigidos porque estavam no caminho:**

1. **`parcialmente_pago` não existia em mapa nenhum.** O badge do honorário
   exibia a string crua do enum desde a DEC-028.
2. **O breadcrumb ignorava Seções e Financeiro** — quatro telas caíam no
   `return ['LEX']` do fim de `buildBreadcrumb` e ficavam sem trilha.
3. **`FinanceiroPage` tinha `loadingSummary` sem desenhar nada**: os quatro
   cartões apareciam de repente. Duas telas de detalhe usavam
   `<p>Carregando...</p>` em vez do `<Loading />` do projeto.

**Uma correção de premissa do roteiro:** ele pedia moeda em três formulários e
nomeava `valor`, `valorBase` e `valorPago`. São **quatro** campos em três
telas — a parcela também tem `valor`, e deixá-lo como `<input type="number">`
manteria dois jeitos de digitar dinheiro no mesmo módulo.

**Um desvio deliberado:** o título do gráfico de barras passou a ser
"Honorários **contratados** por mês **de cadastro**". A rota soma `Fee.valor`
agrupando por `createdAt` — é valor contratado, pelo mês em que a cobrança foi
registrada. "Honorários por mês" deixava a advogada livre para ler aquilo como
faturamento do mês. **O backend não foi alterado** para acompanhar o rótulo:
`getFeesByMonth` ainda inclui honorário cancelado, e isso ficou como achado
reportado, não como correção de passagem.

**Não tocado:** backend (nenhum commit deste repositório),
`axiosConfig.js`, telas do portal, contrato de payload de qualquer rota.
**Nenhuma dependência nova** — `package.json` idêntico a `main`.

---

## Rotina de encerramento de sessão

Antes de fechar qualquer sessão, peça:

> "Atualize o CLAUDE.md com o que foi feito hoje, os arquivos alterados,
> decisões tomadas, pendências e próximo passo recomendado."
