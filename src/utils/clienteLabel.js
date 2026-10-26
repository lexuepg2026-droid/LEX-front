import { nomeDoCliente } from './enums.js';
import { formatCNPJ, formatCPF } from './formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// O RÓTULO DO CLIENTE NO SELETOR DE PARTICIPANTE — Fase 3.3b (DEC-110)
//
// "{nome} — {CPF/CNPJ formatado}". O documento vai junto porque é o que
// distingue dois homônimos, e formatado porque é como a advogada o lê no
// papel — o banco guarda só os dígitos.
//
// Sem documento, só o nome: um "— " sobrando no fim pareceria rótulo cortado.
// ═══════════════════════════════════════════════════════════════════════════
export const documentoFormatado = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return '';
  if (cliente.tipoPessoa === 'fisica') return cliente.cpf ? formatCPF(cliente.cpf) : '';
  return cliente.cnpj ? formatCNPJ(cliente.cnpj) : '';
};

export const rotuloDoClienteNoSeletor = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return '';
  const documento = documentoFormatado(cliente);
  const nome = nomeDoCliente(cliente);
  return documento ? `${nome} — ${documento}` : nome;
};

export default { documentoFormatado, rotuloDoClienteNoSeletor };
