import { useCallback, useState } from 'react';
import clientService from '../api/clientService';
import processService from '../api/processService';
import { toast } from '../utils/toast';
import { getApiErrorMessage } from '../utils/apiError';
import { jaAvisadoPeloToastGlobal } from '../api/toastGlobal';
import {
  mensagemDesativarCliente,
  mensagemReativarCliente,
  motivoDeNaoDesativarCliente
} from '../utils/activationMessages';

// ═══════════════════════════════════════════════════════════════════════════
// DESATIVAR E REATIVAR UM CLIENTE — um hook, dois usos (Fase 3.5, DEC-122)
//
// A lista e o ⋮ do detalhe do cliente, como `useDesativacaoProcesso` (DEC-117)
// faz com o processo. É um IRMÃO daquele hook, e não uma generalização dele,
// porque as duas desativações não fazem a mesma pergunta:
//
//   | | processo | cliente |
//   |---|---|---|
//   | prévia | `activation-preview`: quantos vínculos CAEM junto | os processos ativos dele: se há algum, a ação é RECUSADA |
//   | impedimento | ao REATIVAR (cliente desativado, DEC-053) | ao DESATIVAR (processo ativo, 409 `processos`) |
//   | reativar | volta com a cascata | não cascateia (DEC-052) |
//
// Um hook só teria um `if (tipo)` em cada passo — prévia, impedimento, frases
// e serviço —, e a regra de cada um ficaria espalhada entre os dois ramos. O
// que é igual (o estado do modal, a ordem prévia → modal → ação → refazer, o
// toast global da DEC-084) tem a mesma forma nos dois arquivos, de propósito.
//
// ── A prévia (DEC-052 na forma do cliente) ──────────────────────────────
// O cliente não tem `activation-preview`: não cascateia. O que ele tem é a
// RECUSA do back — e a prévia lê, no instante do clique, os processos em que
// ele tem vínculo ativo (`GET /processes?clienteId=&situacao=todos`, a mesma
// contagem do 409). Havendo algum, o modal não abre: a advogada lê o motivo,
// com os processos nomeados, e a tela é refeita (DEC-053: a aba velha). Sem
// nenhum, o modal abre com a frase de sempre. A autoridade continua sendo o
// back: o 409 chega com a mensagem dele, se a prévia estiver velha.
//
// `aoConcluir({ acao, id, recusado })`: a lista refaz a consulta; o detalhe,
// que só abre cliente ativo, vai para a lista depois de desativar.
// ═══════════════════════════════════════════════════════════════════════════
const FECHADO = Object.freeze({ open: false, id: null, acao: null, mensagem: '', carregando: false });

const PREVIA_LIMITE = 5;

// O papel DESTE cliente em cada processo da prévia, para a frase nomear
// "(litisconsorte)" como o 409 nomeia.
const comPapelDoCliente = (processos, clienteId) =>
  processos.map((p) => {
    const vinculo = (p.participantes ?? []).find(
      (v) => String(v.clienteId?._id ?? v.clienteId) === String(clienteId)
    );
    return { ...p, papelDoCliente: vinculo?.papel, principalDoCliente: vinculo?.principal === true };
  });

export default function useDesativacaoCliente({ aoConcluir } = {}) {
  const [modal, setModal] = useState(FECHADO);

  const abrir = useCallback(async (id, acao) => {
    if (acao === 'reativar') {
      // Reativar cliente não tem impedimento: ele não tem pai inativo que o
      // segure (DEC-053) e não traz processo nenhum junto (DEC-052).
      setModal({ open: true, id, acao, mensagem: mensagemReativarCliente(), carregando: false });
      return;
    }

    setModal({ open: true, id, acao, mensagem: '', carregando: true });
    try {
      const { data } = await processService.listProcesses({
        clienteId: id, situacao: 'todos', page: 1, limit: PREVIA_LIMITE
      });
      const total = typeof data?.total === 'number' ? data.total : 0;
      const impedimento = motivoDeNaoDesativarCliente(total, comPapelDoCliente(data?.data ?? [], id));

      if (impedimento) {
        setModal(FECHADO);
        toast.error(`Não é possível desativar. ${impedimento}`);
        aoConcluir?.({ acao, id, recusado: true });
        return;
      }

      setModal({ open: true, id, acao, mensagem: mensagemDesativarCliente(), carregando: false });
    } catch (err) {
      setModal(FECHADO);
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível conferir o efeito desta ação.'));
    }
  }, [aoConcluir]);

  const fechar = useCallback(() => setModal(FECHADO), []);

  const confirmar = useCallback(async () => {
    const { id, acao } = modal;
    setModal(FECHADO);
    try {
      if (acao === 'desativar') {
        await clientService.deleteClient(id);
        toast.success('Cliente desativado. Você pode reativá-lo quando quiser.');
      } else {
        await clientService.reactivateClient(id);
        toast.success('Cliente reativado. Os processos dele continuam como estavam.');
      }
      aoConcluir?.({ acao, id, recusado: false });
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(
        err,
        acao === 'desativar' ? 'Erro ao desativar cliente.' : 'Erro ao reativar cliente.'
      ));
    }
  }, [modal, aoConcluir]);

  // As props do `<Modal>`, prontas — a mesma forma de `useDesativacaoProcesso`.
  const propsDoModal = {
    open: modal.open,
    title: modal.acao === 'reativar' ? 'Reativar cliente' : 'Desativar cliente',
    message: modal.carregando ? 'Conferindo os processos deste cliente…' : modal.mensagem,
    variant: modal.acao === 'reativar' ? 'default' : 'danger',
    confirmLabel: modal.acao === 'reativar' ? 'Reativar' : 'Desativar',
    onConfirm: confirmar,
    onCancel: fechar,
  };

  return { abrir, propsDoModal };
}
