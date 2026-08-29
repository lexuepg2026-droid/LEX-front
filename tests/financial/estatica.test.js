// ═══════════════════════════════════════════════════════════════════════════
// Fase 4.2 — varreduras estáticas do módulo financeiro
//
// ── O que estas varreduras provam, e o que NÃO provam ──────────────────────
// São análise de arquivo, sem navegador. Não pintam pixel e não clicam em nada.
//
// O que provam é a REGRESSÃO ESPECÍFICA de cada item: o `PUT` voltando por
// cima do `PATCH` num merge, o `valorPago` reentrando num payload de parcela, a
// tela voltando a abrir `err.response` por conta própria, o componente parando
// de chamar as funções que `honorario.test.js` testa. É essa volta que um
// refactor distraído causa, e é ela que ficaria sem guarda.
//
// A conta em si é testada de verdade em `honorario.test.js` — as duas juntas
// cobrem a cadeia: a regra está certa, e é ela que a tela usa.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

// Varredura de CÓDIGO, não de prosa. Sem isto, um comentário explicando "não se
// lê `err.response` direto" derrubaria a própria varredura que o explica — e a
// saída óbvia seria apagar o comentário, que é o contrário do que se quer.
const semComentarios = (codigo) =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

// Todos os .js/.jsx de src/, para as varreduras que valem no repositório todo.
const arquivosFonte = (dir = resolve(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosFonte(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

const TELAS_FINANCEIRAS = [
  "src/pages/fees/FeeFormPage.jsx",
  "src/pages/fees/FeeListPage.jsx",
  "src/pages/installments/InstallmentFormPage.jsx",
  "src/pages/installments/InstallmentListPage.jsx",
  "src/pages/payments/PaymentFormPage.jsx",
  "src/pages/payments/PaymentListPage.jsx",
  "src/components/financeiro/ProcessFinancialSheet.jsx"
];

const SERVICES_FINANCEIROS = [
  "src/api/feeService.js",
  "src/api/installmentService.js",
  "src/api/paymentService.js"
];

// ═════════════════════════════════════════════════════════════════════════
// Parte 5 — migração PUT → PATCH
// ═════════════════════════════════════════════════════════════════════════

describe("as três rotas financeiras usam PATCH, e PUT não voltou", () => {
  for (const arquivo of SERVICES_FINANCEIROS) {
    test(`${arquivo.split("/").pop()} atualiza por PATCH`, () => {
      const codigo = ler(arquivo);
      assert.match(codigo, /api\.patch\(/, "o update deixou de usar PATCH");
    });
  }

  test("nenhum `api.put` sobrou nas rotas financeiras — varredura do src inteiro", () => {
    // `PUT` continua vivo no backend como alias depreciado, e é exatamente por
    // isso que a regressão passaria despercebida: voltar a usá-lo não quebra
    // nada, só ressuscita o alias que deveria morrer.
    const ofensores = [];

    for (const caminho of arquivosFonte()) {
      const codigo = readFileSync(caminho, "utf8");
      for (const [, rota] of codigo.matchAll(/api\.put\(\s*[`'"]([^`'"]*)/g)) {
        if (/^\/(fees|installments|payments)\b/.test(rota)) {
          ofensores.push(`${caminho.replace(RAIZ, "")} → ${rota}`);
        }
      }
    }

    assert.deepEqual(ofensores, [], `PUT financeiro encontrado:\n${ofensores.join("\n")}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// `valorPago` nunca entra em payload de escrita de parcela
// ═════════════════════════════════════════════════════════════════════════

describe("`valorPago` é somente leitura", () => {
  test("`valorPago` só aparece como chave no estado SOMENTE LEITURA", () => {
    const codigo = semComentarios(ler("src/pages/installments/InstallmentFormPage.jsx"));

    // Ler para exibir é legítimo (`situacao.valorPago`, `inst.valorPago`). O que
    // não pode é `valorPago` virar CHAVE de um objeto que vai para a API — que
    // é a forma de um payload.
    const linhas = codigo
      .split("\n")
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /^\s*valorPago\s*:/.test(l));

    assert.equal(linhas.length, 1, `esperava uma única chave \`valorPago\`, achei ${linhas.length}`);
    assert.match(
      linhas[0][1],
      /valorPago:\s*Number\(inst\.valorPago/,
      "a única chave `valorPago` deixou de ser a do estado de exibição"
    );
  });

  test("o objeto `payload` da parcela não contém `valorPago`", () => {
    const codigo = semComentarios(ler("src/pages/installments/InstallmentFormPage.jsx"));
    const payload = codigo.match(/const payload = \{[\s\S]*?\n\s*\};/)?.[0];

    assert.ok(payload, "não achei a montagem do payload — o formulário mudou de forma");
    assert.ok(!/valorPago/.test(payload), `\`valorPago\` entrou no payload:\n${payload}`);
  });

  test("o payload da parcela é explícito, campo a campo — sem spread de formData", () => {
    // É o spread que faria `valorPago` entrar sozinho no dia em que alguém o
    // acrescentasse ao estado do formulário.
    const codigo = ler("src/pages/installments/InstallmentFormPage.jsx");
    assert.ok(
      !/payload\s*=\s*\{\s*\.\.\.formData/.test(codigo),
      "o payload voltou a ser spread de formData"
    );
  });

  test("o payload de honorário também não tem `valorPago`", () => {
    const codigo = ler("src/utils/feeCalc.js");
    assert.ok(!/valorPago/.test(codigo), "`valorPago` apareceu na montagem do honorário");
  });

  test("o service de parcela não injeta `valorPago` no corpo", () => {
    assert.ok(!/valorPago/.test(ler("src/api/installmentService.js")));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Nenhuma tela lê `error.response` direto
// ═════════════════════════════════════════════════════════════════════════

describe("o tratamento de erro passa pelos helpers, nunca por err.response", () => {
  // A regra do projeto é sobre o CORPO do erro: `message`, `campo`, `errors`,
  // `dependencia`, `saldoDisponivel`. É isso que os helpers encapsulam, e é aí
  // que ler direto reintroduz o regex sobre texto do servidor que a Fase 1.3
  // quebrou.
  // As duas instâncias de axios ficam FORA das duas varreduras abaixo. Elas são
  // a camada por baixo dos helpers: inspecionar a resposta é literalmente o
  // trabalho de um interceptor, e é lá que mora a decisão de derrubar a sessão
  // no 401. Exigir que usassem `getApiErrorMessage` seria pedir que o andar de
  // baixo chamasse o de cima.
  const INTERCEPTORS = ["src/api/axiosConfig.js", "src/api/portalAxios.js"];

  test("`utils/apiError.js` é o único arquivo que abre o CORPO do erro", () => {
    const ofensores = [];

    for (const caminho of arquivosFonte()) {
      const relativo = caminho.replace(`${RAIZ}/`, "");
      if (relativo === "src/utils/apiError.js") continue; // o helper
      if (INTERCEPTORS.includes(relativo)) continue;

      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      if (/\berr(or)?\??\.?\.?response\??\.data\b/.test(codigo)) ofensores.push(relativo);
    }

    assert.deepEqual(
      ofensores,
      [],
      `estas telas abrem o corpo do erro direto:\n${ofensores.join("\n")}`
    );
  });

  // Ler o STATUS é outra coisa, e é legítimo: roteia a tela por código HTTP
  // (422 pede escolha, 429 é excesso de tentativas) sem interpretar texto
  // nenhum. Não há helper para isso, e inventar um seria embrulhar `err.status`
  // em três linhas.
  //
  // O conjunto é TRAVADO mesmo assim: um arquivo novo que apareça aqui derruba
  // o teste e obriga a decidir de propósito, em vez de o hábito se espalhar.
  test("o roteamento por status HTTP fica restrito às três telas autorizadas", () => {
    const leemStatus = [];

    for (const caminho of arquivosFonte()) {
      const relativo = caminho.replace(`${RAIZ}/`, "");
      // O HELPER é quem abre o erro — a mesma exceção do teste do CORPO, logo
      // acima. A F-5b acrescentou `getApiErrorStatus` ali porque a fila
      // precisa distinguir "não saiu do aparelho" (sem resposta) de "o
      // servidor recusou" (4xx) e "o servidor falhou" (5xx). Pô-lo em
      // `utils/apiError.js` é o que impede as telas de voltarem a ler
      // `err.response` por conta própria para chegar ao mesmo lugar.
      if (relativo === "src/utils/apiError.js") continue;
      if (INTERCEPTORS.includes(relativo)) continue;

      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      if (/\berr(or)?\??\.response\??\.status\b/.test(codigo)) leemStatus.push(relativo);
    }

    assert.deepEqual(leemStatus.sort(), [
      // 409 de sobrescrita e 422 de pendências, na geração de documento (3.2).
      "src/components/documents/GenerationPanel.jsx",
      // 409 de sobrescrita, agora também na tela do próprio documento (4.4).
      //
      // Entrou de propósito, e não por hábito: a Fase 4.4 pôs "Regerar a partir
      // das seções" aqui, e regerar documento editado à mão responde 409. É o
      // MESMO contrato da 2C que o GenerationPanel já trata — o status é o que
      // distingue "precisa confirmar" de "deu errado", e o corpo continua sendo
      // lido só por `getApiErrorDetails`.
      "src/pages/documents/DocumentFinalTextPage.jsx",
      // 429 do rate limit do portal, que precisa de mensagem visivelmente
      // diferente da de credencial inválida (3.2).
      "src/pages/portal/PortalLoginPage.jsx"
    ]);
  });

  for (const arquivo of TELAS_FINANCEIRAS) {
    test(`${arquivo.split("/").pop()} usa os helpers de erro`, () => {
      const codigo = ler(arquivo);
      // Nas telas financeiras a régua é mais apertada: nem corpo, nem status.
      // Nenhuma delas roteia por código HTTP — o que precisam saber vem das
      // chaves estruturadas.
      assert.ok(
        !/\berr(or)?\??\.response\b/.test(semComentarios(codigo)),
        "a tela voltou a ler err.response direto"
      );
      assert.match(
        codigo,
        /getFinancialErrorMessage|getApiErrorMessage|getApiErrorField/,
        "a tela não usa helper de erro nenhum"
      );
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// O formulário de honorário continua usando a regra testada
// ═════════════════════════════════════════════════════════════════════════

describe("FeeFormPage delega a regra a utils/feeCalc.js", () => {
  const codigo = ler("src/pages/fees/FeeFormPage.jsx");

  test("importa as quatro funções e não reimplementa nenhuma", () => {
    for (const fn of [
      "camposDoTipo",
      "derivarValorHonorario",
      "validarHonorario",
      "montarPayloadHonorario"
    ]) {
      assert.match(codigo, new RegExp(`\\b${fn}\\b`), `${fn} deixou de ser usada pela tela`);
    }

    assert.match(
      codigo,
      /from\s+['"][^'"]*feeCalc['"]/,
      "a tela deixou de importar utils/feeCalc"
    );
  });

  test("a conta do valor derivado NÃO foi copiada para dentro do componente", () => {
    // Duas cópias da mesma fórmula divergem na primeira vez que uma delas muda.
    assert.ok(
      !/Math\.round\([^)]*\)\s*\/\s*100/.test(codigo),
      "a derivação foi reimplementada na tela; a fonte é utils/feeCalc.js"
    );
  });

  test("`status` não é mais um <select> — só `cancelado` é escrevível", () => {
    assert.ok(
      !/<select[^>]*name=["']status["']/.test(codigo),
      "o select de status voltou; três dos quatro estados são derivados (DEC-028)"
    );
    assert.match(codigo, /name="cancelado"/, "a ação de cancelar sumiu do formulário");
  });

  test("os rótulos de tipo saem do enum, não são literais repetidos", () => {
    assert.match(codigo, /TIPO_HONORARIO_OPTIONS\.map\(/);
    for (const rotulo of ["Custas processuais"]) {
      assert.ok(
        !codigo.includes(`>${rotulo}<`),
        `"${rotulo}" voltou a ser literal — a fonte é utils/enums.js`
      );
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// A ficha exibe, não recalcula
// ═════════════════════════════════════════════════════════════════════════

describe("ProcessFinancialSheet exibe os totais que vieram", () => {
  const codigo = ler("src/components/financeiro/ProcessFinancialSheet.jsx");

  test("não há `reduce` nem soma dos totais na tela", () => {
    // (o `codigo` já veio sem comentários nas asserções que precisam)
    // Somar aqui seria somar o que foi baixado. No dia em que a ficha ganhar
    // recorte, o total viraria o do recorte, continuaria batendo com as linhas
    // visíveis e estaria errado.
    assert.ok(!/\.reduce\(/.test(codigo), "a ficha começou a somar por conta própria");
  });

  test("lê `totais` do backend nos dois níveis", () => {
    assert.match(codigo, /totais\.contratado/);
    assert.match(codigo, /totais\.pago/);
    assert.match(codigo, /totais\.emAberto/);
    assert.match(codigo, /h\.totais\.contratado/);
  });

  test("`emAberto` da parcela também vem pronto", () => {
    assert.match(codigo, /formatCurrency\(p\.emAberto\)/);
  });

  test("NÃO desembrulha envelope de listagem — a ficha não tem envelope", () => {
    assert.ok(
      !/res\.data\.data\s*\?\?/.test(semComentarios(codigo)),
      "a ficha responde `{ processo, totais, honorarios }`, sem `data`"
    );
  });

  test("honorário cancelado é exibido, e distinto", () => {
    assert.match(codigo, /STATUS_CANCELADO/);
    assert.match(codigo, /ficha-honorario--cancelado/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// O recibo só aparece para pagamento ativo
// ═════════════════════════════════════════════════════════════════════════

describe("recibo", () => {
  test("a listagem esconde o botão quando o pagamento foi integralmente estornado", () => {
    // ── Mudou a CONDIÇÃO, não a regra (F-1a) ─────────────────────────────
    //
    // Era `p.ativo !== false`: o pagamento tinha soft delete, e a rota do
    // recibo respondia 404 para o desativado. Com a DEC-032 o pagamento deixou
    // de ser desativável — desfazer entrada é ESTORNO — e a rota passou a
    // responder 404 quando o valor LÍQUIDO zera.
    //
    // A regra que este teste protege é a mesma desde a 4.2: a tela não oferece
    // um papel que o backend recusa emitir. O que mudou é como se pergunta.
    //
    // ── F-1b.3 ───────────────────────────────────────────────────────────
    // As ações da linha foram para um menu de três pontos (a coluna cortava o
    // terceiro botão), e o líquido, que agora decide DOIS itens do menu,
    // virou uma variável da linha em vez de ser recalculado em cada condição.
    // A asserção passou a medir as duas metades da mesma regra: de onde o
    // líquido sai, e que é ele quem decide se o recibo é oferecido.
    const codigo = ler("src/pages/payments/PaymentListPage.jsx");
    assert.match(
      codigo,
      /const\s+liquido\s*=\s*p\.valorLiquido\s*\?\?\s*p\.valor/,
      "o líquido da linha deixou de sair de `valorLiquido ?? valor`"
    );
    assert.match(
      codigo,
      /liquido\s*>\s*0\s*\n?\s*\?/,
      "o recibo deixou de checar o líquido; a rota responde 404 ali"
    );
    assert.match(
      codigo,
      /liquido\s*<=\s*0\s*&&/,
      "a nota `sem recibo` deixou de aparecer no caso em que o backend recusa " +
      "emitir — e o vazio mudo é o defeito que a F-1b fechou"
    );
  });

  test("a listagem não oferece mais Remover nem Reativar", () => {
    // As duas rotas morreram (DEC-032/DEC-034) e respondem 404. Um botão que
    // só sabe produzir erro é pior que botão nenhum: ele afirma que a ação
    // existe.
    const codigo = ler("src/pages/payments/PaymentListPage.jsx");
    assert.ok(!/reativarPayment/.test(codigo), "a tela ainda chama reativarPayment");
    assert.ok(!/removePayment/.test(codigo), "a tela ainda chama removePayment");

    const servico = ler("src/api/paymentService.js");
    assert.ok(!/const\s+reativarPayment/.test(servico), "o método de reativação continua no serviço");
    assert.ok(!/const\s+removePayment/.test(servico), "o método de remoção continua no serviço");
  });

  test("a listagem de parcelas não oferece mais Reativar", () => {
    const codigo = ler("src/pages/installments/InstallmentListPage.jsx");
    assert.ok(!/reativarInstallment/.test(codigo), "a tela ainda chama reativarInstallment");

    const servico = ler("src/api/installmentService.js");
    assert.ok(
      !/const\s+reativarInstallment/.test(servico),
      "o método de reativação continua no serviço"
    );
  });

  test("o download é por blob, sem abrir a URL crua em nova aba", () => {
    const codigo = ler("src/api/paymentService.js");
    assert.match(codigo, /responseType:\s*'blob'/);
    assert.match(codigo, /URL\.revokeObjectURL/, "sem revoke o blob fica preso na memória da aba");
    assert.ok(!/window\.open/.test(codigo), "a URL crua não se abre: o cookie é httpOnly");
  });
});
