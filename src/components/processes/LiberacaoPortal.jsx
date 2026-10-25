import React, { useEffect, useRef, useState } from 'react';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import '../../pages/processes/ProcessPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// "LIBERADO NO PORTAL" — por participante, no detalhe do processo
// (Fase 2.5, DEC-097)
//
// O login do portal é da pessoa (DEC-089), e QUAIS processos ela vê é decisão
// da advogada, processo a processo (DEC-091). Este é o controle dessa decisão.
//
//   - É um `role="switch"` de verdade: um `<button>` com `aria-checked`, que
//     o leitor de tela anuncia como "ligado/desligado".
//   - LIGAR é direto: mostrar um processo ao próprio cliente não tem risco a
//     confirmar.
//   - DESLIGAR pede confirmação, em linha: o cliente deixa de ver o processo
//     na próxima tela dele, e uma confirmação de leitura em curso não chega a
//     ser registrada. O foco vai para "Desligar"; Escape cancela e devolve o
//     foco ao controle.
//   - Sem sinal, a regra de toda ação que exige rede nesta tela: anunciado
//     como desabilitado, com o motivo dito uma vez no topo da página.
// ═══════════════════════════════════════════════════════════════════════════
function LiberacaoPortal({ processoId, clienteId, nomeCliente, liberado, online, onAlterado }) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const controle = useRef(null);
  const botaoDesligar = useRef(null);

  useEffect(() => {
    if (confirmando) botaoDesligar.current?.focus();
  }, [confirmando]);

  const gravar = async (valor) => {
    setEnviando(true);
    try {
      await processService.setLiberacaoNoPortal(processoId, clienteId, valor);
      onAlterado?.(valor);
      toast.success(
        valor
          ? `Processo liberado no portal para ${nomeCliente}.`
          : `${nomeCliente} deixou de ver este processo no portal.`
      );
      setConfirmando(false);
      controle.current?.focus();
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível alterar a liberação.'));
    } finally {
      setEnviando(false);
    }
  };

  const alternar = () => {
    if (!online || enviando) return;
    if (liberado) setConfirmando(true);
    else gravar(true);
  };

  const cancelar = () => {
    setConfirmando(false);
    controle.current?.focus();
  };

  return (
    <span className="liberacao-portal">
      <button
        ref={controle}
        type="button"
        role="switch"
        aria-checked={liberado}
        aria-disabled={online && !enviando ? undefined : 'true'}
        className={`liberacao-portal__controle${liberado ? ' liberacao-portal__controle--sim' : ''}`}
        onClick={alternar}
      >
        <span className="liberacao-portal__trilho" aria-hidden="true">
          <span className="liberacao-portal__botao" />
        </span>
        Liberado no portal: {liberado ? 'sim' : 'não'}
      </button>

      {confirmando && (
        <span
          className="liberacao-portal__confirmacao"
          role="group"
          aria-label="Confirmar o desligamento"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              cancelar();
            }
          }}
        >
          <span className="liberacao-portal__aviso">
            {nomeCliente} deixa de ver este processo na próxima tela do portal.
          </span>
          <button
            ref={botaoDesligar}
            type="button"
            className="btn-secondary liberacao-portal__desligar"
            aria-disabled={enviando ? 'true' : undefined}
            onClick={() => { if (!enviando) gravar(false); }}
          >
            {enviando ? 'Desligando…' : 'Desligar'}
          </button>
          <button type="button" className="btn-secondary" onClick={cancelar}>
            Cancelar
          </button>
        </span>
      )}
    </span>
  );
}

export default LiberacaoPortal;
