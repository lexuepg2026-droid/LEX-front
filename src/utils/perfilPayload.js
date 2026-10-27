import { maskCPF, maskCEP, maskPhone, unmask } from './masks.js';

// ═══════════════════════════════════════════════════════════════════════════
// O PAYLOAD DO PERFIL — Fase 3.6 (DEC-128)
//
// Saiu de `ProfilePage` para a suíte EXECUTAR a regra, no padrão de
// `clientePayload.js` (DEC-125). A regra não mudou — a tela já enviava só o
// que diferia da fotografia `inicial` (o mesmo desenho de `Perfil.jsx:129-164`
// da Raniele):
//
//   - só vai o campo DIFERENTE do que veio da API; nada mudou → `{}`;
//   - campo apagado vai `null`: `undefined` some no JSON, e o merge parcial
//     do backend (`PATCH /auth/me`, travado em `perfilParcial.test.js`) não
//     apagaria nada;
//   - a comparação é sobre o valor NORMALIZADO — CPF, telefone, CEP e número
//     da OAB sem máscara, texto sem espaço nas pontas. Reformatar o mesmo CPF
//     não é mudança;
//   - os subdocumentos (`oab`, `advocacia`, `endereco`) só entram com os
//     campos que mudaram; o backend mescla campo a campo.
// ═══════════════════════════════════════════════════════════════════════════

// Espelho plano do usuário. Guarda o valor MASCARADO (é o que aparece no
// input); a máscara sai só na comparação.
export const formularioDoPerfil = (u) => ({
  nomeCompleto: u?.nomeCompleto || '',
  cpf: maskCPF(u?.cpf || ''),
  telefone: maskPhone(u?.telefone || ''),
  oabNumero: u?.oab?.numero || '',
  oabEstado: u?.oab?.estado || '',
  advNome: u?.advocacia?.nome || '',
  advChavePix: u?.advocacia?.chavePix || '',
  advInstagram: u?.advocacia?.instagram || '',
  advSite: u?.advocacia?.site || '',
  // String vazia representa "sem logo" no formulário; vira null no payload,
  // que é como o backend remove o campo.
  advLogo: u?.advocacia?.logoBase64 || '',
  cep: maskCEP(u?.endereco?.cep || ''),
  logradouro: u?.endereco?.logradouro || '',
  numero: u?.endereco?.numero || '',
  complemento: u?.endereco?.complemento || '',
  bairro: u?.endereco?.bairro || '',
  cidade: u?.endereco?.cidade || '',
  estado: u?.endereco?.estado || '',
  pais: u?.endereco?.pais || 'Brasil',
});

const texto = (v) => String(v ?? '').trim();
const digitos = (v) => unmask(v);
const igual = (v) => String(v ?? '');

// campo do payload → [chave no formulário, normalização]
const RAIZ = {
  nomeCompleto: ['nomeCompleto', texto],
  cpf: ['cpf', digitos],
  telefone: ['telefone', digitos],
};

const SUBDOCUMENTOS = {
  oab: {
    numero: ['oabNumero', digitos],
    estado: ['oabEstado', igual],
  },
  advocacia: {
    nome: ['advNome', texto],
    chavePix: ['advChavePix', texto],
    instagram: ['advInstagram', texto],
    site: ['advSite', texto],
    logoBase64: ['advLogo', igual],
  },
  endereco: {
    cep: ['cep', digitos],
    pais: ['pais', texto],
    estado: ['estado', igual],
    cidade: ['cidade', texto],
    bairro: ['bairro', texto],
    logradouro: ['logradouro', texto],
    numero: ['numero', texto],
    complemento: ['complemento', texto],
  },
};

const comparar = (destino, campos, inicial, atual) => {
  for (const [chave, [doFormulario, normalizar]] of Object.entries(campos)) {
    const antes = normalizar(inicial?.[doFormulario]);
    const agora = normalizar(atual?.[doFormulario]);
    if (antes === agora) continue;
    destino[chave] = agora === '' ? null : agora;
  }
  return destino;
};

export const montarPayloadPerfil = (inicial, atual) => {
  const payload = comparar({}, RAIZ, inicial, atual);
  for (const [sub, campos] of Object.entries(SUBDOCUMENTOS)) {
    const parte = comparar({}, campos, inicial, atual);
    if (Object.keys(parte).length > 0) payload[sub] = parte;
  }
  return payload;
};

export const semAlteracoes = (payload) => Object.keys(payload).length === 0;

export default { formularioDoPerfil, montarPayloadPerfil, semAlteracoes };
