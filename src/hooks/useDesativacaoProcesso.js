import { useCallback, useState } from 'react';
import processService from '../api/processService';
import { toast } from '../utils/toast';
import { getApiErrorMessage } from '../utils/apiError';
import { jaAvisadoPeloToastGlobal } from '../api/toastGlobal';
import {
  mensagemDesativarProcesso,
  mensagemReativarProcesso,
  motivoDeNaoReativar
} from '../utils/activationMessages';

// ═══════════════════════════════════════════════════════════════════════════
// DESATIVAR E REATIVAR UM PROCESSO — um hook, dois usos (Fase 3.4, DEC-117)
//
// A lista e o ⋮ do detalhe faziam a mesma coisa com duas cópias do código (a
// do detalhe nasceu na 3.3b). Duas cópias divergem na primeira revisão de
// redação; aqui divergir seria uma tela pedir a contagem e a outra não.
//
// ── DEC-052: a contagem vem ANTES da confirmação ────────────────────────
// O modal só abre depois que o servidor diz quantos vínculos estão em jogo.
// A advogada precisa saber o tamanho do efeito antes de causá-lo — é a regra
// do modal de estorno (passo 161). Abrir primeiro e preencher o número depois
// faria a frase mudar debaixo dos olhos de quem já está lendo.
//
// ── DEC-053: a última barreira antes do 409 ──────────────────────────────
// O item do menu já vem desabilitado pela lista, mas a lista pode estar velha
// — a advogada deixou a aba aberta e desativou o cliente por outro caminho.
// O preview é lido no INSTANTE do clique, e é ele que impede o modal de abrir
// com um botão "Reativar" que levaria a uma recusa.
//
// `aoConcluir({ acao, id, recusado })` é o que cada tela faz depois: a lista
// refaz a consulta (o registro pode ou não continuar visível, conforme o filtro
// de situação — adivinhar isso duplicaria a regra do filtro); o detalhe, que
// só abre processo ativo, vai para a lista.
// ═══════════════════════════════════════════════════════════════════════════
const FECHADO = Object.freeze({ open: false, id: null, acao: null, mensagem: '', carregando: false });

export default function useDesativacaoProcesso({ aoConcluir } = {}) {
  const [modal, setModal] = useState(FECHADO);

  const abrir = useCallback(async (id, acao) => {
    setModal({ open: true, id, acao, mensagem: '', carregando: true });
    try {
      const { data } = await processService.getActivationPreview(id);

      const impedimento = acao === 'reativar'
        ? motivoDeNaoReativar(data.impedimentosDeReativacao)
        : null;

      if (impedimento) {
        setModal(FECHADO);
        toast.error(`Não é possível reativar. ${impedimento}`);
        // A tela estava desatualizada: refeita, o menu passa a mostrar o motivo
        // e a advogada não clica de novo.
        aoConcluir?.({ acao, id, recusado: true });
        return;
      }

      const mensagem = acao === 'desativar'
        ? mensagemDesativarProcesso(data.vinculosAfetados)
        : mensagemReativarProcesso(data.vinculosAfetados);
      setModal({ open: true, id, acao, mensagem, carregando: false });
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
        await processService.deleteProcess(id);
        toast.success('Processo desativado. Você pode reativá-lo quando quiser.');
      } else {
        await processService.reactivateProcess(id);
        toast.success('Processo reativado.');
      }
      aoConcluir?.({ acao, id, recusado: false });
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(
        err,
        acao === 'desativar' ? 'Erro ao desativar processo.' : 'Erro ao reativar processo.'
      ));
    }
  }, [modal, aoConcluir]);

  // As props do `<Modal>`, prontas: título, frase, verbo e cor saem de `acao`
  // num lugar só. Dois modais separados divergiriam na primeira revisão.
  const propsDoModal = {
    open: modal.open,
    title: modal.acao === 'reativar' ? 'Reativar processo' : 'Desativar processo',
    message: modal.carregando ? 'Conferindo o efeito desta ação…' : modal.mensagem,
    variant: modal.acao === 'reativar' ? 'default' : 'danger',
    confirmLabel: modal.acao === 'reativar' ? 'Reativar' : 'Desativar',
    onConfirm: confirmar,
    onCancel: fechar,
  };

  return { abrir, propsDoModal };
}
