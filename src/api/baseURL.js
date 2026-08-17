// ═══════════════════════════════════════════════════════════════════════════
// URL BASE DA API — fonte única das duas instâncias de axios (Fase F-0)
//
// Vivia duplicada em `axiosConfig.js` e `portalAxios.js`, com a mesma expressão
// escrita duas vezes. Duas cópias da mesma decisão divergem: bastaria alguém
// mudar o fallback de um lado para o portal e as telas da advogada passarem a
// falar com servidores diferentes no mesmo build.
//
// ── Por que o fallback é SÓ de desenvolvimento ─────────────────────────────
// `npm run dev` precisa funcionar sem `.env` nenhum — exigir configuração para
// rodar localmente é atrito sem ganho, e foi para isso que o fallback nasceu.
//
// Em produção ele é o contrário de conveniência: o bundle publicado sairia
// apontando para a máquina de quem compilou, subiria sem erro e falharia em
// TODA requisição. `vite.config.js` aborta o build de produção quando
// `VITE_API_URL` falta; o `import.meta.env.DEV` aqui é a segunda tranca, para
// o dia em que alguém desligar a primeira.
//
// ── Por que `import.meta.env.DEV` direto, e não uma variável recebida ──────
// O Vite SUBSTITUI `import.meta.env.DEV` por `false` no build de produção, o
// que torna o ramo inteiro código morto e faz o endereço de desenvolvimento
// desaparecer do bundle. Lendo a flag de um parâmetro, a substituição não
// acontece e o literal `http://localhost:3001` viaja para o arquivo publicado
// — foi exatamente o que a primeira versão desta guarda fez, e o `grep` no
// `dist/` pegou. O endereço não pode estar lá nem como texto inerte: é ele que
// alguém vai encontrar procurando por que a API não responde.
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACK_DEV = 'http://localhost:3001/api';

export const BASE_URL = (() => {
  const url = (import.meta.env.VITE_API_URL ?? '').trim();
  if (url !== '') return url;

  if (import.meta.env.DEV) return FALLBACK_DEV;

  throw new Error(
    'VITE_API_URL não está definida neste build. O endereço da API não tem ' +
      'fallback em produção — ver vite.config.js e .env.production.example.'
  );
})();

export default BASE_URL;
