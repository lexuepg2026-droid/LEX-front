import React, { useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/common/Loading';
import { useOutbox } from '../../contexts/OutboxContext';
import { manterMinhaVersao } from '../../offline/outbox';
import { useAuth } from '../../contexts/AuthContext';
import { descreverEntrada, mensagemDeDescarte } from '../../offline/outboxMessages';
import { formatUpdatedAt } from '../../offline/dataAge';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/formatters';
import '../../styles/modules.css';
import './PendenciasPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// AS ALTERAÇÕES QUE AINDA NÃO SUBIRAM (F-5b, Parte 4)
//
// **Sem esta tela, a fila é perda de dado silenciosa.** Ela não é opcional, e é
// por isso que a fase proibiu mergear fila sem ela: uma gravação que ficou
// guardada e falhou, sem lugar onde apareça, é trabalho da advogada que some
// sem ninguém saber.
//
// Três coisas que ela faz, e que nenhuma outra tela faz:
//
//   1. diz **o que era, de quando, e o que houve** — em português, nunca
//      `POST /events 409`;
//   2. no conflito, mostra **as duas versões** e deixa a advogada escolher.
//      Escolher por ela seria decidir sobre conteúdo que é dela (DEC-060);
//   3. descartar **pede confirmação nomeando o que se perde** — é o único
//      caminho pelo qual trabalho dela desaparece, e some para sempre.
//
// O que a tela NÃO faz: descartar sozinha. Não há limite de tentativas, prazo
// nem "falhou demais, some" (ver `offline/outboxPlan.js`).
// ═══════════════════════════════════════════════════════════════════════════

// Os campos do corpo que valem a pena mostrar lado a lado no conflito. É uma
// lista curta e explícita: despejar o JSON inteiro devolveria à advogada o
// `POST /events 409` que esta tela existe para não mostrar.
const CAMPOS_COMPARAVEIS = [
  ['titulo', 'Título'],
  ['data', 'Data'],
  ['hora', 'Hora'],
  ['local', 'Local'],
  ['descricao', 'Descrição'],
  ['fase', 'Fase'],
  ['concluido', 'Concluído']
];

const valorLegivel = (campo, valor) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (campo === 'data') return formatDate(valor);
  return String(valor);
};

