// ═══════════════════════════════════════════════════════════════════════════
// FASE 2.5 — portal por pessoa (DEC-089 a DEC-097)
//
// Varreduras do que a suíte sem DOM consegue provar: as rotas que o portal
// chama, a lista entre o login e o processo, a pele com os tokens fixos da
// marca, e o lado da advogada. Teclado, pixel e o fluxo inteiro ficam na
// verificação no navegador e no roteiro manual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("Fase 2.5 · o portal chama as rotas por processo", () => {
  const servico = semComentarios(ler("src/api/portalService.js"));

  test("a lista e as rotas de dado levam o processoId", () => {
    assert.match(servico, /portalApi\.get\('\/portal\/processos'\)/);
    assert.match(servico, /portalApi\.get\(`\/portal\/processos\/\$\{processoId\}`\)/);
    assert.match(servico, /`\/portal\/processos\/\$\{processoId\}\/documentos`/);
    assert.match(servico, /`\/portal\/processos\/\$\{processoId\}\/confirmacoes`/);
    assert.match(servico, /`\/portal\/processos\/\$\{processoId\}\/documentos\/\$\{id\}\/download`/);
  });

  test("nenhuma rota antiga, sem processo, sobrou", () => {
    assert.doesNotMatch(servico, /'\/portal\/processo'|'\/portal\/documentos'|'\/portal\/confirmacoes'\)/);
    assert.match(servico, /'\/portal\/confirmacoes\/texto'/, "o texto da declaração continua sem processo");
  });
});

