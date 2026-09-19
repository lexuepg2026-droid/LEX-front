// ═══════════════════════════════════════════════════════════════════════════
// A-2 (DEC-064) — CONFIRMAÇÃO DE E-MAIL E RECUPERAÇÃO DE SENHA, NA TELA
//
// Testes de análise do código-fonte, como o resto da suíte do frontend: não há
// ambiente de renderização (zero dependências novas). O que o servidor faz —
// expirar o token, aceitá-lo uma vez, responder igual para conta existente e
// inexistente — está provado em `lex-backend/tests/auth/emailSenha.test.js`.
// Aqui se trava o que só a tela decide:
//
//   1. as três telas que o e-mail abre existem e são PÚBLICAS;
//   2. a recuperação tem UMA mensagem, sem ramo por existência de conta;
//   3. o token sai da barra de endereço, e a confirmação envia UMA vez só
//      (React.StrictMode monta o efeito duas vezes);
//   4. redefinir/confirmar NÃO abre sessão, e o aviso de e-mail não confirmado
//      NÃO bloqueia nada (decisão do Daniel);
//   5. o e-mail do cliente é validado só quando muda, e segue opcional.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");

const rotas = ler("src/routes/AppRoutes.jsx");
const authService = ler("src/api/authService.js");
const login = ler("src/pages/auth/LoginPage.jsx");
const esqueci = ler("src/pages/auth/ForgotPasswordPage.jsx");
const redefinir = ler("src/pages/auth/ResetPasswordPage.jsx");
const confirmar = ler("src/pages/auth/ConfirmEmailPage.jsx");
const aviso = ler("src/components/layout/EmailConfirmationBanner.jsx");
const layout = ler("src/components/layout/AppLayout.jsx");
const clienteForm = ler("src/pages/clients/ClientFormPage.jsx");

