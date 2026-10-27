import { unmask } from './masks.js';

// ═══════════════════════════════════════════════════════════════════════════
// O PAYLOAD DO CLIENTE — Fase 3.5 (DEC-125)
//
// Saiu de `ClientFormPage.handleSubmit` para a suíte EXECUTAR a regra (criar
// PF, criar PJ, trocar o tipo na edição) em vez de só ler o texto — o mesmo
// caminho de `processoPayload.js` na 3.4. Nenhuma regra mudou:
//
//   - payload explícito, campo a campo, nunca `{ ...formData }`;
//   - campo opcional esvaziado vai `null` na EDIÇÃO (senão o merge parcial
//     preservaria o valor antigo) e `undefined` na CRIAÇÃO (para o schema
//     aplicar os padrões, como a nacionalidade "brasileira");
//   - enum vazio nunca vai como string vazia: '' reprova no enum, null limpa;
//   - a senha do portal só vai quando a advogada DIGITOU algo — em branco é
//     "não mexer no acesso", não "apagar" (toda gravação volta a provisória);
//   - só os campos do tipo ESCOLHIDO vão (F-6.2): o servidor recusa campo do
//     tipo oposto com 400, e remove do cadastro os do tipo anterior. Os do
//     outro tipo continuam no estado da tela — trocar o rádio e voltar
//     devolve tudo como estava.
// ═══════════════════════════════════════════════════════════════════════════
export const montarPayloadCliente = (formData, { tipoPessoa, isEditing }) => {
  const opcional = (valor) => {
    const v = typeof valor === 'string' ? valor.trim() : valor;
    if (v) return v;
    return isEditing ? null : undefined;
  };

  const endereco = {
    cep: opcional(unmask(formData.cep)),
    logradouro: opcional(formData.logradouro),
    numero: opcional(formData.numero),
    complemento: opcional(formData.complemento),
    bairro: opcional(formData.bairro),
    cidade: opcional(formData.cidade),
    estado: opcional(formData.estado),
    pais: opcional(formData.pais),
  };

  const payload = {
    tipoPessoa,
    email: opcional(formData.email),
    telefone: opcional(unmask(formData.telefone)),
    observacoes: opcional(formData.observacoes),
    endereco,
  };

  if (formData.senhaPortal !== '') {
    payload.senhaPortal = formData.senhaPortal;
  }

  if (tipoPessoa === 'fisica') {
    payload.nomeCompleto = formData.nomeCompleto;
    payload.cpf = unmask(formData.cpf);
    payload.rg = opcional(formData.rg);
    payload.dataNascimento = opcional(formData.dataNascimento);
    payload.sexo = opcional(formData.sexo);
    payload.estadoCivil = opcional(formData.estadoCivil);
    payload.profissao = opcional(formData.profissao);
    payload.nacionalidade = opcional(formData.nacionalidade);
  } else {
    payload.razaoSocial = formData.razaoSocial;
    payload.nomeFantasia = formData.nomeFantasia;
    payload.cnpj = unmask(formData.cnpj);

    const repNome = formData.repNome.trim();
    const repCpf = unmask(formData.repCpf);
    const repCargo = formData.repCargo.trim();
    // Com algum dado preenchido manda o trio (campo vazio como null, para
    // limpar); com os três vazios manda null, que remove o subdocumento.
    payload.representanteLegal = (repNome || repCpf || repCargo)
      ? { nome: opcional(repNome), cpf: opcional(repCpf), cargo: opcional(repCargo) }
      : (isEditing ? null : undefined);
  }

  return payload;
};

export default { montarPayloadCliente };
