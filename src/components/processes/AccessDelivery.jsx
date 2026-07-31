import React, { useState } from 'react';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';

// ═══════════════════════════════════════════════════════════════════════════
// ENTREGA DO ACESSO — código de um participante
//
// O código vem da ROTA DEDICADA, sob demanda. Ele não aparece em listagem
// nenhuma de propósito: circula por WhatsApp e por papel, e uma tela aberta na
// mesa do escritório, ou um print, não pode expor o acesso de todos os
// clientes de uma vez.
//
// ── Por que a senha NÃO entra no texto pronto ─────────────────────────────
// O texto existe para ser colado numa mensagem. Código e senha na mesma
// mensagem significam que quem tiver acesso àquele aparelho — ou ao print, ou
// ao encaminhamento — tem o acesso inteiro. Separar os canais é a única
// proteção real aqui, e ela só funciona se a interface não oferecer o
// contrário por conveniência. A recomendação está escrita na tela.
//
// ── Tamanho da fonte do código ────────────────────────────────────────────
// A advogada dita este código por telefone. `LEX-N28J-2EWG` tem caracteres que
// se confundem em corpo pequeno, e ditar errado custa uma ligação a mais.
// ═══════════════════════════════════════════════════════════════════════════

const ENDERECO_PORTAL = `${window.location.origin}/portal`;

const montarMensagem = (codigo, nomeProcesso) => (
  `Olá! Você pode acompanhar o seu processo${nomeProcesso ? ` (${nomeProcesso})` : ''} ` +
  `pelo portal do escritório.\n\n` +
  `Endereço: ${ENDERECO_PORTAL}\n` +
  `Código de acesso: ${codigo}\n\n` +
  `A senha vai por outro canal, por segurança. ` +
  `No primeiro acesso o sistema vai pedir que você troque essa senha por uma ` +
  `que só você conheça — isso é obrigatório e leva menos de um minuto.`
);

function AccessDelivery({ processoId, clienteId, nomeCliente, nomeProcesso, onFechar }) {
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  React.useEffect(() => {
    let ativo = true;
    processService
      .getProcessClienteCodigoAcesso(processoId, clienteId)
      .then((res) => {
        if (ativo) setCodigo(res.data.codigoAcesso);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível obter o código de acesso.'));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [processoId, clienteId]);

  // A área de transferência pode estar bloqueada (contexto não seguro,
  // permissão negada). Quando estiver, o valor continua visível na tela e é
  // isso que a mensagem de erro precisa dizer — "falhou" sem mais nada faria a
  // advogada achar que o código não veio.
  const copiar = async (texto, oQue) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${oQue} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar. ${oQue} está na tela para você selecionar.`);
    }
  };

  return (
    <div className="entrega-acesso">
      <div className="entrega-acesso__cabecalho">
        <strong>Entregar acesso a {nomeCliente}</strong>
        <button type="button" className="btn-secondary" onClick={onFechar}>
          Fechar
        </button>
      </div>

      {carregando && <p>Buscando o código…</p>}
      {erro && <p className="error-message">{erro}</p>}

      {codigo && (
        <>
          <p className="entrega-acesso__rotulo">Código de acesso deste processo</p>
          <p className="entrega-acesso__codigo">{codigo}</p>

          <div className="entrega-acesso__acoes">
            <button
              type="button"
              className="btn-primary"
              onClick={() => copiar(codigo, 'Código')}
            >
              Copiar só o código
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => copiar(montarMensagem(codigo, nomeProcesso), 'Texto da mensagem')}
            >
              Copiar mensagem pronta
            </button>
          </div>

          <p className="entrega-acesso__aviso">
            <strong>Envie a senha por outro canal.</strong> A mensagem pronta
            traz o endereço e o código, mas não a senha — se as duas coisas
            viajarem juntas, quem interceptar uma tem as duas. Diga a senha por
            telefone, ou por um aplicativo diferente do que você usar para
            mandar este texto.
          </p>

          <pre className="entrega-acesso__previa">{montarMensagem(codigo, nomeProcesso)}</pre>
        </>
      )}
    </div>
  );
}

export default AccessDelivery;
