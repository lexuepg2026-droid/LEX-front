// ═══════════════════════════════════════════════════════════════════════════
// AS TABELAS DE DOMÍNIO — carregadas SOB DEMANDA, nunca no bundle (DEC-057)
//
// ── O problema de projeto ─────────────────────────────────────────────────
// A tabela do CNJ tem **658 KB** (847 classes + 5.598 assuntos). Um
// `import tabela from './classes-assuntos-cnj.json'` a costura dentro do
// chunk principal, e aí **toda tela do sistema** — login, dashboard,
// financeiro — baixa e interpreta meio megabyte de tabela processual que só o
// formulário de processo usa. O custo apareceria onde ninguém pediu por ele.
//
// ── A decisão ─────────────────────────────────────────────────────────────
// Os quatro arquivos vivem em `public/tabelas/`, que o Vite copia **verbatim**
// para `dist/`. Ninguém os importa: eles chegam por `fetch`, na primeira vez
// que um campo que precisa deles é usado, e ficam memoizados no módulo pelo
// resto da sessão. Quem nunca abre o formulário de processo nunca baixa o CNJ.
//
// **`fetch` nativo, e não o cliente de API.** O `api.js` carrega o interceptor
// de 401 da DEC-050: um arquivo estático que voltasse 401 por qualquer motivo
// deslogaria a advogada no meio do cadastro. Estes arquivos não são recurso
// autenticado e não têm nada que fazer naquele caminho.
//
// ── O requisito que vem da F-5 (offline) ──────────────────────────────────
// `public/` sai do build **sem hash no nome**, em URL estável e previsível
// (`/tabelas/comarcas-pr.json`). É o que deixa o service worker que já existe
// cacheá-los por URL, sem precisar extrair nome nenhum do HTML — ao contrário
// dos `/assets/*` hasheados, que o `sw.js` hoje precisa garimpar do índice.
// **A F-5 não está implementada aqui, e não é para estar.** O que esta fase
// fez foi não escolher um caminho que a impedisse.
//
// ⚠️ **Aviso para a F-5:** URL estável significa **sem cache-busting**. Se o
// Davi mandar uma tabela nova, o nome do arquivo é o mesmo. Cache-first cego
// serviria a tabela velha para sempre. O marcador de versão é o campo
// `versao` do envelope — quem escrever a regra de cache precisa olhar para
// ele, ou usar network-first com fallback, como o `sw.js` já faz na navegação.
// ═══════════════════════════════════════════════════════════════════════════

// O envelope que todo arquivo do Davi carrega. Está aqui, e é conferido em
// tempo de execução, porque a próxima entrega dele pode vir com outro formato
// — e a hora de descobrir isso é no `catch` do carregamento, com o nome do
// arquivo na mensagem, e não três telas adiante com uma lista vazia.
export const CHAVES_ENVELOPE = ['tabela', 'versao', 'fonte', 'url'];

// Cada tabela: o arquivo em `public/tabelas/`, e sob que chave está a lista.
// O CNJ é o único com DUAS listas no mesmo arquivo — classes e assuntos vêm
// da mesma extração, na mesma data, da mesma fonte, e separá-los em dois
// arquivos duplicaria o envelope e deixaria as duas versões divergirem.
export const TABELAS = {
  comarcas:      { arquivo: 'comarcas-pr',          listas: ['itens'] },
  nacionalidades:{ arquivo: 'nacionalidades',       listas: ['itens'] },
  profissoes:    { arquivo: 'profissoes-cbo',       listas: ['itens'] },
  cnj:           { arquivo: 'classes-assuntos-cnj', listas: ['classes', 'assuntos'] },
};

// `BASE_URL` e não `/` cru: o dia em que o app for servido sob um subcaminho,
// o `fetch` absoluto quebraria calado. `import.meta.env` não existe fora do
// Vite (a suíte roda em `node --test`), daí o `?.`.
const base = () => {
  const b = import.meta.env?.BASE_URL ?? '/';
  return b.endsWith('/') ? b : `${b}/`;
};

export const caminhoDaTabela = (nome) => {
  const def = TABELAS[nome];
  if (!def) throw new Error(`Tabela desconhecida: ${nome}`);
  return `${base()}tabelas/${def.arquivo}.json`;
};

export const conferirEnvelope = (dado, nome) => {
  if (!dado || typeof dado !== 'object') {
    throw new Error(`Tabela ${nome}: conteúdo não é um objeto.`);
  }
  const faltando = CHAVES_ENVELOPE.filter((c) => typeof dado[c] !== 'string' || dado[c] === '');
  if (faltando.length > 0) {
    throw new Error(`Tabela ${nome}: envelope sem ${faltando.join(', ')}.`);
  }
  for (const lista of TABELAS[nome].listas) {
    if (!Array.isArray(dado[lista])) {
      throw new Error(`Tabela ${nome}: \`${lista}\` não é uma lista.`);
    }
  }
  return dado;
};

// Memoização por PROMESSA, e não pelo resultado: dois campos que abrem juntos
// (classe e assunto, no mesmo formulário) pedem o CNJ no mesmo tick. Guardar o
// resultado faria os dois dispararem o `fetch` antes de qualquer um terminar,
// e o arquivo de 658 KB viria duas vezes.
const emMemoria = new Map();

export const carregarTabela = (nome) => {
  if (!TABELAS[nome]) return Promise.reject(new Error(`Tabela desconhecida: ${nome}`));

  if (!emMemoria.has(nome)) {
    const promessa = fetch(caminhoDaTabela(nome))
      .then((r) => {
        if (!r.ok) throw new Error(`Tabela ${nome}: HTTP ${r.status}.`);
        return r.json();
      })
      .then((dado) => conferirEnvelope(dado, nome))
      // Falha não fica memoizada: uma queda de rede na primeira vez não pode
      // condenar o campo a ficar vazio pelo resto da sessão.
      .catch((e) => {
        emMemoria.delete(nome);
        throw e;
      });
    emMemoria.set(nome, promessa);
  }

  return emMemoria.get(nome);
};

// ── Os rótulos, por tabela ────────────────────────────────────────────────
// Moram aqui, e não nas telas, porque são conhecimento sobre o FORMATO do
// arquivo do Davi. Espalhá-los pelos formulários faria a próxima entrega dele
// quebrar em quatro lugares em vez de um.

export const rotuloComarca = (item) => item?.nome ?? '';
export const rotuloProfissao = (item) => item?.nome ?? '';
export const rotuloCnj = (item) => item?.nome ?? '';

// **A nacionalidade é o caso especial, e é de propósito que ela continua UM
// campo só.** O LEX gera procuração ("brasileira, casada, professora"), e o
// que se grava hoje é o gentílico em texto livre, com `default: "brasileira"`.
// A tabela do Davi traz as duas flexões, então dá para **sugerir a forma
// certa** olhando o `sexo` que já está no cadastro — isso é ganho, e é o que
// esta fase entrega. Virar dois campos (ou passar a flexionar na geração)
// seria mudança de modelo, e mudança de modelo se reporta, não se faz de
// passagem. Ver o relatório da F-4.
export const gentilicos = (envelope, sexo) => {
  const itens = envelope?.itens ?? [];
  if (sexo === 'masculino') return itens.map((i) => i.masculino).filter(Boolean);
  if (sexo === 'feminino') return itens.map((i) => i.feminino).filter(Boolean);
  // Sexo ainda não preenchido: oferece as duas formas, sem escolher por ela.
  return itens.flatMap((i) => [i.feminino, i.masculino]).filter(Boolean);
};