describe("Fase 2.5 · Seus processos", () => {
  const lista = semComentarios(ler("src/pages/portal/PortalProcessListPage.jsx"));

  test("com um processo só, vai direto para ele", () => {
    assert.match(lista, /if \(processos\.length === 1\) \{\s*return <Navigate to=\{`\/portal\/processos\/\$\{processos\[0\]\.id\}`\} replace \/>;/);
  });

  test("lista vazia diz o que fazer", () => {
    assert.match(lista, /Nenhum processo liberado para você no momento\. Fale com seu advogado\./);
  });

  test("Olá, {nome}, e cada cartão com título, número, fase e os indicadores", () => {
    assert.match(lista, /Olá, \{cliente\.nome\}/);
    assert.match(lista, /rotuloFase\(p\.fase\)/);
    assert.match(lista, /p\.numeroProcesso/);
    assert.match(lista, /p\.confirmacaoPendente/);
    assert.match(lista, /documentosNovos/);
  });

  test("a rota existe e entra por lazy(), como o resto do portal", () => {
    const rotas = ler("src/routes/AppRoutes.jsx");
    assert.match(rotas, /lazy\(\(\) => import\('\.\.\/pages\/portal\/PortalProcessListPage'\)\)/);
    assert.match(rotas, /<Route path="processos" element=\{<PortalProcessListPage \/>\} \/>/);
    assert.match(rotas, /<Route path="processos\/:processoId" element=\{<PortalProcessPage \/>\} \/>/);
    assert.doesNotMatch(rotas, /path="processo"/, "a rota da sessão por vínculo saiu");
  });

  test("login, troca de senha e o portão levam à lista", () => {
    assert.match(ler("src/pages/portal/PortalLoginPage.jsx"), /'\/portal\/processos'/);
    assert.match(ler("src/pages/portal/PortalPasswordPage.jsx"), /navigate\('\/portal\/processos'/);
    assert.match(ler("src/components/portal/PortalProtectedRoute.jsx"), /<Navigate to="\/portal\/processos" replace \/>/);
  });
});

describe("Fase 2.5 · a tela do processo", () => {
  const pagina = semComentarios(ler("src/pages/portal/PortalProcessPage.jsx"));

  test("o processo vem da URL e vai para documentos e confirmação", () => {
    assert.match(pagina, /const \{ processoId \} = useParams\(\);/);
    assert.match(pagina, /portalService\.obterProcesso\(processoId\)/);
    assert.match(pagina, /<PortalDocumentList processoId=\{processoId\}/);
    assert.match(pagina, /<PortalConfirmation processoId=\{processoId\} \/>/);
  });

  test("mantém a fase e o trânsito em julgado, e ganha o Voltar com mais de um processo", () => {
    assert.match(pagina, /explicacaoFase\(processo\.fase\)/);
    assert.match(pagina, /EXPLICACAO_TRANSITO_EM_JULGADO/);
    assert.match(pagina, /\{totalDeProcessos > 1 && \(\s*<Link to="\/portal\/processos"/);
  });

  test("o recibo diz de qual processo", () => {
    assert.match(semComentarios(ler("src/components/portal/PortalConfirmation.jsx")), /ultima\.processo &&/);
  });
});

describe("Fase 2.5 · a pele da Figura 15", () => {
  const login = semComentarios(ler("src/pages/portal/PortalLoginPage.jsx"));

  test("o login: Voltar para /, rótulos acima, Entrar, e o 'esqueceu' que não é link", () => {
    assert.match(login, /<Link to="\/" className="portal-voltar">/);
    assert.match(login, /<label htmlFor="portal-codigo">Código de acesso<\/label>/);
    assert.match(login, /<label htmlFor="portal-senha">Senha<\/label>/);
    assert.match(login, /'Entrar'/);
    assert.match(login, /<p className="portal-login__esqueceu">Esqueceu a senha\? Fale com seu advogado\.<\/p>/);
    assert.doesNotMatch(login, /<(a|Link)[^>]*>\s*Esqueceu/, "o 'esqueceu' não leva a lugar nenhum");
    assert.match(login, /<LogoLex \/>/, "a logo pequena embaixo");
  });

  test("Portal.css usa os tokens FIXOS da marca, e nenhum token do tema", () => {
    const css = ler("src/components/portal/Portal.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const doTema = [...css.matchAll(/var\((--color-[a-z-]+)\)/g)]
      .map((m) => m[1])
      .filter((t) => !/^--color-(marca-|on-marca-)/.test(t));
    assert.deepEqual([...new Set(doTema)], [], "o portal não muda com o tema: só --color-marca-*");
  });

  test("as regras de formulário do portal são escopadas por .portal", () => {
    const css = ler("src/components/portal/Portal.css").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css, /^\.form-group\b/m, ".form-group solto pegaria os formulários da advogada");
  });
});

describe("Fase 2.5 · o lado da advogada (DEC-097)", () => {
  test("o serviço tem a liberação e o acesso do cliente", () => {
    assert.match(semComentarios(ler("src/api/processService.js")),
      /api\.patch\(`\/processes\/\$\{id\}\/clientes\/\$\{clienteId\}\/liberacao`, \{ liberadoNoPortal \}\)/);
    assert.match(semComentarios(ler("src/api/clientService.js")), /api\.get\(`\/clients\/\$\{id\}\/acesso-portal`\)/);
  });

  test("o interruptor é um switch acessível, e desligar pede confirmação com Escape", () => {
    const c = semComentarios(ler("src/components/processes/LiberacaoPortal.jsx"));
    assert.match(c, /role="switch"/);
    assert.match(c, /aria-checked=\{liberado\}/);
    assert.match(c, /if \(liberado\) setConfirmando\(true\);\s*else gravar\(true\);/, "ligar é direto, desligar confirma");
    assert.match(c, /e\.key === 'Escape'/);
    assert.match(c, /botaoDesligar\.current\?\.focus\(\)/, "o foco vai para Desligar");
    assert.match(c, /controle\.current\?\.focus\(\)/, "e volta ao interruptor");
    assert.match(c, /aria-disabled=\{online && !enviando \? undefined : 'true'\}/, "sem sinal, anunciado desabilitado");
  });

  test("o detalhe do processo mostra o interruptor só para quem tem portal", () => {
    const pagina = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
    assert.match(pagina, /\{noPortal\?\.temAcessoPortal && \(\s*<LiberacaoPortal/);
  });

  test("a entrega mostra o código PESSOAL, diz se o processo está liberado e oferece liberar", () => {
    const c = semComentarios(ler("src/components/processes/AccessDelivery.jsx"));
    assert.match(c, /Código de acesso pessoal de \{nomeCliente\}/);
    assert.match(c, /ainda não está liberado/);
    assert.match(c, /Liberar este processo/);
    assert.match(c, /processService\.setLiberacaoNoPortal\(processoId, clienteId, true\)/);
    assert.match(c, /ainda não tem acesso ao portal/, "sem senha, diz o caminho");
  });

  test("o detalhe do cliente tem o bloco Acesso ao portal, sem a senha", () => {
    const pagina = semComentarios(ler("src/pages/clients/ClientDetailPage.jsx"));
    assert.match(pagina, /<AcessoPortalResumo clienteId=\{id\} \/>/);
    const bloco = semComentarios(ler("src/components/clients/AcessoPortalResumo.jsx"));
    assert.match(bloco, /acesso\.codigoAcessoPessoal/);
    assert.match(bloco, /acesso\.processosLiberados\} de \{acesso\.processosAtivos\}/);
    assert.doesNotMatch(bloco, /senhaPortalHash/);
  });
});