function ComparacaoDeVersoes({ minha, doServidor }) {
  const campos = CAMPOS_COMPARAVEIS.filter(
    ([campo]) =>
      Object.prototype.hasOwnProperty.call(minha ?? {}, campo) ||
      Object.prototype.hasOwnProperty.call(doServidor ?? {}, campo)
  );

  if (campos.length === 0) return null;

  return (
    <div className="pendencia__versoes">
      <div className="pendencia__versao">
        <h4 className="pendencia__versao-titulo">A sua versão</h4>
        <dl className="pendencia__campos">
          {campos.map(([campo, rotulo]) => (
            <React.Fragment key={`minha-${campo}`}>
              <dt>{rotulo}</dt>
              <dd>{valorLegivel(campo, minha?.[campo])}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
      <div className="pendencia__versao">
        <h4 className="pendencia__versao-titulo">O que está no servidor</h4>
        <dl className="pendencia__campos">
          {campos.map(([campo, rotulo]) => (
            <React.Fragment key={`servidor-${campo}`}>
              <dt>{rotulo}</dt>
              <dd>{valorLegivel(campo, doServidor?.[campo])}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}

function PendenciasPage() {
  const { user } = useAuth();
  const { entradas, quantidade, enviando, online, enviar, tentarDeNovo, descartar, recarregar } =
    useOutbox();
  const [descarteAberto, setDescarteAberto] = useState(null);

  const confirmarDescarte = async () => {
    const entrada = descarteAberto;
    setDescarteAberto(null);
    await descartar(entrada.id);
    toast.success('Alteração descartada.');
  };

  // "A minha versão vale": a entrada que levou 409 sai e uma NOVA entra, com a
  // versão que o servidor devolveu. Sobrescrever de propósito, depois de ver as
  // duas versões, é outra intenção — e por isso ganha chave nova.
  const manterMinha = async (entrada) => {
    await manterMinhaVersao(user?.id, entrada.id);
    await recarregar();
    await enviar();
    toast.info('Sua versão foi reenviada por cima da que estava no servidor.');
  };

  return (
    <div className="module-container">
      <PageHeader title="Alterações não enviadas" />

      <div className="pendencias__topo">
        <p className="pendencias__resumo">
          {quantidade === 0
            ? 'Tudo que você gravou já está no servidor.'
            : `${quantidade} ${quantidade === 1 ? 'alteração' : 'alterações'} ainda ` +
              `${quantidade === 1 ? 'não foi enviada' : 'não foram enviadas'}.`}
        </p>
        {/* O envio manual existe para quem não quer esperar o gatilho
            automático — e para o caso de o navegador achar que há rede quando
            não há (portal cativo), em que o automático não dispara. */}
        <button
          type="button"
          className="ui-btn ui-btn--secondary ui-btn--sm"
          onClick={enviar}
          disabled={quantidade === 0 || enviando}
          aria-disabled={online ? undefined : 'true'}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {enviando ? 'Enviando…' : 'Tentar enviar agora'}
        </button>
      </div>

      {!online && (
        <p className="pendencias__offline">
          <CloudOff size={15} aria-hidden="true" />
          Sem conexão. A fila sobe sozinha quando o sinal voltar.
        </p>
      )}

      {enviando && <Loading />}

      {quantidade === 0 ? (
        <EmptyState
          title="Nada pendente"
          description="Toda alteração que você fez já chegou ao servidor."
        />
      ) : (
        <ul className="pendencias__lista">
          {entradas.map((entrada, indice) => {
            const falhou = entrada.estado === 'falhou';
            const conflito = entrada.falha?.classificacao === 'conflito';

            return (
              <li
                key={entrada.id}
                className={`pendencia${falhou ? ' pendencia--falhou' : ''}`}
              >
                <div className="pendencia__cabecalho">
                  {/* A ordem é a do reenvio, e ela importa: criar e depois
                      editar são duas entradas, e fora de ordem a segunda
                      falharia. O número deixa isso visível. */}
                  <span className="pendencia__ordem" aria-hidden="true">{indice + 1}</span>
                  <div>
                    <p className="pendencia__descricao">
                      {descreverEntrada(entrada)}
                    </p>
                    <p className="pendencia__estado">
                      {falhou
                        ? entrada.falha?.mensagem
                        : `Aguardando envio — enfileirada ${formatUpdatedAt(entrada.criadoEm) ?? ''}.`}
                    </p>
                  </div>
                </div>

                {conflito && (
                  <ComparacaoDeVersoes minha={entrada.body} doServidor={entrada.falha?.atual} />
                )}

                <div className="pendencia__acoes">
                  {conflito ? (
                    <>
                      <button
                        type="button"
                        className="ui-btn ui-btn--primary ui-btn--sm"
                        onClick={() => manterMinha(entrada)}
                      >
                        Manter a minha versão
                      </button>
                      <button
                        type="button"
                        className="ui-btn ui-btn--secondary ui-btn--sm"
                        onClick={() => setDescarteAberto(entrada)}
                      >
                        Ficar com a do servidor
                      </button>
                    </>
                  ) : (
                    <>
                      {falhou && (
                        <button
                          type="button"
                          className="ui-btn ui-btn--primary ui-btn--sm"
                          onClick={() => tentarDeNovo(entrada.id)}
                          disabled={enviando}
                        >
                          Tentar de novo
                        </button>
                      )}
                      <button
                        type="button"
                        className="ui-btn ui-btn--secondary ui-btn--sm"
                        onClick={() => setDescarteAberto(entrada)}
                      >
                        Descartar
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* A confirmação NOMEIA o que se perde. Uma frase genérica ("descartar
          esta alteração?") não deixa a advogada avaliar o que está perdendo —
          e aqui não há como recuperar depois. */}
      <Modal
        open={Boolean(descarteAberto)}
        title="Descartar alteração"
        message={descarteAberto ? mensagemDeDescarte(descarteAberto) : ''}
        variant="danger"
        confirmLabel="Descartar"
        onConfirm={confirmarDescarte}
        onCancel={() => setDescarteAberto(null)}
      />
    </div>
  );
}

export default PendenciasPage;