const arquivosDeSrc = (dir = join(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosDeSrc(caminho, acc);
    else if (/\.(jsx?|css)$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

describe("A-2 — a API chamada pela tela", () => {
  test("as quatro chamadas são POST nas rotas do backend", () => {
    assert.match(authService, /confirmEmail = \(token\) => api\.post\('\/auth\/confirm-email', \{ token \}\)/);
    assert.match(authService, /resendConfirmation = \(\) => api\.post\('\/auth\/resend-confirmation'\)/);
    assert.match(authService, /forgotPassword = \(email\) => api\.post\('\/auth\/forgot-password', \{ email \}\)/);
    assert.match(authService, /resetPassword = \(token, novaSenha\) =>\s*api\.post\('\/auth\/reset-password', \{ token, novaSenha \}\)/);
  });

  test("todas estão exportadas", () => {
    for (const nome of ["confirmEmail", "resendConfirmation", "forgotPassword", "resetPassword"]) {
      assert.match(authService, new RegExp(`export default \\{[^}]*\\b${nome}\\b`), nome);
    }
  });
});

describe("A-2 — as três telas que o e-mail abre", () => {
  test("estão nas rotas, com os caminhos que o backend põe no link", () => {
    assert.match(rotas, /path="\/esqueci-senha" element=\{<ForgotPasswordPage \/>\}/);
    assert.match(rotas, /path="\/redefinir-senha" element=\{<ResetPasswordPage \/>\}/);
    // O backend monta `${APP_URL}/confirmar-email?token=` e `/redefinir-senha?token=`.
    assert.match(rotas, /path="\/confirmar-email" element=\{<ConfirmEmailPage \/>\}/);
  });

  test("são PÚBLICAS: ficam antes do ProtectedRoute", () => {
    const primeiraProtegida = rotas.indexOf("<ProtectedRoute");
    assert.ok(primeiraProtegida > 0, "não achei o ProtectedRoute");

    for (const caminho of ["/esqueci-senha", "/redefinir-senha", "/confirmar-email"]) {
      const posicao = rotas.indexOf(`path="${caminho}"`);
      assert.ok(posicao > 0 && posicao < primeiraProtegida, `${caminho} ficou atrás do portão da advogada`);
    }
  });

  test("o login tem o link 'Esqueci minha senha'", () => {
    assert.match(login, /<Link to="\/esqueci-senha">Esqueci minha senha<\/Link>/);
  });
});

describe("A-2 — recuperação: uma mensagem só", () => {
  test("a tela usa a MESMA mensagem para qualquer resultado do servidor", () => {
    assert.equal(
      (esqueci.match(/Se o e-mail informado tiver uma conta/g) ?? []).length, 1,
      "a frase de sucesso precisa existir num lugar só"
    );
    assert.match(esqueci, /await authService\.forgotPassword\(email\);\s*setEnviado\(true\);/);
  });

  test("não há ramo por existência de conta: nada de 404 nem de status na resposta de sucesso", () => {
    assert.doesNotMatch(esqueci, /404|response\?\.status|getApiErrorStatus/,
      "a tela passou a distinguir respostas — a conta existe ou não é exatamente o que ela não pode saber");
  });

  test("confere o formato ANTES de enviar, com a função única (DEC-063)", () => {
    assert.match(esqueci, /import \{ emailValido, MENSAGEM_EMAIL_INVALIDO \} from '\.\.\/\.\.\/utils\/email'/);
    assert.match(esqueci, /if \(!emailValido\(email\)\) \{\s*setErro\(MENSAGEM_EMAIL_INVALIDO\);\s*return;/);
  });

  test("nenhuma tela nova define expressão de e-mail própria", () => {
    for (const [nome, fonte] of Object.entries({ esqueci, redefinir, confirmar, aviso })) {
      assert.doesNotMatch(fonte, /\[\^\\s@\]|\\S\+@\\S\+/, `${nome} tem uma segunda regra de e-mail`);
    }
  });
});

describe("A-2 — o token", () => {
  test("a redefinição lê o token UMA vez e tira da barra de endereço", () => {
    assert.match(redefinir, /useState\(lerTokenDaUrl\)/);
    assert.match(redefinir, /navigate\('\/redefinir-senha', \{ replace: true \}\)/);
  });

  test("a confirmação tira o token da barra de endereço", () => {
    assert.match(confirmar, /navigate\('\/confirmar-email', \{ replace: true \}\)/);
  });

  test("a confirmação envia UM pedido só, mesmo sob React.StrictMode", () => {
    assert.match(confirmar, /const enviado = useRef\(false\)/);
    assert.match(confirmar, /if \(enviado\.current\) return;\s*enviado\.current = true;/);
    assert.equal((confirmar.match(/authService\s*\.confirmEmail\(/g) ?? []).length, 1);
  });

  test("a redefinição separa 'o link não vale mais' de 'a senha não serve'", () => {
    assert.match(redefinir, /const codigo = getApiErrorCode\(err\);/, "o código sai pelo helper, nunca por err.response");
    assert.match(redefinir, /codigo === 'tokenInvalido' \|\| codigo === 'tokenExpirado'/);
    assert.match(redefinir, /setLinkMorto\(true\)/);
  });

  test("a regra da senha nova é a do cadastro (8, letra e número)", () => {
    assert.match(redefinir, /senha\.length < 8 \|\| !\/\[a-zA-Z\]\/\.test\(senha\) \|\| !\/\\d\/\.test\(senha\)/);
    assert.match(redefinir, /As senhas não coincidem/);
  });
});

describe("A-2 — nenhuma destas telas abre sessão", () => {
  test("redefinir a senha NÃO loga: a tela não usa o contexto de autenticação e manda ao login", () => {
    assert.doesNotMatch(redefinir, /useAuth|AuthContext|\blogin\(/);
    assert.match(redefinir, /navigate\('\/login', \{ replace: true \}\)/);
  });

  test("confirmar só ATUALIZA o usuário (checkAuth), não faz login", () => {
    assert.match(confirmar, /await checkAuth\(\)/);
    assert.doesNotMatch(confirmar, /authService\.login|\blogin\(/);
  });
});

describe("A-2 — o aviso de e-mail não confirmado NÃO bloqueia", () => {
  test("só aparece quando `emailConfirmadoEm` é exatamente null", () => {
    assert.match(aviso, /if \(!user \|\| user\.emailConfirmadoEm !== null\) return null;/,
      "com `undefined` (servidor sem o campo) afirmar 'não confirmado' seria dizer o que ninguém verificou");
  });

  test("está montado no layout, ao lado do conteúdo — e não envolvendo ou substituindo o Outlet", () => {
    assert.match(layout, /<EmailConfirmationBanner \/>\s*<main className="main-content">\s*<Outlet \/>\s*<\/main>/);
  });

  test("DECISÃO DO DANIEL: nada além do aviso consulta `emailConfirmadoEm` — ninguém é barrado por isso", () => {
    const usos = arquivosDeSrc()
      .filter((caminho) => readFileSync(caminho, "utf8").includes("emailConfirmadoEm"))
      .map((caminho) => caminho.slice(RAIZ.length));

    assert.deepEqual(
      usos,
      ["src/components/layout/EmailConfirmationBanner.jsx"],
      "um portão (ProtectedRoute, login, rota) passou a olhar o e-mail confirmado — o login deixou de ser livre"
    );
  });

  test("oferece reenviar e 'já confirmei' (a confirmação acontece em outra aba)", () => {
    assert.match(aviso, /authService\.resendConfirmation\(\)/);
    assert.match(aviso, /onClick=\{\(\) => checkAuth\(\)\}/);
    assert.match(aviso, /res\.data\?\.jaConfirmado/);
  });

  test("o botão do aviso tem estilo próprio (`btn-secondary` só existe na folha de uma tela)", () => {
    assert.doesNotMatch(aviso, /btn-secondary/);
    const css = ler("src/components/layout/EmailConfirmationBanner.css");
    assert.match(css, /\.email-banner__botao\s*\{/);
  });
});

describe("A-2 — o e-mail do cliente: formato quando muda, e OPCIONAL", () => {
  test("usa a função única e só cobra o formato de e-mail que MUDOU", () => {
    assert.match(clienteForm, /import \{ emailValido, MENSAGEM_EMAIL_INVALIDO \} from '\.\.\/\.\.\/utils\/email'/);
    assert.match(clienteForm, /setEmailOriginal\(d\.email \|\| ''\)/);
    assert.match(clienteForm, /emailDigitado\.toLowerCase\(\) !== emailOriginal\.trim\(\)\.toLowerCase\(\)/);
    assert.match(clienteForm, /!emailValido\(emailDigitado\)/);
  });

  test("destaca o input de e-mail no erro", () => {
    assert.match(clienteForm, /setError\(MENSAGEM_EMAIL_INVALIDO\);\s*setCampoComErro\('email'\);\s*return;/);
  });

  test("o campo continua OPCIONAL: sem `required` no input de e-mail", () => {
    const input = clienteForm.match(/<input type="email" name="email"[^>]*>/s)?.[0];
    assert.ok(input, "não achei o input de e-mail do cliente");
    assert.doesNotMatch(input, /\brequired\b/);
  });

  test("e-mail vazio passa: a conferência só roda quando há texto", () => {
    assert.match(clienteForm, /if \(\s*emailDigitado &&/);
  });
});
