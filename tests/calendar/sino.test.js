// ═══════════════════════════════════════════════════════════════════════════
// F-3, PARTE 4 — O SINO NA TELA
//
// O backend já prova a contagem (`tests/calendar/sino.test.js` do lex-backend).
// Aqui prova-se o que só a tela pode errar:
//
//   • **zero não aparece** — nem como "0";
//   • o sino NÃO ESCREVE nada: não há rota de "marcar como lido", e não pode
//     haver chamada de escrita neste componente;
//   • o destino de cada item sai do MESMO ponto único do calendário.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), 'utf8');

const SINO = ler('src/components/layout/NotificationBell.jsx');
const CSS = ler('src/components/layout/NotificationBell.css');
const API = ler('src/api/calendarService.js');
// Comentários fora: eles CITAM o que o componente não faz, e uma varredura
// ingênua acusaria a própria explicação.
const CODIGO = SINO.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('Parte 4 — o badge SOME no zero', () => {
  test('o badge só é renderizado quando o total é maior que zero', () => {
    assert.match(
      CODIGO,
      /\{total > 0 && \(/,
      'um badge com "0" é ruído permanente: ocupa o mesmo espaço e a mesma cor ' +
      'de um badge que significa alguma coisa'
    );
  });

  test('não há caminho que renderize "0" no badge', () => {
    // Um `{total}` como NÓ DE TEXTO do JSX imprimiria o zero. O `${total}` do
    // `aria-label` não conta e não pode contar: lá o número é justamente o que
    // se quer dizer, e "nada pendente" é o texto do caso zero.
    assert.equal(
      />\s*\{\s*total\s*\}\s*</.test(CODIGO),
      false,
      'o total não é impresso como texto sem a guarda'
    );

    // E o conteúdo do badge é sempre a expressão com teto, nunca o total cru.
    const badge = /className="sino__badge"[^>]*>\s*([^<]+)</.exec(CODIGO);
    assert.ok(badge, 'o badge precisa existir no JSX');
    assert.match(badge[1], /total > 99/, 'o badge imprime a expressão com teto');
  });

  test('o total sai do BACKEND calculado — a tela não soma os três', () => {
    // Se ela somasse, o dia em que um quarto caso entrasse ela continuaria
    // mostrando três, e ninguém notaria porque o número continuaria plausível.
    assert.ok(CODIGO.includes('avisos?.total'));
    assert.equal(
      /eventosHoje\.length\s*\+/.test(CODIGO),
      false,
      'a tela não pode recompor o total'
    );
  });

  test('números grandes não estouram o badge', () => {
    assert.ok(CODIGO.includes("'99+'"));
  });
});

describe('Parte 4 — SEM estado de lido: o sino não escreve nada', () => {
  test('o componente não faz nenhuma chamada de escrita', () => {
    for (const verbo of ['.post(', '.patch(', '.put(', '.delete(']) {
      assert.equal(
        CODIGO.includes(verbo),
        false,
        `o sino chama ${verbo} — abrir a lista não pode mudar estado nenhum`
      );
    }
  });

  test('o serviço de calendário só expõe LEITURA', () => {
    const codigoApi = API.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const verbo of ['api.post', 'api.patch', 'api.put', 'api.delete']) {
      assert.equal(codigoApi.includes(verbo), false, `\`${verbo}\` em calendarService`);
    }
    assert.ok(codigoApi.includes('api.get'));
  });

  test('não há campo nem função de "lido" em lugar nenhum do componente', () => {
    for (const palavra of ['marcarComoLido', 'setLido', 'lido:', 'naoLidos', 'unread']) {
      assert.equal(CODIGO.includes(palavra), false, `\`${palavra}\` reintroduz o estado de leitura`);
    }
  });

  test('abrir a lista RECARREGA, e é só isso que o clique faz', () => {
    // Recarregar é leitura. Entre um tique e outro a advogada pode ter
    // concluído algo noutra aba, e abrir a lista para ver um item já resolvido
    // é o que faz ela deixar de confiar no número.
    assert.ok(CODIGO.includes('carregar()'));
  });
});

describe('Parte 4 — as três seções, e o destino de cada item', () => {
  test('as três seções do backend estão na tela', () => {
    for (const chave of ['eventosHoje', 'eventosAtrasados', 'parcelasVencidas']) {
      assert.ok(CODIGO.includes(chave), `falta a seção ${chave}`);
    }
  });

  test('seção vazia não vira cabeçalho vazio', () => {
    assert.ok(CODIGO.includes('.filter((s) => s.itens.length > 0)'));
  });

  test('o destino sai do PONTO ÚNICO, e não de rotas escritas aqui', () => {
    assert.ok(CODIGO.includes('destinoDoItem'));
    // Duplicar as rotas aqui as faria divergir na primeira mudança de caminho —
    // e a parcela vencida do sino levaria a um lugar diferente da mesma parcela
    // no calendário.
    assert.equal(
      /['"]\/dashboard\/parcelas\/editar\//.test(CODIGO),
      false,
      'rota de parcela escrita à mão no sino'
    );
  });

  test('o painel vazio tem FRASE, e não um branco', () => {
    assert.ok(CODIGO.includes('Nada exige atenção agora'));
  });
});

describe('Parte 4 — acessibilidade e fechamento', () => {
  test('o rótulo acessível carrega o NÚMERO', () => {
    // Um badge é informação visual pura: sem isto, quem lê por áudio ouve só
    // "avisos" e não sabe se há três coisas pendentes ou nenhuma.
    assert.match(CODIGO, /aria-label=\{total > 0 \?/);
    assert.ok(CODIGO.includes('exigem atenção'));
  });

  test('o painel fecha com Esc e com clique fora', () => {
    assert.ok(CODIGO.includes("evento.key === 'Escape'"));
    assert.ok(CODIGO.includes('mousedown'));
    // Um painel que só fecha pelo próprio botão prende o foco de quem navega
    // por teclado.
  });

  test('o badge usa o tom de ATENÇÃO, e não o de perigo', () => {
    // Um prazo de hoje e uma parcela vencida pedem AÇÃO; não anunciam que algo
    // deu errado. É o mesmo tom do selo de liminar da DEC-054.
    assert.match(CSS, /\.sino__badge\s*\{[^}]*--color-warning/s);
    assert.equal(/\.sino__badge\s*\{[^}]*--color-danger/s.test(CSS), false);
  });

  test('o painel cabe em 360 px', () => {
    assert.ok(CSS.includes('@media (max-width: 767px)'));
    assert.match(CSS, /\.sino__painel\s*\{[^}]*max-width:\s*calc\(100vw/s);
  });
});

describe('Parte 4 — NÃO é Web Push (Parte 0 da fase)', () => {
  test('o sino não pede permissão de notificação nem registra push', () => {
    // Notificação no celular com o app fechado exige service worker novo,
    // permissão e chaves VAPID. Decisão do Daniel em 24/08/2026: fora desta
    // fase. Aviso é sino com contador DENTRO do sistema.
    for (const proibido of ['Notification.requestPermission', 'pushManager', 'PushSubscription', 'applicationServerKey']) {
      assert.equal(CODIGO.includes(proibido), false, `\`${proibido}\` é Web Push`);
    }
  });

  test('o service worker existente não ganhou nada de push', () => {
    const sw = ler('public/sw.js');
    for (const proibido of ['push', 'notificationclick', 'showNotification']) {
      assert.equal(
        sw.toLowerCase().includes(proibido.toLowerCase()),
        false,
        `o service worker ganhou \`${proibido}\` — Web Push está fora do escopo`
      );
    }
  });
});
