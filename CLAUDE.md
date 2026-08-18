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
nos dois temas — dourado da marca no escuro (o padrão do app), `#7A6528` no
claro, onde o dourado perde contraste contra o branco.

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

### V-2 — 401 de senha atual incorreta DERRUBA a sessão · **ALTA**

**Sessão de 17/08/2026, passo 12.** Trocar a senha no Perfil informando a senha
atual **errada** leva a usuária para a tela de login, em vez de mostrar o erro
no formulário.

**Por que é alta, e não cosmética:** o sistema **expulsa a advogada por um erro
de digitação**. Ela não descobre que errou a senha — descobre que "caiu", e a
leitura natural é "o sistema me desconectou sozinho". Perde o que estava
fazendo em outra aba, e a única pista do que aconteceu é uma tela de login.

**Causa provável, não confirmada:** o interceptor de `api/axiosConfig.js:19`
reage a **qualquer** 401 que não seja de `/auth/me`, estando fora de `/login`,
com `window.location.href = '/login'` e o toast "Sessão expirada". O backend
responde **401** em `POST /auth/alterar-senha` quando a senha atual não confere
(`"Senha atual incorreta"`) — que é um 401 de *validação de campo*, não de
sessão morta. O interceptor não distingue os dois.

**Não corrigir de passagem.** A correção mexe no interceptor que governa a
sessão inteira do app, e o critério de "quais 401 são sessão expirada" precisa
ser decidido de uma vez — provavelmente por rota isenta, como `/auth/me` já é,
ou por código de erro estável do backend, no padrão que o portal usa desde a
3.1 (`portalErrors.js`). Candidato à **F-2**.

**Confirmaria/descartaria:** logar em `/dashboard/perfil`, submeter troca de
senha com senha atual errada, e observar se a navegação para `/login` parte do
interceptor (toast "Sessão expirada" antes do redirecionamento) ou do
`catch` da própria tela.

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

## Rotina de encerramento de sessão

Antes de fechar qualquer sessão, peça:

> "Atualize o CLAUDE.md com o que foi feito hoje, os arquivos alterados,
> decisões tomadas, pendências e próximo passo recomendado."
