import React, { useState } from 'react';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';

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
// ── Fase 2.5 (DEC-093, DEC-097): o código é o PESSOAL ─────────────────────
// Um código e uma senha por pessoa abrem todos os processos LIBERADOS para
// ela. Por isso a entrega diz duas coisas além do código: se ESTE processo
// está liberado (e oferece liberar ali mesmo, se não estiver), e se o cliente
// já tem senha — sem senha não há código, e o caminho é o cadastro do cliente.
//
// ── Tamanho da fonte do código ────────────────────────────────────────────
// A advogada dita este código por telefone. `LEX-N28J-2EWG` tem caracteres que
// se confundem em corpo pequeno, e ditar errado custa uma ligação a mais.
// ═══════════════════════════════════════════════════════════════════════════

const ENDERECO_PORTAL = `${window.location.origin}/portal`;

const montarMensagem = (codigo, nomeProcesso) => (
  `Olá! Você pode acompanhar os seus processos${nomeProcesso ? ` — entre eles, ${nomeProcesso} —` : ''} ` +
  `pelo portal do escritório.\n\n` +
  `Endereço: ${ENDERECO_PORTAL}\n` +
  `Código de acesso: ${codigo}\n\n` +
  `A senha vai por outro canal, por segurança. ` +
  `No primeiro acesso o sistema vai pedir que você troque essa senha por uma ` +
  `que só você conheça — isso é obrigatório e leva menos de um minuto.`
);

function AccessDelivery({ processoId, clienteId, nomeCliente, nomeProcesso, online = true, onLiberado, onFechar }) {
  const [codigo, setCodigo] = useState('');
  const [acesso, setAcesso] = useState(null); // { liberadoNoPortal, temSenhaPortal, senhaPortalProvisoria }
  const [liberando, setLiberando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  React.useEffect(() => {
    let ativo = true;
    processService
      .getProcessClienteCodigoAcesso(processoId, clienteId)
      .then((res) => {
        if (!ativo) return;
        setCodigo(res.data.codigoAcesso ?? '');
        setAcesso({
          liberadoNoPortal: res.data.liberadoNoPortal === true,
          temSenhaPortal: res.data.temSenhaPortal === true,
          senhaPortalProvisoria: res.data.senhaPortalProvisoria === true,
        });
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
  const liberar = async () => {
    if (!online || liberando) return;
    setLiberando(true);
    try {
      await processService.setLiberacaoNoPortal(processoId, clienteId, true);
      setAcesso((a) => ({ ...a, liberadoNoPortal: true }));
      onLiberado?.();
      toast.success(`Processo liberado no portal para ${nomeCliente}.`);
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível liberar o processo.'));
    } finally {
      setLiberando(false);
    }
  };

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

      {acesso && !acesso.temSenhaPortal && (
        <p className="entrega-acesso__aviso">
          <strong>{nomeCliente} ainda não tem acesso ao portal.</strong> Defina uma
          senha provisória no cadastro do cliente: o código pessoal é criado junto
          com ela.
        </p>
      )}

      {acesso?.temSenhaPortal && (
        <p className="entrega-acesso__aviso">
          {acesso.liberadoNoPortal ? (
            <>Este processo <strong>está liberado</strong> no portal para {nomeCliente}.</>
          ) : (
            <>
              Este processo <strong>ainda não está liberado</strong> no portal: com o
              código abaixo, {nomeCliente} entra e não o vê.{' '}
              <button
                type="button"
                className="btn-primary"
                aria-disabled={online && !liberando ? undefined : 'true'}
                onClick={liberar}
              >
                {liberando ? 'Liberando…' : 'Liberar este processo'}
              </button>
            </>
          )}
          {acesso.senhaPortalProvisoria && (
            <> A senha ainda é a <strong>provisória</strong>: no primeiro acesso o portal pede a troca.</>
          )}
        </p>
      )}

      {codigo && (
        <>
          <p className="entrega-acesso__rotulo">Código de acesso pessoal de {nomeCliente}</p>
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
