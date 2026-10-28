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
- **Flutuante dentro de tabela rolável vai em portal** (DEC-046). Menu,
  tooltip, popover, seletor de data: `createPortal` no `body` + `position:
  fixed` + `getBoundingClientRect()`. Nunca `absolute` dentro do wrapper —
  `overflow` recorta, e `z-index` não resolve recorte.
- **Rótulo de contagem chega no SINGULAR**; quem conjuga é
  `components/ui/plural.js`. "1 parcelas" foi defeito de verdade.
- **Rótulo de parcela sai de `installmentLabel.js`** (DEC-048). Nunca
  `Parcela {n}` no JSX: o "de N" congelado é o que impede um recibo de mudar de
  significado depois de entregue.
- **Flutuante com N linhas e soma corrente vai em ROTA, não em modal**
  (DEC-049). Modal serve para decisão curta; montagem de plano precisa da soma
  visível o tempo todo.
- **Toda listagem usa o menu ⋮ na coluna de ações** (DEC-047). Ação dentro do
  menu, explicação fora dele, Excluir em vermelho e por último. Não há mais
  fileira de botões, e `col-acoes-menu` é a única medida de coluna de ação.
- **Nada do usuário vai para o navegador sem o id dele na chave** (DEC-058).
  Leitura e escrita do espelho local passam por `hooks/useCachedResource`; quem
  monta chave é `offline/cacheKey.js`, e só ele. O logout apaga, e entrar com
  outro id apaga antes de escrever. Varreduras em `tests/offline/`.
- **Escrita offline só pelas quatro operações da lista** (DEC-059). O que não
  está em `offline/outboxOperations.js` continua recusado pela guarda da F-5a —
  e o financeiro está fora de propósito. Nada sai da fila sem sucesso do
  servidor ou gesto humano com confirmação.
- **Portal quebra a ordem do Tab** (emenda à DEC-046). Quem abrir um flutuante
  em `createPortal` conduz o foco explicitamente — entra, circula, volta no
  Esc. Sem `autoFocus`, nunca.

---

## Convenção de fase — o relatório vira arquivo markdown (a partir da F-1b.3.1)

Ao final de **toda fase**, além de exibir o relatório no terminal, o relatório
**inteiro** é gravado em:

```
lexa_31maio/relatorios/AAAA-MM-DD-<fase>.md
```

Na F-1b.3.1: `lexa_31maio/relatorios/2026-08-20-F-1b.3.1.md`.

**Onde, e por quê.** `lexa_31maio/` é a pasta que **contém** os dois repos e
**não é repositório de nenhum deles**. O relatório fica **fora do controle de
versão**: não entra em commit por acidente, não polui histórico, não aparece em
`git status`. **Não se grava dentro do repo do backend nem do frontend.**

Regras do arquivo:

- É o relatório **completo**, com as **saídas reais coladas** — o mesmo
  conteúdo que iria para o terminal, **não um resumo dele**. Se algo foi
  truncado na exibição, o arquivo traz a versão inteira.
- Markdown de verdade: títulos por parte, tabelas onde há tabela, blocos de
  código para saídas de comando. **Vai ser lido fora do terminal, por outra
  pessoa.**
- Cabeçalho de identificação: nome da fase, data, **commits de merge dos dois
  repos**, contagem final das suítes, e uma linha de **veredito** — "concluída
  e mergeada" / "parcial, não mergeada" / "parada no portão X".
- **A regra de segredos vale igual aqui**: nenhum segredo no relatório, nem
  mascarado — prova por **definido/comprimento/comparação booleana**. Arquivo
  em disco é justamente onde essa disciplina costuma relaxar.
- No terminal, ao terminar, basta uma confirmação curta com **o caminho do
  arquivo gerado**.

A pasta é externa aos repos, mas **a regra é de processo** e por isso fica
registrada nos **dois** CLAUDE.md: ela precisa sobreviver a troca de sessão.


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
                               success → --color-success-text
                               warning → --color-warning-text
                               danger  → --color-danger-text
                               info    → --color-info-text
                               neutral → --color-text-secondary
