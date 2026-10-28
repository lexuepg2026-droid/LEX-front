// ═══════════════════════════════════════════════════════════════════════════
// O TEXTO FINAL NA PELE NOVA — o que o cabeçalho diz (Fase 3.9b2, DEC-148)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM. Nada
// aqui pede dado novo ao servidor — tudo sai do documento que a tela JÁ lê
// (`GET /documents/:id`, com `processoId` populado).
// ═══════════════════════════════════════════════════════════════════════════

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// "número — título" do processo, ou só o que existir.
export const processoDoDocumento = (documento) => {
  const p = documento?.processoId;
  if (!p || typeof p !== 'object') return '';
  return [texto(p.numeroProcesso), texto(p.titulo)].filter(Boolean).join(' — ');
};

// De quem é a peça. O `clienteId` vem como id; o NOME está nas variáveis
// congeladas na geração (`nomeCliente` da PF, `razaoSocialCliente` da PJ) —
// o mesmo nome que o texto do documento usa. Sem elas (modelo, upload), nada.
export const clienteDoDocumento = (documento) => {
  const v = documento?.variaveisResolvidas;
  if (!v || typeof v !== 'object') return '';
  return texto(v.nomeCliente) || texto(v.razaoSocialCliente);
};

// "processo · cliente", só com o que existir.
export const contextoDoDocumento = (documento) =>
  [processoDoDocumento(documento), clienteDoDocumento(documento)].filter(Boolean).join(' · ');