```

> Desde a Fase 1 (DEC-075) o badge pinta o texto com `--color-*-text`, e o mapa
> acompanhou: a regra "a fatia é o texto do badge" continua valendo.

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

## Sentinela de montagem — o bug da folha (Fase 4.4)

**Efeito de limpeza sozinho não é sentinela.** A tela de montagem guardava
assim:

```js
const montado = useRef(true);
useEffect(() => () => { montado.current = false; }, []);   // corpo VAZIO
```

O `<React.StrictMode>` monta, desmonta e monta de novo em desenvolvimento. A
limpeza escrevia `false`, o corpo do efeito não escrevia nada, e a sentinela
ficava **presa em `false` com o componente vivo na tela**. Todo
`if (montado.current) setX(...)` virava no-op silencioso — sem erro, sem aviso,
sem console.

**O sintoma:** adicionar uma seção gravava (201), a releitura trazia a lista
nova do servidor, e a folha A4 continuava mostrando o estado do carregamento
inicial. Para a advogada: "cliquei, não deu erro, não aconteceu nada".

O carregamento inicial escapava porque usa `let ativo = true` **local ao
efeito**, criado a cada execução — e não um ref que sobrevive entre elas.

**A correção é uma linha:** o efeito precisa **afirmar** a montagem, não só
negá-la na saída. Mora em `hooks/useIsMounted.js`, em hook, para a próxima tela
não reescrever as duas linhas de memória e errar do mesmo jeito.

**Varredura feita na fase:** o formato do defeito (`useEffect(() => () => …)`)
não existe em nenhum outro arquivo, e as outras oito telas do módulo usam a
variável local ao efeito, imune à remontagem. **Era um caso só.**

`hooks/useIsMounted.js` exporta também `simularSentinela()` — a mesma lógica
sem React, para a suíte rodar o ciclo `monta → desmonta → monta` e conferir
onde o ref para. A suíte não tem renderizador; é a troca aceita por não
instalar uma testing-library só para isto. **As duas versões precisam ser
lidas juntas:** mexer numa sem mexer na outra faz o teste deixar de descrever
o hook.

---

## Estado da montagem — funções puras

`pages/documents/assemblyState.js`, extraído junto com a correção acima, pelo
mesmo motivo de `utils/feeCalc.js`: a suíte é `node --test` sem DOM, e lógica
dentro do componente só se testaria por varredura de texto.

| Função | O que faz |
|---|---|
| `listaDeVinculos(res)` | envelope → array, **sempre** array |
| `secaoIdDe(v)` | id da seção com `secaoId` populado **ou** cru |
| `idsDasSecoes` / `idsNaOrdem` | o conjunto usado e o corpo do PATCH |
| `reordenarLocal` / `removerLocal` | os movimentos **otimistas** |

**Quem ordena é o backend.** A inserção com `ordem` empurra as seguintes no
servidor, e a tela relê em vez de reproduzir a regra. `reordenarLocal` fora da
faixa devolve a **mesma referência**, e não uma cópia: cópia marcaria o estado
como sujo sem nada ter mudado e dispararia uma reordenação inútil.

---

## Regerar a partir das seções (Fase 4.4)

A auditoria da 4.4 encontrou o contrato da 2C **inteiro no backend** e quase
inteiro na interface: exibir, editar, salvar por PATCH e o selo "editado à mão"
já existiam em `DocumentFinalTextPage`; o 409 com `confirmarSobrescrita` já
existia em `GenerationPanel`, na tela de **montagem**.

**O que faltava era regerar a partir da tela do próprio documento.** Pela
montagem, a advogada tinha de voltar, achar o modelo e reescolher processo e
cliente — sabendo de cor quais eram. Tudo isso já está gravado no documento
desde a 2C: `geradoDeModeloId`, `processoId`, `clienteId`, `honorarioId`.

As regras vivem em `pages/documents/regeneration.js`:

- **`processoId` vem populado** na leitura; mandar o objeto no payload faria o
  backend receber um id inválido. A normalização é explícita.
- **Cliente e honorário ausentes saem `undefined`, não `null`.** Aqui não é
  "apagar campo" (a convenção do projeto) — é "não informar", e o backend
  trata os dois diferente: `honorarioId` omitido deixa ele escolher quando há
  um único ativo.
- **Cada impedimento tem frase própria** (modelo, upload, sem
  `geradoDeModeloId`, sem processo). Um "não é possível regerar" genérico
  deixaria a advogada sem saber se o problema é o documento ou o sistema.

**Três diálogos diferentes, e a diferença importa:**

| Situação | Quem avisa | Por quê |
|---|---|---|
| texto **não salvo** | a tela | o servidor não sabe da edição na caixa; não haveria 409, e ela se perderia em silêncio |
| documento **editado** | o 409 do backend | é o contrato da 2C — reenvia com `confirmarSobrescrita: true` |
| documento **não editado** | ninguém | regenera direto; pedir confirmação sempre treina a clicar "sim" sem ler |

O texto do diálogo sai das **chaves** do 409 (`dataGeracao`,
`editadoManualmente`, `sairaDoPortal`), nunca de regex sobre a mensagem. A
frase do portal só entra quando `sairaDoPortal` é verdadeiro: dizer "e sai do
portal" sobre documento que nunca esteve lá é informação errada na direção que
assusta.

**Esta tela entrou na allowlist de roteamento por status HTTP**
(`tests/financial/estatica.test.js`), com motivo escrito. É a terceira, ao lado
de `GenerationPanel` e `PortalLoginPage`.

---


## PWA mínimo, escrito à mão (Fase 4.5)

Sem workbox e sem plugin de Vite — a fase proíbe dependência nova, e o que este
app precisa cabe em três estratégias.

| Peça | O que faz |
|---|---|
| `public/manifest.webmanifest` | `display: standalone`, `start_url: /dashboard`, ícones 192/512, cores do tema |
| `public/sw.js` | precache do shell no `install`, cache-first nos assets com hash, network-first na navegação, limpeza por versão no `activate` |
| `src/registrarSW.js` | registra **só** com `import.meta.env.PROD` |

**`/api/*` NUNCA é cacheado.** É a decisão mais importante do arquivo e a que um
gerador não tomaria por nós: toda resposta da API é autenticada e pertence a uma
advogada — cache dela é vazamento esperando o segundo usuário no mesmo
navegador. E número financeiro velho servido sem aviso faria a advogada planejar
o mês com o dado do mês passado.

> ⚠️ **A mesma regra existe em OUTRA API, e as duas se leem juntas.** A F-5a
> passou a guardar resposta da API no **IndexedDB** — de propósito, e sob três
> condições que esta regra aqui não precisava ter porque simplesmente não
> guardava nada: chave escopada pelo id do usuário, limpeza no logout e limpeza
> na troca de conta (**DEC-058**, `src/offline/`). O aviso de idade da Parte 3
> é o que responde à segunda metade do parágrafo acima: o número velho aparece,
> **dizendo que é velho**. **Quem mexer no `sw.js` precisa ler a DEC-058, e
> vice-versa — é o mesmo vazamento em dois bancos do mesmo navegador.**

**O SW não roda em desenvolvimento**, de propósito: cachearia os módulos que o
Vite serve sem hash e a tela pararia de refletir o código — sem erro nenhum, que
é o mesmo formato de armadilha silenciosa da sentinela de montagem da Fase 4.4.

**O precache descobre os assets sozinho.** Os nomes têm hash e este arquivo é
copiado verbatim de `public/`; em vez de gerar a lista no build (plugin, ou um
passo que alguém esqueceria de rodar), o `install` baixa o `index.html` e extrai
os `/assets/…` dele. A fonte da verdade continua sendo o HTML que o servidor
entrega.

**Navegação é network-first**, e não cache-first, porque `index.html` **não tem
hash**: servi-lo do cache primeiro entregaria a casca velha apontando para
assets que o deploy novo já apagou — tela branca depois de atualizar.

`tests/pwa/pwa.test.js` **executa** o service worker num `self` falso
(`node:vm`) e dispara eventos de fetch nele. Verificar por leitura provaria que
a linha existe, não que ela decide.

## Foco visível (Fase 4.5)

`:focus-visible` global em `styles/global.css`, com `--color-focus` declarado
nos dois temas. Desde a Fase 1 (DEC-074/076) o dourado saiu: o anel é o bege
`#EDE3CF` no escuro (14,7:1 sobre o fundo) e o verde `#174034` no claro
(10,4:1), medidos por `tests/css/contraste.test.js`. A regra global troca o
raio do elemento por 4 px no foco; campo e botão em pílula têm regra própria
que preserva o raio deles.

Havia **seis** `outline: none`, e **dois estavam dentro de regras
`:focus-visible`**: a regra escrita para desenhar o foco era a que o apagava.

`:focus-visible` e não `:focus` porque o navegador só o aplica em foco de
teclado — clicar com o mouse continua sem anel, que era o motivo de alguém ter
escrito `outline: none` em primeiro lugar. É por isso que a correção não era
apenas removê-los.

`tests/css/foco.test.js` varre por **declaração**, não por string: o comentário
que explica o defeito contém a expressão, e uma varredura ingênua derrubaria a
própria explicação — a saída óbvia seria apagar o comentário.



## A lista de pendências é UM componente (Fase 4.6)

`components/documents/PendenciaList.jsx`, usado pela tela de **montagem** e pela
tela do **documento**. Vivia inteiro dentro do `GenerationPanel`.

**O defeito que originou a extração não era duplicação — era ausência.** A tela
do documento, que ganhou "Regerar" na Fase 4.4, tratava o mesmo 422 com
`toast.error(getApiErrorMessage(err))`. O `message` do backend é *"Não é
possível gerar o documento: há informações faltando no cadastro"*, que **não
nomeia nada**; os nomes vivem em `errors.pendencias[]`, que aquela tela
descartava. O comentário no código afirmava o contrário.

**A tela separa os motivos.** `motivo` vem do vocabulário fechado do backend:

| `motivo` | Como aparece |
|---|---|
| `campoVazio` | "Faltam N dados no cadastro", cor de aviso |
| `tipoIncompativel`, `tipoHonorarioIncompativel`, `parcelasDesiguais` | bloco **separado e primeiro**, cor de impedimento |

Separar não é estética: incompatibilidade **não se resolve preenchendo
cadastro**, e listá-la junto de "faltam 3 dados" convida à ação errada — que é o
beco original com outra roupa.

**O aviso preventivo** (`GET /documents/modelos/:id/compatibilidade`) aparece ao
escolher o cliente, antes de qualquer clique. **Não bloqueia**: `podeGerar` não
depende dele, e há teste travando isso. A advogada pode querer gerar e apagar o
trecho incompatível no texto final — o poder moderador dela, desde a Fase 2C.
Falha na consulta não reporta nada: o pior caso é o aviso não aparecer, que é o
comportamento anterior à fase, e o 422 continua sendo a rede.


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
| `tests/documents/folha.test.js` | o **ciclo de vida** da sentinela e a lista que alimenta a folha |
| `tests/documents/regeracao.test.js` | os **parâmetros** da regeração e o texto do 409 |
| `tests/css/appliedClasses.test.js` | que toda classe aplicada **alcança** regra |
| `tests/offline/escopo.test.js` | que **não existe chave sem usuário**, e que uma leitura não atravessa escopo |
| `tests/offline/politica.test.js` | o **limite e o descarte**, e a escolha entre rede e cache |
| `tests/offline/idade.test.js` | a **idade do dado** e as frases do estado sem sinal |
| `tests/offline/estatica.test.js` | a **fiação**: o logout limpando, a troca de conta limpando antes de escrever, o portal intocado |
| `tests/offline/fila.test.js` | o que **entra na fila** (e que o financeiro não entra), a ordem, a **parada na primeira falha** e as frases |
| `tests/offline/filaEstatica.test.js` | que **nada é descartado sozinho**, que o logout avisa, e que as telas de dinheiro continuam bloqueadas |
| `tests/infra/deploy.test.js` | que o modelo de variáveis **lista o que o código lê**, que `VITE_API_URL` de produção é `/api`, que o endereço de desenvolvimento **não sobrevive ao build** e que o Node é declarado com teto |

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

## Backlog de achados de validação visual

> Achado que só aparece com olho humano na interface. Entra aqui quando o passo
> do roteiro **REPROVA**, e sai quando o passo for revalidado — não quando o
> código for alterado. O roteiro (`docs/validacao-manual.md`) mantém o passo na
> lista pendente enquanto o achado estiver aberto; os dois se referem um ao
> outro de propósito.

### V-2 — 401 de senha atual incorreta DERRUBA a sessão · ✅ **FECHADO (F-2a/F-2b)**

**Sessão de 17/08/2026, passo 12.** Trocar a senha no Perfil informando a senha
atual **errada** leva a usuária para a tela de login, em vez de mostrar o erro
no formulário.

**Por que é alta, e não cosmética:** o sistema **expulsa a advogada por um erro
de digitação**. Ela não descobre que errou a senha — descobre que "caiu", e a
leitura natural é "o sistema me desconectou sozinho". Perde o que estava
fazendo em outra aba, e a única pista do que aconteceu é uma tela de login.

**Causa CONFIRMADA na F-2a**, e era a suspeita: o interceptor de
`api/axiosConfig.js` reagia a **qualquer** 401 que não fosse de `/auth/me`,
estando fora de `/login`, com `window.location.href = '/login'` e o toast
"Sessão expirada". O backend respondia **401** em `POST /auth/alterar-senha`
quando a senha atual não conferia — um 401 de *validação de campo*, não de
sessão morta. O interceptor não distinguia os dois.

**CORRIGIDO na F-2a (DEC-050).** A correção **não** foi nenhuma das duas saídas
que este achado propunha, e vale registrar por quê:

| Saída proposta aqui | Por que não |
|---|---|
| **rota isenta**, como `/auth/me` já era | lista de exceção **apodrece**: a próxima rota que devolvesse 401 por engano não estaria nela, e o defeito voltaria calado, num lugar diferente |
| **código de erro estável**, no padrão do portal | resolveria, mas obriga o interceptor a conhecer um vocabulário que cresce a cada rota — e o problema não era falta de vocabulário, era o 401 significar duas coisas |

O que se fez foi **dar um significado só ao 401**: sessão ausente ou inválida, e
mais nada. Credencial conferida dentro de sessão válida virou **422**. Com isso o
interceptor ficou trivialmente correto — desloga em 401 e **não conhece rota
nenhuma**. Os dois testes de URL que ele tinha saíram, e no lugar entrou uma
pergunta sobre estado: *só se desloga quem estava logado*.

**✅ FECHADO em 21/08/2026.** O passo **191** — que exercita exatamente este
caminho, senha atual errada com a advogada continuando logada — foi executado
pelo Daniel e **passou**. Reportado **sem capturas**, e isso fica registrado no
próprio passo: um achado fechado por relato verbal tem peso menor que um fechado
com evidência anexa, e quem reabrir a discussão precisa saber disso.

**O passo 12 continua pendente**, e não é contradição: ele cobre mais que o V-2
— a troca de senha ponta a ponta, com logout e login pela senha nova —, e essa
parte ainda não foi olhada. O achado era sobre o 401 que deslogava; essa parte
está resolvida e conferida.

### V-1 — campo de e-mail não é destacado no cadastro duplicado · MÉDIA

**Sessão de 17/08/2026, passo 4.** Cadastrar com um e-mail que já existe
(`demo@lex.dev`) volta corretamente para a etapa 1 e mostra a mensagem, mas o
**input de e-mail não fica destacado**.

**A ligação existe pela metade, e é o que torna o achado sutil.**
`RegisterPage` já chama `getApiErrorField(err)` e já age sobre ele — mas
**só para navegar**: `if (campo === 'email') setStep(1)`
(`RegisterPage.jsx:136-138`). O valor nunca vira estado nem classe. A tela não
tem `campoComErro`, e nenhum `<input>` dela recebe `.input-erro`
condicionalmente. Volta para a etapa certa e não diz qual campo é.

Todo o resto do encanamento está pronto: `POST /auth/register` responde **409**
com `campo: "email"` (DEC-031); `getApiErrorField` lê `data.campo` independente
do status (`utils/apiError.js:19`); e `.input-erro` tem regra alcançável — o
elo que a 2E.1 tinha quebrado e a 2E.2 travou em teste.

**Por que passou despercebido até agora:** a varredura do passo 81
(`tests/regressions/telas2E1.test.js:109-113`) cobre quatro formulários —
Processo, Parcela, Pagamento e Honorário. `RegisterPage` está fora dela.

**Por que média e não baixa:** é o primeiro contato de qualquer pessoa nova com
o sistema — os colegas do Daniel, a banca — e a etapa 1 tem quatro campos. Sem
o destaque, quem errou lê "e-mail já cadastrado" e ainda precisa procurar qual
dos quatro é o e-mail.

---

## O smoke test de 17/08/2026 — o que foi corrigido e o que ficou aberto

O Daniel exercitou o Financeiro 2.0 à mão na main mergeada da F-1a e achou
**quatro defeitos que as duas suítes não pegavam**. Os quatro foram corrigidos
na F-1a.1 (A-1 e A-2 no backend, A-3 e A-4 na tela).

**Duas verificações daquele smoke test NÃO foram executadas**, e ficam
registradas como pendência do Daniel — não como defeito conhecido. A diferença
importa: ninguém as tomou por validadas.

| | O quê | Por que ainda aberta |
|---|---|---|
| **S-5** | os cartões do dashboard com os números da DEC-040 | o painel muda na F-1b; validar agora seria validar duas vezes |
| **S-7** | a imutabilidade do pagamento **na tela** — que a edição não oferece valor, data nem forma | o fluxo de estorno, que é o caminho alternativo que a tela precisa oferecer, é da F-1b |

### A seção 21 do roteiro nasceu ANTES do previsto, e não é a seção do módulo

A F-1a registrou que a **seção 21 nasceria na F-1c**, quando as telas do
Financeiro 2.0 existissem. Ela nasceu na F-1a.1, com três passos (**155 a
157**), e isso não antecipa a F-1c.

O que entrou são só os passos que **estas quatro correções** exigem e que
nenhuma varredura estática alcança: o foco do teclado, o texto de um documento
jurídico assinado, e a única conferência independente da soma da ficha. A
validação visual **completa** do módulo — extrato na tela, preview de alocação,
reparcelamento ponta a ponta — continua sendo da F-1c.

Fica escrito aqui para que a conta do roteiro (154 → **157**) não pareça a
seção 21 tendo sido feita adiantada.

---

## A validação visual dos passos 90–154 foi ADIADA (17/08/2026)

Decisão do Daniel, consciente e registrada. A sessão de 17/08 cobriu os passos
**1 a 89** — cadastro, login, perfil, clientes, processos, seções, o módulo de
documentos inteiro e as cinco primeiras do portal. Do 90 em diante fica para
depois.

**Não é dívida esquecida: é dívida com dois prazos escritos.**

| Prazo | O quê | Por quê |
|---|---|---|
| **Antes de QUALQUER demonstração pública** | passo **85** — conferir que `NODE_ENV` não é `production` | O `express-rate-limit` conta **por IP**. Numa banca, três pessoas no mesmo wifi saem do mesmo IP: com o teto de produção (5), o terceiro leva **429 sem ninguém atacar nada**, e a demonstração morre com uma mensagem de bloqueio na tela. É conferir uma variável, não mudar código. |
| **Antes de qualquer cliente REAL usar o portal** | passos **90 a 98** | São os passos de confirmação de visualização e de isolamento do portal. O artefato que a Fase 3.1 existe para produzir é probatório; entregá-lo a um cliente de verdade sem tê-lo olhado uma vez é o pior momento para descobrir um defeito. |

O passo 85 está em `## Validado` porque foi executado em 17/08 — **mas ele é
pré-voo, não conquista**. Vale para aquela execução, e volta a valer a cada
demonstração. Está escrito assim na nota da seção.

---

## Registro de sessões

### Fase F-1a.1 — correções do smoke test

**Resumo:** dois dos quatro achados são de tela. Frontend 289 → **305**.
Roteiro 154 → **157**. Ver o bloco "As correções do smoke test", acima.

**Arquivos novos:** `tests/regressions/f1a1.test.js`.
**Alterados:** `components/financeiro/ProcessFinancialSheet.jsx` + `.css`,
`utils/statusVisual.js`, `pages/clients/ClientListPage.jsx`,
`pages/fees/FeeListPage.jsx`, `pages/processes/ProcessListPage.jsx`,
`pages/payments/PaymentListPage.jsx`,
`pages/installments/InstallmentListPage.jsx`, `docs/validacao-manual.md`.

**A varredura de CSS pegou um defeito meu, na hora.** A primeira versão da
parcela reparcelada aplicava `.status-badge status-badge--info` à mão na ficha,
e a folha do badge é importada pelo `StatusBadge`, não pela ficha —
`tests/css/appliedClasses.test.js` acusou classe sem regra alcançável. A
correção foi a certa por dois motivos: usar o componente **e** pôr o rótulo na
fonte única de status.

**Não tocado:** `axiosConfig.js`, telas do portal, catálogo de variáveis,
módulo de documentos, contrato de payload de rota nenhuma.
**Nenhuma dependência nova.**

---

### Fase F-1a — Financeiro 2.0: o frontend mínimo

**Resumo:** o suficiente para o app funcionar com o modelo novo do backend.
Frontend 264 → **289**. Ver o bloco "Financeiro 2.0 na tela", acima, para o
porquê de cada escolha.

**Arquivos novos:** `pages/payments/allocationSummary.js`,
`pages/payments/paymentRow.js`, `tests/financial/financeiro2.test.js`.

**Alterados:** `pages/payments/PaymentFormPage.jsx` (reescrita),
`pages/payments/PaymentListPage.jsx`,
`pages/installments/InstallmentListPage.jsx`,
`components/financeiro/ProcessFinancialSheet.jsx` + `.css`,
`pages/dashboard/DashboardHomePage.jsx` + `DashboardPage.css`,
`api/paymentService.js`, `api/installmentService.js`, `api/feeService.js`,
`utils/enums.js`, `styles/modules.css`,
`tests/financial/estatica.test.js`, `tests/regressions/telas2E1.test.js`.

**Dois testes estáticos foram ATUALIZADOS, não apagados:** o do botão de recibo
passou a checar o líquido em vez de `ativo` (mesma regra, condição diferente), e
o de destaque de campo do `PaymentFormPage` passou de `valorPago` para `valor`,
que é o nome que o backend emite em `campo` desde a DEC-032. O que testava
reativação virou **teste de ausência**: nenhuma tela e nenhum serviço chamam as
rotas mortas.

**Quatro métodos de API nasceram sem tela**, de propósito, para a F-1b não
precisar de backend: `preverAlocacao`, `listReversals`/`createReversal`,
`getStatement` e `listRenegotiations`/`createRenegotiation`.

**Não tocado:** `axiosConfig.js`, telas do portal, catálogo de variáveis,
módulo de documentos. **Nenhuma dependência nova** — `package.json` idêntico a
`main`.

---

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

### Fase 4.4 — Módulo de documentos: a folha, o editor pós-geração e o gráfico

**Resumo:** um bug funcional real — a folha da montagem não refletia a seção
adicionada — diagnosticado até a causa raiz, corrigido e travado. Mais a
regeração na tela do documento e o achado do gráfico que a 4.3 deixou aberto.
Frontend 182 → 213 testes. Roteiro manual 120 → 130 passos.

**Arquivos novos:** `hooks/useIsMounted.js`,
`pages/documents/assemblyState.js`, `pages/documents/regeneration.js`,
`tests/documents/folha.test.js`, `tests/documents/regeracao.test.js`.

**Alterados:** `pages/documents/DocumentAssemblyPage.jsx` (a correção e a
extração), `pages/documents/DocumentFinalTextPage.jsx` + `.css` (regerar),
`tests/financial/estatica.test.js` (a allowlist de status, com motivo),
`docs/validacao-manual.md`.

**A causa raiz, em uma linha honesta:** o efeito que guardava a sentinela de
montagem só tinha limpeza, e a remontagem do StrictMode a deixava presa em
`false` — todo `setState` guardado virava no-op silencioso. **Não era a rede,
não era o backend, e não era a folha.**

**O diagnóstico foi medido, não suposto.** Antes de tocar em qualquer linha,
a sequência inteira da tela foi reproduzida por HTTP contra o servidor real
(POST sem `ordem`, POST com `ordem`, PATCH reordenar, DELETE): **o backend
respondeu certo em todos os passos**, com `secaoId` populado e `ordem` correta.
Foi isso que descartou o backend e apontou para o ciclo de vida do efeito.

**A correção foi conferida por mutação:** removida a linha `ref.current = true`
do efeito, o teste do ciclo de vida falha; devolvida, passa. Sem isso o teste
provaria apenas que o código roda.

**Não tocado:** contrato de rota nenhum, `axiosConfig.js`, telas do portal,
módulo financeiro. **Nenhuma dependência nova** — `package.json` idêntico a
`main`.

---


### Fase 4.5 — Auditoria Geral nº 2: foco, reativação, PWA e vetores

**Resumo:** foco visível global, a interface de reativação de pagamento e
parcela, o PWA mínimo escrito à mão e os vetores compartilhados da fórmula
percentual. Frontend 213 → **240**.

**Arquivos novos:** `public/manifest.webmanifest`, `public/sw.js`,
`public/icone-192.png`, `public/icone-512.png`, `src/registrarSW.js`,
`tests/css/foco.test.js`, `tests/pwa/pwa.test.js`,
`tests/financial/percentualVetores.test.js`,
`tests/fixtures/percentualVetores.json`.

**Alterados:** `styles/variables.css` (tokens de foco), `styles/global.css` (o
anel), `styles/modules.css` (`.filter-toggle`), as cinco folhas que tinham
`outline: none`, `pages/payments/PaymentListPage.jsx` e
`pages/installments/InstallmentListPage.jsx` (modo "mostrar desativados" e ação
"Reativar"), `api/paymentService.js` e `api/installmentService.js`,
`index.html`, `src/main.jsx`, `README.md`.

**Decisões:** o modo de inativos é EXCLUSIVO e não um "incluir" — misturar os
conjuntos faria a coluna de valor somar o que foi estornado sem nada dizendo
isso na linha; linha desativada oferece **só** "Reativar", porque editar e
baixar recibo são exatamente o que o backend recusa; os vetores da fórmula são
conferidos por hash contra o arquivo idêntico do backend, e editar um lado sem o
outro derruba as duas suítes.

**Um erro meu, pego pela asserção de guarda do próprio teste:** o caso escolhido
para provar a ORDEM do arredondamento (`33.33% de 1000`) tem `1000 * 33.33`
exatamente igual a 33330 em ponto flutuante — as duas ordens coincidiam e o
teste não provava nada. O `assert.notEqual` reprovou o par; o caso passou a ser
`8.75% de 987654.32`.

**O favicon apontava para `/vite.svg`, que não existe neste repositório** (não
havia `public/` até esta fase): toda página pedia um arquivo ausente e recebia
404. Corrigido de passagem, porque o `public/` nasceu aqui.

**Não tocado:** contrato de rota nenhum, `axiosConfig.js`, telas do portal.
**Nenhuma dependência nova** — `package.json` idêntico a `main`. Os ícones
saíram de script descartável com o PIL do ambiente.

---


### Fase 4.6 — Mensagens que orientam

**Resumo:** a lista de pendências vira componente único, a tela do documento
deixa de engolir o 422, e nasce o aviso preventivo de PF/PJ. Frontend 240 → **250**.

**Arquivos novos:** `components/documents/PendenciaList.jsx` + `.css`,
`tests/documents/mensagens.test.js`.
**Alterados:** `components/documents/GenerationPanel.jsx` + `.css`,
`pages/documents/DocumentFinalTextPage.jsx`, `api/documentService.js`.

As regras de estilo da lista **mudaram de folha junto com o JSX**: a folha é
importada pelo componente que aplica as classes, e não pela tela que o monta —
dependência que só existe pela árvore de componentes não é alcançável por
análise estática, e foi esse o defeito que a varredura pegou nas telas do portal
na Fase 3.2.

**Não tocado:** contrato de rota nenhum além do consumo da rota nova,
`axiosConfig.js`, telas do portal, módulo financeiro.
**Nenhuma dependência nova.**

---

### Fase F-0 — Faxina: build que falha, carregamento e listas honestas

**Resumo:** o build de produção deixa de sair quebrado em silêncio, os cinco
formulários de edição ganham estado de leitura, e as duas listagens por processo
param de depender de um defeito do backend. Frontend 250 → **264**.
Roteiro manual 147 → **154**.

**Arquivos novos:** `src/api/baseURL.js`, `.env.production.example`,
`tests/regressions/f0.test.js`.
**Alterados:** `vite.config.js`, `eslint.config.js`, `public/sw.js`,
`src/api/axiosConfig.js`, `src/api/portalAxios.js`, os **cinco** formulários de
edição, `pages/payments/PaymentListPage.jsx`,
`pages/installments/InstallmentListPage.jsx`, `styles/modules.css`,
`README.md`, `docs/validacao-manual.md`, `.gitignore`.

**Ponto de restauração desta fase:** tag `v-pre-f0-2026-08-16` e branch
`backup/pre-f0-main`, publicadas antes de qualquer edição, em `0ef1ecb`.

---

## O build de produção FALHA sem `VITE_API_URL` (Fase F-0)

**Era o achado mais grave da auditoria de retomada, e o mais silencioso.**

Não havia `.env` nem `.env.production` no repositório. O fallback de
`axiosConfig.js` e `portalAxios.js` — `?? "http://localhost:3001/api"` —
entrava no bundle publicado:

```
$ grep -oE "localhost:3001[^\"]*" dist/assets/index-*.js
localhost:3001/api
```

`npm run build` saía com sucesso, `lint` saía 0, e as duas suítes passavam com
o app apontando para uma máquina que não existe no servidor. **Nenhuma
verificação pegava**, porque não há nada de errado com o código: o defeito é a
ausência de uma variável. Por isso a guarda vive no **build**, e não num teste.

| Peça | O que faz |
|---|---|
| `vite.config.js` | plugin `apply: "build"` que **aborta** o build de produção sem `VITE_API_URL`, com mensagem dizendo como resolver |
| `api/baseURL.js` | fonte única da URL; fallback guardado por `import.meta.env.DEV` |
| `.env.production.example` | a variável, documentada, versionada (exceção no `.gitignore`) |

**`npm run dev` continua sem exigir nada.** Exigir configuração para rodar
localmente é atrito sem ganho, e foi para isso que o fallback nasceu.

### A forma do `import.meta.env.DEV` importa

A primeira versão desta guarda passava `import.meta.env` como **parâmetro** e
lia `env?.DEV` dentro da função. Ficou correta e inútil: o Vite só substitui
`import.meta.env.DEV` por `false` quando ele aparece **literalmente**. Lido de
um parâmetro, o ramo não vira código morto, e o literal
`http://localhost:3001/api` viajou para o `dist/` do mesmo jeito — o `grep`
pegou.

O endereço não pode estar lá **nem como texto inerte**: é ele que alguém vai
encontrar procurando por que a API não responde, e vai concluir a coisa errada.
`tests/regressions/f0.test.js` trava as duas pontas — a forma literal e a
ausência de `localhost:3001` dentro das instâncias de axios.

---

## Carregamento na LEITURA dos formulários de edição (Fase F-0)

Os cinco formulários (honorário, pagamento, parcela, cliente, processo) tinham
`loading`, mas só para o botão Salvar: `{loading ? "Salvando..." : "Salvar"}`.
**Não havia estado nenhum para a leitura.** Abrir a edição pintava o formulário
vazio, e os campos apareciam de repente quando o GET voltava — numa conexão
lenta, a advogada começa a digitar por cima do que ainda vai ser sobrescrito.

O estado novo é `carregandoRegistro`, separado do `loading` do botão, e
**inicia em `Boolean(id)`**: iniciar em `false` mostraria o formulário vazio
por um quadro antes do spinner, que é o mesmo defeito com um passo a mais.

`setCarregandoRegistro(false)` vai num `finally`, nunca só no caminho feliz —
um GET que falha deixaria o spinner girando para sempre, e a tela nunca chegaria
a mostrar a mensagem de erro que ela já sabe montar. Há varredura travando isso.

---

## As listagens por processo pedem o teto e AVISAM quando truncam (Fase F-0)

`PaymentListPage` e `InstallmentListPage` renderizam o array inteiro, sem
paginador. Funcionavam porque o backend tinha um caminho especial para
`?processoId=` que devolvia **tudo**, ignorando `limit` — a tela pedia 20 e
recebia o processo inteiro.

A Fase F-0 corrigiu o backend (regra central nº 4: paginação obrigatória, teto
100). Sem mexer na tela, o default de 20 passaria a **truncar em silêncio**: uma
lista curta com cara de completa, e a advogada somando recebimentos que não
estão todos ali.

A escolha registrada: **pedir o teto (100) explicitamente e exibir "Mostrando N
de M" quando o conjunto for maior**. Não é o paginador — é a versão honesta
enquanto ele não existe. O paginador de verdade é da **F-1**, que reescreve
estas telas; truncar sem avisar é que não podia sobreviver a esta fase.

A classe `.aviso-lista-parcial` mora em `styles/modules.css`, importada pelas
duas telas que a aplicam — a regra de alcançabilidade da varredura de CSS.

---

## Os globais de lint saíram dos arquivos e foram para o config (Fase F-0)

`public/sw.js` abria com uma diretiva de ambiente do ESLint no formato antigo.
O flat config do ESLint 9 **já a ignora**, com aviso, e o ESLint 10 a reporta
como **erro** — o comentário que existia para calar o lint viraria o motivo de
ele falhar.

Os globais migraram para `eslint.config.js`, em dois blocos novos:
`public/sw.js` recebe `globals.serviceworker`; `vite.config.js` e
`eslint.config.js` recebem `globals.node` (a guarda do build usa
`process.cwd()`). `npm run lint` passou a sair **sem aviso nenhum**, e não só
sem erro.

**A varredura que protege isso já derrubou a própria explicação uma vez**, nesta
fase: escrita como busca pela string `eslint-env`, ela reprovou o comentário que
explicava a remoção. Passou a procurar a **forma de diretiva**, e o comentário
deixou de soletrá-la — o mesmo arranjo de `css/foco.test.js` desde a 4.5.

---

## Financeiro 2.0 na tela — o que a F-1a fez, e o que ela NÃO fez

> As decisões DEC-032 a DEC-039 são de **contrato** e moram no `CLAUDE.md` do
> backend, por extenso. Aqui está só o que é decisão de interface.

**A fase tocou o frontend o mínimo para o app funcionar com o modelo novo.** A
UX rica do dinheiro é a **F-1b** e nada dela foi antecipado: sem preview de
alocação na tela, sem estorno em modal, sem extrato desenhado, sem paginador
real. Antecipar meia tela seria pior que não ter — a advogada aprenderia um
fluxo que muda na fase seguinte.

### O pagamento nasce contra o HONORÁRIO

O seletor de **parcela** virou seletor de **honorário**. Quem decide em quais
parcelas o dinheiro encosta é o motor do backend, do vencimento mais antigo em
diante.

**A tela não reproduz essa regra.** Reproduzi-la seria escrevê-la duas vezes, e
a cópia divergiria na primeira mudança — é exatamente por isso que o preview e a
criação compartilham a mesma função no backend.

**O bloco "valor da parcela / já recebido / saldo restante" SAIU.** Ele servia
ao 409 de excedente, que foi revogado (DEC-035): a conta que ele mostrava
deixou de ser a pergunta. O que sobra vira saldo adiantado, e o resultado é
mostrado **depois** de gravar, a partir do que o 201 devolveu.

**O resumo do resultado é função pura** (`pages/payments/allocationSummary.js`),
pela razão de sempre: a suíte é `node --test` sem DOM, e frase montada dentro do
componente só se testaria por varredura de texto — que prova que a linha existe,
não que ela diz a coisa certa. Aqui há plural, concordância e três casos que se
combinam.

### A edição de pagamento tem UM campo

A allowlist do backend aceita `observacoes` e mais nada (DEC-032). O formulário
exibe valor, data, tipo e forma como **somente-leitura**, e não os esconde: é o
que faz a advogada entender o que está editando. Um campo editável que o
servidor recusa é a tela sendo mais permissiva que a API, e o erro só apareceria
no Salvar.

### O que sumiu das listagens, e por quê

| Sumiu | Motivo |
|---|---|
| "Reativar" (pagamento e parcela) | as rotas respondem 404 (DEC-034) |
| "Remover" (pagamento) | `DELETE /payments/:id` não existe (DEC-032) |
| modo "mostrar desativados" (pagamento) | filtro que nunca devolve nada sugere que existe um conjunto para olhar |

**Um botão que só sabe produzir erro é pior que botão nenhum: ele afirma que a
ação existe.** O modal de confirmação de remoção saiu junto — ele perguntava
"esta ação não pode ser desfeita" sobre uma ação que agora nem existe.

O modo "mostrar desativadas" **continua** na listagem de PARCELAS: a parcela
ainda é excluível. O que mudou é o texto — deixou de prometer reativação e passa
a dizer que se recria uma parcela nova.

### A coluna "Parcela" virou "Aplicado em"

Um pagamento pode encostar em duas parcelas, ou em nenhuma. Exibir "Parcela N"
obrigaria a escolher uma das duas, escondendo a outra. A decisão vive em
`pages/payments/paymentRow.js`, em função pura — tem ordenação, plural e um caso
de borda que merece asserção de verdade: **sem alocação ativa, o líquido é o que
distingue "saldo adiantado" de "estornado"**. Dizer "saldo adiantado" sobre um
pagamento estornado afirmaria que o dinheiro está no caixa da advogada.

### O valor líquido aparece AO LADO do bruto, nunca no lugar

Os dois são fatos distintos, e trocar um pelo outro apagaria a informação de que
houve estorno. A célula do líquido ganha `.valor-estornado` quando difere —
**cor de aviso, não de perigo**: um estorno é um fato registrado, não um erro.

**O botão de recibo passou a checar o LÍQUIDO**, e não `ativo`. A regra que ele
protege é a mesma desde a 4.2 — a tela não oferece um papel que o backend recusa
emitir —, e o que mudou é como se pergunta: a rota responde 404 quando o
pagamento foi integralmente estornado.

### `saldoAdiantado` na ficha e a nota do dashboard

A ficha exibe o saldo em rótulo **condicional**: é zero na maioria dos
honorários, e uma linha "R$ 0,00" em todos eles seria ruído em cima do que
importa. Quando existe, precisa aparecer — é ele que explica por que o em aberto
é menor do que "contratado menos recebido".

No dashboard entrou uma **nota**, e não um quarto cartão. `pendente` passou a
ser `contratado − recebido − saldoAdiantado`, e sem a nota a advogada subtrai os
dois cartões de cima, não chega ao terceiro, e conclui que o painel está errado.
Um cartão permanente em R$ 0,00 ocuparia o lugar de informação real; redesenho
de painel é F-1b.

### A ficha lê ALOCAÇÕES, não `parcela.pagamentos`

O nome mudou porque a coisa mudou. Cada alocação traz `pagamentoId` — o vínculo
que a tela navega — e a data do PAGAMENTO ao lado do valor do pedaço, porque o
pedaço não é o depósito. Alocação de origem `saldoAdiantado` se identifica como
tal: aquela parcela não teve dinheiro entrando naquela data.

---

## As correções do smoke test — o que é de INTERFACE (F-1a.1)

> DEC-040 (piso zero + crédito nomeado) e DEC-041 (recibo por alocação) são de
> **contrato** e moram no `CLAUDE.md` do backend, por extenso, com o caso
> numérico observado. Aqui está só o que é decisão de tela.

### A parcela reparcelada não mostra dívida fantasma

Parcela `cancelado` com `reparcelamentoId` imprimia "em aberto R$ 2.250,00" na
ficha. Ela **nunca entrou em soma nenhuma** — o problema era de leitura, e
leitura é o que a ficha é.

| O que | Como fica |
|---|---|
| rótulo | **"Reparcelada"**, não "Cancelado" |
| "em aberto" | **omitido** |
| valor e recebido | **mantidos**, atenuados |
| a operação | uma linha: "Substituída pelo reparcelamento de DD/MM/AAAA" |

**"Reparcelada" e "Cancelado" são o mesmo status no banco e leituras
diferentes**: uma cobrança cancelada foi desfeita, uma reparcelada foi
SUBSTITUÍDA — o dinheiro continua devido, em outras parcelas. Chamar as duas de
"Cancelado" faz a advogada ler baixa onde houve renegociação.

**O rótulo entra em `utils/statusVisual.js`**, e não como string na tela. Aquele
arquivo é a fonte ÚNICA de rótulo e cor desde a 4.3 — badge e fatia de gráfico
saem dele —, e um rótulo escrito à mão seria o segundo mapa que a fase existiu
para eliminar. Tom `info` e não `danger`: nada se perdeu, o plano mudou.

**Valor e recebido ficam porque é histórico auditável.** Omitir a parcela
inteira levaria junto o registro de que aquela cobrança existiu e do que foi
recebido nela — o mesmo raciocínio que mantém o honorário cancelado na ficha.

**A linha da operação é texto simples, sem link.** Navegação para o
reparcelamento é F-1b.

### O `return <Loading/>` antecipado é o que fazia a busca perder o foco

A causa, confirmada por leitura antes de qualquer correção:

```js
if (loading) return <Loading />;   // ← troca a ÁRVORE INTEIRA
…
<input value={busca} onChange={…} />   // ← desmonta e remonta a cada refetch
```

Cada tecla digitada refazia a consulta (com debounce), o efeito punha `loading`
em `true`, e o return antecipado substituía tudo por `<Loading/>`. O React
desmontava o `<input>` e montava **outro** quando a resposta chegava: foco
perdido, cursor no começo, e a advogada clicando de novo no campo a cada
palavra. **Não era `key`.**

A correção é estrutural: o indicador passa para **dentro do JSX, abaixo dos
controles**, e o input nunca desmonta. `SecaoListPage` já usava esse padrão e
virou a referência — as outras é que estavam fora dele.

**Cinco listagens** têm filtro próprio e sofriam o defeito: clientes,
honorários, processos, pagamentos e parcelas. As telas de **detalhe** não
sofrem: o `loading` delas é do carregamento inicial e não volta a `true`.

**Não se corrige com `autoFocus` nem com `.focus()` em efeito.** Os dois tratam
o sintoma e criam um defeito pior — roubam o foco de quem está navegando por
teclado, e num efeito disparado por refetch fazem isso a cada tecla. Há
varredura proibindo os dois.

**O que a suíte prova e o que ela não prova.** Não há como provar foco sem DOM
(a suíte é `node --test` sem renderizador, decisão da 2E.2).
`tests/regressions/f1a1.test.js` trava a **causa** por varredura estática — o
padrão do return antecipado e as duas saídas fáceis —, e o **passo 155** do
roteiro manual fecha a outra metade. Inventar um teste de foco frágil seria
pior que o passo manual honesto.

A varredura limpa comentários antes de analisar: sem isso, o comentário de
`ClientListPage` que EXPLICA a remoção — e cita a linha removida entre crases —
derrubaria a varredura que o explica, e a saída óbvia seria apagar a
explicação. Mesma armadilha de `css/foco.test.js` desde a 4.5.

### `saldoAdiantado` deixou de ser subtraído em qualquer lugar

Consequência da DEC-040 para a tela: o crédito sai **sempre nomeado** e nunca
como abatimento silencioso. A ficha já o exibia em rótulo condicional desde a
F-1a; o que mudou é que agora ele não participa de nenhuma conta, e o "em
aberto" ao lado passou a ser a dívida real.

A nota do dashboard continua valendo e ficou mais verdadeira: ela existe
justamente para explicar um valor que aparece na tela sem entrar na subtração.

---

## As correções da leitura dos recibos — o que é de INTERFACE (F-1a.2)

> **DEC-042** (três estados de quitação, **PROVISÓRIA**) e a **emenda de
> 17/08/2026 à DEC-028** são de **contrato** e moram no `CLAUDE.md` do backend,
> por extenso, com o caso numérico observado. Aqui está só o que a tela precisa
> saber — e nesta fase **não houve mudança de código no frontend**.

### DEC-042 em uma frase, para quem monta tela

O recibo tem **três** estados de quitação, e quem decide é a **obrigação
alcançada**, não a sobra:

| Estado | Quando | O que a advogada entrega |
|---|---|---|
| **Plena** | as parcelas alcançadas ficaram integralmente quitadas | "plena e geral quitação" — **mesmo havendo crédito**, que sai nomeado à parte |
| **Parcial** | alguma parcela alcançada continua com saldo em aberto | "quitação PARCIAL […] que permanece devido" |
| **Adiantamento** | nenhuma alocação | texto próprio; **sem** falar de saldo devido |

**O defeito que a originou** (achado A-1, GRAVE): o recibo de R$ 3.500,00 do
seed dizia, no corpo, "R$ 3.000,00 na parcela 1 de 1 e R$ 500,00 mantidos como
crédito" — e no pé, que a quitação era PARCIAL e não alcançava "o saldo
remanescente da obrigação, que permanece devido". **Não havia saldo
remanescente**: a parcela valia 3.000 e foi paga inteira. O papel afirmava
dívida inexistente **contra o cliente que pagou a mais**.

**A DEC-041 continua PROVISÓRIA e agora convive com a DEC-042.** As duas
redações aguardam ratificação da Laís, e **nenhum recibo vai a cliente real
antes disso** — é a mesma pendência de TIPOS_HONORARIO (DEC-039).

### O badge do honorário e a linha "Recebido" agora saem da MESMA fonte

**Achado A-4.** Na ficha da "Ação de Cobrança de Dívida", o honorário
"Assessoria tributária" exibia **"Recebido: R$ 1.500,00"** e o badge
**"Pendente"** — contradição na mesma linha, entre dois valores certos cada um
por si.

Não era defeito de tela: `ProcessFinancialSheet.jsx` já renderizava `h.status` e
`h.totais.pago` exatamente como a API os manda. Era a **derivação do status** no
backend que olhava só as parcelas vigentes, enquanto "Recebido" somava também as
canceladas por reparcelamento — que é onde o dinheiro fica depois da DEC-037.

**Consequência para a tela: nenhuma mudança de código, e é o ponto.** A ficha
não recalcula nada (decisão da 4.2), então ela exibia fielmente uma contradição
do backend. O passo **158** do roteiro existe para olhar as duas informações
lado a lado — a contradição é visual, e nenhuma asserção de valor a pega.

---

## DEC-043 na tela — o preview vem da API, e o nome do honorário é link (F-1b)

> A decisão completa, com o porquê do verbo e a invariante que a sustenta, está
> por extenso no **CLAUDE.md do backend**. Aqui fica o que ela obriga do lado
> da tela.

### O preview é FORMATADO, nunca recalculado

`PaymentFormPage` mostra, antes de a advogada confirmar, o que vai acontecer
com o dinheiro. O plano vem de `POST /payments/preview` — a mesma
`planejarAlocacao` que a criação executa.

**A tela não distribui valor entre parcelas.** `pages/payments/allocationPreview.js`
só escreve frases a partir do que a API devolveu: não ordena, não soma e não
decide o que cabe onde. Há teste estático proibindo `sort`, `Math.min` e
`Math.max` nesse arquivo (`tests/financial/f1b.test.js`, bloco 3) — se alguém
simular a alocação na tela, existirão duas regras para a mesma pergunta sobre
dinheiro, e a advogada decidirá pela cópia.

O **mesmo formatador** serve ao previsto e ao realizado: o 201 devolve
`alocacoes` com a mesma forma de `destinos`. Dois formatadores poderiam
discordar sobre números que precisam bater.

### Três regras de tela que vieram junto

**1. Enquanto o valor está incompleto, o bloco não aparece** — nem como
"R$ 0,00". Um preview de zero reais afirma que nada vai acontecer, o que é
diferente de "ainda não sei". É o espírito do `"—"` da 4.3.

**2. A digitação não perde o foco.** O debounce é de 350 ms e o
`<Loading />` do preview **nunca** substitui o formulário — o aviso de
carregamento é uma palavra ao lado do título. A causa da perda de foco foi
corrigida na F-1a.1 (o `return <Loading/>` antecipado) e não se reintroduz:
há varredura travando o padrão.

**3. A tela não navega sozinha depois de salvar.** Até a F-1a ela ia para a
listagem e o resultado vivia num toast, que some em segundos. O ponto da fase é
poder **comparar** previsto e realizado — e não se compara com algo que saiu da
tela. O bloco fica, com as saídas explícitas embaixo.

### `MOEDA NUNCA TRUNCA` — regra nova, e onde ela já vale

Em qualquer tela desta fase, valor em reais aparece **inteiro** ou a coluna cede
espaço. Concretamente: `white-space: nowrap` + `flex-shrink: 0` no número, grid
com `auto-fit`/`minmax` em vez de colunas fixas, e **nenhum
`text-overflow: ellipsis`** em regra que alcance dinheiro. Há teste varrendo as
quatro folhas escritas na F-1b.

`cell-truncate` continua valendo para a **descrição** do honorário — texto
livre, sem teto, com `title` devolvendo o inteiro. O que a regra proíbe é
truncar **moeda**.

**As listagens antigas ainda truncam** (a coluna Líquido corta: "R$ 3.50…"). É
trabalho declarado da **F-1b.2**, junto do paginador e dos filtros.

### O nome do honorário é sempre um link

Em toda tela onde a descrição do honorário aparece como texto, ela leva a
`/dashboard/honorarios/:id`:

| Tela | Arquivo |
|---|---|
| Listagem de honorários | `pages/fees/FeeListPage.jsx` |
| Listagem de parcelas | `pages/installments/InstallmentListPage.jsx` |
| Listagem de pagamentos | `pages/payments/PaymentListPage.jsx` |
| Ficha financeira do processo | `components/financeiro/ProcessFinancialSheet.jsx` |
| Dashboard (próximos vencimentos e vencidas) | `pages/dashboard/DashboardHomePage.jsx` |
| Formulário de pagamento (modo edição) | `pages/payments/PaymentFormPage.jsx` |

**Os `<option>` dos formulários ficam de fora, e é deliberado:** HTML não
permite link dentro de `<option>`, e o seletor já leva ao honorário por outro
caminho.

**No dashboard a linha virou DOIS links** — o nome leva à cobrança, "Parcela N"
leva à parcela. Não dá para aninhar um link no outro. O backend passou a mandar
`honorarioId` em `proximosVencimentos` para isso.

**Não há item de menu novo.** A página se alcança pelos links; um item apontando
para uma listagem que já existe seria superfície nova para reduzir clique
nenhum.

### A trilha do cabeçalho passou a saber o nome do registro

`contexts/BreadcrumbContext.jsx` (novo, ~70 linhas, sem dependência): a página
publica o próprio nome e o `Header` o usa como último segmento — "LEX ›
Honorários › «descrição»" em vez de "LEX › Honorários › Detalhe".

O rótulo é **casado com o pathname**. Guardar só o texto deixaria o nome da tela
anterior no ar entre a navegação e o GET seguinte — a advogada leria o honorário
errado no cabeçalho da página nova.

Os dois hooks moram junto do provider, com `eslint-disable` justificado, pela
mesma razão registrada em `AuthContext.jsx`.

### Componentes novos, todos à mão e sem dependência

| Componente | O que é |
|---|---|
| `pages/fees/FeeDetailPage.jsx` | a página do honorário — cabeçalho, parcelas, extrato, ações |
| `components/financeiro/FeeStatement.jsx` | a linha do tempo, com "carregar mais" |
| `components/financeiro/ReversalModal.jsx` | estorno **e** anulação, dois modos |
| `components/financeiro/statementEntry.js` | os rótulos e os **vínculos** do extrato (função pura) |
| `components/financeiro/reversalEffect.js` | a frase do efeito do estorno (função pura) |
| `pages/payments/allocationPreview.js` | as frases do plano (função pura) |

As quatro funções puras existem pela razão de sempre neste projeto: a suíte é
`node --test` **sem DOM**, e frase montada dentro de componente só se testaria
por varredura de texto — que prova que a linha existe, não que ela diz a coisa
certa.

### O extrato usa "carregar mais", e isso é uma escolha declarada

O contrato é paginado (`page`/`limit`, padrão da F-0) e o **paginador real é da
F-1b.2**. Aqui o padrão honesto é acumular: o extrato se lê de cima para baixo,
como história, e trocar de página no meio obriga a lembrar o que ficou na
anterior. O botão diz **quantos faltam** — silêncio no lugar dele seria uma
lista curta com cara de completa.

### O modal de estorno não repete regra do backend

O default do valor é o **líquido restante**, relido do servidor ao abrir. O
`motivo` é obrigatório nos dois modos. As recusas (422 com o valor estornável,
409 de anulação dupla) aparecem **pelo texto do backend**, via
`getFinancialErrorMessage`/`getApiErrorField` — sem redação nova, porque
reescrever a mensagem quebraria o roteamento por `campo` da 2E.1.

**O que a tela deliberadamente NÃO afirma:** quanto do estorno sai de cada
parcela. A desalocação é espelhada (da alocação mais recente para a mais
antiga) e reproduzir o rateio criaria a segunda fonte de verdade que a DEC-043
existe para impedir. A tela descreve a **ordem** — que é contrato — e nomeia as
parcelas sustentadas hoje.

### O buraco silencioso do recibo foi fechado

Pagamento estornado por inteiro não tem recibo (a rota responde 404 de
propósito). A célula ficava **vazia**, e vazio não se distingue de falha de
carregamento. Agora diz **"estornado integralmente — sem recibo"**. O **badge**
na coluna do valor é da F-1b.2; o que esta fase resolve é o vazio não ser mudo.

---

## DEC-044 na tela — a linha que deixou de valer diz que deixou de valer (F-1b.2)

**A fase não nasceu de erro de conta.** Os seis passos da F-1b passaram em
18/08/2026. Ela nasceu de duas coisas que a leitura humana achou por cima
deles: o extrato conta a história certa e deixa duas linhas sem contexto, e as
telas novas não cabem em tela estreita.

### O caso real, e por que ele quebra a leitura

Estornar R$ 1.000,00 de um pagamento de R$ 4.500,00 e **anular o estorno**
deixa o extrato do honorário assim:

| Linha | Valor | Vale? |
|---|---|---|
| Alocação | R$ 3.000,00 | sim |
| Alocação | R$ 1.500,00 | **não** — desfeita pelo estorno |
| Alocação | R$ 500,00 | sim — é a **substituta**, o resto da de 1.500 |
| Alocação | R$ 1.000,00 | sim — nasceu da **anulação** |
| | **R$ 6.000,00** | para um pagamento de R$ 4.500,00 |

A conta do sistema está **certa** (há uma desalocação de 1.500 compensando, e
`totais.pago` diz 4.500). O que estava errado é a **leitura**: quem lê de cima
a baixo soma 6.000 e não entende. O estorno anulado já tinha o tratamento certo
desde a F-1b — a linha diz "este estorno foi anulado depois". A alocação
desfeita não tinha nenhum.

### A regra

> **Nenhuma linha do extrato pode ser somada por quem lê e dar um total que o
> sistema não reconhece. Se uma linha não vale mais, ela diz isso.**

Quatro consequências, todas em `components/financeiro/statementEntry.js`:

1. **Alocação desfeita** — renderizada **atenuada**, com o valor **riscado**, e
   a frase diz *quando* e *por qual estorno*: "Esta alocação foi desfeita em
   18/08/2026 pelo estorno de R$ 1.000,00 — não entra na soma." A decisão sai
   de `alocacaoDesfeita(evento)`, que pergunta por `evento.ativa` — o campo que
   o contrato define como a resposta — e nunca pela presença de um `estornoId`
   (a desalocação também tem um, e não é a mesma coisa).
2. **Alocação substituta** (nascida de estorno parcial, DEC-035) — diz de onde
   veio. Ela **herda a data do pagamento**, então aparece no meio das
   originais daquele dia; sem a frase, o bloco do dia parece alocar mais do que
   o pagamento tinha.
3. **Referência do pagamento** — o vínculo dizia "Do pagamento de 18/08/2026",
   só pela data, e com dois pagamentos no mesmo dia a frase não os distingue.
   Agora soma o sufixo curto: "Do pagamento de 08/05/2026 (#1ebee9)". É o
   **mesmo formato** que a linha do pagamento já exibia, e agora sai de um lugar
   só — `refDoPagamento()`. Dois formatos para a mesma referência não seriam
   referência.
4. **Desalocação com estorno anulado** — diz que o valor voltou. Sem a
   ressalva, quem lê subtrai duas vezes.

### `dataPagamento` corrigiu uma afirmação ERRADA, não só uma ambiguidade

A alocação nascida de uma **anulação** grava `data` = data da anulação. A frase
usava essa data: para o caso acima, ela dizia "Do pagamento de 18/08/2026"
quando o pagamento é de **08/05/2026** — uma data em que pagamento nenhum
aconteceu. O contrato passa a expor `dataPagamento` ao lado do `pagamentoId`, e
a tela nomeia a data real. `evento.data` fica como retaguarda para contrato
antigo, não como fonte preferida.

### A ordem cronológica é DECISÃO, não divergência

O extrato lista **do mais antigo para o mais novo**, contrário ao que o prompt
da F-1b pediu. Fica assim, e por escrito: **extrato conta uma história, e
história se lê do começo.** É também o que torna possível a verificação do
passo 165 — somar as alocações vivas de cima para baixo e bater com o
pagamento. Invertida, a soma teria de ser feita de trás para frente.

Nota de ordenação: a criação do honorário **não** é necessariamente a primeira
linha. `historicoStatus` é carimbado com o instante real da criação, e um
pagamento com data retroativa (o caso normal — lançar em agosto o PIX de maio)
o antecede. Ordenar por instante de gravação contaria a história na ordem em
que foi digitada, não na em que aconteceu.

### O que a tela continua NÃO fazendo

Não soma o extrato (`reduce` é proibido por varredura), não recorta a lista por
`ativa` (o backend manda tudo, marcado) e não reproduz o rateio da desalocação.
Nada da DEC-040/041/042/043 foi afrouxado por conveniência de tela.

---

## Moeda nunca trunca — e a coluna de dinheiro tem largura própria (F-1b.2)

**Valor cortado é pior que valor ausente**, porque parece legível e não é. A
coluna "Líquido" da listagem de pagamentos exibia **"R$ 3.50…"**; a coluna
"Honorário", **"Honorári…"** em quase toda linha.

### A causa, que não era a classe de truncamento

`.data-table--fixed td` aplica `text-overflow: ellipsis` a **toda** célula, não
só às marcadas com `cell-truncate`. Numa tabela de largura fixa, **largura
insuficiente já é truncamento**, sem ninguém pedir. As duas colunas eram
`col-xs` (100 px), que corta em ~8 caracteres — exatamente onde
"R$ 3.500,00" vira "R$ 3.50…" e "Honorários advocatícios" vira "Honorári…".

### As regras

- Coluna de dinheiro usa **`.col-money`** (150 px) e **nunca** recebe
  `cell-truncate`. Faltando espaço na tabela, quem cede é a coluna de **texto
  livre** — a que fica `auto` e tem `title` com o texto inteiro.
- A largura é dimensionada pelo **valor máximo plausível**, não pelo que está
  no banco hoje. 150 px dão ~122 px de conteúdo, o bastante para
  "R$ 1.234.567,89". Calibrar pelos dados atuais é voltar a cortar em silêncio
  no dia do primeiro honorário de êxito sobre um monte-mor grande.
- **Data** usa `.col-data` (130 px) e **status** usa `.col-status` (160 px),
  pelo mesmo argumento: "18/08/20…" se lê como uma data de 2020, e
  "Parcialm…" não é um status.
- A proibição é **verificável**: `f1b2.test.js` falha se achar `cell-num` e
  `cell-truncate` na mesma célula, em **qualquer** das sete listagens — não só
  nas financeiras. Uma regra que só vive em comentário volta na próxima
  listagem.

### A coluna "Honorário": por que largura sozinha não resolvia

As descrições reais compartilham 23 caracteres de prefixo ("Honorários
advocatícios — "). Numa coluna que comporta ~22, alargar só troca "Honorári…"
por "Honorários advocatíci…", que continua sem diferenciar nada; caber o
prefixo **mais** o específico passaria de 400 px, e aí some a coluna do
processo.

A saída foi o **trecho distintivo** (`utils/feeLabel.js`): a descrição segue a
forma "categoria — específico", e a listagem exibe o específico. A regra é
**uniforme** (corta sempre que houver separador), porque uma coluna que muda de
critério linha a linha é pior de varrer com o olho. O separador exige **espaço
dos dois lados**, para "pré-pago" e "extra-judicial" não serem partidos. A
descrição inteira continua no `title` e na página para onde o link leva —
escolhe-se qual metade aparece primeiro, não se apaga nada.

### O badge "Estornado integralmente"

Sai de `utils/statusVisual.js`, como todo rótulo de estado desde a 4.3 — nunca
de string escrita no JSX. Não é status do backend: é `valorLiquido <= 0`, uma
distinção de **leitura**, na mesma linhagem de `reparcelada`. Tom `danger`, e
não `warning`, porque o estorno **parcial** já usa o realce de aviso na célula
do líquido e os dois precisam se distinguir num relance.

Ele mora na coluna do **valor**, e cabe lá porque **quebra em duas linhas** —
`white-space: normal` reafirmado contra o `nowrap` da célula *e* o do próprio
badge. Alargar a coluna para 180 px teria custado a coluna do processo.

---

## Responsividade — LEX é PWA, tela que não cabe é defeito (F-1b.2)

O Daniel anotou "responsividade da tela não adequada" no passo 159 e "rever
responsividade" no passo 163. As regras abaixo ficam ao lado das classes de
tabela da 4.3.

### As regras

1. **Nenhuma barra de rolagem horizontal da PÁGINA em 360 px.** Tabela que não
   cabe rola **dentro do próprio container** (`.table-wrapper`, a regra do
   passo 111). A página rolando de lado é defeito.
2. **Nenhum valor em reais quebra no meio nem trunca.** Os quatro números do
   honorário **empilham** (`auto-fit` + `minmax`) em vez de espremer.
3. **Modal em 360 px** cabe na largura, cabe na altura **com o teclado virtual
   aberto**, os botões continuam alcançáveis e o quadro de efeito continua
   legível — ele é o ponto do modal.
4. **No extrato**, valor e descrição não colidem: em tela estreita o valor vai
   para **linha própria** em vez de espremer a frase.
5. **Breadcrumb longo** encurta com reticências e o bloco do usuário continua
   na tela.
6. **`:focus-visible` preservado** em tudo que ganhar CSS novo.

### Os três defeitos reais que foram corrigidos

**a) `span-*` valia por PAR de classes, e o bloco novo ficou de fora.** As
larguras de grade eram escritas como `.form-group.span-3`, `.form-note.span-3`,
`.form-fieldset.span-3` — uma lista que cada bloco novo tinha de entrar. O
preview de alocação (`<div className="plano span-3">`) não entrou, e ocupava
**uma** das três colunas em desktop. Pior: `.form-info-box` recebia
`grid-column: span 2` em ≤1023 px e **nada** a devolvia para `1` em ≤767 px —
num grid de uma coluna, `span 2` cria uma **coluna implícita** e a grade fica
mais larga que o container. **Era essa a rolagem horizontal do passo 159.**

A largura passa a ser da **classe** (`.span-1/2/3`), com os três pontos de
quebra. Quem entrar no grid amanhã com `span-3` recebe a largura certa sem
editar a folha — que é o que a lista por par não garantia. Os pares antigos
ficam: são mais específicos, dizem a mesma coisa, e removê-los mexeria em seis
telas para ganhar nada.

**b) `overflow-wrap: anywhere` partia o valor ao meio.** Em `.plano__linha`, ele
evitava o estouro da caixa cortando onde desse — **inclusive dentro do
número**: "R$ 3.0" numa linha, "00,00" na outra. Valor partido é o mesmo defeito
do valor truncado, com outra aparência. Trocado por `break-word`, que só age em
palavra que sozinha não caberia.

> A regra se apoia num fato do formatador: `Intl` pt-BR separa "R$" dos dígitos
> com **espaço não-separável** (U+00A0), e dígito não tem oportunidade de
> quebra. Sem `anywhere`, o valor é **indivisível por construção**. Há teste
> fixando isso — se o `Intl` passasse a emitir espaço comum, a regra de CSS
> deixaria de bastar sozinha.

**c) O modal era 32 px mais largo que a tela, e o teclado cobria os botões.** O
afastamento das bordas era `margin: var(--space-4)` no modal, que tem
`width: 100%`: num container de 360 px isso dá 360 **mais** 32 de margem, e
`box-sizing: border-box` não alcança margem. Virou **padding da moldura**.

E `max-height: calc(100vh - …)` ignora o teclado virtual: com ele aberto, o
modal continua dimensionado para a tela inteira e os botões ficam embaixo do
teclado, sem rolagem que os alcance. Agora é `100dvh`, com `100vh` na linha
anterior como retaguarda. A moldura ganhou `overflow-y: auto`, porque
`align-items: center` com conteúdo mais alto que o container corta os **dois**
lados e o de cima é inalcançável.

### O que a suíte prova, e o que ela NÃO prova

A varredura alcança **regra**, não **pixel**: ela confirma que `100dvh` está na
folha, que `span-*` volta à coluna única em 767 px, que `anywhere` sumiu e que
`auto-fit`/`minmax` está no cabeçalho. Ela não renderiza nada — não há
navegador, não há layout, não há teclado virtual. **Largura que estoura, botão
embaixo do teclado e badge que não cabe são, por definição, olho humano**, e
estão nos passos **165 a 171** do roteiro.

Duas folhas mexidas são **compartilhadas** — `pages/clients/ClientPage.css` e
`components/ui/Modal.css`. `appliedClasses.test.js` cobre alcance de regra, não
aparência, então a não-regressão dos formulários antigos é **inteiramente olho
humano**: é o **passo 171**, escrito para isso.

---

## O aviso preventivo do estorno — avisar sem bloquear (F-1b.2)

Com um valor acima do líquido digitado, o quadro continuava dizendo "Estorno
integral" até o servidor recusar com 422 — descrevia com segurança um efeito
que não ia acontecer, porque `valor >= liquido` é verdade tanto **no** teto
quanto **acima** dele.

`acimaDoEstornavel()` roda **antes** de qualquer outra leitura, e o quadro troca
a descrição por uma constatação verdadeira, mudando de **tom** junto (aviso, não
perigo — nada foi recusado ainda).

**O envio continua liberado.** O servidor é a autoridade sobre quanto ainda é
estornável — padrão do passo 102, e por uma razão concreta: entre abrir o modal
e confirmar, outro estorno pode ter entrado, e uma tela que barrasse pelo número
que leu há um minuto recusaria operações legítimas sozinha, sem recurso. Há
teste fixando que o `submit` só olha `salvando`.

A comparação é em **centavos inteiros**: no teto exato, `45.00 * 100` em float é
como um aviso falso apareceria bem no valor que o botão preenche sozinho.

---

## O que fica para a F-1b.3 e adiante

**F-1b.3 — as listagens.** FEITA. Paginador real nas três listagens financeiras
**e no extrato** (o "Carregar mais" saiu: ver a seção da F-1b.3 abaixo), filtro
por honorário, barra de busca e filtro por período nas três.

Também declarado, e **não** feito ali: as colunas de **status** e **data** das
listagens **não financeiras** (`ProcessListPage`, `ClientListPage`,
`DocumentListPage`) não foram remedidas. Elas não têm coluna de dinheiro, então
a regra da F-1b.2 é vacuamente satisfeita; a varredura já as cobre, e se
ganharem dinheiro amanhã ela falha. **Elas também não foram convertidas ao
paginador novo** — o componente é genérico o bastante, e converter tela que
ninguém pediu é o trabalho que some no meio de outro.

**F-1c.** Reparcelamento ponta a ponta, a leitura do "de N" pós-reparcelamento,
e a seção do roteiro que valida o módulo inteiro.

---

## RESTRIÇÃO DE PROJETO — o layout das páginas vai mudar (F-1b.3)

**A decisão não é do Daniel.** O desenho das páginas do LEX deve mudar por
decisão externa, e o desenho novo ainda não existe.

**A consequência prática, e ela vale a partir de agora:** invista no que
sobrevive a um redesenho, e gaste o mínimo possível em CSS de página.

| Sobrevive ao redesenho | Não sobrevive |
|---|---|
| contrato de API (filtros, envelope, `campo` do 400) | grade da página, espaçamento, ordem visual das colunas |
| comportamento (foco que não se perde, página que volta ao 1, Esc que fecha, foco que volta ao gatilho) | escolha de cor, sombra, arredondamento |
| componente reutilizável (`Paginador`, `ActionMenu`, `FinancialFilters`) | o lugar exato onde ele é montado na tela |
| função pura testável (`paginacao.js`, `periodo.js`, `filterSummary.js`, `statementEntry.js`) | tudo o que só existe dentro do JSX |

**O que isso PROÍBE:** reestruturar tela existente por gosto. Na F-1b.3 o
extrato ficou como está (a DEC-044 resolveu a leitura e o passo 165 provou), e
o agrupamento por operação **não** entrou.

**O que isso NÃO afrouxa:** as regras da F-1b.2 continuam valendo integralmente
— moeda nunca trunca, `col-money`/`col-data`/`col-status` com as larguras
declaradas, responsividade em 360 px. Um redesenho futuro não é licença para
regredir; é motivo a mais para as regras estarem em teste e não em memória.

**Consequência no roteiro:** o passo **167** (responsividade em 360/768/desktop)
passou em 19/08/2026 e **precisa ser reexecutado** quando o desenho novo
chegar. Está registrado lá e aqui.

---

## Fase F-1b.3 — achar o lançamento

**A pergunta da fase:** achar um lançamento sem precisar lembrar de qual
honorário ele é.

### Paginador à mão, e as contas fora do componente

`components/ui/Paginador.jsx` + `components/ui/paginacao.js`. Zero dependência
(regra do projeto): são dois botões, um rótulo e três contas. As contas vivem
no `.js`, testadas como função pura — o off-by-one da última página e o
`totalPages` de um conjunto vazio (que é **1**, e não 0: "página 1 de 0" não é
uma posição em que alguém possa estar) estão fixados em teste.

Substituiu, nas três listagens financeiras **e no extrato**:

- o teto 100 + `aviso-lista-parcial` da F-0 ("Mostrando 100 de 137. Use os
  filtros para reduzir o conjunto."). Era honesto e não era navegação: quem
  tinha 137 pagamentos não tinha como chegar no 101º;
- o "Carregar mais" do extrato. O argumento do acúmulo — o extrato se lê como
  história — vale para quem lê a história inteira, e não cobre quem procura UM
  lançamento. Com acúmulo **não há como voltar**: não existe posição para onde
  voltar.

`.aviso-lista-parcial` continua em `modules.css`, **sem uso**, com comentário
dizendo por quê: as listagens não financeiras ainda não foram convertidas.

### O estado dos filtros vive num hook só

`hooks/useListFilters.js`. Duas regras que ele existe para tornar impossíveis de
esquecer:

1. **mudar filtro volta para a página 1** — senão quem está na página 4 e
   escolhe um honorário com duas páginas cai numa página vazia e conclui que o
   honorário não tem lançamento;
2. **trocar de página não perde filtro nem busca** — consequência de a página
   ser mais um campo do mesmo objeto de consulta, e não um estado paralelo.

Escrito como hook, e não repetido nas três telas, porque **as três telas são
exatamente onde a regra se perde**: a que for escrita por último copia a
anterior e esquece o `setPage(1)`.

### A barra de filtros é componente de MÓDULO — a causa do passo 155

`components/financeiro/FinancialFilters.jsx`, declarado no escopo do módulo.
Um componente declarado **dentro** do render do pai é um tipo novo a cada
consulta: o React desmonta e remonta a árvore inteira dele, e **o input perde o
foco** — o mesmo defeito do `return <Loading/>` antecipado, por outra porta.

A varredura estática (`tests/regressions/f1b3.test.js`) trava as duas portas.

`children` recebe os filtros que só uma listagem tem (status, tipo, forma de
pagamento): uma prop `mostrarStatus` por listagem viraria uma lista de
bandeiras que só cresce.

### DEC-045 — a referência do pagamento é o que o humano reconhece

**O defeito, com o caso real (passo 166).** Dois pagamentos do mesmo dia saíram
referenciados como **#e66b7a** e **#e66b7c** — diferem no **último** caractere.
A suíte provava que não colidiam; ninguém casava as linhas de relance. A causa
é estrutural: os seis últimos hex de um ObjectId são o **contador**, que
incrementa de 1 em 1, então pagamentos criados em sequência **sempre** colidem
no prefixo desses seis.

**A decisão.** O vínculo nomeia o pagamento por **valor** e **forma**, além da
data:

> Do pagamento de **R$ 300,00 em dinheiro** (10/06/2026, #db9126), aplicado na
> parcela 3.

O sufixo do id **permanece**, como desempate do caso degenerado (dois
pagamentos idênticos em valor, forma e data — duas notas de R$ 300 no mesmo
dia é caso real). Deixou de ser a referência principal.

**Uma função só, usada pelos dois lados do vínculo:** `identidadeDoPagamento`
em `statementEntry.js`. A frase da alocação e a referência da linha do próprio
pagamento saem dela — é isso que faz as duas se casarem na tela. Duas redações
para a mesma identidade seria o defeito da DEC-045 outra vez, com outro
sintoma.

O backend passou a mandar `valorPagamento` e `formaPagamento` nas linhas de
alocação e desalocação do extrato. Sem pagamento por trás (saldo adiantado) os
dois vêm `null`, e a frase **não escreve "R$ 0,00"**.

### Menu de três pontos — `components/ui/ActionMenu.jsx`

A coluna Ações de Pagamentos tinha **três** botões ("Baixar recibo",
"Estornar", "Editar") numa coluna de 230 px dimensionada para dois: o terceiro
ficava **fora da tela**. Ação escondida atrás de rolagem que ninguém percebe é
ação que não existe.

Alargar a coluna resolveria hoje e quebraria na quarta ação. O menu tem largura
**fixa de um botão** (`.col-acoes-menu`, 96 px), qualquer que seja o número de
ações — é a medida que não volta a quebrar quando a F-1c acrescentar
"Reparcelar" e a F-2, "Mudar status".

Comportamento, igual ao dos modais do projeto (passo 31): abre por clique e por
teclado (é um `<button>` de verdade — Enter e Espaço vêm de graça), fecha com
**Esc** e com clique fora (`mousedown`, não `click`: um item que navega desmonta
a linha antes de o `click` chegar ao documento), e **devolve o foco ao botão que
o abriu**. `:focus-visible` vem da regra global e não é sobrescrito.

**Escrito para a F-2 reusar**, e não além disso: sem submenu, sem ícone, sem
atalho por letra, sem posicionamento automático — nada disso tem chamador.

**O que NÃO entrou no menu:** a nota **"sem recibo"** do pagamento
integralmente estornado e o **"Reparcelada"** da parcela cancelada. As duas são
**explicação, não ação** — escondê-las devolveria o buraco silencioso que a
F-1b fechou, com um passo a mais: a advogada teria de abrir um menu para
descobrir por que falta um botão.

### Três testes antigos foram REESCRITOS, não afrouxados

| Teste | O que ele fixava | Por que mudou |
|---|---|---|
| `regressions/f0.test.js` | `const LIMITE = 100` e `aviso-lista-parcial` nas duas listagens | fixava o **andaime** que esta fase substituiu. Passou a exigir `POR_PAGINA`, `setTotal` e `<Paginador total={total}>` |
| `financial/f1b.test.js` | `Carregar mais` no extrato | idem. Passou a exigir `<Paginador>` e a **proibir** o "Carregar mais" — os dois padrões dariam duas posições para a mesma lista |
| `financial/f1b2.test.js` | a tela chama `refDoPagamento` | a DEC-045 pôs o sufixo dentro de uma identidade maior. Passou a exigir `referenciaDaLinhaDePagamento` — a regra protegida é a mesma: **formato único, num lugar só** |
| `financial/estatica.test.js` | `(p.valorLiquido ?? p.valor) > 0 &&` literal | o líquido virou variável da linha (decide dois itens do menu). Passou a medir as duas metades: de onde o líquido sai, e que é ele quem decide o recibo |

Cada um leva no próprio arquivo o porquê da mudança. **Um teste que trava o
andaime contra a obra é um teste que precisa ser reescrito, não apagado.**
---

## DEC-046 — o menu de ações é renderizado em portal, posicionado pelo viewport (F-1b.3.1)

### O defeito

Na validação manual da F-1b.3 o botão **⋮** passou em tudo que é
comportamento: recebia o **anel de foco dourado** por Tab e **abria** o painel
ao clique. **O painel saía da tela, cortado — nas três listagens.**

Foco e abertura funcionando **descartam** as causas de comportamento (o
`keydown` registrado, o estado que abre, o `outline` apagado). Sobrou
posicionamento. E "nas três" é a assinatura de causa **estrutural**: é um
componente só, dentro de um wrapper só.

### A causa

O painel era `position: absolute` dentro da própria célula. **Todo ancestral
com `overflow` diferente de `visible` recorta descendente posicionado**, e
havia **três**, aninhados:

| # | Seletor | Arquivo | Propriedade |
|---|---|---|---|
| 1 | `.data-table--fixed td` | `styles/modules.css` | `overflow: hidden` |
| 2 | `.table-wrapper` | `styles/modules.css` | `overflow-x: auto` |
| 3 | `.main-content` | `components/layout/AppLayout.css` | `overflow-y: auto` |

O mais interno é o que menos se procura: a **própria célula**, de 96 px — o
painel de 180 px era recortado antes mesmo de chegar ao wrapper. E o wrapper
recorta nos **dois** eixos: quando um eixo é `auto` e o outro é `visible`, o
`visible` **computa para `auto`**. A rolagem horizontal que fez a tabela caber
é a mesma que corta o menu para baixo.

**Recorte não é ordem de pintura.** Nenhum `z-index` atravessa um `overflow` —
foi por isso que o `z-index: 20` original não adiantou nada.

### A solução

O painel é renderizado por **`createPortal`** (do `react-dom`, que já é
dependência — **zero dependência nova**) direto no **`document.body`**, fora
dos três contêineres, com **`position: fixed`** e coordenadas calculadas do
gatilho por **`getBoundingClientRect()`**.

A conta mora em `components/ui/actionMenuPosition.js`, **módulo `.js` separado
e função pura** — a suíte é `node --test` sem DOM, e conta dentro de `.jsx` só
se testaria por varredura de texto.

- **Alinhamento padrão:** borda direita do painel na borda direita do botão,
  abrindo **para baixo**. A coluna de ações é a última da tabela.
- **Virada horizontal:** se a borda esquerda ficaria fora, alinha pela
  **esquerda** do botão. É o caso de **360 px**, onde o painel é mais largo que
  o espaço à esquerda do gatilho.
- **Virada vertical:** se não cabe abaixo, abre **acima**. É o caso da **última
  linha visível**.
- **A coordenada NUNCA sai do viewport.** Um painel maior que a própria tela
  encosta na margem em vez de vazar. A suíte varre a tela inteira, em 360 e
  1024 px, e não aceita uma posição fora.

### Rolar fecha o menu

Um painel `fixed` é ancorado ao **viewport**: o botão a que ele pertence rola,
o painel não. Reposicionar a cada quadro seria possível e seria **pior** — o
painel passaria por cima do cabeçalho e sairia da tabela. **Um menu apontando
para a linha errada é pior que menu nenhum**, então ele fecha. Vale para a
rolagem da página, para a rolagem horizontal da tabela e para o `resize`.

`scroll` é escutado em **captura** (`addEventListener('scroll', fechar, true)`)
porque **`scroll` não borbulha**: sem a captura, a rolagem da `.table-wrapper`
e a da `.main-content` — que são exatamente as duas desta tela — nunca
chegariam a um ouvinte do `window`. E quem põe com captura **precisa remover
com captura**, senão o ouvinte fica.

### A armadilha do portal, registrada

Com o painel fora da raiz, `raizRef.contains(alvo)` **deixa de valer**: o
clique dentro do painel passa a parecer clique fora, e o menu fecharia no
primeiro item clicado. O fechamento por clique fora consulta **os dois**
elementos, o gatilho e o painel.

### `fixed` só é confiável porque nenhum ancestral cria bloco de contenção

`transform`, `filter`, `contain` e `perspective` em **qualquer** ancestral
criam bloco de contenção e re-ancoram o `fixed` ao elemento em vez do viewport.
Foi conferido na Parte 1 que não há nenhum deles no caminho — os únicos hits do
projeto são `text-transform` (que não conta) e o `filter` do logo, que não é
ancestral de tabela. **Uma varredura estática mantém a conferência viva**: se
alguém puser um `transform` no layout ou na tabela, o portal continua
funcionando e o **posicionamento volta a errar, calado**.

### A consequência de projeto

**Qualquer flutuante futuro dentro de tabela rolável tem este mesmo problema e
esta mesma solução** — tooltip, popover, seletor de data, autocomplete. Não é
uma peculiaridade do menu de ações: é o que acontece com todo elemento
posicionado que precisa escapar de um contêiner que recorta. Quem for
construir o próximo começa por `actionMenuPosition.js` e por `createPortal`, e
não por `z-index`.

---

## Singular e plural — `components/ui/plural.js` (F-1b.3.1)

O rodapé de Parcelas filtradas dizia **"1 parcelas"**. O rótulo chegava ao
paginador **já no plural**, porque as listagens passavam o nome da coleção.

O rótulo passou a ser o **singular** (`rotulo="parcela"`) e a concordância é de
`pluralizar(quantidade, singular)`. **A direção importa:** derivar o singular
do plural exigiria saber que a palavra não termina em "s" no singular
("lápis"), e o caminho só existe numa direção.

`0` vai para o **plural** — é a concordância do português, e o singular é só o
1. As regras cobrem as quatro palavras dos rodapés e as terminações vizinhas
(`ão` → `ões` **antes** da regra de vogal, senão "movimentaçãos"); o que elas
errarem entra em `PLURAIS_IRREGULARES`, e não num `if` na tela.

As **duas formas** do rodapé: página única diz o total (**"11 pagamentos"**),
paginada diz o intervalo (**"1–20 de 23 parcelas"**).

---

## A célula de ações comporta a NOTA, não só o botão (F-1b.3.1)

`col-acoes-menu` era **96 px** — a medida do gatilho (40) mais o padding (24),
e esquecia que a **nota divide a célula com ele**. Com `overflow: hidden` em
toda célula de `data-table--fixed`, **largura insuficiente é truncamento
silencioso**: "Reparcelada" saiu **"Reparcelad"**.

Passou a **120 px**, que é a medida da **nota mais longa**, e a nota ficou
**empilhada acima** do gatilho (`.actions-cell--menu`). Lado a lado exigiria
~150 px, e os 30 px de diferença sairiam da coluna de texto livre. Os 24 px
que a coluna ganhou saíram da coluna **auto**, que trunca por projeto — **nunca
da coluna de dinheiro**, que continua em 150 px (regressão da F-1b.2).

**"Reparcelada" e "sem recibo" são EXPLICAÇÃO, não ação** — continuam fora do
menu, na célula. Escondê-las no menu faria a advogada abrir um menu para
descobrir por que falta um botão.

---

## Emenda à DEC-046 — o portal custa a ordem de tabulação (F-1b.3.2)

A DEC-046 tirou o painel do contêiner que o recortava. **Tirou junto a ordem de
foco natural** — e isso só apareceu na validação manual, no passo 178.

**O defeito.** O menu abria com Enter, o anel de foco aparecia, as ações
funcionavam ao clique e o painel ficava dentro da tela. Mas **o painel não era
acessível por Tab, só por mouse**.

**A causa é a outra metade do portal.** `createPortal` propaga **eventos** pela
árvore do React — é por isso que o `onClick` dos itens sempre funcionou. Mas a
**ordem de tabulação é a do DOM real**, e no DOM real o painel é o **último
filho do `document.body`**, enquanto o gatilho está numa célula no meio da
tabela. Tab a partir do gatilho ia para a **próxima célula da tabela**.

Antes da DEC-046, o painel era irmão imediato do gatilho e o Tab caía nele de
graça. **A correção do recorte pagou com a ordem de foco.**

### O foco passa a ser conduzido

| Momento | Comportamento | Por quê |
|---|---|---|
| **Ao abrir** | foco vai para o **primeiro item** | sem isso o Tab sai para a tabela |
| **Ao abrir, quando** | **depois** de a posição estar calculada | focar elemento `visibility: hidden` no canto superior esquerdo faz o navegador **rolar a página até lá** |
| **Tab** | no último item, **volta ao primeiro** | a tabela está **atrás** de um menu aberto; tabular para dentro do que está atrás é o defeito do painel cortado, só que invisível |
| **Shift+Tab** | no primeiro, vai ao **último** | idem, no outro sentido |
| **Esc** | fecha e devolve o foco ao gatilho | com o Tab preso no painel, é o **único caminho de volta** |

A ordem é garantida pela **lista de dependências** do efeito (`[aberto,
posicao, itensFocaveis]`), não pela ordem das linhas no arquivo: `posicao` só
deixa de ser `null` depois do `useLayoutEffect` ter medido.

**`preventDefault` é obrigatório** e é a linha que mais some numa refatoração:
sem ela o navegador move o foco **antes** de o código correr, e o `.focus()`
vira correção tarde demais — o foco pisca na tabela e volta.

**Item desabilitado fica fora do ciclo.** Um `<button disabled>` não é
tabulável; incluí-lo faria o ciclo parar num elemento que o navegador se recusa
a focar, e o menu travaria no "Baixando…" do recibo em curso.

**Sem `autoFocus`** — regra do projeto desde a F-1a, agora varrida no projeto
inteiro pela suíte. **Sem setas** (`ArrowUp`/`ArrowDown`): não têm chamador, e
generalizar antes do segundo caso é inventar requisito.

### A consequência, para quem usar portal de novo

**Quem usar `createPortal` outra vez — tooltip, popover, seletor de data —
herda este custo junto com a solução.** O portal resolve o recorte e quebra a
tabulação, sempre. Os dois vêm no mesmo pacote, e o segundo é invisível até
alguém tentar navegar sem mouse.

**Por que a suíte não pegou:** é foco, e não há DOM em `node --test`. O passo
178 existe exatamente para isto e **funcionou como projetado** — achou o que a
varredura não alcança. O que a suíte trava agora é a **mecânica**, que é onde o
defeito voltaria.

---

## DEC-047 — a coluna de ações de toda listagem é o menu ⋮ (F-1b.3.2)

Relato do Daniel: *"temos que usar o menu de ações de ⋮ em tudo, em processos
também está sem, em documentos também, apenas a parte financeira está
correta."*

**A razão não é estética.** Até aqui, a advogada aprendia um gesto no
Financeiro e ele **não valia nas outras telas**. Um sistema que resolve o mesmo
problema de duas formas obriga a decorar qual tela usa qual.

### A regra

- **Ação vai para DENTRO do menu.** Editar, Excluir, Baixar, Ver, e o que vier.
- **Explicação fica FORA dele, na célula.** "Reparcelada", "sem recibo" e afins
  — esconder explicação no menu faria abrir um menu para descobrir **por que
  falta um botão**.
- **Excluir sempre em vermelho, sempre por último.**
- **O componente é o mesmo `ActionMenu`. Nenhuma cópia.**

### As sete listagens

| Listagem | Ações, na ordem | Entrou em |
|---|---|---|
| Pagamentos | Baixar recibo, Estornar (só com líquido), Editar | F-1b.3 |
| Parcelas | Editar, **Excluir** | F-1b.3 |
| Honorários | Editar, **Excluir** | F-1b.3 |
| Clientes | Ver, Editar, **Excluir** | F-1b.3.2 |
| Processos | Gerenciar, **Excluir** | F-1b.3.2 |
| Documentos | Abrir, Baixar PDF, Baixar DOCX, **Excluir** | F-1b.3.2 |
| Seções | Ver, Editar, **Desativar** | F-1b.3.2 |

**Quatro listagens entraram, e não três.** A **Biblioteca de Seções** tinha o
mesmo padrão e não estava no relato — deixá-la de fora tornaria esta decisão
falsa no dia em que foi escrita.

### Os casos que não eram "editar/excluir"

- **Documentos: PDF e DOCX** eram downloads com **ícone** e estado "baixando".
  Os **ícones saíram**: dentro do menu o item é uma **linha de texto**, e
  "Baixar PDF" por extenso diz mais que um ícone de 13 px ao lado de "PDF" — o
  `title` que explicava o ícone deixou de ser necessário pelo mesmo motivo. O
  **estado continua**: o item vira "Baixando…" e fica desabilitado.
- **Seções: "Ver"** abre um **modal de preview**, não navega — é `onSelecionar`
  e não `to`, que é a distinção que o `ActionMenu` já fazia.
- **Seções: "Desativar"** leva o vermelho mas **não virou "Excluir"**: a seção
  não é apagada, e trocar o verbo mudaria o que a tela promete.

### O que a decisão apagou

As medidas de coluna por quantidade de botão — `col-acoes-2`, `-2-lg`, `-3`,
`-3-lg`, `-4`, de 180 a 340 px — **ficaram sem chamador e foram removidas**.
Sobrou **`col-acoes-menu`, 120 px**, a largura de um botão mais a nota.

Não foram deixadas "por precaução": **medida de coluna sem chamador é a próxima
listagem escolhendo entre seis larguras que não deveriam existir** — e foi
exatamente assim que a listagem de pagamentos acabou com três botões numa
coluna dimensionada para dois, que é o defeito que abriu a F-1b.3.

---

## DEC-048 — "Parcela 1 de 3" (F-1c.1)

### O defeito

O reparcelamento continuava a numeração: um honorário de 2 parcelas que virava
3 ficava com **1, 2** (canceladas) e **3, 4, 5** (vivas). Para quem lê,
**"parcela 3" de um plano de três é a PRIMEIRA** — e a advogada, ao telefone
com o cliente, precisa dizer "são três parcelas, esta é a primeira".

### A regra

O plano vigente numera de **1**. As canceladas guardam o número que tinham,
com **"Reparcelada"** ao lado, e o **"de N" delas é congelado** no tamanho do
plano a que pertenciam — uma cancelada de um plano de 2 continua dizendo
**"de 2"**, mesmo que o plano de hoje tenha 5.

### O rótulo sai de UMA função

`components/financeiro/installmentLabel.js`:

| Função | Para quê |
|---|---|
| `rotuloDaParcela({ numeroParcela, totalParcelas, totalNoPlanoVigente })` | "Parcela 1 de 3" |
| `tamanhoDoPlanoVigente(parcelas)` | conta o plano ORIGINAL vivo, sem somar gerações |
| `rotuloNaLista(parcela, parcelas)` | resolve o vigente sozinho, para o chamador não saber da regra |

**`totalParcelas` (congelado) tem precedência SEMPRE** sobre
`totalNoPlanoVigente`. É o ponto inteiro da decisão.

**N = 1 não ganha "de 1"**: a única parcela do plano já se identifica por ser a
única, e "Parcela 1 de 1" é o mesmo ruído que o recibo evita desde a 4.1.

**Cuidado com `Number(null)`**, que é `0` e é finito: sem guarda, uma parcela
ausente vira **"Parcela 0"**, que parece um número de parcela e é lido como um.

Seis telas mostram número de parcela (honorário, listagem, extrato, recibo,
ficha do processo, dashboard). **Rótulo montado em seis lugares é rótulo que
vai divergir** — e aqui divergir significa a lista dizer "Parcela 1 de 3" e o
recibo dizer "parcela 3", sobre a mesma parcela. A suíte proíbe `Parcela {` no
JSX das telas.

### A listagem de Parcelas não consegue contar o plano sozinha

Ela **atravessa honorários**: vinte linhas podem ser de oito honorários
diferentes. Contar o plano a partir do array da página daria o tamanho da
**página**, e o número mudaria a cada filtro. Por isso o backend manda
**`totalNoPlano`** já resolvido, e a tela só o exibe.

A página do honorário tem a lista inteira e conta sozinha, via `rotuloNaLista`.

### O extrato usa a frase que o backend manda

`statementEntry.parcelaDoEvento` prefere `evento.referencia` — *"parcela 1 de
3, vencendo 15/09/2026"*. Ela vem de lá porque **só o backend sabe o "de N"
congelado de cada geração**. O ordinal nu continua como retorno para resposta
de API antiga, que a tela não pode quebrar.

Depois da renumeração existem **duas parcelas nº 1** no mesmo honorário, e o
ordinal deixou de identificar qualquer coisa — é o defeito da DEC-045, agora em
parcelas, e a solução é a mesma: **referência por atributo**.

### O portal do cliente não mostra parcela

E não por esquecimento: a **DEC-029 ponto 8** mantém o portal **sem nada
financeiro**, com teste travando no backend. Não há rótulo a aplicar lá — e se
aparecer número de parcela no portal, **isso é o defeito**, não a melhoria.

---

## DEC-049 — a tela do reparcelamento tem ROTA, não modal (F-1c.2)

### O que ela liga

O backend reparcela desde a **DEC-037** (F-1a). A página do honorário carregava
um botão **"Reparcelar" desabilitado** desde a F-1b, com a frase *"o fluxo
completo chega na fase F-1c"*. **Botão morto numa demonstração é promessa
quebrada** — esta fase o ligou.

### A divergência é a decisão

Estorno e anulação usam **modal**. O reparcelamento usa **rota dedicada**
(`/dashboard/honorarios/:id/reparcelar`), e isso **diverge do padrão de
propósito**.

**Por quê:** o plano novo tem **N linhas editáveis** e uma **soma corrente** que
precisa ficar visível o tempo todo — é ela, e só ela, que decide se o botão pode
ser apertado. Num modal, N cresce, o corpo rola, e a soma sai da tela
**justamente quando há mais linhas para conferir**.

**Modal serve para decisão curta; isto é montagem de plano.** Quem for
"corrigir" a inconsistência depois precisa ler isto antes.

### A ordem da tela não é arbitrária

| # | Bloco | Por que aí |
|---|---|---|
| 1 | **Saldo em aberto** | é a âncora — tudo na tela existe em função dele |
| 2 | **O que sai** | as em aberto, que serão canceladas |
| 3 | **O que FICA** | as pagas, intactas |
| 4 | **O plano novo** | com a soma corrente |
| 5 | **Motivo** | opcional (DEC-037) |
| 6 | **Confirmação** | resumo em português, não "tem certeza?" |

**O bloco 3 é o que faz a função ser usada.** Sem a lista do que fica, a
advogada não tem como saber se reparcelar apaga o que o cliente já pagou — e,
na dúvida, ela não aperta o botão. **A ausência dessa lista é o que faz uma
função existir e não ser usada.**

### A sobra da divisão vai para a PRIMEIRA parcela

R$ 1.000,00 em 3 não dá três parcelas iguais. Alguém fica com o centavo, e ele
vai para a **primeira**: `[333,34 · 333,33 · 333,33]`.

**É decisão de negócio, não de arredondamento.** O cliente paga o valor quebrado
**agora** e o resto é redondo — "R$ 333,34 e mais duas de R$ 333,33" se combina
no telefone melhor que o contrário, e as parcelas que ainda vão vencer são as
fáceis de conferir. A alternativa (sobra na última) deixa a quebra para o fim,
quando ninguém mais lembra por que aquele valor é diferente — e é justamente a
última que costuma ser renegociada de novo.

A linha continua **editável**: a função propõe, a advogada decide. Na tela ela
se identifica ("inclui a sobra da divisão") — sem a marca, um valor que não bate
com os demais parece erro de digitação.

**É combinação com cliente, não decisão técnica** — está na lista de ratificação
da Laís.

### O vencimento cai no ÚLTIMO DIA DO MÊS, nunca no mês seguinte

Somar mês a mês com `setMonth` faz **31/01 + 1 mês virar 03/03**: o navegador
transborda o dia que não existe em fevereiro para março. Uma parcela que deveria
vencer em fevereiro passaria a vencer em março, e a advogada só descobriria pela
**cobrança que não saiu**.

O dia é **preso** ao último do mês de destino: 31/01 → 28/02 (ou 29 em bissexto),
31/03 → 30/04. E o dia original é **reaplicado a partir do primeiro
vencimento**, não do anterior — senão 31/01 viraria 28/02 e depois 28/03,
arrastando o erro para sempre.

### A tela valida, o backend DECIDE

A conferência da soma na tela é **conveniência**: evita uma viagem e mostra
**quanto** falta. A autoridade continua sendo o **422** do
`renegotiationService`, e a mensagem vem de `getFinancialErrorMessage` — nunca
um texto inventado na tela. As duas validações **coexistem**; a da tela não
substitui a do servidor.

**A diferença é nomeada em reais**: "faltam R$ 250,00" / "sobram R$ 100,00",
nunca só um sinal vermelho. A advogada precisa saber **quanto** ajustar, não que
errou — um aviso que diz apenas "valor inválido" a obriga a refazer a conta à
mão, que é o trabalho que esta tela existe para tirar dela.

### O saldo vem de `totais.emAberto`

**Não é conta desta tela.** É a mesma fórmula que o backend usa para validar
(`max(0, contratado − alocado)`, DEC-040). Recalcular aqui abriria a segunda
fonte de verdade que a F-1b fechou, e a divergência apareceria como um **422 num
plano que a tela dizia estar certo**.

### Tudo em centavos, por dentro

`renegotiationPlan.js` converte para centavos inteiros e volta. Somar float
acumula resíduo, e resíduo aqui é a advogada montando um plano que soma
"R$ 6.000,00" na tela e é recusado por um centavo que ela não vê. A comparação
`fecha` é de **inteiros**: `0.1 + 0.2 !== 0.3`, e um plano de três parcelas
cairia nesse buraco.

---

## O Financeiro 2.0 ENCERRA aqui (F-1c.2)

O ciclo que começou na F-1a fecha com esta fase. O que ele entregou, por
decisão:

| DEC | O quê |
|---|---|
| DEC-032 a DEC-039 | o Financeiro 2.0 (alocação, estorno, reparcelamento, tipos de honorário) |
| DEC-040 | `emAberto = max(0, contratado − alocado)`; crédito nomeado à parte |
| DEC-041 / DEC-042 | os estados de quitação no recibo |
| DEC-044 | a linha do extrato que deixou de valer **diz** que deixou |
| DEC-045 | a referência do **pagamento** é valor e forma, não o sufixo do id |
| DEC-046 | o menu de ações em **portal**, posicionado pelo viewport |
| DEC-047 | a coluna de ações de **toda** listagem é o menu ⋮ |
| DEC-048 | **"Parcela 1 de 3"** — numeração do plano vigente, "de N" congelado |
| DEC-049 | a tela do reparcelamento, em rota dedicada |

**A fase seguinte foi a F-2a**, que matou o **V-2** (o 401 que deslogava em
qualquer erro) e limpou as duas pendências que este ciclo deixou: a coluna do
rótulo que truncava e as gerações que se intercalavam. Ver "O que fica para
adiante", no fim deste arquivo.

---

## DEC-050 — o interceptor não conhece rota nenhuma (F-2a)

### O defeito (V-2)

Errar a **senha atual** na tela de troca de senha devolvia **401**. O
interceptor de `api/axiosConfig.js` tratava **todo** 401 como sessão perdida:
`toast.error('Sessão expirada')` e `window.location.href = '/login'`. A advogada
errava a digitação e era **expulsa do sistema**, no meio de uma tarefa.

### A correção NÃO foi feita aqui

A tentação era acrescentar `/auth/alterar-senha` à lista de rotas ignoradas.
**Lista de exceção apodrece:** a próxima rota que devolvesse 401 por engano não
estaria nela, e o defeito voltaria calado, num lugar diferente.

A correção foi no **backend** e é semântica: **o 401 é reservado exclusivamente
para sessão ausente ou inválida; qualquer outra falha de credencial dentro de
uma sessão válida é 422.** Ver a DEC-050 no CLAUDE.md do backend, com o
inventário completo dos 401 classificados.

### O que sobrou deste lado, e por que não é uma lista de exceção

Havia **dois testes de URL** no interceptor:

```js
const isAuthMe  = error.config?.url === '/auth/me';
const isOnLogin = window.location.pathname === '/login';
if (status === 401 && !isAuthMe && !isOnLogin && !isRedirecting) { … }
```

Os dois **saíram**. No lugar entrou uma pergunta sobre **estado**, não sobre
rota:

> **só se desloga quem estava logado.**

Um 401 só é "sessão perdida" se **havia sessão a perder**. Sem sessão, ele é o
estado normal de quem ainda não entrou — a sondagem de `/auth/me` na subida do
app, ou o login recusado —, e reagir a ele mandaria para `/login` quem está
justamente tentando chegar lá, com um "Sessão expirada" sobre uma sessão que
nunca existiu. Em `/registrar` isso **interrompia o cadastro**.

**A diferença entre as duas formas:** a lista de rotas precisa ser atualizada a
cada rota nova, e ninguém lembra. A pergunta sobre estado vale para qualquer
rota que exista hoje ou venha a existir, **porque não fala de rotas**.

### `api/sessionLoss.js` — módulo próprio, e por quê

A regra saiu de `axiosConfig.js` por duas razões, e a segunda decidiu:

1. `axiosConfig.js` cria a instância e importa `utils/toast` — trabalho de
   **fiação**. A regra não é fiação, e misturar as duas foi o que fez o 401 e a
   decisão de deslogar morarem na mesma linha.
2. **A regra ficou testável.** `axiosConfig.js` importa `'../utils/toast'` sem
   extensão, que **só o Vite resolve** — a suíte roda em `node --test` e não
   consegue importar aquele arquivo. Enquanto a decisão morasse lá, ela só podia
   ser verificada lendo o código como texto, e **teste que lê texto não prova
   comportamento**. Agora `ehSessaoPerdida(status, haviaSessao)` é chamada de
   verdade, com 401 e com 422.

É o mesmo motivo de `api/baseURL.js`: infraestrutura compartilhada que não
pertence a nenhuma das duas instâncias.

**Quem responde a pergunta é o `AuthContext`**, a única coisa no app que sabe se
há sessão. Toda transição passa por `registrarUsuario`, que faz `setUser` e
avisa `registrarSessao` no mesmo lugar — há teste travando que só ele chama
`setUser`, porque um `setUser` solto seria uma transição que o interceptor não
veria, e a bandeira ficaria mentindo até o próximo 401.

**A instância do portal não mudou.** Ela nunca teve o defeito: reage só a 401
**com o código `sessaoPortalInvalida`**, e o portal continua com o interceptor
separado pelo motivo de sempre — um 401 de portal não pode arremessar o cliente
para a tela de login da advogada.

## DEC-051 — as gerações agrupadas, o plano vigente primeiro (F-2a)

### O defeito

Na página do honorário as parcelas vinham ordenadas por **número**. Depois da
DEC-048, que faz cada plano numerar a partir de 1, um honorário com três
gerações mostrava:

```
Parcela 1 de 2   (morta)
Parcela 1 de 3   (morta)
Parcela 1 de 2   (VIVA)
Parcela 2 de 2   (morta)
```

Três linhas dizendo "Parcela 1", intercaladas, e a advogada tendo de **caçar
quais são as que valem**. O rótulo estava certo; a **ordem** é que não respondia
pergunta nenhuma.

### A regra

Agrupar por plano. **O plano vigente primeiro**, em ordem numérica; os planos
substituídos depois, também em ordem numérica, cada grupo com um separador que
diga o que ele é — *"Substituídas pelo reparcelamento de 21/08/2026"*.

**O motivo:** a pergunta que a tela responde é *"quanto ainda se deve, e
quando"*. O histórico é resposta de **outra** pergunta e não pode disputar
espaço com a primeira.

**Isso não apaga nada.** As canceladas continuam visíveis, com o rótulo
congelado e o badge "Reparcelada", como a DEC-048 exige. O que muda é **onde**
ficam — depois, e sob um título que explica por que estão ali.

### Como se sabe qual plano é o vigente

**Não** é "o que não tem parcela cancelada", e a diferença é sutil o bastante
para ter merecido nota no código.

`planoId` é a operação que **criou** a parcela (`null` = plano original);
`reparcelamentoId` é a que a **cancelou**. Um plano foi substituído quando
**alguma** parcela dele foi cancelada — e nem todas precisam ter sido: **um
plano de 3 com a parcela 1 já paga cancela só as outras duas**, e a paga
continua de pé, no plano velho.

Por isso o **grupo** é que é "substituído", não a parcela. O separador diz o que
aconteceu com o **plano**; o badge de cada linha continua dizendo o que
aconteceu com **ela** — a paga diz "Pago", as outras dizem "Reparcelada".

### Entre grupos substituídos: ordem cronológica

Do mais antigo para o mais recente. Lido de cima para baixo depois do plano
vigente, o histórico sai **na ordem em que aconteceu**, que é como se conta uma
história.

### A nota subiu para o título do grupo

`.honorario-parcela__reparcelada` **saiu**. Ela repetia "Substituída pelo
reparcelamento de 21/08/2026" em **cada** linha cancelada — a mesma frase três
vezes seguidas, porque as parcelas de um plano são sempre substituídas pelo
**mesmo** reparcelamento. A frase é do grupo, e agora mora nele.

### A ordem sai de função pura

`components/financeiro/installmentGrouping.js`, testada com **três gerações** e
com o caso da parcela paga. A tela só percorre o resultado — há teste travando
que ela não ordena por conta própria.

## A coluna do rótulo da parcela — `.col-parcela` (F-2a)

A coluna **"Nº Parcela"** da listagem de Parcelas (e do **Financeiro**, que
embute a mesma tela) exibia **"Parce…"**. Ela era `col-xxs` (**80 px**) — medida
de quando a célula mostrava o ordinal nu, "1", "2", "3". A **DEC-048** trocou o
conteúdo por "Parcela 1 de 3" e ninguém mexeu na coluna.

**É a mesma família do passo 182 e da moeda da F-1b.2:** numa tabela
`table-layout: fixed`, **largura insuficiente já é truncamento**, sem ninguém
pedir — `text-overflow: ellipsis` vale para toda célula de `.data-table--fixed`.

E este truncamento é dos piores: **"Parce…" não é um rótulo encurtado, é a
palavra "Parcela" cortada no meio** — some o número, que é a única coisa que a
coluna existe para dizer.

**160 px**, dimensionada pelo rótulo mais longo possível — "Parcela 10 de 12",
~114 px em 15 px de fonte, mais o padding e as bordas. Não pelo que está no
banco hoje: coluna calibrada pelos dados atuais volta a cortar no dia em que
entrar um plano de dez parcelas, e volta a cortar em silêncio.

**A largura NÃO saiu da coluna de dinheiro** (seria regressão da F-1b.2). Os
80 px a mais vieram do total da tabela, que cresce e rola dentro de
`.table-wrapper`; `.col-money` continua em 150 px, com teste travando.

**Classe própria, e não `col-md`**, pelo motivo de sempre nesta folha: a medida
precisa vir acompanhada do **porquê**, senão a próxima pessoa a alargar o rótulo
não tem onde ler a conta.

---

## DEC-052 (frontend) — reativar sem adivinhar (F-2b)

> ⚠️ **Leia a DEC-053 (frontend) junto com esta seção.** Desde a F-2c,
> "Reativar" pode aparecer **desabilitado com o motivo ao lado** — um terceiro
> estado do item que esta seção não previa.

### As duas ações são mutuamente exclusivas

"Desativar" e "Reativar" vivem no mesmo lugar do menu **⋮** (DEC-047), e
**aparece só a que o estado do registro permite** — `ativo === false` decide.
Mostrar as duas ofereceria, em metade dos casos, uma ação que o backend
responde **404**.

**"Excluir" saiu** das listagens de Cliente e de Processo. A ação sempre foi
soft delete; enquanto não havia volta, o nome era uma imprecisão tolerável. Com
a reativação existindo ele **mente** — e o modal ainda prometia que a ação *"não
pode ser desfeita"*, o que virou falso. Prometer irreversibilidade numa ação
reversível faz a advogada **evitar uma operação segura**.

As outras quatro listagens continuam "Excluir": elas não ganharam reativação
nesta fase, e renomear uma ação cuja volta não existe seria trocar uma
imprecisão por outra.

**"Reativar" NÃO é destrutivo.** Pintá-lo de vermelho ensinaria a advogada a
hesitar diante da ação que conserta o engano.

### A contagem vem ANTES da confirmação

O modal do processo só abre **depois** que o servidor diz quantos vínculos estão
em jogo (`GET /processes/:id/activation-preview`). Abrir primeiro e preencher o
número depois faria a frase mudar debaixo dos olhos de quem já está lendo.

É a mesma regra do **modal de estorno** (passo 161): a advogada precisa saber o
tamanho do efeito **antes** de causá-lo. Uma confirmação que não diz o que vai
acontecer não é confirmação — é um "tem certeza?" que ninguém lê.

O cliente **não** consulta preview: ele não cascateia (`deleteClient` só aceita
desativar quem não participa de processo ativo), então não há número a buscar.

### As frases são função pura

`utils/activationMessages.js`. Texto escrito duas vezes diverge na primeira
revisão de redação — e aqui divergir significa **uma tela prometer que os
processos voltam e a outra dizer que não**.

Três coisas que as frases carregam, e cada uma resolve um mal-entendido:

| A frase diz | Sem ela |
|---|---|
| **quantos** vínculos caem / voltam | a advogada confirma sem saber o tamanho do efeito |
| que os **removidos à mão não voltam** | "voltam 2" parece errado para quem lembra que havia 3 |
| que reativar cliente **não** reativa os processos | ela reativa o cliente, presume que voltou tudo, e só descobre o contrário quando for procurar um processo |

Singular e plural são tratados: nada de `1 participante(s)`, que denuncia que
ninguém olhou a frase. E com zero participantes a frase **não promete gente que
não existe** — a promessa de que "eles voltam" ficaria sem sujeito.

### O filtro de situação, sem o qual nada disso teria tela

As listagens de Cliente e Processo filtravam `ativo: true` **sem alternativa**:
um registro desativado não aparecia em lugar nenhum, e **um menu com "Reativar"
não teria linha onde existir**. Um cliente desativado por engano ficava
desativado para sempre.

Cada uma ganhou um seletor: **Somente ativos** (o padrão, inalterado), Somente
desativados, Ativos e desativados. **Quem não mexer no seletor vê a listagem de
sempre.**

**Não confundir com o filtro de `status` do processo**, que fica ao lado:
`status` é o andamento jurídico ("encerrado" continua sendo um processo vivo no
cadastro); `situacao` é se o **registro** existe para o sistema.

### A linha desativada leva DUAS marcas

`.tag-desativado` (texto) e `.linha-desativada` (esmaecimento), e as duas são
necessárias:

- a **tag** diz o estado em palavra. **Cor sozinha não serve**: é a única pista
  para quem não distingue matizes, e some numa impressão em preto e branco;
- o **esmaecimento** dá a leitura periférica, para varrer a tabela sem ler cada
  tag.

O esmaecimento é discreto de propósito. Um cinza forte demais faria a linha
parecer **desabilitada** — e ela não é: o menu ⋮ dela continua funcionando, e é
justamente lá que mora o "Reativar".

### Recarregar em vez de mexer na lista em memória

Depois de desativar ou reativar, a tela **refaz a consulta** em vez de filtrar o
array local. O registro pode ou não continuar visível conforme o filtro de
situação em vigor, e adivinhar isso na tela **duplicaria a regra do filtro** —
que já mora no backend.

---

## DEC-053 (frontend) — o motivo aparece, e nomeia o cliente (F-2c)

> A regra inteira, e por que ela é geral, está no **CLAUDE.md do backend**. Aqui
> fica só o que a tela faz — e **a tela não é a autoridade**: o serviço recusa de
> qualquer forma.

### Botão desabilitado com motivo, e não botão ausente

Quando o cliente de um processo está desativado, o item **"Reativar"** do menu
**⋮** aparece **desabilitado, com o motivo ao lado** — e **não some**.

A escolha foi feita, entre as duas possíveis:

| Opção | O que ela ensina |
|---|---|
| item **ausente** | *"o sistema perdeu a função"* — e o passo seguinte é abrir um chamado |
| item **desabilitado com o motivo** | *"dá para fazer, mas nesta ordem"* — que é a verdade |

> **Botão ausente faz procurar; botão desabilitado com explicação ensina.**

O motivo **nomeia o cliente**: *"O cliente João Paulo Oliveira está desativado.
Reative o cliente primeiro."* Uma frase genérica mandaria a advogada procurar,
num cadastro inteiro, qual deles está fora.

### `aria-disabled`, e NÃO `disabled`

Um `<button disabled>` **não recebe foco**. O leitor de tela nunca chegaria nele
— e o motivo, que é o item inteiro, ficaria invisível **justamente para quem
mais depende de texto**.

Com `aria-disabled` o item continua **tabulável**, continua no ciclo de Tab do
painel (emenda à DEC-046, F-1b.3.2) e é anunciado como desabilitado. **O clique
é barrado no handler** — `aria-disabled` só anuncia, não impede.

`desabilitado` sem `motivo` continua sendo `disabled` de verdade: é o caso do
"Baixando…" em curso, onde não há o que explicar e o item não deve segurar o
foco. **São dois estados diferentes, e o contrato do `ActionMenu` os separa.**

O motivo é **texto no próprio item**, nunca `title`: tooltip de `title` não abre
no toque e não é lida de forma confiável por leitor de tela.

### Duas barreiras, e as duas são necessárias

| Barreira | Quando | Contra o quê |
|---|---|---|
| item nasce bloqueado | ao **renderizar a listagem**, por `impedimentosDeReativacao` da linha | o clique inútil |
| `activation-preview` relido | no **instante do clique** | a **aba velha** — a advogada deixou a tela aberta e desativou o cliente por outro caminho |

Sem a segunda, *"nenhuma tela dispara o que o backend recusaria"* valeria só
enquanto ninguém tivesse duas abas abertas. Quando ela dispara, a listagem é
**refeita** — deixá-la desatualizada faria a advogada clicar de novo.

### A frase é montada no frontend, e isso é deliberado

`motivoDeNaoReativar` (`utils/activationMessages.js`) monta o texto a partir do
vetor `impedimentosDeReativacao`. Ela **não copia** a mensagem do servidor, por
uma razão de **tempo**: a tela precisa do texto **antes** de chamar a rota, para
desabilitar o item.

Quem chega ao 409 mesmo assim lê a mensagem do servidor, que diz a mesma coisa.
**As duas redações vivem lado a lado de propósito** — a de cá é a que aparece
primeiro. Ambas concordam no plural, pela mesma razão do `plural()` da DEC-052:
concordância errada numa frase lida todo dia faz o sistema parecer improvisado.

---

## DEC-054 (frontend) — dois eixos na tela, e o selo que não reordena (F-2d)

**O vocabulário é da Laís, de 23/08/2026.** O contrato inteiro e o porquê de
cada decisão estão no `CLAUDE.md` do **backend**; aqui fica o que a tela faz
com ele.

### As quatro fases moram em `utils/enums.js`

`FASE_PROCESSO_OPTIONS` — espelho de `FASES_PROCESSO` do backend, **sem
endpoint e de propósito**: é constante, não dado. Mesma escolha do tipo de
honorário (DEC-039), pela mesma razão — uma rota `/fases` custaria uma viagem
de rede em toda carga de formulário para entregar quatro strings que não mudam
entre deploys. O preço é a duplicação, e há teste **nos dois repos** travando
que as listas não divergiram.

⚠️ **O rótulo da primeira está PENDENTE DE RATIFICAÇÃO.** Ela deu duas
palavras — *"fase inicial"* e *"fase de conhecimento"*. Adotada a segunda; a
razão está no backend. **Trocar é mudar uma string aqui**, sem migração: o valor
gravado é `conhecimento`.

### Nenhuma tela monta o rótulo da fase por conta própria

`rotuloDaFase()` é o caminho único. Listagem, detalhe e formulário passam por
ele.

**Não é zelo abstrato — é a repetição de um defeito já pago.** O `<select>` de
status desta mesma tela montava o rótulo com
`s.charAt(0).toUpperCase() + s.slice(1)`, e foi assim que `parcialmente_pago`
chegou a aparecer na interface **com sublinhado, em cinza**. A 4.3 criou
`statusVisual.js` para eliminar o segundo mapa de rótulos; a F-2d não abre o
terceiro.

Há teste travando três coisas: que as telas usam a fonte única, que **nenhuma**
capitaliza a fase à mão, e que **nenhum** `<option value="execucao">Execução…`
aparece escrito no JSX.

### O seletor oferece as QUATRO, e nenhuma desabilitada

*"Sim, pode voltar."*

> **Se alguma opção de fase aparecer cinza, riscada ou bloqueada, alguém
> inventou uma máquina de estados que a Laís não pediu.** Há teste varrendo o
> JSX do formulário e do detalhe atrás de `disabled` dentro do bloco do
> seletor, e outro atrás de `indexOf`/`findIndex` contra a lista de fases — que
> é como uma máquina de estados entra sem ninguém decidir por ela: primeiro
> para "ordenar", depois para "avisar", e aí já está travando.

### O motivo é opcional — e a tela precisa PARECER opcional

A etiqueta diz **"Motivo (opcional)"**, o campo não tem `required`, e o botão
"Mudar fase" **não** está condicionado ao campo estar preenchido.

**As três coisas são necessárias.** Um campo sem `required` mas sem aviso ainda
parece obrigatório para quem está preenchendo — e um campo que parece
obrigatório é obedecido como se fosse. Há teste para as três.

### A fase muda no DETALHE, não no formulário

Painel **"Andamento do processo"**, em `ProcessDetailPage`. Duas razões, e as
duas são de contrato:

1. **a fase tem rota própria** (`PATCH /processes/:id/fase`), porque toda
   mudança grava histórico. O formulário salva por `PATCH /processes/:id`, que
   **recusa** o campo — misturar os dois faria um "Salvar" só disparar duas
   requisições com semânticas diferentes;
2. **o motivo é da TRANSIÇÃO, não do processo.** Num formulário de quinze
   campos ele pareceria mais um dado cadastral — e ela dispensou o "porquê"
   justamente por não querer preencher campo obrigatório.

No **formulário** a fase aparece só na **criação**: um processo pode ser
cadastrado quando já está em execução, e obrigá-lo a nascer em conhecimento
para depois ser movido registraria uma transição que nunca aconteceu. Na edição
vira leitura, **com o caminho dito por extenso** — um campo em modo leitura sem
explicação parece campo quebrado, e a advogada procura um botão de editar que
não existe naquela tela.

### O histórico já aparece, mesmo antes da F-2e

Bloco **"Histórico de fases"**, lista simples, mais recente no topo. A tela da
linha do tempo é da F-2e; o que existe aqui é a lista bruta do que já foi
gravado — **e ela existe agora porque, sem exibir o histórico, a validação
manual não teria como conferir que o `de → para` está sendo escrito**.

A primeira entrada diz **"Cadastrado em ‹fase›"**, e não `— → Fase de
conhecimento`: o processo nasceu naquela fase, não veio de nenhuma, e um
travessão ali inventaria uma origem.

### O selo da liminar — `.tag-liminar`

*"Liminar é um plus dentro das fases (…) não é uma fase nova."*

Selo ao lado do título, **na listagem e no detalhe, com a mesma classe**. Dois
desenhos para o mesmo fato fariam a advogada duvidar se são o mesmo fato.

**Cor de atenção (`--color-warning`), não de perigo.** Vermelho é o tom de
`cancelado` e `vencido` — coisas que deram errado. Liminar não deu errado: é
pedido de urgência, e pintá-la de vermelho ensinaria a advogada a ler perigo
onde há prioridade.

**A palavra, não só a cor.** Herda a forma da `.tag-desativado` pela mesma
razão escrita lá: cor sozinha é a única pista para quem não distingue matizes, e
some numa impressão em preto e branco.

### 🚨 A LISTA NÃO SE REORDENA POR LIMINAR

**Ela pediu DESTAQUE, não PRIORIDADE**, e são coisas diferentes.

Reordenar muda o que a advogada espera encontrar onde ela deixou — transforma
um selo visual numa mudança de mapa mental, e ninguém pediu isso. Quem quiser
ver só as liminares usa o **filtro** (`com` / `sem` / todos), e **decide
QUANDO**.

A ordenação continua sendo `createdAt` decrescente, decidida no backend. Há
teste nos dois repos: aqui, varrendo a listagem atrás de `.sort(`; lá, montando
um cenário em que o processo com liminar é **o mais antigo dos três** e
exigindo que ele **não** apareça no topo.

> **Se ao ver a tela o selo não bastar**, a saída é **propor** — não reordenar
> por conta própria.

### A fase NÃO substituiu o `status`: a listagem tem as duas colunas

"Suspenso" não é uma fase, e "execução" não é um status. A coluna que sumisse
levaria junto o filtro que a advogada usa desde a Fase 2, e há teste exigindo
`<th>Fase</th>` **e** `<th>Status</th>`.

Os dois filtros combinam de propósito: *"em execução E suspenso"* é pergunta
legítima.

### O encerramento não pede fase nenhuma

O campo "Trânsito em julgado" fica no formulário, e **não** aparece desabilitado
em fase alguma. Se algum dia esta tela exigir "Recursos" para liberá-lo, alguém
inventou um caminho único onde ela descreveu vários — *"acordo cumprido → trânsito
em julgado"*, e acordo se cumpre em qualquer lugar. Há teste.

**`null`, e não `undefined`**, nos campos apagáveis do payload. Com `undefined`
o campo sairia do JSON e uma data de trânsito em julgado registrada por engano
ficaria lá para sempre — não haveria como desfazê-la pela tela.

---

## O verbo acompanha a ação que a tela oferece (F-2d, achado do passo 184)

A F-2b renomeou **"Excluir" → "Desativar"** em Clientes e Processos. Uma
mensagem ficou com a palavra velha.

`utils/financialErrors.js` montava a frase fixa: *"A exclusão foi recusada. (…)
remova antes de excluir."* Agora **o verbo mora na tabela de dependências**,
uma entrada por dependente:

| `dependencia` | bloqueia | verbo |
|---|---|---|
| `processos` | a **desativação** de um CLIENTE | **desativar** |
| `parcelas` | a exclusão de um HONORÁRIO | excluir |
| `pagamentos` | a exclusão de uma PARCELA | excluir |
| `documentos` | a exclusão de uma SEÇÃO | excluir |

**Corrigido só onde a ação MUDOU.** Um verbo único para as quatro faria a
mensagem discordar do botão em três telas para concordar em uma.

Há teste dos dois lados: das frases, e dos **rótulos dos menus** — se um menu
mudar de verbo, o teste cai e a tabela acima precisa mudar junto. É o que
obriga a conversa a acontecer em vez de as duas listas divergirem em silêncio.

---

## Passos 90–98 (portal) — o levantamento da F-2c

**Conclusão, antes do detalhe: eles NÃO são "controles de acesso do portal por
implementar". São passos de VALIDAÇÃO MANUAL de funcionalidade que já existe,
entregue na Fase 3.2 — e nunca executados.**

A pendência vinha sendo carregada fase após fase com a marca *"antes de qualquer
cliente real usar o portal"*, e a redação foi endurecendo até parecer trabalho
de código não feito. O levantamento da F-2c leu os nove passos e confrontou cada
um com o código. **Nenhum deles descreve controle de acesso ausente.**

### O que cada um exige, e onde ele está

| # | O que o passo exige | Marca | Veredito | Onde |
|---|---|---|---|---|
| **90** | PDF e DOCX baixam com nome do servidor, abrem no aparelho | `[só olho humano]` | **atendida** (código) | `portalController.js:76` (`Content-Disposition`), `documentRenderService.js:75` (`montarNomeArquivo`) |
| **91** | Confirmação **depois** do conteúdo, sem modal; declaração inteira; recibo em fuso de Brasília | `[só olho humano]` | **atendida** (código) | `PortalProcessPage.jsx:176` (bloco por último), `portalLabels.js:91` (`America/Sao_Paulo`) |
| **92** | Confirmar de novo **não apaga** a anterior; as duas aparecem | `[automatizável]` | **atendida + automatizada** | `PortalConfirmation.jsx:99,159`; `tests/portal/confirmacao.test.js:238` |
| **93** | Botão "Sair" visível na barra; *voltar* não devolve a sessão | `[só olho humano]` | **atendida** (código) | `PortalLayout.jsx:34` |
| **94** | Definir/entregar/redefinir/revogar senha; senha **nunca** exibida; mensagem pronta **sem** a senha; CPF recusado com mensagem própria | `[automatizável]` | **atendida + automatizada** | `AccessDelivery.jsx:109`; `clientValidation.js:63–71` (CPF/CNPJ); `tests/portal/auth.test.js:338` |
| **95** | O código cabe numa ligação — legibilidade ao ditar | `[só olho humano]` | **inverificável por código** | `utils/accessCode.js` |
| **96** | Selos "Confirmou a leitura" × "Acessou, não confirmou" | `[automatizável]` | **atendida**; automatizada **só no backend** | `portalEstados.js:23`; `statusVisual.js:98–99`. **Sem teste de frontend para os selos** |
| **97** | Contador do dashboard zera ao **olhar a lista**, não ao abrir o processo | `[automatizável]` | **atendida + automatizada** | `ProcessDetailPage.jsx:103,254`; `tests/portal/confirmacao.test.js:352` |
| **98** | Aviso de visibilidade nas **duas** regerações, com textos **diferentes** | `[só olho humano]` | **atendida + automatizada** | `GenerationPanel.jsx:291,324`; `tests/documents/regeracao.test.js:126–163` |

### O controle de acesso propriamente dito — já existe, e é testado

A dimensão que a redação da pendência sugeria (*"um cliente ver dado de
outro"*) **não está nesses nove passos**, e está implementada e coberta:

- `portalAuthMiddleware.js:58–90` — **o vínculo é revalidado a cada
  requisição**, nunca confiado ao token: cliente, processo e vínculo precisam
  estar **ativos**, o token precisa **coerir** com o vínculo no banco, e o
  carimbo da senha invalida sessões anteriores. Revogar acesso tem efeito
  **imediato**, sem esperar as 2 h da sessão;
- `tests/portal/isolamento.test.js` — token de portal não vale em rota da
  advogada e vice-versa; a sessão de um vínculo não alcança outro; o código do
  cliente A nunca devolve o processo do cliente B; a senha de um cliente não
  abre o código de outro; varredura de `senhaPortalHash`, `codigoAcesso`,
  `usuarioId`; e um **placar explícito de "zero vazamentos"**.

### O que a F-2c NÃO fez, e por quê

**Nenhuma linha de código.** Não havia exigência desatendida para implementar:
cinco dos nove são `[só olho humano]` por definição — *"nenhum script abre um
DOCX no Word do Android para ver se corrompeu"* —, e os quatro `[automatizável]`
já têm código **e** cobertura.

**A única lacuna real encontrada:** o passo **96** (selos de litisconsórcio) tem
o vocabulário travado no backend e os rótulos em `statusVisual.js`, mas **não
tem teste de frontend** provando que a tela do processo os exibe. É pequeno, é
verificável, e fica registrado aqui em vez de virar código numa fase cujo portão
de escopo já tinha sido gasto na Parte 1.

> **A pendência continua aberta — como VALIDAÇÃO, que é o que ela sempre foi.**
> Os nove passos precisam do Daniel, num celular de verdade, antes de qualquer
> cliente real usar o portal. Nenhuma fase de código os fecha.

---

## DEC-055 (frontend) — o que é FATO se edita; o que é DERIVADO leva à origem (F-3)

A tela da agenda mostra **duas naturezas** no mesmo lugar, e a metade visível da
decisão é a que a advogada vive:

| | O quê | Na tela |
|---|---|---|
| **Compromisso** | audiência, prazo, reunião | **cheio**, azul de `info`. **Edita aqui.** |
| **Vencimento** | parcela, honorário | **listrado**, borda **tracejada**, âmbar de `warning` (vermelho de `danger` quando vencida). **Leva à parcela.** |

> **Nota de 27/10/2026 (Fase 3.8, DEC-134):** as cores mudaram. Até a 3.7 o
> compromisso era verde e o vencimento azul, e o Início e a Visão geral
> pintavam o vencimento de âmbar e o compromisso de azul: a mesma coisa com
> cor diferente em duas telas. A regra agora é uma só, em
> `utils/tomDaData.js`, para a Agenda e a `LinhaDeData`. **A forma não
> mudou:** o vencimento continua listrado e tracejado, porque é derivado — e é
> a forma, não a cor, que diz isso.

**A derivada não é editável no calendário.** Clicar nela navega para
`/dashboard/parcelas/editar/:id` (ou `/honorarios/editar/:id`), com uma frase
explicando por quê — *"este vencimento vem do financeiro e não se edita na
agenda"*. Uma linha que se comporta diferente **sem explicação** é lida como
tela quebrada.

O ponto único é **`src/utils/calendarLabels.js`** (`destinoDoItem`), e o sino usa
a **mesma função**: duplicar as rotas faria a parcela vencida do sino levar a um
lugar diferente da mesma parcela no calendário.

**Há teste travando que nenhum destino de derivada aponta para `/agenda`** — no
dia em que alguém "unificar" os destinos, a derivada passaria a abrir um
formulário de evento, e editar a data ali criaria a segunda fonte.

### A distinção NÃO é só por cor

**Três sinais somados:** cor, forma da barra (cheia × listrada) e borda (sólida ×
tracejada), mais a **legenda escrita** e o nome da natureza em `.sr-only`.

Quem não distingue âmbar de azul não recebe distinção nenhuma — e é **a mesma
pessoa** que não receberia a informação de que uma das linhas não se edita.

Em 360 px a **explicação** da legenda sai (duas linhas por item empurrariam a
grade para baixo da dobra); o **nome** fica, porque é ele que distingue.

---

## A GRADE DO MÊS é função pura, construída à mão (F-3)

`src/pages/calendar/monthGrid.js`. **Zero dependência nova — e isso inclui não
instalar biblioteca de calendário.** Nem `date-fns`, nem `dayjs`, nem
`react-calendar`. Há teste varrendo o `package.json` por doze nomes.

A grade são sete colunas e no máximo seis linhas, e a conta cabe em vinte
linhas. O último dia do mês é **o dia 0 do mês seguinte** — a forma que não
precisa saber quantos dias tem cada mês nem se o ano é bissexto, e é por isso
que fevereiro de **2024**, **2026** e **2100** saem certos sem uma linha sobre
bissexto.

**Tudo em `Date.UTC`.** Há teste varrendo o módulo por `.getDate(`, `.getMonth(`,
`.getFullYear(`, `.getDay(` e `.setDate(` — nenhum método de hora local — e
outro que constrói a grade em três fusos para provar que sai igual. Uma grade que
monta o dia com hora local monta **o mês errado** a oeste de Greenwich.

**As casas de fora do mês ENTRAM**, marcadas com `noMes: false`. Deixá-las vazias
faria buraco na primeira e na última linha, e **buraco se lê como "não há nada
nesse dia"** — não como "esse dia é de outro mês".

O intervalo pedido ao backend é o **da grade**, e não o do mês: pedir só o mês
deixaria em branco os dias vizinhos que a grade mostra.

A virada de **ano** sai de graça: `Date.UTC(2026, 12, 1)` é janeiro de 2027.
Escrever `mes === 12 ? ...` à mão é onde a virada de ano costuma errar.

---

## Em 360 px a AGENDA é o padrão — e a grade continua alcançável (F-3)

Sete colunas em 360 px dão **51 px por dia**. Descontando borda e respiro sobram
uns 45 px úteis: um dia com dois compromissos vira **dois retângulos ilegíveis**,
e "Audiência de instrução" não cabe nem truncado de forma útil.

`vistaPadrao(largura)` é função pura e testada: abaixo de **768 px** devolve
`'agenda'`. O corte é o mesmo em que `AppLayout` troca a Sidebar pela BottomNav —
é onde este projeto já decidiu que a tela virou celular, e um segundo limiar faria
as duas coisas trocarem em larguras diferentes.

**A grade não some no celular.** A advogada escolhe; o sistema só decide o que
**abre**. Há teste travando que o seletor de vistas não recebe `display: none` em
tela estreita.

**A vista e o mês vivem na query string** (`?vista=`, `?mes=`), e não em `useState`:

- navegar entre meses **não perde a vista** — ela está no endereço;
- o **"voltar" do navegador** desfaz a navegação de mês, que é o que alguém
  espera depois de clicar cinco vezes em ›;
- existe **link** para "setembro na agenda", que é o que o sino usa.

A vista é **reescrita a cada navegação de mês**: sem isso, quem chegasse por um
link sem `?vista=` e clicasse em › perderia a vista implícita da largura e
voltaria à grade em 360 px.

### As outras regras da tela

- **HOJE é visualmente distinto, sempre** — mesmo sem compromisso. É a única
  pergunta que um calendário responde sem que ninguém a faça. E o `hoje` vem do
  **backend**: um relógio de máquina atrasado destacaria o dia errado justamente
  no componente cuja função é dizer que dia é hoje.
- **A célula NÃO estica.** Altura máxima fixa, e o excesso vira **"+N"**, que
  abre o dia. Um dia com sete itens empurraria as outras semanas para fora da
  tela — a advogada perderia a visão do mês por causa do dia mais ocupado dele.
  **O N é quantos ficaram de fora**, não o total: um "+8" com 3 à vista mandaria
  procurar oito itens dos quais três já aparecem.
- **Estado vazio com frase própria** — *"Nenhum compromisso em setembro/2026"*,
  com o nome do mês. E **carregando ≠ vazio** (regra do passo 116): grade vazia e
  grade carregando são indistinguíveis, e a segunda faz esperar por algo que não
  vem.
- **Criar clicando num dia**, com a data já preenchida (`?data=AAAA-MM-DD`,
  validada — query string é digitável, e `?data=amanhã` não pode virar `value` de
  um `<input type="date">`).
- A agenda lista **só os dias que têm alguma coisa**: imprimir os trinta dias do
  mês para mostrar três compromissos esconderia os três.

---

## A data NÃO vira `Date` em lugar nenhum da tela (F-3)

A decisão de fuso está inteira no `CLAUDE.md` do **backend**. O que o frontend
tem de garantir é o encaixe:

- a `data` chega como **`"AAAA-MM-DD"`** e vai **direto** para o
  `<input type="date">`, que fala esse formato nativamente;
- as casas da grade são **strings**, e a comparação com o item é `===`;
- **nenhuma linha constrói `Date` a partir da data do item.** Há teste varrendo
  `CalendarPage.jsx`, `EventFormPage.jsx`, `api/calendarService.js` e
  `api/eventService.js`.

`formatDate` (com `timeZone: 'UTC'`) continua sendo quem **exibe** — e continua
correto. O que mudou é que agora ele recebe uma string que já não tem fuso para
errar, em vez de um instante que precisa ser desfeito.

---

## O SINO — no cabeçalho, e sem estado de lido (F-3)

`NotificationBell` fica no **Header**, e não na Sidebar: precisa estar visível
nas duas larguras, e em 360 px a Sidebar não existe.

**Não existe "marcar como lido".** Há teste varrendo o componente por `.post(`,
`.patch(`, `.delete(` e por `marcarComoLido`, `setLido`, `naoLidos`, `unread`.
Um contador que só zera com clique treina a pessoa a zerar sem olhar.

**Zero não aparece, nem como "0"** — o badge é renderizado sob `{total > 0 && ...}`.

**O total vem calculado do backend**, e a tela não soma os três: se somasse, o dia
em que um quarto caso entrasse ela continuaria mostrando três, e ninguém notaria
porque o número continuaria plausível.

O `aria-label` carrega o **número**: badge é informação visual pura, e sem isso
quem lê por áudio ouve só "avisos".

**Não é Web Push.** Há teste varrendo o componente por
`Notification.requestPermission` e `pushManager`, e `public/sw.js` por `push`,
`notificationclick` e `showNotification`. Decisão do Daniel em **24/08/2026**:
aviso é sino com contador **dentro** do sistema.

---

## DEC-056 (frontend) — a linha do tempo, e a régua que diz onde é hoje (F-3)

`ProcessTimeline`, na página do processo, **abaixo** da ficha financeira e
**irmã** dela — não dentro.

**O financeiro não entra**, e há teste varrendo o componente por `feeService`,
`installmentService`, `paymentService`, `FeeStatement`, `formatCurrency` e `R$`.
O extrato do honorário responde outra pergunta e já a responde bem.

**A marca do "hoje" é uma LINHA na régua**, e não um estilo por item: o que a
advogada procura ao abrir isto é **onde o presente está**, e um contorno
diferente em cada item obriga a percorrer a lista para descobrir. Quando não há
futuro nenhum, a linha vai no fim — a régua sempre diz onde o presente está.

O **futuro** tem dois sinais (opacidade **e** marca tracejada), e o corte vem do
backend.

**Todos os rótulos vêm prontos** (`paraRotulo`, `deRotulo`, `tipoEventoRotulo`).
Há teste conferindo que a tela **não escreve** "Fase de conhecimento", "Sentença",
"Execução" nem "Recursos": o rótulo da primeira fase está **pendente de
ratificação**, e escrevê-lo aqui faria a mudança acontecer em dois lugares.

---

## Tipos de evento — espelho SEM endpoint, e PENDENTE DE RATIFICAÇÃO (F-3)

`TIPO_EVENTO_OPTIONS` em `src/utils/calendarLabels.js` repete
`config/tiposEvento.js` do backend, de propósito e sem rota: é **constante, não
dado**. Uma rota `/tipos-evento` custaria uma viagem de rede em toda carga de
formulário para entregar quatro strings que não mudam entre deploys.

O preço é a duplicação, e **há teste nos dois repos** comparando as listas — o
que a torna aceitável. É a mesma escolha do tipo de honorário e da fase
processual.

⚠️ **Os quatro valores saíram do enunciado da fase, não da Laís.** Perícia,
diligência e despacho são candidatos óbvios, e nenhum entrou. Trocar um rótulo
não migra nada; o valor gravado é o que vai ao banco.

**Nenhuma tela monta rótulo de tipo por conta própria** — o backend manda
`tipoRotulo` pronto em todo item, e `calendarLabels` cobre o formulário, que
precisa do rótulo antes de o evento existir. Há teste varrendo as telas por
`.charAt(0).toUpperCase()` e por `replace('_'`: foi o que a tela de processos
fazia com o `status`, e é como "parcialmente_pago" chegou a aparecer com
sublinhado na interface.


## O que fica para adiante (atualizado em 25/08/2026 — depois da F-3)

**✅ F-2a — FEITA.** O **V-2** morreu (DEC-050), as gerações se agruparam
(DEC-051), a coluna do rótulo parou de truncar, e o seed passou a gravar o plano
inteiro — `npm run seed:fresh` sozinho voltou a bastar.

**✅ F-2b — FEITA.** A **DEC-052** desbloqueou a reativação: a cascata passou a
**registrar** o que derrubou, e a reativação restaura só isso. Junto vieram o
filtro de situação nas duas listagens (sem ele os desativados não apareciam em
lugar nenhum), a troca de "Excluir" por "Desativar" nas duas, e os modais que
dizem a contagem antes de confirmar.

Do lado do backend, a mesma fase fechou as duas pendências de operação: os tetos
de rate limit por ambiente saíram de uma cópia só, e os comandos destrutivos
passaram a **interromper** pedindo confirmação contra banco não-local.

**✅ F-2c — FEITA.** A **DEC-053** fechou a subida: o item "Reativar" nasce
desabilitado com o motivo ao lado, nomeando o cliente, e o preview é relido no
clique para o caso da aba velha.

**✅ F-2d — FEITA, e o BLOQUEIO acabou.** O vocabulário da Laís chegou em
23/08/2026, e a resposta dela mudou a pergunta: **não era um status, eram dois
eixos** (DEC-054).

A previsão que esta seção fazia estava metade certa:

- o **histórico `de → para` separado do `historicoAtivacao`** era o ponto já
  decidido, e continua valendo — é o `historicoFase`;
- a **"cor por status"** virou outra coisa: um **selo de liminar**, porque
  liminar é sinalizador e não estado;
- e o que não se previa: **"trânsito em julgado" não cabia na mesma lista** das
  fases. É o outro eixo.

Junto vieram a coluna de fase e o filtro de liminar na listagem, o painel de
andamento no detalhe, e o verbo velho que sobrou nas mensagens (passo 184).

**Suítes na F-2a:** frontend **566** testes (20 novos em
`tests/regressions/f2a.test.js`), backend **508** (22 novos).

**Suítes na F-2b:** frontend **583** testes (+17 em
`tests/regressions/dec052.test.js`), backend **549** (+41). Zero skip, zero todo
nos dois.

**Suítes na F-2d:** frontend **626** testes (+26 entre
`tests/regressions/dec054.test.js` e `tests/regressions/f2d.test.js`), backend **634** (+61). Zero skip, zero todo
nos dois.

**Suítes na F-3:** frontend **770** testes (+144, os novos em `tests/calendar/`
— `grade`, `tela`, `sino`, `dec055` e `dec056`), backend **730** (+96, em
`tests/calendar/` — `evento`, `fuso`, `dec055`, `dec056`, `hierarquia` e
`sino`). Zero skip, zero todo nos dois.

**Sobre o "zero skip" do frontend:** ele depende de `dist/` existir. O teste
"o build separa o chunk do portal" é condicional ao build, e num clone limpo a
suíte reporta **1 skip** sem que nada esteja errado. Rode `npm run build` antes
se quiser o 0/0.

---

## A F-2e foi ENTREGUE dentro da F-3 (Parte 5) — o que ficou decidido

A fase que esta seção anunciava não aconteceu como fase própria: a **linha do
tempo** entrou como a **Parte 5 da F-3**, e a decisão é a **DEC-056**, acima.

As duas perguntas que ficaram aqui para "decidir com a Laís antes" foram
respondidas — **uma por decisão nossa, registrada; a outra continua aberta**:

- **"só as fases, ou também o `historicoAtivacao`?"** — **DECIDIDO, e o
  `historicoAtivacao` NÃO entrou.** A linha do tempo responde *"por onde este
  processo andou"*; `historicoAtivacao` responde *"este registro esteve fora do
  sistema"*. A segunda é pergunta administrativa sobre o **cadastro**, não sobre
  o **processo** — e uma desativação seguida de reativação apareceria no meio da
  história jurídica sem ter nada a ver com ela.
  O **encerramento** e a **liminar**, esses entraram: são fatos do processo.
- **"pagamento no êxito" e "cliente inadimplente"** — **continuam pendentes.**
  Não foram tocados pela F-3. Ver o `CLAUDE.md` do backend; o primeiro mexe na
  DEC-039, congelada, e a decisão é da Laís.

**A próxima fase é a F-4** — dashboard com ações e autocomplete com as tabelas de
domínio do Davi. Depois a **F-5 (offline)**, que vem por último de propósito: com
os dados em IndexedDB e numa fila de saída, **toda entidade nova custa dobrado**
— e a F-3 acabou de criar uma (`Event`), com uma tela que consulta por intervalo
e um sino que consulta o tempo todo.

---

## DEC-057 (frontend) — o campo sugere e não obriga (F-4)

**A regra, e ela é a fase inteira: o campo SUGERE, NÃO OBRIGA.**

Se a comarca não estiver na lista, ela digita mesmo assim e salva. Não há
`onBlur` que corrija, não há validação contra a tabela, não há "escolha uma
opção da lista". O componente (`components/ui/CampoComSugestoes.jsx`) tem um
poder só sobre o valor: **escrevê-lo quando alguém escolhe**. Nunca impedir,
nunca reverter, nunca limpar.

**Por quê.** Autocomplete que recusa valor fora da tabela trava trabalho real no
dia em que a tabela está desatualizada — e ela vai estar. As quatro tabelas são
de **22/08/2026** e envelhecem sozinhas: o TJPR cria comarca, a CBO ganha
ocupação, o CNJ muda assunto. Um campo que envelhece junto com a tabela vira
impedimento de cadastrar, e o custo cai inteiro sobre quem está com pressa.

Há duas travas na suíte, e a segunda é a que importa: a mutação que introduz um
`onBlur` de limpeza derruba `tests/sugestoes/filtro.test.js`, e o passo **227**
do roteiro é o passo que a fase existe para ter.

### Grava-se o TEXTO, não o código

O que vai para o banco é o texto, exatamente como está na tabela quando a
sugestão é escolhida. **Não há campo de código, nada foi migrado, e
`{{comarca}}` continua sendo texto.**

**Trade-off registrado.** Filtrar por código seria mais robusto: o código do CNJ
não muda quando o nome muda, e dois escritórios digitando "Ponta Grossa" e
"ponta grossa" gravariam a mesma chave. Não é o que esta fase entrega. O
problema resolvido é a **divergência de grafia daqui em diante**; resolver
retroativamente exigiria migração e uma decisão sobre o que já está gravado —
nenhuma das duas foi pedida, e as duas são caras de desfazer.

### As tabelas são estáticas e carregam SOB DEMANDA

`public/tabelas/`, quatro arquivos, entregues pelo **Davi em 23/08/2026**:

| Arquivo | Itens | Tamanho |
|---|---|---|
| `comarcas-pr.json` | 161 comarcas, com entrância | 12 KB |
| `nacionalidades.json` | 196 países, masculino e feminino | 20 KB |
| `profissoes-cbo.json` | 2.725 ocupações | 244 KB |
| `classes-assuntos-cnj.json` | 847 classes + 5.598 assuntos | **674 KB** |

**Ninguém os importa.** Um `import` de `.json` costura o arquivo dentro do chunk
principal, e aí **toda tela do sistema** — login, dashboard, financeiro — baixa e
interpreta meio megabyte de tabela processual que só o formulário de processo
usa. Eles chegam por `fetch` (`utils/tabelasDominio.js`), na primeira vez que um
campo que precisa deles é **usado** — não ao montar a tela —, memoizados **por
promessa**, para dois campos do mesmo formulário (classe e assunto) dividirem um
download só.

Custo medido: o bundle principal foi de **557.416 para 565.083 bytes**. Com a
tabela do CNJ importada estaticamente ele vai a **612.120**, e
`tests/sugestoes/tabelas.test.js` derruba pelos chunks do build.

`fetch` nativo e **não** o cliente de API: o `api.js` carrega o interceptor de
401 da DEC-050, e um estático que voltasse 401 deslogaria a advogada no meio do
cadastro.

⚠️ **Requisito que vem da F-5.** `public/` sai do build **sem hash**, em URL
estável (`/tabelas/comarcas-pr.json`) — é o que deixa o service worker cacheá-los
por nome fixo, sem garimpar o `index.html` como faz hoje com os `/assets/*`.
**A F-5 não foi implementada aqui**; o que esta fase fez foi não escolher um
caminho que a impedisse. E o aviso que vai junto: URL estável significa **sem
cache-busting** — o marcador de versão é o campo `versao` do envelope, e cache
cego serviria tabela velha para sempre.

### De onde vieram, e a ressalva do CNJ

O **`RELATORIO.md` do Davi viaja junto das tabelas**, em `public/tabelas/`, e há
teste que trava isso. Fontes: TJPR (Anexo I do Código de Organização Judiciária),
MTE/CBO, ONU-IBGE.

🚨 **A tabela do CNJ NÃO veio do SGT oficial.** A consulta oficial em massa
estava bloqueada, e os dados foram puxados de um **dump de terceiro**
(`palomaalves/tpu-assistente`) e formatados por IA. A ressalva está escrita no
`RELATORIO.md`, e `tests/sugestoes/tabelas.test.js` falha se ela sumir de lá —
porque quem abrir o arquivo daqui a um ano precisa saber disso **antes** de
tratá-lo como fonte oficial.

### Vara ficou de FORA, e foi decisão

A lista de varas **varia por comarca**, muda com frequência e **não foi
coletada** — o briefing do Davi já dizia. `vara` continua texto livre, sem
sugestão. **Ausência de sugestão na Vara não é defeito; sugestão na Vara é.**
Está escrito aqui para a próxima fase não "completar" a lista sem saber que a
exclusão foi decidida.

### A nacionalidade continua UM campo

O LEX gera procuração — *"brasileira, casada, professora"* —, e hoje
`nacionalidade` é **texto livre** com `default: "brasileira"`, resolvido por
`{{nacionalidadeCliente}}` com formatador `texto`. O `sexo` existe no cadastro,
como enum próprio, e **nunca flexionou nada**: um cliente homem sem correção
manual gerava procuração dizendo "brasileira".

A tabela do Davi traz as duas flexões, então a fase passou a **sugerir a forma
certa** olhando o `sexo` já cadastrado. Sem sexo escolhido, oferece as duas e não
decide por ela. **Virar dois campos, ou flexionar na geração do documento, é
mudança de MODELO** — reportada, e não feita de passagem.

### O que ficou fora do lugar que a fase pediu

A F-4 pediu um campo **Assunto** alimentado pelos assuntos do CNJ, e mandou
**não tocar no backend**. `Process` **não tem** campo `assunto`. O assunto foi
para **`area`**, que já existia: os assuntos de primeiro nível do CNJ são
literalmente *"DIREITO TRIBUTÁRIO"*, *"DIREITO PREVIDENCIÁRIO"* — o que a
advogada digitava à mão como "Tributario". Consequência registrada:
`{{areaProcesso}}` passa a renderizar o texto do CNJ nos documentos gerados
**daqui em diante**; nada migra.

---

## O painel responde "o que eu preciso fazer hoje" (F-4, Parte 5)

Seis blocos colapsáveis (`components/dashboard/BlocoDoPainel.jsx`), com a
escolha lembrada em `localStorage` — e lida dentro de `try/catch`, porque em
navegação privada ela lança, e um painel que não abre por causa disso seria pior
do que um que não lembra.

**Atenção primeiro, estatística depois.** Nascem abertos: *Precisa de atenção*,
*No mês*, *Próximos vencimentos*. Nascem fechados: *Acumulado do escritório*,
*Resumo Geral*, *Distribuição por Status*. Fechado **desmonta** o conteúdo — como
`DashboardCharts` é `lazy`, quem não abre não baixa os 386 KB do recharts.

O cabeçalho é um `<button>` com `aria-expanded`: um `<h2 onClick>` não recebe
foco, não responde a Enter nem a espaço, e o leitor de tela anuncia um título em
vez de um controle. A ação fica **fora** do botão, ao lado — link dentro de botão
é HTML inválido, mesma razão dos dois irmãos de "Próximos vencimentos" (F-1b).

### O número que não pode divergir do sino

O sino conta parcelas vencidas **no cabeçalho** enquanto o painel as conta **no
corpo** — mesma tela, mesmo instante. Antes da F-4 o painel chegava lá por três
caminhos: `resumoFinanceiro.vencidas`, um filtro no cliente sobre todas as
parcelas, e o sino. Os três liam o mesmo campo derivado (DEC-028) e concordavam
— **por coincidência de consultas escritas à mão**, não por construção.

Agora há **um caminho só**: `utils/painel.js`, alimentado por
`GET /api/calendar/avisos`, a mesma requisição que o sino já fazia. Sino e painel
chamam a mesma função; nenhum dos dois lê `avisos.parcelasVencidas` na mão. O
valor em dinheiro continua vindo do resumo financeiro — o sino não expõe valor, e
somar centavos no cliente abriria o terceiro caminho ao fechar o segundo.

É o defeito que o **passo 135** pegou uma vez ("Honorários a Receber" contra
"Honorários contratados"), fechado por construção. **O backend não foi tocado**:
as consultas seguem duas no servidor; o que passou a ter caminho único é a tela.

### Os cartões em 360 px (pendência do passo 181, fechada)

A causa nunca esteve no CSS — os três blocos usam a mesma `.summary-grid`, com a
mesma regra. Está no **conteúdo**: `Intl` em pt-BR separa "R$" dos dígitos com
espaço não-separável, e dígito não tem oportunidade de quebra, então
"R$ 1.234.567,89" é **um token indivisível**. Item de grade tem `min-width: auto`
e não encolhe abaixo da largura intrínseca do conteúdo; duas colunas a 360 px dão
~150 px por trilha, a trilha estica e a página com ela. O "Resumo Geral" escapava
por sorte: inteiro formatado cabe.

A correção é **dar largura ao cartão** (uma coluna só até 480 px), e não quebrar
o valor — a F-1b.2 já decidiu que ele é indivisível por construção. `min-width: 0`
junto, como cinto e suspensório.

---

## DEC-058 (frontend) — a leitura offline, escopada por usuário (F-5a)

> **É a mesma decisão do `/api/` fora do Cache Storage, escrita em outra API.**
> Quem mexer numa precisa ler a outra: `sw.js` (Fase 4.5) e `src/offline/`
> (F-5a) protegem contra o mesmo vazamento, em dois bancos diferentes do mesmo
> navegador.

### O risco, e por que ele não é hipotético

Toda resposta da API é autenticada e pertence a **uma** advogada. A Fase 4.5
travou isso no Cache Storage — nenhuma entrada de `/api/` — porque um cache
compartilhado entrega a resposta da primeira pessoa à segunda que usar aquele
navegador. **IndexedDB tem exatamente o mesmo problema, e o `pwa.test.js` não o
cobre**, porque é outra API.

O caso concreto é o computador do escritório: a advogada e a estagiária.

### As três regras, e onde cada uma mora

| Regra | Onde |
|---|---|
| todo dado guardado é escopado pelo **id do usuário** | `offline/cacheKey.js` — `buildKey` **lança** sem `userId` |
| o **logout apaga tudo** | `offline/offlineCache.js` → `clearAll`, chamado no `finally` do `logout` |
| entrar com **outro id** limpa o anterior **antes de escrever** | `startSession`, chamado no login, no cadastro e no `checkAuth` |

`buildKey` lança em vez de devolver `null` ou cair num escopo padrão: **escopo
padrão é onde os dados de duas pessoas se encontram.** O `checkAuth` está na
lista porque recarregar a página não passa pelo login — é o caminho de quem
senta no computador do escritório e abre o sistema com o cookie que já existia.

A limpeza é `clear()` de verdade. Não marca como inválido, não expira, não
filtra na leitura: **apaga**. Dado "invalidado" que continua no disco continua
sendo o dado.

### A arquitetura veio do TESTE, e não o contrário

`node --test` não tem IndexedDB nem navegador, e a fase proibiu dependência nova
— inclusive wrapper de IndexedDB. A saída não foi testar menos, foi **deslocar o
que decide**:

| Camada | Arquivo | O que faz |
|---|---|---|
| fina | `offline/offlineStore.js` | abrir, ler, escrever, apagar. **Nenhum `if` sobre conteúdo** |
| pura | `offline/cacheKey.js` | a chave escopada, a serialização estável dos parâmetros |
| pura | `offline/cachePolicy.js` | o que se guarda, o limite, o descarte, rede×cache |
| pura | `offline/dataAge.js` | a idade do dado, em português |
| pura | `offline/offlineMessages.js` | as frases, e qual motivo ganha quando há dois |
| pura | `offline/writeGuard.js` | quais métodos gravam, e quando barrar |
| fiação | `offline/offlineCache.js` | a ordem: escolher antes de gravar, limpar antes de escrever |

**Regra para quem mexer:** se precisar de um `if` sobre o conteúdo dentro de
`offlineStore.js`, ele está no arquivo errado.

O que a suíte não alcança é o banco de verdade — e é por isso que o passo **235**
do roteiro existe, com o DevTools aberto.

### O que se guarda, e o que não

Guarda-se **o que passou pela tela**: listagens e detalhes de clientes,
processos, honorários, parcelas, pagamentos, resumo financeiro e agenda. A lista
é uma **allowlist** (`CACHEABLE_RESOURCES`), porque esquecer de acrescentar
deixa uma tela sem cache e esquecer de excluir põe no banco algo que ninguém
decidiu pôr.

**Não se guarda:** PDF e DOCX gerados (binário grande, valor baixo offline — a
tela diz que o arquivo é do servidor), o que ela nunca abriu, e **nada do portal
do cliente**.

Limites: **5 MB**, **120 entradas**, **256 KB por entrada**, e o descarte é **o
mais antigo primeiro**. Ter limite próprio, menor que o do navegador, é o que
mantém o descarte sendo decisão nossa em vez de um `QuotaExceededError` no meio
de uma navegação — que a advogada lê como "o sistema quebrou". "Antigo" é pelo
`atualizadoEm`, e não pelo último acesso: descartar por acesso guardaria para
sempre a tela que ela abre todo dia, com o número do mês passado dentro.

### A idade do dado é obrigatória (Parte 3)

Tela servida do espelho abre com **"Sem conexão. Dados de hoje às 14:32."** — a
hora da última atualização **daquele dado**, nunca a atual. É a regra da
**DEC-044** aplicada à tela inteira: *o que deixou de ser confiável diz que
deixou*. Um saldo de duas horas atrás exibido como saldo de agora faz a advogada
dizer um número errado ao cliente ao telefone.

O aviso é **por tela**, e não um único no cabeçalho: duas telas carregadas em
horas diferentes têm idades diferentes, e um aviso global teria de escolher uma
hora só — que é a mentira que ele existe para não contar.

`dataAge.js` é o único lugar do frontend que constrói `Date` a partir de um
**instante**, e isso não contradiz a regra da F-3: aquela é sobre a **data do
domínio** (`AAAA-MM-DD`, que não tem fuso a errar). Instante se lê no fuso de
quem olha; data de calendário, não.

### Indisponível não é quebrado (Parte 4)

Três barreiras, e as três são necessárias:

| Barreira | Onde | Contra o quê |
|---|---|---|
| botão/item anunciado como desabilitado, **com o motivo** | na tela, ao renderizar | o clique inútil |
| `if (!online) return` no handler | no gesto | `aria-disabled` só ANUNCIA (DEC-053) |
| interceptor de requisição | `api/axiosConfig.js` | o sinal que cai **entre** o clique e o envio, e as telas não convertidas |

`aria-disabled` e não `disabled`, pela razão da DEC-053: botão desabilitado de
verdade não recebe foco, e o motivo — que é o ponto inteiro — ficaria invisível
para quem depende de leitor de tela.

A terceira barreira também **acaba com o erro genérico de rede**: sem sinal, o
interceptor troca a mensagem do erro pela explicação, e como `getApiErrorMessage`
lê `err.message`, toda tela que já usa o helper passou a dizer "sem conexão" sem
ser tocada. O `portalAxios.js` **não** recebeu isso.

`blockReason` resolve o caso de haver dois motivos para o mesmo item (o cliente
desativado da DEC-053 **e** a falta de sinal): a falta de sinal ganha, porque
bloqueia a ação inteira agora — e o outro volta a mandar quando o sinal voltar.

### `navigator.onLine` é assimétrico, e o app depende disso

`false` é confiável; `true` significa "há rede", não "há internet". Por isso o
app **só afirma "sem conexão" quando a resposta é `false`** — dizer isso a quem
está conectado manda procurar o problema no lugar errado. O limite conhecido:
em portal cativo, a tela mostra o erro do servidor em vez do aviso de offline.
Sem gambiarra de "ping": teste de conectividade próprio é outra decisão, com
custo de bateria e de requisição, e ninguém a pediu.

#### 🚨 A FILA NÃO É ACIONADA quando `onLine` fica `true` sem internet (achado da V-D)

**Isto é limitação conhecida da API do navegador, não defeito do código** — e
precisa estar escrito porque é **exatamente o que um avaliador vai reproduzir
desligando o wi-fi**.

> A guarda de offline dispara com `navigator.onLine === false`. Perder conexão
> sem derrubar a interface de rede — por exemplo, o roteador sem saída para a
> internet — deixa `onLine` em `true`: a requisição sai e fica pendurada, e a
> fila não é acionada. O sintoma é a tela dizendo que está salvando até a
> conexão voltar.

**Vale para a fila inteira, e não só para a operação em que o achado apareceu.**
A guarda mora no interceptor (`api/axiosConfig.js`), antes de qualquer decisão
sobre enfileirar: se `shouldBlockWrite` não dispara, nenhuma das quatro
operações da DEC-059 chega a ser considerada. Compromisso e mudança de fase se
comportam como a reordenação de seções do passo 128 — a requisição parte.

**Como isso APARECE, e por que engana.** A tela mostra o indicador de
salvamento e fica nele; quando o sinal volta, a requisição pendurada completa e
grava. Parece a fila funcionando, e não é: nada foi enfileirado, nada
sobreviveria a fechar a aba, e a tela de pendências fica vazia o tempo todo.

**Como reproduzir o caminho CERTO:** DevTools → Network → **Offline**, que é o
único gesto que garante `onLine === false`. É o que as pré-condições dos passos
**128** e **244 a 251** mandam, e a razão de mandarem está aqui.

**Não se "conserta" com um ping.** Um teste de conectividade próprio custa
bateria e uma requisição periódica, e a decisão de não tê-lo está no parágrafo
acima desde a F-5a. O que se faz é **saber e documentar** — e, no dia em que
alguém demonstrar o offline, desligar a rede pelo DevTools e não pelo roteador.

### ⚠️ Aviso para a F-5b: subir a versão do banco tem custo

A outbox vai precisar de outra object store, e isso significa **subir
`DB_VERSION`**. A partir daí, `indexedDB.open` pode disparar `onblocked` —
quando outra aba do app ainda segura a conexão da versão anterior. O ramo já
está tratado (`open` **rejeita**, e o `catch` do `offlineCache` deixa o app
seguir online), mas quem subir a versão precisa saber de duas coisas:

- o `startSession` do login **espera** por essa abertura; sem o `onblocked`, a
  tela de login ficaria pendurada sem erro nenhum;
- a migração precisa preservar o que já está guardado **ou apagá-lo de
  propósito** — e apagar é o lado seguro, porque o formato antigo de chave já é
  tratado como "não é meu" por `keysOfOtherUsers`.

### F-5a lê; F-5b escreve — e a separação é a decisão

A F-5a **não grava offline**: sem fila, sem outbox, sem `POST` guardado para
depois; não resolve conflito (sem escrita não há conflito); não toca no portal;
não muda o MongoDB; e continua sem Web Push.

A leitura vai inteira antes porque a escrita é a fase mais perigosa do projeto
depois do dinheiro — outbox append-only, idempotência por UUID e fila de
pendências revisada por humano quando dois aparelhos divergirem. Misturar as
duas é o modo mais fácil de estragar as duas.

**O que a F-5a deliberadamente NÃO faz, e a F-5b vai ter de decidir:** recarregar
a página sem sinal continua caindo no login. A sessão é do servidor, o cookie é
`httpOnly` e `/auth/me` não responde offline — dar identidade local ao app é uma
decisão de segurança que a F-5b já precisa tomar para a outbox, e antecipá-la
aqui seria decidir por ela.

---

## DEC-059 e DEC-060 (frontend) — a fila de escrita (F-5b)

> A F-5a leu sem sinal; a F-5b **grava**. A separação é a decisão, e ela está
> na DEC-058: a leitura foi inteira antes porque a escrita é a fase mais
> perigosa do projeto depois do dinheiro.

### DEC-059 — o que entra na fila, e o que NÃO

**Só quatro operações**: criar, editar e concluir compromisso da agenda, e
mudar a fase do processo (`offline/outboxOperations.js`). A regra da F-5a
continua sendo a regra — **sem sinal, escrita não sai** —, e isto é uma **lista
fechada de exceções** por cima dela.

**O financeiro ficou de fora, e não é excesso de cautela.** Toda validação de
dinheiro depende de estado do servidor que o navegador offline não tem como
conferir: o saldo em aberto, se a parcela já foi quitada, se o honorário foi
reparcelado, quanto ainda é estornável. Um pagamento enfileirado às 10h pode
ser inválido às 15h — a parcela foi quitada por outro caminho, ou o plano foi
substituído. Aí a fila teria de explicar à advogada **por que um recebimento
que ela deu como registrado não existe**, depois de ela já ter dito ao cliente
que estava pago. O Financeiro 2.0 levou oito subfases para a tela nunca mentir
sobre dinheiro; **enfileirar dinheiro reintroduz a mentira pela porta do
offline.**

**Apagar compromisso também ficou fora**, por outro motivo: apagar offline o
que ainda não foi criado no servidor exigiria remapear identificador local
quando a criação subisse — a armadilha clássica de fila, e a que produz o pior
defeito, que é apagar o registro errado.

### A fila

| Propriedade | Como |
|---|---|
| append-only | a entrada não se edita e não se reordena; muda o **estado** (`pendente` → sai, ou `pendente` → `falhou`) |
| escopada por usuário | `buildQueueKey` — a MESMA chave da DEC-058, e por isso a mesma limpeza na troca de conta |
| sobrevive a recarregar | store `fila` do IndexedDB (banco na versão **2**; nada da F-5a se perde) |
| em ordem | por `criadoEm`, com `seq` desempatando o mesmo milissegundo |
| **para na primeira falha** | a próxima pode depender da que falhou |
| **nada é descartado sozinho** | sem teto de tentativas, sem prazo, sem expurgo |

A fila é store **separada** do cache de leitura porque os ciclos de vida são
opostos: no cache, descartar o mais antigo é feature; na fila, **perder é
defeito**. Juntas, o descarte por cota apagaria trabalho da advogada.

**Idempotência**: cada entrada nasce com um UUID no clique, e ele é o mesmo em
todo reenvio — inclusive no "tentar de novo" da tela. É o que impede o reenvio
de criar um segundo compromisso quando a rede caiu **depois** de o servidor
gravar (DEC-059, lado do backend).

### DEC-060 — conflito não se resolve sozinho

A tela manda no cabeçalho `X-If-Unmodified-Since` o `updatedAt` que ela **leu**.
Se o registro mudou desde então, o servidor recusa com **409** e devolve o que
está gravado. A tela de pendências mostra **as duas versões** e a advogada
escolhe:

- **"Manter a minha versão"** → a entrada que levou 409 sai e **uma nova
  entra**, com a versão do servidor e **chave de idempotência nova**.
  Sobrescrever de propósito, depois de ver as duas, é **outra intenção** — e é
  o que mantém a fila append-only;
- **"Ficar com a do servidor"** → descarte, com a confirmação que nomeia o que
  se perde.

O cabeçalho vai **fora do corpo** porque o corpo passa pela guarda de campos
permitidos do backend, que recusa campo desconhecido — e com razão. Nenhum
contrato de rota mudou por causa desta fase.

### A tela de pendências não é opcional

**Sem ela, a fila é perda de dado silenciosa.** Uma gravação guardada que
falhou, sem lugar onde apareça, é trabalho que some sem ninguém saber. Por isso
a fase proibiu mergear fila sem tela — e por isso as Partes 2, 3 e 4 foram num
commit só.

Ela diz **o que era, de quando e o que houve**, em português; nunca
`POST /events 409`. O contador fica ao lado do sino, com ícone e cor próprios:
o sino conta o que o mundo cobra, este conta o que ainda não saiu daqui. Somá-los
faria "3" significar coisas diferentes conforme o dia.

### O logout com fila pendente — a tensão com a DEC-058

A DEC-058 manda **apagar tudo** no logout, e ela continua valendo: sair da conta
num computador emprestado precisa deixar o navegador limpo. Mas a fila não é
cache — é trabalho que **nunca chegou ao servidor**.

**A regra: avisa antes, dizendo quantas são, e a escolha é dela.** Nem apagar
calado (perda de dado sem aviso), nem segurar o logout (decidir por ela).

**Tentar enviar antes de sair foi considerado e descartado:** se houvesse sinal,
a fila já teria subido sozinha — o reenvio dispara quando o sinal volta. Uma
fila que ainda existe no momento do logout ou está sem sinal (e não vai subir)
ou travou numa falha (e precisa de decisão, não de mais uma tentativa). Segurar
a saída prenderia a advogada numa espera que já se sabe inútil, justamente no
computador emprestado, que é onde ela precisa sair depressa.

### Se a fila não conseguir gravar, a tela NÃO diz que gravou

`enfileirar` devolve `null` quando o IndexedDB não aceitou a escrita, e o
interceptor volta a recusar com a frase da F-5a. Dizer "ficou na fila" sobre
algo que não ficou em lugar nenhum é **perda de dado com mensagem de sucesso** —
o pior desfecho possível desta fase.

---

## DEC-061 — o deploy: dois serviços, uma origem só (D-1)

> Fase de **infraestrutura**. Nenhum comportamento do sistema mudou; o que
> mudou é ele conseguir rodar fora do `localhost`.

### A arquitetura

**Render, plano gratuito.** Um **Web Service** para a API (Express) e um
**Static Site** para o `dist/` do Vite. O banco continua no **Atlas**, com
`0.0.0.0/0` no IP Access List — o plano gratuito do Render não tem IP de saída
fixo.

O site serve a API **no mesmo domínio**, por um **rewrite** de `/api/*` para o
Web Service:

```
navegador ──► https://<o-site>/dashboard        (arquivos do site)
          └─► https://<o-site>/api/auth/login   ──rewrite──► https://<a-api>/api/auth/login
```

### Por que UMA origem, e não dois domínios

**Por causa do cookie.** O `lex-token` é `httpOnly`. Com front e back em
domínios diferentes ele vira **cross-site** e passa a exigir
`SameSite=None; Secure` — que parte dos navegadores e dos bloqueadores recusa,
de formas que só aparecem no aparelho de outra pessoa. **Numa banca, é o
defeito que ninguém consegue depurar na hora.**

Com o rewrite, o navegador vê tudo na mesma origem: o cookie continua como
está (`SameSite=strict` em produção), **não há CORS**, e **nada da autenticação
mudou nesta fase**.

### O que isso exige do frontend

**`VITE_API_URL=/api`** — um **caminho**, não uma URL. É o valor de produção, e
é o que faz o navegador chamar o próprio domínio. Uma URL absoluta ali desfaz a
decisão inteira, sem erro nenhum no build.

A guarda de build da F-0 continua valendo e continua recusando a **ausência** da
variável (passo 148). O que ela **não** pode passar a exigir é uma URL absoluta
— há teste para isso, porque um `startsWith("http")` acrescentado por bom senso
quebraria o deploy com cara de erro de configuração.

### Duas regras de rewrite, e a ORDEM importa

| # | Source | Destination | Action |
|---|---|---|---|
| 1 | `/api/*` | `https://<a-api>/api/*` | **Rewrite** |
| 2 | `/*` | `/index.html` | **Rewrite** |

- **Rewrite, nunca Redirect.** Redirect trocaria o domínio na barra do
  navegador — e o cookie voltaria a ser cross-site, que é o que esta
  arquitetura evita.
- **A ordem é a regra**: o Render aplica a primeira que casa, e `/*` casa com
  tudo. Invertidas, **toda chamada de API volta como o HTML do app**.
- A regra 2 é o que faz **F5 numa tela interna** funcionar — quem conhece
  `/dashboard/clientes` é o `react-router`, não o servidor.
- O Render **não aplica regra quando existe arquivo no caminho**, então
  `/assets/*` e `/tabelas/*` continuam sendo servidos direto.

### A consequência para o service worker, e ela é nova

Até esta fase, uma chamada de API ia para **outro domínio** e o `sw.js` nem
chegava a considerá-la (`url.origin !== self.location.origin` → passa direto).
Com o rewrite, `/api/*` passa a ser **mesma origem**: quem impede resposta
autenticada de entrar no Cache Storage é, agora, **só** a regra
`url.pathname.startsWith("/api/")`.

**Ela deixou de ser redundante e passou a ser a única barreira.** Quem mexer no
`sw.js` precisa saber disso — e o passo **256** do roteiro existe para conferi-la
no ar.

### `render.yaml` — e o que ele NÃO consegue resolver sozinho

O blueprint na raiz descreve os **dois** serviços (o campo `repo` aponta para o
repositório do backend) e marca os segredos como `sync: false`, que faz o Render
**perguntá-los na tela** em vez de os guardar em arquivo versionado.

**Uma linha depende de um valor que só existe depois:** o `destination` do
rewrite é a URL pública da API, e ela só é conhecida quando o serviço é criado.
Se o nome estiver em uso por outra conta, o Render dá outro hostname e o
rewrite aponta para o lugar errado. O README manda conferir isso no primeiro
apply, e o caminho manual está escrito ao lado.

### A versão do Node é DECLARADA

`engines.node: ">=20.0.0 <21.0.0"`, nos dois repositórios. Sem isso o Render usa
o default **dele** — hoje a série 24 —, e o build rodaria numa versão que a
suíte nunca tocou. O teto é exigência explícita da documentação do Render: faixa
aberta resolve para o `latest`, que muda de major sozinho.

### A hibernação do plano gratuito

O Web Service gratuito **dorme depois de 15 minutos** sem requisição e leva
**cerca de um minuto** para acordar. O site estático **não** dorme — quem dorme
é a API, então o sintoma é o app abrir normal e a primeira consulta demorar.

**Antes de qualquer demonstração, abrir o sistema alguns minutos antes.** Isso
é pré-voo, como o passo 85: não é defeito a corrigir, é o plano gratuito, e o
que não pode acontecer é a banca ser a primeira vez que alguém vê.

---

## DEC-062 (frontend) — o seletor de ordem, e o paginador que a ordem exigiu (A-1)

> A decisão completa — o campo derivado, a collation `pt` medida contra o
> Atlas, o índice e a migração — está por extenso no **CLAUDE.md do backend**.
> Aqui fica o que é decisão de interface.

### O seletor

`utils/ordemCliente.js` — espelho **sem endpoint** de `ORDENACOES_CLIENTE` do
backend, pela razão de sempre: é **constante, não dado**. Duas opções, com
**valor gravado separado do rótulo** (`nome_asc` → "Nome (A–Z)"), como a DEC-039
fixou para todo vocabulário do projeto.

**O padrão é A–Z**, e a tela manda o valor **explícito** para a API em vez de
confiar em os dois padrões continuarem iguais.

**Nenhum `<option value="nome_asc">` escrito à mão.** O seletor é montado de
`ORDENS_CLIENTE.map` — um `<option>` no JSX seria a segunda lista, livre para
divergir, que é o defeito que `statusVisual.js` existe para não repetir.

**A ordenação NÃO entra em "Filtros aplicados".** Ordenar não recorta o
conjunto, e anunciá-la ali faria a advogada procurar por que a lista está curta
quando ela não está.

### O estado saiu para `useListFilters`, e o motivo é a página 1

A `ClientListPage` guardava `busca` e `situacao` em `useState` próprio, com
debounce próprio. Funcionava porque **não havia página nenhuma para reiniciar**.

Com a ordenação, passa a haver — e a regra é a do passo **175**: *mudar filtro
volta para a página 1*. Quem está na página 4 e inverte a ordem continua na
página 4 de uma lista que virou do avesso; a tela não erra, mostra corretamente
a quarta página de outro conjunto, e nada explica por que os nomes mudaram.

**Escrever o `setPage(1)` à mão aqui seria a quarta cópia da regra**, e o
comentário do próprio hook diz por que isso dá errado. Há varredura proibindo
`setFiltros(` direto na tela — é a única forma de a regra se perder sem que mais
nada mude.

`honorarioId`, `preset`, `de` e `ate` vêm no estado do hook e ficam **inertes**
nesta tela: são recorte financeiro, e cliente não tem período. O hook é de
listagem, não do módulo financeiro.

### 🚨 A listagem de clientes NÃO TINHA PAGINADOR, e a ordem alfabética tornou isso um defeito

Ela chamava `getAllClients()` sem `page`/`limit`, e o serviço tem
`limit = 20` no default: **a tela pedia 20 e mostrava 20**, com o `total` do
envelope descartado. Com 8 clientes no seed, ninguém notou.

**O recorte já existia; o que muda é O QUE ele esconde.** Por `createdAt: -1`
ele escondia os clientes **mais antigos** — a metade que ninguém procura numa
lista de cadastro. Ordenado por nome, passa a esconder **o fim do alfabeto**: um
cliente chamado "Zeca" simplesmente não existiria na tela, e a busca seria a
única forma de alcançá-lo.

Entrou o **`<Paginador>`**, sem uma linha de mudança nele — o comentário do
componente já previa as listagens não financeiras desde a F-1b.3. O envelope
inteiro passou a ser guardado no espelho local (DEC-058), porque é dele que sai
o `total`: com `clientes.length` o paginador diria "1–20 de 20" com 137 clientes
no banco.

**`page` e `ordem` entram na CHAVE do cache offline**, junto com busca e
situação: cada página e cada sentido têm espelho próprio, e voltar a uma página
já vista funciona sem sinal.

**Só a listagem de clientes.** Processos, documentos e seções continuam sem
paginador — converter tela que ninguém pediu segue sendo o trabalho que some no
meio de outro.

---

## DEC-063 (frontend) — a mesma regra, a mesma frase, e a tela do login (A-1)

> O porquê da assimetria entre cadastro e login está por extenso no **CLAUDE.md
> do backend**, e é a parte que mais precisa ser lida antes de "corrigir" algo.

### A regra tem UM dono, e o defeito era ter dois

`utils/email.js` espelha `src/utils/email.js` do backend. Antes da A-1 a
expressão vivia **escrita à mão dentro do `RegisterPage.jsx`**, e a mesma
expressão vivia no `authValidation.js` — duas implementações da mesma regra,
**com o mesmo furo**: as duas aceitavam `daniel@lex..dev`.

O teste de paridade **importa as duas implementações e compara caso a caso**,
inclusive casos fora da tabela da fase — é ali que duas cópias costumam
divergir, porque ninguém as escreveu pensando neles. Varredura estática não
bastaria: dois arquivos podem ter a mesma aparência e discordar num caso.

**A frase também é única.** A tela dizia *"E-mail inválido."* (com ponto) e o
servidor *"E-mail inválido"* (sem) — a mesma recusa com duas caras, conforme a
validação acontecesse antes ou depois do envio.

### A tela do login valida; o servidor não

```js
// LoginPage.jsx — a ORDEM é a decisão
if (!emailValido(email)) { setError(MENSAGEM_EMAIL_INVALIDO); return; }
setLoading(true);
await login(email, senha);
```

Três coisas, e as três têm teste:

1. **a guarda vem antes do `await login()`** — o ponto é **não enviar**, e o
   passo **265** confere isso na aba Network;
2. **há `return`** — sem ele a mensagem apareceria *e* a requisição sairia, que
   é o defeito com cara de correção;
3. **`setLoading(true)` fica DEPOIS** — senão o botão entra em "Entrando..." e
   volta, piscando, para uma requisição que nunca aconteceu.

**O servidor continua sem validar formato no login, de propósito**, e isso não é
inconsistência: a tela poupa uma viagem para quem digitou errado; o servidor
precisa responder igual para tudo, porque é ele que alguém consultaria em massa
para descobrir quais e-mails têm conta. **O passo 266 é o que fecha essa
metade**, e é o passo mais importante da fase.

---

## DEC-064 (frontend) — as telas que o e-mail abre, e o aviso que não bloqueia (A-2)

O detalhe da decisão está no **CLAUDE.md do backend**. Aqui, o que é da tela.

**Três telas públicas, fora do `ProtectedRoute`** (quem esqueceu a senha não tem
sessão; quem clica no link de confirmação pode estar noutro navegador):
`/esqueci-senha`, `/redefinir-senha` e `/confirmar-email`. Os dois últimos
caminhos são os que o backend põe no link do e-mail — mudar um lado sem o outro
quebra o link em silêncio.

- **O token sai da barra de endereço** logo depois de lido (`navigate(..., { replace: true })`):
  na barra ele iria para o histórico, para o "copiar link" e, conforme o
  cabeçalho `Referrer`, para o próximo site aberto daqui.
- **A confirmação envia UM pedido só.** `React.StrictMode` monta o efeito duas
  vezes em desenvolvimento, e o segundo envio do mesmo token responderia "já
  utilizado" e sobrescreveria o sucesso. O guarda é um `ref` (que sobrevive à
  remontagem), e há teste — a mutação que o remove derruba um.
- **`POST` também na confirmação**, embora ela "só leia um link": o link abre uma
  TELA, e é a tela que chama a API. Um `GET` com o token seria consumido por
  antivírus e leitores de e-mail que pré-visualizam links.
- **Redefinir e confirmar não abrem sessão.** A redefinição manda ao login; a
  confirmação só chama `checkAuth()` para o aviso sumir sem F5.
- **A recuperação tem UMA mensagem.** A tela não tem ramo por existência de
  conta — nem tem como saber. Como no login (DEC-063), ela confere o formato
  antes de enviar e o servidor não.

**O aviso "Confirme seu e-mail"** (`components/layout/EmailConfirmationBanner.jsx`)
fica no topo do layout, ao lado do conteúdo — **nunca envolvendo o `Outlet`**. Só
aparece com `emailConfirmadoEm === null` (com `undefined`, servidor sem o campo,
afirmar "não confirmado" seria dizer o que ninguém verificou). **O login não é
bloqueado** (decisão do Daniel), e `tests/regressions/a2.test.js` trava isso pela
raiz: **só o aviso pode consultar esse campo** — a mutação que faz o
`ProtectedRoute` olhá-lo derruba o teste. "Já confirmei" existe porque a
confirmação acontece em outra aba.

**O botão do aviso tem estilo próprio** (`.email-banner__botao`): `.btn-secondary`
só tem regra dentro de `ProcessPage.css`, e a varredura de CSS — que existe para
isso — acusou a classe inalcançável a partir do layout.

**E-mail do cliente (`ClientFormPage.jsx`):** a tela confere o formato com a
função única (`utils/email.js`) e, como o servidor, **só de um e-mail que mudou**
em relação ao gravado (`emailOriginal`). Continua opcional — sem `required`.

Passos de roteiro: **267 a 271**. Os dois primeiros (o e-mail chega; a
recuperação de ponta a ponta) só se validam no ambiente publicado, com o
provedor configurado.

---

## DEC-066 (frontend) — `toast.info` existe, e com fundo sólido (Fase 0)

**O defeito, em produção desde a F-3 (`55e3fe4`).** Cinco telas chamavam
`toast.info(...)` e `utils/toast.js` só tinha `success` e `error`. O
`TypeError` acontecia **antes** da linha seguinte:

| Onde | O que deixava de acontecer |
|---|---|
| `CalendarPage.jsx` — clicar num vencimento | o `navigate` para a parcela ou honorário de origem |
| `EventFormPage.jsx` — salvar e concluir sem sinal | sair do formulário depois de enfileirar |
| `ProcessDetailPage.jsx` — mudar fase sem sinal | limpar o motivo; o erro escapava do `catch` |
| `PendenciasPage.jsx` — "manter a minha versão" | a confirmação do reenvio |

Nos ramos da fila a gravação **tinha** ido para a fila — o defeito era a tela
não dizer isso e não sair do lugar, o que se lê como "não salvou".

**A correção é o método que faltava**, com a mesma assinatura dos outros dois.
Nenhum ponto de chamada mudou.

**O tom `info` tem fundo SÓLIDO** (`#1D4ED8`, texto `#FFFFFF`, **6,70:1**), e não
o `-bg` translúcido de `success` e `error`. Com fundo sólido o contraste não
depende do tema nem do que estiver atrás do toast — o translúcido de erro mede
4,34:1 no escuro e 3,01:1 no claro (inventário de 24/10/2026). A cor definitiva
vem com a paleta da Fase 1; o que fica decidido aqui é **sólido**.

**A varredura que teria pegado o defeito agora existe:**
`tests/regressions/fase0.test.js` lista todo `toast.<método>(` de `src/` e falha
se o módulo não tiver o método. `utils/toast.js` não importa nada, então a
suíte o **carrega e executa** — o impedimento de `tests/offline/estatica.test.js`
é do `axiosConfig.js`, que o importa sem extensão.

---

## DEC-067 (frontend) — o seletor pede o teto e diz quando corta; a busca é da fase 3 (Fase 0)

> ⚠️ **SUBSTITUÍDA pela DEC-101 (Fase 3.2).** Os `<select>` viraram
> `SeletorComBusca`, com busca no servidor: o teto de 100, o aviso "Mostrando os
> N mais recentes de T", `utils/seletorLimitado.js` e `hooks/useOpcaoGarantida.js`
> saíram. O texto abaixo fica como histórico do paliativo.

**O defeito.** O seletor de processo do formulário de honorário
(`processService.listProcesses()`) e o seletor de honorário do formulário de
parcela (`feeService.listFees()`) eram chamados **sem `limit`**. O backend
devolvia os 20 do padrão, e a tela os mostrava como se fossem todos: com 21
processos, o mais antigo **não existia** no seletor, e não havia como lançar
honorário para ele por aquela tela.

**O paliativo.** Os dois pedem `limit: 100` — o teto que as rotas aceitam
(`Math.min(100, …)` em `processController.js` e `feeController.js`; não há
utilitário compartilhado no backend, então o número mora em
`utils/seletorLimitado.js` com a referência). Quando o `total` do envelope é
maior, aparece abaixo do seletor: **"Mostrando os 100 mais recentes de 137."**
("mais recentes" porque as duas listagens ordenam por `createdAt` decrescente).

**O que NÃO se fez, e por quê:** baixar todas as páginas. Seria trocar um teto
silencioso por um download que cresce com o escritório, num seletor nativo que
fica inutilizável muito antes de 500 opções.

**O conserto de verdade fica para a fase 3:** trocar os dois `<select>` por
`CampoComSugestoes` com busca no servidor (`/fees` e `/processes` já aceitam
`busca`), o que acaba com o teto e permite mostrar processo e cliente na opção
— que é o item 4 da 3ª banca.

**Limite conhecido do paliativo:** na **edição**, se o registro aponta para um
processo ou honorário fora dos 100 mais recentes, o `<select>` não tem a opção e
aparece vazio. O valor continua no `formData` e vai no payload; o que falta é a
exibição. Some junto com o `<select>` na fase 3.

---

## DEC-069 (frontend) — o cartão se chama "Honorários em aberto" (Fase 0)

O backend passou a contar `pendente` **e** `parcialmente_pago` (ver a DEC-069 no
CLAUDE.md do backend). O rótulo "Honorários a Receber" descrevia a conta antiga
— só os honorários que nunca receberam nada — e trocou para **"Honorários em
aberto"**, que é o que o número passou a ser.

**A chave continua `honorariosAReceber`**, porque é o nome do campo na API; o
que muda é só o texto do cartão. Teste em `tests/regressions/fase0.test.js`.

---

## DEC-070 (frontend) — o filtro `?processoId=` aparece, e sai com um clique (Fase 0)

**O defeito, apontado pela 3ª banca.** As abas do processo
(`pages/processes/ProcessTabs.jsx`) abrem honorários, parcelas, documentos e
pagamentos com `?processoId=` na URL. As quatro listas filtravam por ele e
**nenhuma dizia**: a frase do recorte não o citava, o "Limpar filtros" não o
removia (ele vive na URL, não no estado do `useListFilters`), e a advogada lia
uma lista curta como se fosse o escritório inteiro.

**A correção, em três peças reutilizáveis:**

| Peça | O que faz |
|---|---|
| `utils/processoFiltrado.js` | função pura: "número — título", e o trecho da frase |
| `hooks/useProcessoFiltrado.js` | lê o parâmetro, busca o processo, remove **só** o `processoId` da URL |
| `components/ui/ProcessFilterChip.jsx` | "Processo: {número} — {título} ×", com o × rotulado para leitor de tela |

**O processo vem pelo MESMO recurso do detalhe** (`resource: 'process'`,
`params: { id }`), que é a mesma chave do espelho local da DEC-058: quem abriu o
processo com sinal vê o nome no chip sem sinal.

**Nas três listas financeiras o processo é um filtro como os outros:**

- entra em `descricaoDoRecorteFinanceiro` por um parâmetro próprio, `processo`,
  logo depois da busca e antes do honorário (é o recorte mais largo dos dois);
- conta como "filtrado" para a barra "Filtros aplicados" e para o estado vazio;
- o "Limpar filtros" o remove junto. Sem isso a frase diria "do processo X" e o
  botão deixaria o processo de pé.

**Na lista de documentos** (que não tem barra de filtros) entra o chip, e o
estado vazio diz "Nenhum documento deste processo." em vez de "Nenhum
documento gerado ainda." — o segundo seria falso sobre o escritório.

### A varredura de espelho passou a cobrar QUEM usa o hook

`tests/offline/estatica.test.js` tratava todo arquivo que chama
`useCachedResource` como tela obrigada a exibir o aviso de idade, e o hook novo
entrou como "tela". **A saída não foi isentá-lo**, o que deixaria um hook futuro
servir dado guardado sem aviso: hook em `src/hooks/` saiu da lista e **todo
arquivo que o importa entrou nela**. A regra mais estrita pegou um caso real —
a lista de documentos mostraria, sem sinal, o nome do processo vindo do espelho
sem dizer de quando — e ela passou a exibir o `OfflineNotice` do chip.

Testes em `tests/regressions/fase0.test.js` (bloco do item 5).

---

## DEC-073 (frontend) — o modo claro continua, com paleta própria (Fase 1)

**Decisão do Daniel.** O front da Raniele só tem modo escuro; o nosso tem os
dois desde a Fase 2, com o alternador na Sidebar. O claro **fica**, e deixa de
ser a inversão do escuro: tem paleta própria, derivada da identidade dela.

| Plano | Escuro | Claro |
|---|---|---|
| fundo | `#121212` | `#F7F3EA` (bege bem claro) |
| surface | `#222222` | `#FFFDF9` |
| texto primário | `#D3CAB9` (bege87 composto) | `#01261F` |
| marca | `#174034` / `#01261F` | os mesmos |

**Por que paleta própria, e não inverter.** O inventário de 24/10/2026 mediu o
claro falhando onde o escuro passava: badges de sucesso e aviso em 2,0:1, link
dourado em 2,6:1, borda de campo em 1,3:1. A causa era uma só — os tons
semânticos tinham sido escolhidos para fundo escuro e o claro **não os
redefinia**. Inverter não resolve: um pastel que passa sobre `#222222` some
sobre branco. Cada token de texto tem valor medido **em cada modo**.

---

## DEC-074 (frontend) — a identidade passa a ser a dela (Fase 1)

Verde-escuro `#01261F`, verde `#174034`, bege `#EDE3CF`, cinzas
`#121212`/`#222222` no escuro, e a logo vetorial `LEX_horizontal.svg`. **O
verde `#2E7D32` e o dourado `#B89D4B` saem como cores de marca.** O verde
sobrevive só como fundo sólido do toast de sucesso, que é o dela.

**A tipografia continua a nossa** (Inter e a escala de `variables.css`): ela
não tem tokens de tipografia — a dela é a do sistema, pelo preflight do
Tailwind, que **não** entra. Da estrutura de CSS dela não vem nada: nem
`@import "tailwindcss"`, nem regra global de elemento, nem classe de página.
Vêm **valores** (cores, raios, formas) e **arquivos** (logo e 12 ícones).

**`--color-primary` é FUNDO, não texto.** `#174034` mede 1,5:1 sobre
`#222222`: serve para o botão primário (com texto bege, 9,1:1), não para
borda de seleção nem para letra. Para verde em texto, marca de seleção e
`accent-color`, use **`--color-primary-light`** (`#8CC7AC` no escuro,
`#1E5A47` no claro). Foi um defeito real desta fase: a borda da opção ativa da
geração de documento sumia no escuro.

**`--color-accent` deixou de ser dourado.** No escuro é o bege; no claro, o
verde da marca. O nome ficou porque o significado não mudou ("destaque") e
porque ele aparece em 54 regras.

**A logo é componente** (`components/ui/LogoLex.jsx`), e não `<img>`: o SVG
dela é bege fixo e some no claro, e `currentColor` só atravessa para SVG que
está no documento. `assets/LEX_horizontal.svg` é a fonte, com `currentColor`;
`tests/css/logo.test.js` confere que o componente tem os mesmos traços.

---

## DEC-075 (frontend) — três tokens por semântica, e `--color-text-muted` não é texto (Fase 1)

| Token | Para quê |
|---|---|
| `--color-X` | cor plena: borda, marcador, barra |
| `--color-X-bg` | fundo esmaecido de badge e aviso (translúcido) |
| `--color-X-text` | **o texto do tom** — o único que passa 4,5:1 |

Para `success`, `warning`, `danger` e `info`, com valores próprios em cada
modo. No escuro, os do `StatusBadge` dela. **Toda regra `color:` de tom usa
`-text`** — 69 foram trocadas nesta fase —, e o mapa de `statusVisual.js`
também, para a fatia do donut continuar sendo o texto do badge.

**Fundos sólidos com texto branco** têm tokens à parte e **iguais nos dois
modos**: `--color-success-solid`, `--color-danger-solid`,
`--color-info-solid`, com `--color-on-solid`. São os do toast e do botão de
perigo — com fundo sólido, o contraste não depende do tema (DEC-066).

**`--color-text-muted` NÃO é cor de texto.** Media 2,6:1 no escuro e 3,6:1 no
claro e aparecia como `color:` em 47 regras. O texto discreto é
**`--color-text-discreto`** (bege60 composto no escuro, 5,8:1; `#4A5E55` no
claro, 6,8:1). O token antigo fica para o que não é texto — ícone decorativo,
ícone de campo de busca, controle `:disabled` — e o `variables.css` diz isso
ao lado dele.

---

## DEC-076 (frontend) — contraste mínimo, garantido por teste (Fase 1)

**4,5:1 para texto; 3:1 para texto grande, borda de campo, anel de foco e
elemento não textual — nos dois modos.**

`tests/css/contraste.test.js` lê `variables.css`, resolve `:root` e
`body.light-mode` (o claro herda o que não redefine), **compõe o alfa sobre o
fundo real** e confere os pares de `tests/css/contrastePares.js`. A fórmula
(`tests/helpers/contraste.js`) é a do inventário: luminância relativa do WCAG
2.x, e a suíte confere três valores da tabela 2.3 dele.

**O que ela não alcança: cor escrita fora de `variables.css`.** É por isso que
texto, fundo e borda que dependem do tema usam token. Os literais que ficaram
são a folha A4 (papel, branca nos dois modos), sombras, as sobreposições de
modal e o canvas de imagem — todos iguais nos dois modos por decisão.

**Quem acrescentar um par de cor novo acrescenta o par à lista.** Uma cor que
só existe numa folha de página volta a ser medida à mão, e medida à mão
envelhece na primeira troca de token — foi assim que o claro chegou a 2,0:1.

---

## DEC-077 (frontend) — os ícones dela, em linha e com `currentColor` (Fase 2a)

`components/ui/Icone.jsx` desenha os 12 SVG de `assets/icons/` (`<Icone
nome="pessoa" />`, 20 px por padrão). **Os arquivos são a fonte**, já com
`currentColor`; `components/ui/iconesDados.js` repete os caminhos para o
componente, em `.js` para a suíte poder importá-lo. `tests/css/icones.test.js`
confere, traço a traço, que o dado é o arquivo e que nenhum traço tem cor fixa.

**Por que não `<img>`:** o traço deles era `#EDE3CF` fixo, que some no modo
claro, e `currentColor` não atravessa `<img>`. É o mesmo princípio do `LogoLex`
(DEC-074).

Sem `rotulo` o ícone é `aria-hidden`; com `rotulo`, `role="img"` e
`aria-label`. **Não se desenha ícone novo:** onde os 12 não cobrem, fica o
lucide que a tela já usava.

---

## DEC-078 (frontend) — a marca fixa: cabeçalho e autenticação iguais nos dois modos (Fase 2a)

O cabeçalho (`#174034`) e as telas de autenticação (`#01261F` e `#174034`) são
**marca**, e não tema: têm a mesma cor no escuro e no claro, como os sólidos da
DEC-075. Os tokens `--color-marca-*` moram **só no `:root`**, e um teste falha
se `body.light-mode` redefinir algum.

| Token | Valor | Uso |
|---|---|---|
| `--color-marca-fundo` | `#174034` | barra do cabeçalho, lado direito da autenticação |
| `--color-marca-escuro` | `#01261F` | painel da logo |
| `--color-marca-texto` | `#EDE3CF` | texto, ícone, link ativo, borda do botão contornado |
| `--color-marca-texto-suave` | `#D1CEBB` | link não ativo (bege87 composto) |
| `--color-marca-botao` / `-hover` | `#ADB2A0` / `#D1CEBB` | o botão claro da Figura 14 |
| `--color-on-marca-botao` | `#01261F` | texto do botão claro (7,4:1) |
| `--color-marca-borda-campo` | `#ADB2A0` | borda dos campos (5,3:1) |
| `--color-marca-erro` | `#FFB4AB` | erro sobre o verde (6,8:1) |
| `--color-marca-foco` | `#EDE3CF` | anel de foco sobre a marca |

**Quem monta algo SOBRE a marca usa estes tokens, nunca os do tema.** O
`--color-text-secondary` do claro (`#2E4A41`) some sobre `#174034`, e o
`--color-focus` do claro **é** `#174034`. Por isso a barra não define `color`
para os filhos herdarem: os painéis que abrem dela (submenus, sino) são
superfície do tema, e herdariam o bege.

`--color-primary` continua sendo **só fundo** (DEC-074). Os pares estão em
`tests/css/contrastePares.js`, no bloco "marca:".

---

## DEC-079 (frontend) — o cabeçalho horizontal substitui a Sidebar (Fase 2a)

### Um mapa de destinos só

`components/layout/navegacao.js` é a lista que o cabeçalho e a barra de baixo
leem — eram duas listas à mão (Sidebar e BottomNav). Os **13 destinos** da
Sidebar continuam alcançáveis, e há teste comparando com a lista antiga:

| Antes (Sidebar) | Agora |
|---|---|
| Início, Clientes, Processos, Agenda | links diretos |
| Financeiro, Honorários, Parcelas, Pagamentos | **Financeiro ▾** (Visão geral + os três) |
| Documentos, Gerar documento, Montar modelo, Seções | **Documentos ▾** — as duas portas da montagem continuam separadas |
| Perfil | **menu do usuário** (e o "Mais", no celular) |

A regra de "item ativo" é função pura (`itemAtivo`): as duas portas da
montagem acendem pelo `?modo=`, e a lista de documentos não acende na
montagem.

### O que abre e fecha

`MenuSuspenso.jsx` é o padrão **disclosure** (botão com `aria-expanded` e
`aria-controls`, painel de links), e não `role="menu"`: são links de
navegação. Fecha com Escape (o foco volta ao botão), clique fora, foco saindo
por Tab e ao navegar. Não está em portal: o cabeçalho não recorta, e fora do
portal a ordem de Tab é a natural.

O menu do usuário é um `<button>` — o dela era uma `div` clicável, sem teclado.
**Tema e Sair são as funções do `DashboardPage`**, entregues ao menu e à folha
do "Mais"; o Sair continua avisando da fila offline antes de sair.

### O ponto de troca é 1024 px, e a saudação cabe

Abaixo de 1024 px os links saem do cabeçalho, a barra fica compacta (logo,
fila, sino, iniciais) e a navegação vai para a barra de baixo: Início,
Clientes, Processos, Agenda e **Mais** (folha `role="dialog"` com Financeiro,
Documentos, Pendências, Perfil, Tema e Sair; foco no primeiro item, Tab preso,
Escape e toque no fundo fecham, o foco volta ao "Mais").

Medido no Chrome com o seed: em **1024 px** os seis links e o lado direito
cabem com ~210 px de folga entre "Documentos" e o sino, **com** a saudação. O
ponto não precisou subir. Abaixo de 1024 px a saudação sai e fica o círculo,
com o nome no `aria-label`.

### Quem rola é `.main-content`

O `.app-layout` tem a altura da tela e esconde o excedente; **o `window` não
rola** na área da advogada. É isso que deixa o cabeçalho sempre visível sem
`sticky` (o desenho dela o escondia ao rolar — não veio), é o que
`VoltarAoTopo` rola, e é o que o menu ⋮ escuta para se fechar (DEC-046). Nas
páginas públicas e no portal, quem rola é o `window`.

O conteúdo centraliza acima de `--largura-conteudo` (1280 px), com o recuo no
**padding** do `.main-content`, e não num invólucro: a barra de rolagem fica na
borda da tela e as larguras de coluna (`col-money`, `col-parcela`) não mudam.

A **trilha** continua, logo abaixo da barra, com a lógica de sempre. Trilha ou
"Voltar" é decisão da Fase 2b.

---

## DEC-080 (frontend) — vocabulário único no financeiro (Fase 2a)

O financeiro usa só **Honorários**, **Parcelas** e **Pagamentos** — os nomes do
menu, das rotas e das listagens. "Cobranças previstas" e "Recebimentos" eram os
mesmos objetos com outros nomes, e a advogada procurava no menu uma "cobrança"
que não existia.

Trocados só textos visíveis (lista no relatório da fase); nenhum nome de campo,
rota ou variável. `tests/regressions/fase2a.test.js` varre o código sem
comentários atrás de "cobrança" e "recebimento". **"Recebido"** (o particípio,
nos cartões) continua: é o fato, não o nome de um objeto.

O documento do TCC (Quadros 9, 10 e 12) ainda usa os nomes antigos e é
corrigido à mão.

---

## DEC-081 (frontend) — o layout das telas de autenticação (Fase 2a)

`components/layout/LayoutAutenticacao.jsx`, das Figuras 14 e 16: painel
`#01261F` com a logo e o verde `#174034` com o conteúdo; abaixo de 768 px uma
coluna só. Login, cadastro, esqueci, redefinir e confirmar usam o layout; **o
portal não** (fase 3).

**Rótulo visível acima do campo**, ligado por `htmlFor`. Os campos dela usavam
só placeholder, que some ao digitar e com o preenchimento automático.

**Todo seletor da folha começa por `.auth-layout`.** A dela tinha
`a { width: 24rem }`, que no bundle valia para todo `<a>` do app — há teste. E
as folhas das telas **não** declaram cor, borda nem raio de campo e botão: com
a mesma especificidade do layout, quem venceria dependeria da ordem do bundle.

`#root` passou a ocupar a largura toda (`global.css`): o `body` é flex
centralizado desde o login antigo, e o `#root` encolhia até o conteúdo.

---

## DEC-082 (frontend) — `/` é a página inicial pública; o login fica em `/login` (Fase 2a)

`pages/public/InicioPublico.jsx` em `/`: **Fazer login**, **Criar nova conta**
e **Acompanhe seu processo** — as três pessoas que chegam ao LEX, incluindo o
cliente da advogada. Com sessão, `/` vai ao Início pela mesma pergunta do
`ProtectedRoute`, sem chamada nova à API. O portal continua em `lazy()`.

**Ninguém mandava para `/` esperando o login** — conferido antes da troca:
portão de rota, logout, sessão expirada no interceptor, fim da redefinição de
senha e confirmação de e-mail já apontavam para `/login`. Os links de e-mail do
backend apontam para `/confirmar-email` e `/redefinir-senha`. Há varredura
proibindo `navigate('/')`, `to="/"` e `href = '/'`.

A rota coringa `*` existe dentro do layout da advogada (com o cabeçalho) e fora
de tudo; o link de volta sai de `pages/public/naoEncontrada.js` — `/portal` nos
caminhos do portal, `/dashboard` com sessão, `/` sem.

---

## DEC-083 (frontend) — o toast por tipo: duração, região, fechar e deduplicação (Fase 2b)

| Tipo | Duração | Região |
|---|---|---|
| sucesso | 3 s | `role="status"`, `aria-live="polite"` |
| info | 4 s | `role="status"`, `aria-live="polite"` |
| erro | 6 s | `role="alert"`, `aria-live="assertive"` |

As regras moram em `utils/toast.js` como funções puras (`duracaoDe`,
`regiaoDe`, `deveEmitir`) e o `ToastContainer` só as aplica — o módulo não
importa nada, e a suíte o executa.

- **As duas regiões ficam sempre montadas**, vazias quando não há aviso. Região
  viva que nasce junto com o conteúdo não é anunciada por todo leitor de tela.
- **Botão ×** em todos os tipos, `aria-label="Fechar aviso"`. O anel de foco
  do × é branco (o bege do foco global não tem contraste garantido sobre os
  três fundos sólidos); o realce de hover **escurece** o fundo
  (`--color-toast-fechar-hover`), porque clarear o verde do sucesso derrubava o
  branco para menos de 4,5:1.
- **Pausa** enquanto o mouse está em cima ou o foco está dentro. Escape fecha o
  aviso focado, e o foco volta para onde estava antes de entrar nele.
- **Deduplicação:** mesmo tipo e mesma mensagem dentro de 4 s saem uma vez. A
  janela conta da emissão que saiu — a sexta falha, 5 s depois, aparece de
  novo, porque o problema continua.

---

## DEC-084 (frontend) — o toast global de erro, com política estreita (Fase 2b)

O interceptor da advogada passou a emitir toast para **o que nenhuma tela sabe
explicar**. A política inteira é `deveExibirToastGlobal(erro, config, online)`,
em `api/toastGlobal.js` — módulo próprio pelo motivo de `api/sessionLoss.js`
(a suíte não carrega `axiosConfig.js`).

| Caso | Toast global? | Por quê |
|---|---|---|
| sem resposta, com sinal (servidor fora, CORS, tempo esgotado) | **sim** | nenhuma tela sabe dizer isso melhor |
| 5xx (inclui o 502 de envio de e-mail) | **sim** | idem |
| 429 | **sim** | idem |
| 400, 404, 409, 422 | não | a tela destaca o campo ou lista as pendências |
| 401 | não | é a sessão perdida, com o próprio toast e o `isRedirecting` intactos |
| `offlineWriteError`, `offlineQueuedError` | não | a tela já tem a frase da F-5a/F-5b |
| sem resposta e sem sinal | não | a frase é a da F-5a, e a leitura cai no espelho |
| `ERR_CANCELED` | não | pedido cancelado não é falha |
| `config.semToastGlobal === true` | não | chamada de fundo |

**A frase:** a do servidor quando ele escreveu uma (o 429 "Aguarde um minuto…",
o 502 "Não foi possível enviar o e-mail…"); a nossa quando não — o 500
genérico e o 502/503 do proxy, que chega sem corpo nosso.

**`semToastGlobal`** está no sino a cada 5 minutos, no reenvio da fila offline
(`api/outboxSender.js`), no preview de alocação disparado pela digitação e no
aviso preventivo de compatibilidade do documento. O contador da fila lê o
IndexedDB e não faz requisição.

**E nas três telas que já mostram o erro em linha** — login, "esqueci a senha"
e o reenvio da confirmação de e-mail (`api/authService.js`, `SO_A_TELA_AVISA`),
por decisão do Daniel ao revisar a fase: o 429 e o 502 sairiam no toast e na
frase da tela. No reenvio pelo menu do usuário, que fecha ao clicar, é o
próprio menu quem mostra o toast.

**A marca no erro.** O interceptor marca o erro avisado
(`avisadoPeloToastGlobal`), e toda tela que fazia `toast.error(...)` no
`catch` pergunta `jaAvisadoPeloToastGlobal(err)` antes. Sem isso o mesmo 500
apareceria duas vezes, com duas frases — e frases diferentes a deduplicação
não junta. O **erro em linha continua**: ele diz onde, o toast diz o quê.

**O portal não recebe nada disto** — `portalAxios.js` é outra instância, e há
teste travando que ele não importa a política. A política também não lê URL:
a DEC-050 continua valendo, e a asserção de `f2a.test.js` passou a nomear a
URL (`error.config.url`) em vez de proibir qualquer acesso ao `config`.

---

## DEC-085 (frontend) — a faixa de contexto substitui a trilha (Fase 2b)

Apontamento da 3ª banca — **toda tela diz a qual cliente e processo se
refere** — e o desenho da Raniele (Figura 21: "Voltar" nas telas de detalhe,
sem trilha).

**Três peças, e por que três:**

| Peça | O que faz |
|---|---|
| `contexts/ContextoContext.jsx` | guarda o **id** que a tela publicou (`usePublicarContexto({ processoId })` ou `{ clienteId }`), casado com o `pathname` |
| `hooks/useContextoResolvido.js` | resolve o id pelo espelho, com `resource: 'process'`/`'client'` e `params: { id }` — **as mesmas chaves do detalhe** (DEC-058, DEC-070) |
| `components/layout/FaixaContexto.jsx` | desenha "← Voltar" e "Cliente: Fulano (+2) · Processo: número — título", e o aviso de idade quando o dado vem do espelho |

A resolução fica num hook em `src/hooks/` de propósito: a varredura de
`tests/offline/estatica.test.js` passa a cobrar o aviso de idade de **quem o
importa** (a faixa), como faz com `useProcessoFiltrado`. Nada foi isentado.

**O casamento com o caminho** (`idsPublicadosPara`) é a regra do
`BreadcrumbContext`, trazida para função pura: entre navegar e a tela nova
publicar, a faixa não mostra o processo da tela anterior.

**O "Voltar" é um link para o PAI**, não `navigate(-1)`: quem abriu a tela por
um favorito ou numa aba nova não tem "anterior", e o -1 a levaria para fora do
sistema. O mapa (`paiDaRota`) é o da trilha — toda tela de uma seção volta à
lista da seção —, com um refinamento: **a edição volta ao detalhe** do mesmo
registro (cliente, processo, honorário). Início, listas, Financeiro, Perfil e
Pendências não têm faixa.

**A query do pai é preservada** quando veio do caminho de origem: a faixa
guarda, em memória, a última query de cada caminho visitado nesta aba. Quem
abriu um honorário a partir de `/honorarios?processoId=X` volta à lista
filtrada; visitar a lista pelo menu (sem query) sobrescreve. Um `?voltar=`
válido (DEC-087) tem precedência sobre tudo.

**Listas filtradas por `?processoId=`** ganham a faixa, com "Voltar" para o
processo. Quem publica é `useProcessoFiltrado`, que as quatro listas já usam.
**O chip da DEC-070 continua**, porque é ele que remove o filtro — mas passou a
dizer só o recorte ("Filtro: só este processo ×"), com o número e o título no
`title`. Repetir o processo no chip e na faixa, a quatro centímetros, seria a
mesma informação duas vezes.

**No celular** (e no desktop) o contexto é uma linha só, com reticências e a
frase inteira no `title` do parágrafo; o "Voltar" nunca encolhe.

**A trilha saiu do `Header`**, e com ela o `BreadcrumbContext`, o
`usePublicarBreadcrumb` e o `useBreadcrumbLabel`. O nome do honorário e o
"Reparcelar" já eram o título das duas telas que publicavam rótulo; agora elas
publicam o processo. Os dois testes que travavam a trilha foram **reescritos
para a faixa** (`f1b.test.js`, `f1b2.test.js`), com a mesma régua.

**Custo aceito:** o detalhe do processo e a faixa leem o mesmo processo — duas
requisições iguais na primeira abertura, e a segunda serve o espelho se o sinal
cair. Compartilhar o dado exigiria a faixa conhecer a tela.

---

## DEC-086 (frontend) — o vínculo pré-preenchido, e a opção escolhida nunca some (Fase 2b)

> **Continua valendo, por outro meio (Fase 3.2, DEC-101):** o id da URL ou do
> registro em edição aparece escolhido no `SeletorComBusca`, com o rótulo
> completo, buscado pelo id quando preciso. `comOpcaoGarantida` e o
> `useOpcaoGarantida` saíram junto com o `<select>`; o rótulo do honorário
> passou a "descrição — Processo nº — cliente" (sem o valor).

- `FeeFormPage` aceita **`?processoId=`**; `InstallmentFormPage` aceita
  **`?honorarioId=`** (no padrão que o `PaymentFormPage` já tinha). Só na
  criação.
- **Corrige o limite conhecido da DEC-067.** Se o id escolhido — vindo da URL
  ou do registro em edição — não estiver entre os 100 mais recentes, a tela o
  busca por id (`GET /processes/:id`, `GET /fees/:id`) e o acrescenta
  **primeiro** no seletor. Enquanto a busca não volta, ou se ela falha, a opção
  existe do mesmo jeito, marcada ("Carregando…" / "Registro indisponível"): o
  `<select>` **nunca** fica sem a opção do valor que carrega. Regra em
  `utils/seletorLimitado.js` (`comOpcaoGarantida`), busca em
  `hooks/useOpcaoGarantida.js`. Aplicada também ao pagamento, que o
  "+ Pagamento" da ficha pode abrir para um honorário antigo.
- **A opção de honorário no form de parcela diz o processo:** "descrição —
  Processo nº {número} — valor" (`rotuloDoHonorarioNoSeletor`). O número vem do
  `processoId` populado que `GET /fees` já devolve; o valor vai por último,
  porque é o que o seletor nativo corta quando a linha não cabe.

A troca dos `<select>` por busca no servidor continua sendo da fase 3; isto
resolve o caso que a DEC-067 deixou aberto, não o teto.

---

## DEC-087 (frontend) — os botões de lançamento na ficha, e o `?voltar=` validado (Fase 2b)

A ficha financeira do processo ganhou **"+ Honorário"** e, em cada honorário,
**"+ Parcela"** e **"+ Pagamento"** — o que a Raniele resolveu com modais,
mantendo aqui as rotas. Honorário cancelado não oferece os dois últimos (o
backend responde 409).

**Sem sinal**, a regra do "Editar Processo" da mesma tela: o link vira botão
`aria-disabled`, porque o financeiro está fora da fila offline (DEC-059).

**O caminho de volta viaja na URL**, como `?voltar=/dashboard/processos/detalhe/:id`,
e é validado na ida e na volta (`voltarValido`, em `components/layout/contexto.js`):
só caminho que começa em `/dashboard/`, sem esquema, sem `//`, sem barra
invertida, sem `..`, sem `%2f`/`%5c`, sem espaço nem caractere de controle, até
512 caracteres. Fora disso o valor é ignorado, como se não existisse — **nunca
uma URL externa**.

- Honorário e parcela: o Salvar e o Cancelar vão para o `?voltar=`.
- **Pagamento: o Cancelar volta; o Salvar não sai sozinho.** É a regra da F-1b
  (a tela fica para comparar previsto e realizado); no lugar, "Voltar ao
  processo" vira o botão principal entre as saídas.
- O "Voltar" da faixa também respeita o `?voltar=`.

---

## DEC-088 (frontend) — o aviso de e-mail compacto, dispensável por sessão (Fase 2b)

**PROVISÓRIA: a decisão final depende dos professores** (aviso fixo ou
efêmero). Este desenho atende às duas leituras e se reverte tirando o ×.

- **Uma linha:** o texto da fase 0, encurtado sem passar a prometer nada
  ("Confirme seu e-mail (…) para receber os avisos e o link de recuperação de
  senha."), com "Reenviar", "Já confirmei" e ×. O texto cede com reticências; os
  botões não.
- **O × dispensa até o próximo login**, por `sessionStorage` com a chave do
  usuário, todo acesso em `try/catch`. O **login** limpa (o recarregar não).
  Sem `sessionStorage`, a faixa continua aparecendo.
- **A indicação permanente**, que não se dispensa: um ponto de alerta no círculo
  de iniciais (`--color-marca-alerta`, fixo nos dois modos — o amarelo do claro
  mede menos de 3:1 sobre a barra), o estado no `aria-label` do botão, e o item
  **"Confirmar e-mail"** no menu do usuário e no "Mais", que reenvia. Somem
  quando `emailConfirmadoEm` deixa de ser nulo.
- **A lógica não mudou:** o mesmo POST, o mesmo `jaConfirmado` que relê a
  sessão, os mesmos textos de erro do servidor. Saiu do aviso para
  `hooks/useConfirmacaoEmail.js` porque agora são três lugares que reenviam.
- **A leitura de `emailConfirmadoEm` mora num arquivo só**
  (`components/layout/confirmacaoEmail.js`), e a varredura da A-2 continua
  sabendo exatamente quem pergunta: a faixa, o menu, o "Mais" e o hook. Nenhum
  portão.

---

## DEC-096 (frontend) — o portal por pessoa, na pele da Figura 15 (Fase 2.5)

> O contrato é das DEC-089 a DEC-095, no `CLAUDE.md` do backend: login pelo
> código PESSOAL, sessão da pessoa, e cada processo liberado pela advogada,
> conferido pelo servidor a cada requisição.

**As rotas do portal:**

| Rota | Tela |
|---|---|
| `/portal` | login |
| `/portal/senha` | troca obrigatória da senha provisória (só a pele mudou) |
| `/portal/processos` | **"Seus processos"** (nova) |
| `/portal/processos/:processoId` | o processo |

`/portal/processo` (singular) saiu; o coringa da 2a responde a ela.

**"Seus processos"** (`pages/portal/PortalProcessListPage.jsx`): "Olá, {nome}"
e um cartão-link por processo, com título, número, fase, papel, trânsito e os
selos "N documentos novos" e "Confirmação de leitura pendente".
- **Um processo só → vai direto para ele** (`<Navigate replace>`): uma tela de
  escolha com uma opção é um clique a mais para ninguém. O login, a troca de
  senha e o portão levam sempre à lista; quem decide é ela.
- **Nenhum → "Nenhum processo liberado para você no momento. Fale com seu
  advogado."** Não é erro: é o estado de quem ainda não teve processo liberado.
- A tela não filtra nada: o que entra na lista é do servidor.

**O processo** recebe o `:processoId` da URL e o passa à lista de documentos e à
confirmação. Mantém fase e trânsito em julgado, e ganha "Voltar aos seus
processos" quando há mais de um. O 404 (não existe, não liberado, ou desligado
no meio da sessão) aparece como erro com o caminho de volta à lista. O recibo da
confirmação diz o processo.

**A pele:** `components/portal/Portal.css` usa **só** os tokens fixos da marca
(`--color-marca-*`, DEC-078) — cartão `#01261F` sobre o verde `#174034`, texto
bege, botão claro em pílula. O portal não muda com o tema da advogada, e há
teste proibindo token do tema na folha. Dois tokens novos: `--color-marca-sucesso`
(o "confirmado" sobre o escuro) e `--color-marca-escuro-hover`. As regras de
formulário ficaram escopadas por `.portal` (`.form-group` existe nos
formulários da advogada). Todos os pares em `tests/css/contrastePares.js`
("portal: …").

**O login:** "Voltar" para `/` (exceção nomeada na varredura da 2a — leva à
página pública, não espera login), título sobre o verde, cartão escuro com
rótulos **acima** dos campos ("Código de acesso", "Senha"), botão "Entrar", e
no lugar do "Esqueceu a senha?" simulado do desenho dela um texto que **não é
link**: "Esqueceu a senha? Fale com seu advogado." A logo pequena embaixo. A
barra com logo e "Sair" só aparece com sessão.

**`PortalAuthContext`** guarda `{ senhaPortalProvisoria, cliente }`; `papel` e
`processoId` saíram (eram do vínculo da sessão antiga). Sair e sessão perdida
continuam levando a `/portal`.

---

## DEC-097 (frontend) — o lado da advogada: liberar processo a processo (Fase 2.5)

- **"Liberado no portal"** (`components/processes/LiberacaoPortal.jsx`), por
  participante, no detalhe do processo — só para quem tem portal
  (`temAcessoPortal`). É um `role="switch"` com `aria-checked`; o estado está na
  palavra ("sim"/"não") e na posição, não só na cor. **Ligar é direto;
  desligar confirma em linha**, com o foco em "Desligar", Escape cancelando e o
  foco de volta ao interruptor. Sem sinal, `aria-disabled`, como toda ação que
  exige rede nesta tela.
- **A entrega** (`AccessDelivery`) mostra o código **pessoal** ("Código de acesso
  pessoal de {nome}"), diz se ESTE processo está liberado e, se não estiver,
  oferece "Liberar este processo" ali mesmo. Sem senha de portal, diz o caminho:
  definir a senha provisória no cadastro do cliente, que cria o código.
- **O detalhe do cliente** ganhou o bloco "Acesso ao portal"
  (`components/clients/AcessoPortalResumo.jsx`): o código pessoal, a situação da
  senha e "N de M processos liberados", concordando com M. Sem espelho local —
  é metade de uma credencial. A lista completa por processo, com os controles,
  é da subfase 3.5; a revogação continua no formulário do cliente.
- **A faixa de contexto** (`contextoDoProcesso`) não mudou: `participantes` só
  ganhou campos, e o teste dela continua passando.

---

## DEC-098 (frontend) — o filtro de mês do Início (Fase 3.1)

> O contrato é a DEC-098 do `CLAUDE.md` do backend: `?mes=AAAA-MM` em
> `GET /financeiro/resumo` e `GET /dashboard/honorarios-por-mes`.

- **O mês mora na URL** (`/dashboard?mes=AAAA-MM`), como a Agenda faz:
  `setSearchParams(..., { replace: false })`, então o "voltar" do navegador
  desfaz a troca e o link copiado abre no mesmo mês. O mês **corrente se
  escreve SEM `?mes=`** (`paramsDoMes`): uma URL só para cada mês, e a chamada
  sem mês continua sendo a de antes. `?mes=` inválido, ou fora de 2000–2100,
  abre no mês corrente. Trocar o mês não rola a página (`VoltarAoTopo` só reage
  ao `pathname`).
- **O seletor** fica ao lado do título "Início": setas, "outubro de 2026" e
  "Mês atual" só quando outro mês está escolhido. O mês corrente é o de **UTC**,
  o mesmo relógio do backend.
- **O que segue o mês, bloco a bloco:**

  | Bloco | Segue o mês? | Por quê |
  |---|---|---|
  | Ações rápidas | não | são atalhos |
  | Precisa de atenção | não | vencido é de hoje |
  | Datas próximas | não | "próximo" é a partir de hoje |
  | Em {mês} — A receber / Recebido | **sim** | é a pergunta do filtro |
  | Em {mês} — Total vencido **hoje** | não | o rótulo diz "hoje" |
  | Acumulado do escritório | não | é o total, sem recorte |
  | Resumo Geral | não | contagens de hoje |
  | Gráficos — donuts "Situação atual (geral)" | não | o sistema não guarda status de meses passados |
  | Gráficos — barras "6 meses até {mês}" | **sim** | a série termina no mês escolhido |

- **O espelho offline tem uma entrada por mês:** `useCachedResource` com
  `params: { mes }` (sem `mes`, a chave é a mesma do Financeiro — é a mesma
  resposta). Sem sinal, um mês visitado vem do espelho com o aviso de idade; um
  mês nunca visitado mostra "Sem dados guardados deste mês." com a frase da
  F-5a. Os blocos que não seguem o mês ficam com a última resposta boa, para não
  sumirem só porque o mês escolhido não tem espelho.
- As funções puras estão em `pages/dashboard/inicio.js`, com teste em
  `tests/regressions/fase31.test.js`.

## DEC-099 (frontend) — as ações rápidas, e a busca dela fica de fora (Fase 3.1)

- **Três ações rápidas**, como links: "Novo cliente" → `/dashboard/clientes/novo`,
  "Novo processo" → `/dashboard/processos/novo`, **"Nova parcela" →
  `/dashboard/parcelas/novo`** (na dela ia ao Financeiro; quem clica em "nova
  parcela" espera o formulário). Ícone da Raniele em cima, rótulo embaixo.
- **Sem sinal ficam desabilitadas** (`aria-disabled`, com a frase
  `MENSAGEM_ESCRITA_OFFLINE` ao lado): criar cliente, processo ou parcela não
  está na fila offline da F-5b.
- **A busca do Início dela não entra.** No `Home.jsx` dela o campo não faz nada;
  uma busca de verdade é outra funcionalidade, com rota e escopo próprios.

## DEC-100 (frontend) — o Início na pele nova, com o NOSSO conteúdo (Fase 3.1)

- **Título "Início"**, e a ordem: ações rápidas, Precisa de atenção (só quando
  há algo), Datas próximas, Em {mês}, Acumulado, Resumo Geral, Gráficos. Os
  blocos são balões `--color-surface` com cantos de 24 px; os cartões continuam
  na `--color-surface-card`, com o valor em cima (alinhamento da Fase 1).
- **O conteúdo é o nosso, nunca o dela.** O "Recebido este mês" dela é o
  `pagamentosRecebidosMes` bruto de `GET /dashboard`, recortado em fuso local e
  sem estorno; o nosso é `recebidoNoMes` do resumo (líquido, em UTC). O
  `pagamentosRecebidosMes` continua sem consumidor.
- **Datas próximas** substitui "Próximos vencimentos": junta
  `proximosVencimentos` (até 5) e os compromissos não concluídos de
  `GET /calendar` (de ontem a +30 dias, cortados pelo `hoje` do servidor) — sem
  rota nova. As derivadas do calendário ficam de fora (seriam os vencimentos em
  dobro). Até 8, por data e hora. Selo com o dia e o mês abreviado
  (`--color-on-primary` sobre `--color-primary`), título, subtítulo, processo e
  a pílula "Vencimento" (âmbar) ou "Compromisso" (azul) com os pares de badge do
  tema — não o branco sobre `#42A5F5` dela. A linha inteira é link, pelo
  `destinoDoItem` da Agenda. Vazio: "Nada nos próximos dias."
- **Ícones pelo `Icone`** nos cartões, nas ações, nos blocos (por um adaptador,
  sem mexer no `BlocoDoPainel`) e no sino. Lucide só sem equivalente: o alerta,
  as setas, o "Registrar pagamento".
- **360 px:** ações em três colunas que encolhem, cartões numa coluna, pílula
  embaixo do título.
- **Achado no navegador, corrigido:** sem preferência gravada, o primeiro
  clique num bloco que nasce fechado gravava "fechado" e não abria nada.
  `alternarBloco` agora parte do estado à vista (`PADRAO_FECHADO`).

---

## DEC-101 (frontend) — os seletores buscam no servidor (Fase 3.2)

> O alcance da busca é a DEC-101 do `CLAUDE.md` do backend: processo por
> número, título e cliente principal; honorário por descrição, número do
> processo e cliente principal — sem acento e sem caixa.

**Os três `<select>`** — processo no formulário de honorário, honorário nos de
parcela e de pagamento — viraram **`components/ui/SeletorComBusca.jsx`**, que
usa o `CampoComSugestoes` (combobox ARIA) no modo de busca no servidor.

- **Espera de 300 ms**, **até 20 sugestões** (`limit` pedido ao servidor),
  "**Nenhum resultado.**" quando vazio. As regras são funções puras em
  `utils/seletorComBusca.js`.
- **`semToastGlobal`** nas duas chamadas (`feeService.buscarHonorarios`,
  `processService.buscarProcessos`): dispara pela digitação (DEC-084). A falha
  aparece **em linha**, no próprio campo.
- **Sem sinal não pergunta:** "A busca precisa de conexão. Conecte-se para
  procurar." Os formulários financeiros continuam fora da fila (DEC-059).
- **O seletor guarda o ID**; o texto é o rótulo dele. Digitar por cima desfaz a
  escolha (`onMudar('', null)`) — um id antigo atrás de um texto novo mandaria
  o registro que a advogada não está vendo. O `handleSubmit` de cada tela
  recusa salvar sem escolha e destaca o campo.
- **DEC-086 continua:** `?processoId=`/`?honorarioId=` e o registro em edição
  aparecem escolhidos, com o rótulo completo. `GET /fees/:id` popula o processo
  sem o cliente e manda o cliente ao lado; `honorarioDoDetalhe` junta os dois só
  para o rótulo. A faixa de contexto (DEC-085) é publicada também quando o item
  chega pelo id (`onEscolhido`).
- **Rótulos (decisão 3):** processo "{número} — {título} — {cliente principal}"
  (`rotuloDoProcessoNoSeletor`); honorário "{descrição} — Processo nº {número}
  — {cliente principal}" (`rotuloDoHonorarioNoSeletor`, sem o valor).
- **Pagamento:** honorário cancelado não aparece nas sugestões (`filtrar`).
- **O `CampoComSugestoes` sem as props novas continua sendo o da F-4**
  (DEC-057: sugere, não obriga). O modo novo entra por `filtrarLocalmente`,
  `onEscolher`, `mensagemErro`, `mensagemSemResultado`, `mensagemCarregando` e
  `chaveDoItem`; os avisos ficaram numa região `aria-live`.

**Duas travas antigas reescritas, não apagadas:** `fase0.test.js` (exigia
`limit: LIMITE_DO_SELETOR` e o aviso) e `fase2b.test.js` (exigia
`useOpcaoGarantida` e o rótulo com valor). Agora exigem a busca no servidor e a
escolha pelo id.

## DEC-102 (frontend) — as listas financeiras no padrão da Figura 19 (Fase 3.2)

Honorários, parcelas e pagamentos, **na página própria**:

- **Balão** `--color-surface`, cantos de 24 px (o do Início), com
  `components/financeiro/CabecalhoDeLista.jsx`: título com o total entre
  parênteses (só com resposta na mão), **busca em pílula** larga e "**+**" à
  direita com `aria-label` ("Novo honorário", "Nova parcela", "Registrar
  pagamento"). Sem sinal, o "+" é `<button aria-disabled>` com o motivo.
- **Os filtros da F-1b.3 numa linha abaixo, em pílulas** (`FinancialFilters`
  com `semBusca` e `pilulas`). Embutidas no `FinanceiroPage`, as listas
  continuam como eram — o Financeiro é a 3.7.
- **A linha inteira abre o registro:** detalhe do honorário; edição da parcela
  (a reparcelada leva ao honorário) e do pagamento — sem sinal, a linha de
  edição não abre (o menu já recusa). Regra em
  `components/financeiro/linhaClicavel.js`: o menu ⋮ (portal, DEC-046) e
  qualquer elemento interativo da linha não disparam a linha; texto
  selecionado e clique com modificador ficam com o navegador. **A linha não é
  focável**: o link do nome continua sendo o alvo de Tab.
- **Coluna Cliente** ao lado de Processo nas três; as parcelas ganharam também
  a coluna Processo (chave nova `processo` da listagem, DEC-102 do back).
- **A seleção em massa da Raniele não entra**; o menu ⋮ com teclado (DEC-046)
  fica no lugar dos ícones de hover dela.

**Três achados da verificação no navegador, corrigidos na fase:**

1. **As colunas de texto colapsavam** — 0 px a 768 e 14 px a 1280 nas parcelas:
   as fixas (`col-money` etc.) já somavam mais que a área útil, e coluna `auto`
   numa tabela `fixed` recebe o que sobra. Agora as de texto têm `col-md` /
   `col-lg`, e **a tabela rola dentro do `.table-wrapper`** (regra do passo
   111). A 1280 px a coluna Ações fica fora da área visível até rolar a tabela.
2. **Trocar filtro trocava a tabela pelo `<Loading/>`** e a página encolhia. A
   recarga mantém a tabela (`aria-busy`, esmaecida); o indicador fica para a
   primeira carga (`loading = carregando && !data`).
3. **Dentro do balão, o hover `--color-accent-muted`** composto sobre a surface
   derrubava os badges danger e info do escuro para 4,44:1 e 4,35:1. O hover da
   linha no balão é `--color-surface-raised`. Pares "lista: …" em
   `tests/css/contrastePares.js`.

## DEC-103 (frontend) — situação, período e busca das listas na URL (Fase 3.2)

O período **não ia para a URL** até aqui (vivia no estado do `useListFilters`).
Agora, nas três listas **na página própria** (`useListFilters(…, { naUrl })`,
via `FILTROS_NA_URL(embedded)`):

- `?busca=`, `?situacao=` (o `status` do estado), `?de=AAAA-MM-DD&ate=…` e os
  filtros próprios de cada lista (`?tipo=`, `?honorarioId=`,
  `?formaPagamento=`, `?inativos=`). Regras em `utils/filtrosNaUrl.js`.
- **O padrão continua "Qualquer período"**, sem parâmetro. O preset **não** vai
  para a URL: é derivado de `de`/`ate` (um link de "Mês atual" aberto no mês
  seguinte mostra o intervalo copiado, como personalizado). Data torta na URL
  é ignorada.
- O "voltar" desfaz; trocar filtro volta à página 1 (pela assinatura dos filtros
  na URL, inclusive no "voltar"); `preventScrollReset`. A busca vai à URL após
  300 ms, e refinar a busca **substitui** a entrada do histórico.
- O "Limpar filtros" tira também o `?processoId=` na **mesma** escrita: duas
  escritas seguidas se atropelariam.
- **Achado no navegador:** preencher a data inicial e logo a final perdia a
  primeira — as duas escritas partiam da mesma query do render. O hook guarda
  a query mais recente (`queryAtual`) e parte dela.
- **Embutidas no Financeiro**, as listas ficam no estado: três listas na mesma
  query brigariam pelo mesmo `?busca=`. A lista de clientes também (3.5).

## DEC-104 (frontend) — o Início leva às confirmações e mostra os não liberados (Fase 3.2)

- **"Confirmações novas"** (`destinoDasConfirmacoes`, em `pages/dashboard/inicio.js`):
  com **um** processo, o cartão é o link para a ficha ("Abrir o processo"),
  que marca as confirmações como vistas; com **vários**, um botão abre uma lista
  curta embaixo dos cartões, com "número — título" e "N confirmações"; sem
  nenhuma, o cartão é só o número.
- **"Processos não liberados no portal"**: cartão novo no Resumo Geral com
  `processosNaoLiberados` e o link para a **lista comum** de processos — o
  filtro por liberação é da 3.4.

## DEC-105 (frontend) — o cliente nas Datas próximas (Fase 3.2)

A linha diz "**{processo} · {cliente}**" (`contextoDoProcesso`), com o nome que
as duas fontes passaram a trazer (DEC-105 do back). `proximosVencimentos` agora
vem com até 8, o mesmo limite das Datas — o risco 2 da 3.1 fechou.

---

## DEC-107 (frontend) — a coluna de ações fixa à direita nas listas financeiras (Fase 3.3)

O risco 1 da 3.2: com as colunas de texto com largura (para não colapsarem), a
tabela passou a rolar dentro do `.table-wrapper`, e **o ⋮ ficava fora da vista a
768 e a 1280 px nas três listas** (medido: o gatilho em x≈1.380 com o wrapper
terminando em 1.236).

- **`data-table--acoes-fixas`** (`styles/modules.css`) nas três listas: a última
  coluna é `position: sticky; right: 0`, `z-index: 1`, com **fundo opaco igual
  ao da linha** — `--color-bg` quando a tabela pousa no fundo da página
  (embutida no Financeiro), `--color-surface` no balão (DEC-102); no hover, o
  realce da linha (no fundo da página, o `--color-accent-muted` composto por uma
  camada de gradiente; no balão, `--color-surface-raised`). Sombra discreta à
  esquerda, sempre — quando a tabela cabe, é só um fio.
- **O menu ⋮ continua no portal** (DEC-046): `sticky` não cria bloco de
  contenção para o `fixed` dele. Conferido no navegador com a tabela rolada até o
  fim: o painel abre colado ao gatilho e dentro da tela.
- **A lista de honorários perdeu "Percentual" e "Valor base"** (estão no detalhe
  do honorário). A contagem exata de colunas de dinheiro da F-1b.2 passou a 1
  nessa lista, com o motivo no teste.
- **Pares de contraste** "ações fixas: …" (o ⋮ e as notas da célula, em
  `--color-text-secondary`, sobre os quatro fundos). A **borda** do gatilho
  (`--color-border`, 1,38:1 no escuro) é decorativa e anterior à fase: quem
  identifica o botão é o glyph, que passa.

## DEC-108 (frontend) — o cartão de não liberados abre o processo quando há um só (Fase 3.3)

> O contrato é a DEC-108 do back: `processosNaoLiberados` conta **processos**
> distintos, e `processoNaoLiberadoId` vem quando a contagem é 1.

`destinoDosNaoLiberados` (`pages/dashboard/inicio.js`): com **um** processo, o
link do cartão é "Abrir o processo" e vai à ficha (onde mora o interruptor),
como o cartão de confirmações (DEC-104); com **mais de um**, ou nenhum, "Ver a
lista de processos" — a lista comum, sem filtro (o filtro por liberação é da
3.4). Back antigo sem o id cai na lista: a tela não inventa destino.

---

## DEC-109 (frontend) — um aviso de idade por tela (Fase 3.3b)

Sem sinal, o detalhe do processo mostrava **dois** avisos iguais, um embaixo do
outro: o da faixa de contexto (DEC-085) e o da tela. Os dois falam do MESMO
processo, lido pela mesma chave do espelho.

- **`usePublicarContexto({ processoId, avisoProprio: true })`**: a tela diz à
  faixa que mostra o próprio `OfflineNotice`. A faixa consulta
  `useAvisoProprioPublicado(pathname)` (casado com o caminho, como os ids) e
  só mostra o dela quando `faixaMostraAviso({ fromCache, avisoProprio })`.
  Funções puras em `components/layout/contexto.js`; `idsPublicadosPara` não
  mudou de forma.
- **Usam a opção:** o detalhe do processo, o detalhe do cliente (mesmo caso: o
  mesmo cliente nos dois) e as quatro listas filtradas, por
  `useProcessoFiltrado({ avisoProprio: true })`. As listas de honorários,
  parcelas e pagamentos ganharam o aviso do processo do filtro para o caso em
  que só ELE veio do espelho (`!fromCache && filtroProcesso.fromCache`).
- **A varredura de `tests/offline/estatica.test.js` não isentou nada:** aceita
  na faixa só a forma dispensável, e cobra de QUEM dispensa — quem publica
  `avisoProprio: true` precisa ler o mesmo registro (`resource` e
  `params: { id }`) e renderizar o aviso; as listas, cobrir o processo do
  filtro. Mutação conferida: tirar o aviso do detalhe derruba a varredura.
- Três travas antigas foram **reescritas, não apagadas** (`fase2b.test.js`:
  o aviso da faixa e as chamadas do detalhe, do cliente e do hook;
  `fase0.test.js`: o hook com a opção).

## DEC-110 (frontend) — o seletor de participante busca no servidor (Fase 3.3b)

> O alcance da busca é a DEC-110 do back: nome sem acento, razão social, nome
> fantasia e CPF/CNPJ com ou sem máscara.

- O `<select>` de `ProcessFormPage` carregava `getAllClients({ limit: 100 })`:
  o 101º cliente não aparecia. Virou o **`SeletorComBusca`** (DEC-101), com
  `clientService.buscarClientes` (até 20, `semToastGlobal`) e
  `filtrar={aindaNaoParticipa}` — quem já é participante não é sugerido.
- **Rótulo "{nome} — {CPF/CNPJ formatado}"** (`utils/clienteLabel.js`,
  `rotuloDoClienteNoSeletor`); sem documento, só o nome.
- **O nome de cada participante** vinha da lista dos 100. Agora mora em
  `clientesConhecidos` (o item escolhido, ou o participante populado na
  edição), **fora** de `participantes` — o payload da criação continua
  `{ clienteId, papel, principal }`.
- O seletor nasce de novo a cada inclusão (`key`), vazio para a próxima.

## DEC-111 (frontend) — o detalhe do processo em balões (Fase 3.3b)

O desenho de `ProcessosDetalhes.jsx` da Raniele, com o NOSSO conteúdo
(inventário 3.15). **Nada do financeiro em modal** (DEC-049, DEC-087).

- **Cabeçalho de identidade** (balão): bolinha na cor do TOM do status (a do
  `StatusBadge`, por classe `processo-cabecalho__bolinha--{tom}`, decorativa),
  título, "status · fase", número com botão de copiar (área de transferência;
  falhando, o número é `user-select: all`), selo de liminar. **O cliente saiu**
  — a faixa já o mostra (DEC-085). À direita, o ⋮ com **Editar**, **Mudar
  fase** (leva o foco ao seletor; não bloqueia sem sinal, porque a fase vai
  para a fila) e **Desativar** (o preview da DEC-052 antes, e depois a lista).
- **`ProcessTabs` em pílulas** dentro do balão do cabeçalho: "Visão geral"
  (`aria-current`) e os links das listas filtradas. A 360 px rolam numa linha.
- **Balões com título, nesta ordem:** dados do processo, participantes, fase e
  linha do tempo, confirmações do portal, ficha financeira. A ficha passou para
  depois das confirmações e a linha do tempo entrou no balão da fase (continua
  irmã da ficha, DEC-056). Não há balão de documentos: a página nunca teve essa
  seção, e os documentos são a aba "Documentos".
- **Participantes** numa lista no padrão da 3.2: nome (link para o cliente),
  documento, papel, selo "Principal" (palavra com contorno), a **situação no
  portal** ("Sem acesso", "Liberado", "Não liberado" — `statusVisual.js`,
  `situacaoNoPortal`) com o estado de leitura ao lado, o interruptor (DEC-097)
  só para quem tem acesso, e o ⋮ ("Abrir o cadastro", "Entregar acesso"). A
  linha inteira abre o cadastro (`useLinhaClicavel`) e **não recebe foco**: os
  alvos de Tab são o nome, o interruptor e o ⋮. A entrega abre por baixo, fora
  da área clicável.
- **"Não sei" não é "sem acesso":** a lista com o portal não tem espelho; sem
  ela a situação diz "Situação no portal indisponível sem conexão" e o
  interruptor não aparece.
- **O interruptor sem sinal** continua `aria-disabled`, e agora diz o motivo ao
  lado ("Sem conexão: liberar e desligar precisam de sinal."), ligado por
  `aria-describedby`.
- **Achado de contraste, corrigido:** o trilho ligado (`--color-success-solid`)
  mede 2,72:1 sobre a linha em hover no escuro. O contorno dele passou a
  `--color-success-text`, e é ele que se mede.
- **Achado no navegador, corrigido:** a fase enfileirada sem sinal não mostrava
  o "Há alteração não enviada" — o interceptor grava na fila sem avisar o
  `OutboxContext`. O detalhe relê a fila no ramo `enfileirado`.
- Folha própria, `pages/processes/ProcessDetailPage.css`, **sem `transform` nem
  `filter`** (os dois ⋮ abrem em portal, DEC-046) — há teste.

## DEC-112 (frontend) — as confirmações são vistas depois de aparecer (Fase 3.3b)

Conferência do passo 97. A lista já era sob demanda (botão "Ver
confirmações"), e abrir a ficha nunca marcou nada. Mas a marcação ia no mesmo
`async` da busca, logo depois do `setConfirmacoes` — antes de o React pintar.
Passou a um **efeito** que roda depois do render que pôs a lista na tela, uma
vez por abertura e só se há o que marcar (`deveMarcarComoVistas`, em
`components/processes/detalheProcesso.js`). Medido no navegador: o PATCH sai
~10 ms depois de a lista estar no DOM, e abrir a ficha não muda o banco. O
comentário de `destinoDasConfirmacoes` (`inicio.js`), que dizia "abrir a ficha
marca", foi corrigido. Testes em `tests/regressions/fase33b.test.js`.

---

## DEC-113 (frontend) — a fila avisa quando muda, para qualquer tela (Fase 3.4)

O interceptor grava na fila (`outbox.enfileirar`) sem passar pelo
`OutboxContext`, e o contexto só relia as entradas no próximo gesto dele: a
tela que acabou de enfileirar dizia "ficou na fila" e não mostrava o "Há
alteração não enviada" (achado da 3.3b, corrigido lá só no detalhe).

- `offline/outboxEvents.js` (novo, sem imports): `aoMudarFila(fn)` /
  `avisarFilaMudou(userId)`. `enfileirar` avisa **depois de gravar**; o
  `OutboxContext` assina e relê a fila do usuário logado. O axios não conhece
  o React. O reler local do detalhe (`8aa2ab0`) saiu.
- Conferido no navegador: o detalhe mostra o aviso em ~60 ms; o formulário
  de compromisso volta à Agenda, que mostra a pendência na hora.
- O CORS local que barrava a fila é a DEC-113 do back.

## DEC-114 (frontend) — o formulário de processo nasce ativo (Fase 3.4)

- **Criação:** sem o seletor de status, sem trânsito em julgado e sem motivo
  do encerramento; a fase continua escolhível (DEC-054). O payload sai de
  `utils/processoPayload.js` (`montarPayloadProcesso`, executado pela suíte):
  na criação **não leva `status`**, e o back usa o `default`.
- **Edição:** como antes — status (rótulo de `statusVisual.js`, não mais
  `charAt(0).toUpperCase()`), seção "Encerramento", fase só leitura com o link
  para o detalhe.
- **Seções** no padrão dos formulários da 3.2 (`form-grid section` de
  `ClientPage.css`): Clientes do processo, Identificação, Andamento,
  Encerramento (só edição), Descrição e observações.
- **Participantes no visual da lista do detalhe** (DEC-111): nome, documento,
  selo "Principal"; papel, rádio de principal e "Remover" por teclado. As
  classes comuns da linha (`participante-linha__quem/__nome/__principal/__doc`)
  e a bolinha de status por tom moram em `ProcessPage.css`, que as duas telas
  importam.
- **Offline:** criar e editar processo NÃO estão na fila (F-5b: só compromisso
  e mudança de fase). Sem sinal o botão é anunciado como desabilitado, o clique
  é barrado e o motivo aparece — como antes.

## DEC-116 (frontend) — a lista de processos no padrão da Figura 19 (Fase 3.4)

- Balão com `CabecalhoDeLista` (total, busca em pílula, "+"), filtros em
  pílulas (`FinancialFilters` com `semBusca`, `pilulas`, e as props novas
  `presets` e `ajudaDoPeriodo` — sem elas a barra é a de sempre), linha
  clicável (`useLinhaClicavel`), ações fixas (DEC-107), `Paginador` (a tela
  antiga mostrava só os 20 primeiros, sem paginação) e o espelho offline.
  **Sem sanfonas e sem seleção em massa.**
- **Colunas:** Nº, Título (link, o alvo de Tab), Cliente, Tipo de ação, Fase,
  Status (bolinha e palavra, a do cabeçalho do detalhe), Distribuição, Ações.
  Larguras: 220/220/170/170/170/130/130/120 = 1.330 px; a tabela rola no
  balão a 1280 (1.192 úteis) e a 768 (696), com o ⋮ sempre à vista.
- **Filtros, todos na URL** (`useListFilters` com `naUrl`): status (chave
  **`andamento`** — `filtrosNaUrl` escreve `status` como `?situacao=`, que aqui
  é o registro), fase, liminar, tipo de ação (opções de
  `GET /processes/tipos-acao`, com o valor da URL garantido), período por
  distribuição (Qualquer / Mês atual / Personalizado, com a linha de ajuda do
  processo sem data), portal e situação ("" = só ativos, fora da URL).
- **Linha do desativado:** esmaecida, com a etiqueta, sem clique e sem link
  (o detalhe responde 404 a processo inativo); o ⋮ tem "Reativar".
- ⋮ do ativo: **Editar** e **Desativar**. "Gerenciar" saiu — o detalhe é o
  link do título e a linha.
- Regras puras em `pages/processes/listaProcessos.js`.
- **Achado no navegador, corrigido** (`utils/filtrosNaUrl.js`): no modo URL,
  escolher "Intervalo personalizado" estando em "Mês atual" voltava a "Mês
  atual" e as datas não apareciam (valia nas listas da 3.2 também). A escolha
  explícita agora ganha; os outros presets e o "Limpar" a desfazem.

## DEC-117 (frontend) — desativar e reativar o processo num hook só (Fase 3.4)

`hooks/useDesativacaoProcesso.js`: a prévia antes do modal (DEC-052), a
segunda barreira da DEC-053 (impedimento no preview → toast e a tela refeita),
os textos e as props do `<Modal>`. A lista refaz a consulta depois de agir; o
⋮ do detalhe vai para a lista depois de desativar. As travas `dec052` e
`dec053` cobram o hook e os dois usos.

## DEC-118 (frontend) — os destinos dos cartões do Início (Fase 3.4)

- **"Processos não liberados":** um → o processo (DEC-108); mais de um → a
  lista filtrada `?portal=nao_liberado`, que conta o mesmo (DEC-115 do back);
  nenhum → a lista comum.
- **"Confirmações novas":** um processo → `…/detalhe/:id#confirmacoes`; a lista
  curta também. O detalhe rola até o balão depois de o processo carregar (sem
  animação com `prefers-reduced-motion`), põe o foco no título e **o mantém
  alinhado** enquanto os blocos de cima carregam, até 2,5 s ou o primeiro gesto
  dela — medido no navegador, a primeira rolagem deixava o balão a 725 px do
  topo. Chegar ao balão não marca nada (DEC-112).

---

## DEC-119 (frontend) — o consumo dos filtros de cliente (Fase 3.5)

> O contrato é a DEC-119 do back. `clientService.getAllClients` repassa
> `tipoPessoa` e `portal`; `processService.listProcesses`, `clienteId`.

## DEC-120 (frontend) — o avatar do cliente (Fase 3.5)

`components/ui/Avatar.jsx` + `avatar.js`: a inicial (primeira letra, com
acento, maiúscula; "?" sem letra) num círculo, **decorativo** (`aria-hidden`:
o nome está escrito ao lado), `pequeno` (32 px, lista) e `grande` (64 px,
cabeçalho do detalhe). A cor é **determinística pelo `_id`** (hash com peso de
posição, 1 a 8), não pelo nome.

As 12 cores da Raniele falhavam com a inicial branca (até 1,9:1). No lugar,
**oito fundos fixos**, `--color-avatar-1..8` com `--color-on-avatar-1..8`, só
no `:root` (iguais nos dois modos, como a marca) e com par em
`contrastePares.js`:

| # | fundo | inicial | contraste |
|---|---|---|---|
| 1 | `#174034` | `#FFFFFF` | 11,54:1 |
| 2 | `#1F5C7A` | `#FFFFFF` | 7,32:1 |
| 3 | `#6B3F8F` | `#FFFFFF` | 7,68:1 |
| 4 | `#8A3B2E` | `#FFFFFF` | 7,65:1 |
| 5 | `#4E5D23` | `#FFFFFF` | 7,21:1 |
| 6 | `#8CC7AC` | `#01261F` | 8,38:1 |
| 7 | `#E3B873` | `#01261F` | 8,76:1 |
| 8 | `#EDE3CF` | `#01261F` | 12,70:1 |

O contorno de 1 px (`--color-border`) desenha o círculo do bege no claro.

## DEC-121 (frontend) — a lista de clientes no padrão da Figura 19 (Fase 3.5)

- O molde da 3.4: `CabecalhoDeLista`, `FinancialFilters` com `semBusca`,
  `pilulas` e a prop nova **`semPeriodo`** (sem ela a barra é a de sempre),
  `useListFilters` com `naUrl`, linha clicável, ações fixas, paginador,
  espelho offline. **Sem seleção em massa.**
- **Colunas:** nome (com o avatar), tipo, CPF/CNPJ formatado, e-mail, telefone
  formatado, ações. O endereço foi para o detalhe. A 1280 px a tabela cabe
  (1.192 de 1.192); a 768 e a 360 rola dentro do balão, com o ⋮ fixo.
- **Filtros na URL**, regras em `pages/clients/listaClientes.js`: `tipoPessoa`
  (`PF`/`PJ`), `portal` (com acesso, sem acesso, com processo não liberado),
  `situacao` ("" = só ativos) e `ordem` ("" = A–Z, DEC-062; a ordem não entra
  em "Filtros aplicados").
- **`situacao` aqui é a própria chave**: a lista não tem `status`, que
  `filtrosNaUrl` escreveria como `?situacao=`. Há teste.
- **Desativado:** esmaecido, com a etiqueta, sem link e sem linha clicável (o
  back responde 404 ao detalhe de inativo); o ⋮ tem "Reativar".
- ⋮ do ativo: **Editar** e **Desativar**. "Ver" saiu do menu: virou o link do
  nome e a linha (como o "Gerenciar" na 3.4).

## DEC-122 (frontend) — desativar e reativar o cliente num hook (Fase 3.5)

`hooks/useDesativacaoCliente.js`, usado pela lista e pelo ⋮ do detalhe. É um
**irmão** de `useDesativacaoProcesso`, e não uma generalização: as duas
desativações fazem perguntas diferentes (o processo tem prévia de cascata e
impedimento ao REATIVAR; o cliente não cascateia e tem impedimento ao
DESATIVAR). Um hook só teria um `if (tipo)` em cada passo.

- **A prévia do cliente** lê `GET /processes?clienteId=&situacao=todos` no
  instante do clique (a contagem do 409). Havendo processo, o modal não abre:
  toast com a frase de `motivoDeNaoDesativarCliente` (nomeia os processos, o
  papel quando não é o principal, e "desvincule-o… não é preciso desativar o
  processo") e a tela refeita. O 409 continua a autoridade.
- Reativar abre direto, com a frase de que os processos NÃO voltam.
- As travas `dec052` e `dec053` cobram o hook e os dois usos.

## DEC-123 (frontend) — o detalhe do cliente com abas (Fase 3.5)

- **Cabeçalho de identidade** (o balão do processo, DEC-111): avatar grande,
  nome, "Pessoa física/jurídica", documento formatado com o botão de copiar do
  número do processo, selo "Desativado", ⋮ (Editar, Desativar/Reativar).
- **Abas em pílulas** (`ClientTabs`, a folha de `ProcessTabs`), **na URL**
  (`?aba=detalhes|processos|portal`, "Detalhes" sem parâmetro); cada troca é
  uma entrada do histórico. **A aba "Pagamentos" da Figura 21 não entra:** o
  financeiro é por processo, e a ficha do processo já o mostra.
- **Detalhes:** balões por grupo (`gruposDeDados`): Identificação, Contato,
  Endereço, Dados profissionais (PF), Representante legal (PJ), Observações;
  grade de 3 colunas (2 a 768, 1 no celular). Só leitura.
- **Processos:** `GET /processes?clienteId=`, tabela compacta (Nº, título,
  papel com o selo "Principal", fase, status), linha para o processo e o link
  "Ver na lista de processos".
- **Portal:** `AcessoPortalResumo` (agora recebe o `acesso`), a lista dos
  processos no visual dos participantes do detalhe do processo, cada um com o
  `LiberacaoPortal` e o último acesso, a entrega (`AccessDelivery`) no ⋮ da
  linha e a revogação (`RevogacaoPortal`, extraída do formulário, uma só).
  Sem senha: "Sem acesso ao portal" com o link para definir.
- **As abas Processos e Portal não têm espelho**: o detalhe já serve o
  cliente do espelho com o aviso dele (DEC-109), e um segundo espelho daria um
  segundo aviso; o portal é metade de credencial. Sem sinal, "indisponível sem
  conexão" — nunca "nenhum processo" ou "sem acesso".

## DEC-124 (frontend) — `?clienteId=` na lista de processos (Fase 3.5)

`hooks/useClienteFiltrado.js` (o irmão de `useProcessoFiltrado`): lê o
cliente pela chave do detalhe (`resource: 'client'`), publica `{ clienteId,
avisoProprio }` para a faixa, e o `ProcessFilterChip` ganhou `alvo`
("Filtro: só este cliente ×"; o padrão continua "processo"). O "Limpar
filtros" tira o `clienteId` junto (`extrasNaLimpeza`). `paiDaRota` leva a
lista filtrada de volta a `…/clientes/detalhe/:id?aba=processos`. Quando só o
cliente veio do espelho, a lista mostra o aviso com a hora dele.

## DEC-125 (frontend) — o formulário de cliente em seções (Fase 3.5)

Identificação (com o tipo de pessoa), Contato, Endereço, Dados profissionais
(PF), Representante legal (PJ), Acesso ao portal e Observações, no padrão do
formulário de processo da 3.4. O payload saiu para `utils/clientePayload.js`
(`montarPayloadCliente`), **sem mudar regra**, e a suíte cria PF e PJ e troca o
tipo sem perder nada. Mantidos: DEC-057, troca PF↔PJ guardada, CEP, senha
provisória, revogação (agora o componente), erro por campo. Criar e editar
cliente continuam **fora da fila** (F-5b): sem sinal, o Salvar é anunciado
como desabilitado, o clique é barrado e o motivo aparece.

## DEC-126 (frontend) — o exemplo do timbrado vem do servidor (Fase 3.6)

A rota é do back (`GET /auth/me/timbrado-exemplo`, DEC-126 no `CLAUDE.md` do
backend): um PDF de uma página montado pelo **mesmo** `renderizarPdf` dos
documentos, com os dados **salvos**. A tela **não desenha timbrado em HTML** —
há teste. Uma prévia desenhada aqui seria a segunda regra para o mesmo papel.

## DEC-127 (frontend) — o perfil em "Dados da conta" × "Dados do escritório" (Fase 3.6)

Apontamento 8 da banca. `pages/profile/ProfilePage.jsx`:

- **Cabeçalho de identidade em balão** (as classes do processo e do cliente,
  DEC-111/123): `Avatar` grande, **cor 1 fixa** (o verde da marca — prop nova
  `cor`; sem ela o cliente continua pela cor do id), nome, "OAB {UF} {número}"
  e o e-mail com a situação. Mostra o que está **salvo**.
- **Seções, nesta ordem:** Dados da conta (nome, CPF, e-mail, OAB); Dados do
  escritório — aparecem nos documentos (nome do escritório, telefone, PIX,
  Instagram, site, logo e o exemplo do timbrado); Endereço do escritório;
  Segurança (a troca de senha, como antes).
- **Todo rótulo com `htmlFor`/`id`**, e cada ajuda por `aria-describedby`. As
  ajudas dizem **onde o dado aparece — ou que não aparece**: Instagram e site
  hoje não saem em timbrado nem recibo, e a chave PIX entra só pelo texto dos
  documentos que usam `{{chavePix}}`. Prometer o timbrado onde ele não está
  seria o tipo de frase que a advogada confere e perde a confiança.
- **E-mail só leitura** (`readOnly`, não `disabled`: focável, o rótulo o
  alcança) com "Confirmado em dd/mm/aaaa" (dia do fuso de Brasília) ou "Não
  confirmado" e, nesse caso, "Reenviar confirmação" pelo `useConfirmacaoEmail`
  (DEC-088), num toast só (o reenvio continua `semToastGlobal`). A troca de
  e-mail continua fora.
- **`situacaoDoEmail`** mora em `components/layout/confirmacaoEmail.js`, o
  único leitor de `emailConfirmadoEm` (A-2). A trava da A-2 passou a listar o
  perfil entre os que perguntam — é mais um lugar do aviso, não um portão.
- Cidade e país continuam texto livre; CPF continua editável ("Identifica a
  sua conta"); o perfil continua **fora da fila e sem espelho** (o usuário vem
  do `AuthContext`).

## DEC-128 (frontend) — salvar só o que mudou (Fase 3.6)

`utils/perfilPayload.js` (`formularioDoPerfil`, `montarPayloadPerfil`,
`semAlteracoes`), no padrão do `clientePayload.js`, **sem mudar a regra** que a
tela já tinha (a do `Perfil.jsx:129-164` da Raniele): só os campos diferentes
da fotografia `inicial`; `null` para o apagado; comparação sem máscara (CPF,
telefone, CEP, OAB) e sem espaço nas pontas. O back aceita o parcial e mescla
campo a campo — travado em `tests/auth/perfilParcial.test.js` do backend.

- **Salvar desabilitado sem alteração**, com "Nenhuma alteração" ao lado; o
  Enter num campo também não envia.
- **Depois de salvar, o `inicial` é o salvo.** O formulário só se
  ressincroniza quando muda a **conta** (`user.id`): um `checkAuth()` — o "já
  confirmado" do reenvio — troca o objeto `user` e apagaria a edição não salva.

## DEC-129 (frontend) — "Ver exemplo do timbrado" (Fase 3.6)

Na seção do escritório. Baixa o PDF da DEC-126 como o recibo (blob +
`nomeDoAnexo` + revoke no `finally`). Com alteração não salva o botão continua
ativo e uma região viva **sempre montada** diz "Salve para ver as mudanças no
exemplo." Sem sinal: `aria-disabled`, clique barrado e o motivo dos downloads
(`MENSAGEM_DOWNLOAD_OFFLINE`), ligado ao botão por `aria-describedby`.

**Achado de passagem, corrigido:** o `<input type=file>` escondido do logo
tinha a largura de um campo inteiro (`.form-group input` vencia o `width: 1px`)
e fazia a página do perfil rolar 156 px de lado em todas as larguras.

## DEC-130 (frontend) — a Visão geral do Financeiro é um painel (Fase 3.7)

`pages/financeiro/FinanceiroPage.jsx` deixou de embutir as três listas (elas
têm página própria, no padrão da 3.2, a um clique no submenu; embutidas eram
uma segunda cópia de cada uma). Quatro balões, nesta ordem:

1. **Resumo** — os cartões do Início (DEC-131), do MESMO `GET /financeiro/resumo`
   sem mês: Valor Contratado, Recebido e Em Aberto (total), Total vencido hoje
   e Saldo adiantado, com a nota. O mês fica no Início.
2. **Parcelas vencidas** — de `GET /calendar/avisos` (a fonte única, DEC-057;
   o back ganhou `clientePrincipalNome` e `emAberto`, DEC-130 do back), até 8,
   na linha das Datas próximas com a pílula "Vencida" (vermelho de badge). A
   linha leva à parcela; **"Ver todas"** leva a
   `/dashboard/parcelas?situacao=vencido` (o filtro de status da DEC-103).
3. **Próximos vencimentos** — `proximosVencimentos` pela `datasProximas` do
   Início, só vencimentos, até 8, com "processo · cliente".
4. **Atalhos** — Honorários, Parcelas e Pagamentos com o total da consulta-
   padrão de cada lista (`limit: 1`: é o "(N)" do título dela) e os três "+".

Regras em `pages/financeiro/visaoGeral.js`. Sem donut (somava bases
diferentes, inventário 3.24), sem busca, filtro nem paginação. O prop
`embedded` saiu das três listas e do `useListFilters`
(`FILTROS_DAS_FINANCEIRAS`, sempre na URL).

**Offline:** só o resumo tem espelho — um aviso de idade (DEC-109). Vencidas e
totais dizem "indisponível sem conexão", nunca "nenhuma". Os "+" ficam
`aria-disabled`, com o motivo (financeiro fora da fila, DEC-059). **Erros:** a
tela não emite toast; com o servidor fora (ou 500), o global sai uma vez.

## DEC-131 (frontend) — o cartão e a linha do Início, compartilhados (Fase 3.7)

- `components/dashboard/CartaoDeResumo.jsx` e `LinhaDeData.jsx`, com as regras
  de CSS movidas de `DashboardPage.css` **sem mudar um valor** (as travas
  da 3.1 e do passo 181 seguem as regras até as folhas novas).
- `components/dashboard/resumoFinanceiro.js`: rótulos, campos e notas que o
  Início e a Visão geral leem em comum (`CAMPOS_EM_COMUM`). Há teste exigindo
  que as duas telas usem as definições, e conferência no navegador: os quatro
  valores e as notas iguais nos dois painéis, no mesmo banco.
- **A nota do saldo adiantado mudou de texto.** Dizia que o crédito "já está
  abatido do total em aberto" — verdade na F-1a, falso desde a DEC-040 (o
  crédito sai nomeado e não entra em conta nenhuma). Agora: "É crédito do
  cliente: não entra no 'Recebido' nem abate o 'Em aberto'." Conferido no
  navegador: com R$ 450,50 de crédito, recebido e em aberto não mudaram.

## DEC-132 (frontend) — "Situação do registro" em Parcelas (Fase 3.7)

O checkbox "Mostrar desativadas" virou a pílula de Clientes e Processos, na
URL e alcançada pelo "Limpar filtros". Regras em
`pages/installments/listaParcelas.js`.

- **A chave é `?registro=inativos`, e não `?situacao=`**: nas listas
  financeiras `?situacao=` já é o STATUS da parcela (DEC-103), e o "Ver todas"
  das vencidas depende disso. Decisão do Daniel.
- **Duas opções — "Somente ativas" (padrão, sem parâmetro) e "Somente
  desativadas".** O "Ativas e desativadas" fica de fora em Parcelas por causa
  da decisão da Fase 4.5: o back só tem o modo exclusivo `?inativos=true`
  (misturar os conjuntos faria a tabela somar o removido sem dizer). O back
  não mudou. Valor torto na URL abre as ativas.
- `.filter-toggle`, sem uso, saiu de `styles/modules.css`.

## DEC-133 (frontend) — listas em telas estreitas: primeira coluna fixa e prioridade (Fase 3.7)

**Tabela que rola, não cartões**, em Honorários, Parcelas, Pagamentos,
Processos e Clientes (Documentos e Seções na 3.9).

- **`data-table--primeira-fixa`** (`styles/modules.css`): a coluna que
  identifica a linha, `sticky` à esquerda — irmã da `--acoes-fixas` (DEC-107),
  com os mesmos fundos (página e balão, com e sem hover), `z-index` e sombra.
  Honorários passou a abrir pela **Descrição**.
- **`prio-2`** sai abaixo de **1280 px**; **`prio-3`**, abaixo de **1440 px**;
  sem classe = `prio-1`, nunca sai (identificação, dinheiro, data, status e
  ações). A classe vai na `<col>`, no `<th>` e em cada `<td>` — a coluna some
  inteira, e a tabela continua coerente para o leitor de tela (há teste por
  coluna). A tabela "lista → coluna → prioridade → motivo" e as medidas estão
  no relatório da 3.7.
- **Resultado medido:** a 1280 px Processos, Honorários, Pagamentos e Clientes
  cabem sem rolar; Parcelas (cinco colunas de dinheiro e datas, todas
  `prio-1`) rola em qualquer largura, com a primeira coluna e o ⋮ à vista. A
  768 e a 360 px a primeira coluna e o ⋮ ficam à vista em todas. Nenhum valor
  truncado, nenhuma rolagem da página.
- **No celular** (≤ 480 px) a primeira coluna tem 128 px, e o ⋮ das listas sem
  nota na célula (Honorários, Processos, Clientes: `data-table--acoes-sem-nota`)
  encolhe para 64 px. Os `min-width` antigos da `.data-table` não esticam estas
  listas.
- **Achado de passagem:** `tests/helpers/cssScan.js` apagava os seletores de
  dentro de `@media` e acusava "classe sem regra" para quem só existe ali.
  Corrigido (bloco de declaração some; bloco de seletores devolve os
  seletores).

## DEC-134 (frontend) — uma regra de cores para as naturezas (Fase 3.8)

A Agenda pintava o vencimento de azul listrado e o compromisso de verde; o
Início e a Visão geral (`LinhaDeData`), o vencimento de âmbar e o compromisso
de azul. Decisão do Daniel: **uma regra, nas três telas**.

| Tipo de data | Tom | Tokens |
|---|---|---|
| Vencimento (parcela a vencer) | âmbar | `--color-warning-*` |
| Vencida | vermelho | `--color-danger-*` |
| Compromisso | azul | `--color-info-*` |

- **Fonte única:** `utils/tomDaData.js` (`TOM_DA_DATA`, `classeDoTom`,
  `tipoDaDataDoItem`). A classe `tom-data--warning|danger|info` põe
  `--tom-fundo`, `--tom-texto` e `--tom-forte` (`styles/tomDaData.css`); a
  pílula da `LinhaDeData` e os itens, marcas e legenda da Agenda leem as
  variáveis e **não nomeiam o token**. Há teste exigindo que as duas telas
  importem a mesma fonte e que nenhuma regra de item, pílula ou legenda nomeie
  `--color-warning|info|danger`.
- **Vencida** sai do `status: "vencido"` que o servidor manda (DEC-028); a tela
  não recalcula.
- **A forma não mudou** (DEC-055): o vencimento continua listrado e tracejado,
  agora no âmbar (ou no vermelho, vencida). A legenda tem três entradas —
  Compromisso, Vencimento, Vencida — mais "Concluído ou pago: riscado".
- Conferido no navegador: as três pílulas com a mesma cor e o mesmo fundo no
  Início, na Visão geral e na vista Agenda.

## DEC-135 (frontend) — no celular, só o ⋮ fica fixo; as notas mudam de coluna (Fase 3.8)

O risco 1 da 3.7: a 360 px a janela entre as duas colunas fixas era 112 px
(56 em Parcelas e Pagamentos), menor que uma coluna de dinheiro, e o valor
aparecia coberto pelo ⋮ até ser rolado.

- **≤ 480 px:** a primeira coluna deixa de ser `sticky` (`position: static`,
  sem sombra) e o ⋮ tem **64 px nas cinco listas**
  (`.data-table--acoes-fixas col:last-child`). A janela passou a 240 px.
  `data-table--acoes-sem-nota` saiu.
- **As notas saíram da célula de ações**, com o mesmo texto e a mesma regra:
  "Reparcelada" (parcela `cancelado`) vai para o **Status** — é a explicação do
  "Cancelado" ao lado; "sem recibo" (`liquido <= 0`) vai para o **Líquido** — é
  o número que decide. As duas colunas são `prio-1`. Classe nova
  `.nota-da-celula` (linha própria, itálico, `--color-text-secondary`,
  `nowrap`). A parcela cancelada continua sem menu: a célula mostra "—".
- **Medido** (relatório da 3.8): a 360 px, 128 de 128 células de dinheiro
  ficavam cobertas pelo ⋮ quando roladas até a vista; agora, 0. Acima de
  480 px, 390 comparações (1280, 1024, 768; dois modos; cinco listas, coluna a
  coluna) iguais às do `main`.

## DEC-136 (frontend) — a Agenda na pele da Figura 20 (Fase 3.8)

- **Balão** `--color-surface`, 24 px. Barra: título "Agenda" (h1), "Hoje", as
  setas com rótulo, **mês e ano em `<select>` nativos em pílula** (mudam o
  `?mes=` pelo mesmo `irPara` das setas; o "voltar" desfaz), as vistas
  **Mês/Agenda** em pílulas (`aria-pressed`, `?vista=`) e o "+". O
  `PageHeader` saiu da tela.
- **Fica de fora do desenho dela:** a semana (ela promete cinco vistas e tem
  duas, sem os atalhos), o "mostrar fins de semana" (a grade mostra os sete
  dias) e a busca (seria funcionalidade nova).
- **Grade:** células arredondadas na `--color-surface-raised`; hoje com o
  número no disco verde, o anel e a palavra "hoje" (e "(hoje)" no rótulo do
  número); fora do mês sem opacidade, com o número no tom discreto; itens como
  **pílulas de uma linha** com reticências, `aria-label` e `title` completos
  (`rotuloDoItemNaGrade`: natureza, hora, título, honorário ou tipo,
  situação); concluído e pago **riscados**, sem opacidade; **"Mais N"** abre o
  dia embaixo da grade, como antes.
- **Vista Agenda e dia aberto** pela `LinhaDeData` (DEC-131), agrupada por dia,
  com "Hoje" marcado. A linha ganhou dois opcionais que o Início não usa:
  `item.situacao` (título riscado e a palavra) e `onAbrir` (a frase da DEC-055
  no clique da derivada, antes da navegação do link).
- Regras puras em `pages/calendar/agenda.js`. Mantidos: `?vista=`/`?mes=`, a
  Agenda como padrão abaixo de 768 px, `monthGrid.js`, a fila e o aviso de
  idade único.

## DEC-137 (frontend) — o formulário de compromisso em seções, com o processo por busca (Fase 3.8)

- **Seções** no padrão da 3.4 e da 3.5: "O que é" (tipo, título), "Quando e
  onde" (data, hora, local — o local entrou com o "quando", e o título da
  seção diz isso), "Processo vinculado", "Observações", e a "Conclusão" na
  edição. Campos e payload iguais.
- **O seletor de processo tinha teto:** `listProcesses({ limit: 100 })`. Virou
  o `SeletorComBusca` da DEC-101 (`buscarProcessos`, até 20 sugestões,
  "{número} — {título} — {cliente}"). O contexto continua publicado quando a
  escolha muda (DEC-085). Sem sinal, o processo já escolhido aparece pelo
  `processo` que o `GET /events/:id` projeta, e o compromisso vai para a fila.
- **`SeletorComBusca` ganhou `obrigatorio`** (padrão `true`): o processo do
  compromisso é opcional e deixou de ser anunciado com `aria-required`. Apagar
  o campo deixa o compromisso solto (`null`).
- Continua rota própria (fila, faixa de contexto e "Voltar" dependem dela).

---

## Rotina de encerramento de sessão

Antes de fechar qualquer sessão, peça:

> "Atualize o CLAUDE.md com o que foi feito hoje, os arquivos alterados,
> decisões tomadas, pendências e próximo passo recomendado."
