import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import feeService from '../../api/feeService';
import Loading from '../../components/common/Loading';
import StatusBadge from '../../components/ui/StatusBadge';
import FeeStatement from '../../components/financeiro/FeeStatement';
import ReversalModal from '../../components/financeiro/ReversalModal';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import { TIPO_HONORARIO_OPTIONS, labelDe } from '../../utils/enums';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { toast } from '../../utils/toast';
import { usePublicarBreadcrumb } from '../../contexts/BreadcrumbContext';
import '../../styles/modules.css';
import './FeeDetailPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// A PÁGINA DO HONORÁRIO — Fase F-1b
//
// ── O problema que ela resolve ────────────────────────────────────────────
// Até aqui, para ver os pagamentos de um honorário era preciso saber o NÚMERO
// DA PARCELA: a listagem de pagamentos filtra por parcela, e a ficha do
// processo mostra a árvore inteira do processo, com todos os honorários
// juntos. A advogada não deveria ter de lembrar que "aquele PIX de maio caiu
// na parcela 2" para achar o dinheiro de uma cobrança.
//
// Esta página é a cobrança vista de dentro: o que foi contratado, o que
// entrou, o que falta, quais parcelas existem e a linha do tempo inteira.
//
// ── Não há item de menu novo ──────────────────────────────────────────────
// Ela se alcança pelos LINKS: o nome do honorário virou link em todas as
// telas onde ele aparece (Parte 6). Um item de menu apontando para uma
// listagem que já existe seria superfície nova para reduzir clique nenhum.
//
// ── Uma leitura para o cabeçalho ──────────────────────────────────────────
// `GET /fees/:id` passou a devolver processo, cliente, totais e parcelas
// (F-1b). O extrato é a segunda chamada, e é paginado — são perguntas com
// cardinalidade diferente, e juntá-las faria a página esperar pelo extrato
// inteiro para desenhar o cabeçalho.
//
// ── A tela não faz conta ──────────────────────────────────────────────────
// Os quatro números vêm de `totais`, calculados por `services/feeTotals.js`,
// o MESMO módulo que a ficha do processo usa. Somar aqui abriria a segunda
// fonte de verdade que a DEC-040 fechou.
// ═══════════════════════════════════════════════════════════════════════════

function FeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [honorario, setHonorario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // O modal de estorno é aberto a partir da linha do extrato. `estorno`
  // preenchido = modo anulação.
  const [modal, setModal] = useState(null);
  // Muda para forçar o extrato a recarregar depois de um estorno.
  const [versaoDoExtrato, setVersaoDoExtrato] = useState(0);

  // A trilha do cabeçalho passa a dizer o NOME da cobrança:
  // "LEX › Honorários › Assessoria tributária". Enquanto o GET não volta, o
  // "Detalhe" genérico continua no lugar — nunca um rótulo em branco.
  usePublicarBreadcrumb(honorario?.descricao ?? null);

  const carregar = useCallback(async () => {
    setError('');
    try {
      const res = await feeService.getFeeById(id);
      setHonorario(res.data);
    } catch (err) {
      setError(getFinancialErrorMessage(err, 'Falha ao carregar o honorário.'));
    }
  }, [id]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    feeService.getFeeById(id)
      .then((res) => { if (ativo) setHonorario(res.data); })
      .catch((err) => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao carregar o honorário.'));
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [id]);

  const aoConcluirEstorno = async (mensagem) => {
    setModal(null);
    toast.success(mensagem);
    // Estorno mexe nos totais E no extrato: as duas leituras são refeitas.
    // Recarregar só uma deixaria o cabeçalho afirmando um recebido que o
    // extrato logo abaixo já desmente.
    await carregar();
    setVersaoDoExtrato((v) => v + 1);
  };

  if (loading) return <Loading />;

  if (error) return <p className="error-message">{error}</p>;
  if (!honorario) return null;

  const { totais, cliente, processoId: processo, parcelas = [] } = honorario;

  return (
    <div className="module-container honorario-page">
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <header className="honorario-cabecalho">
        <div className="honorario-cabecalho__titulo">
          <h1 className="page-title">{honorario.descricao}</h1>
          <StatusBadge status={honorario.status} />
        </div>

        <p className="honorario-cabecalho__tipo">
          {labelDe(TIPO_HONORARIO_OPTIONS, honorario.tipo)}
          {/* Percentual mostra o percentual E o valor base: só o percentual
              não diz quanto é, e só o valor não diz de onde saiu. */}
          {honorario.percentual != null && (
            <> — {formatPercent(honorario.percentual)} sobre {formatCurrency(honorario.valorBase)}</>
          )}
          {honorario.dataVencimento && <> · vence em {formatDate(honorario.dataVencimento)}</>}
        </p>

        {/* Processo e cliente CLICÁVEIS: são as duas perguntas seguintes de
            quem está olhando uma cobrança, e ficar sem link obrigaria a voltar
            ao menu e procurar pelo nome. */}
        <p className="honorario-cabecalho__contexto">
          {processo?._id ? (
            <Link to={`/dashboard/processos/detalhe/${processo._id}`} className="link-interno">
              {processo.titulo || processo.numeroProcesso || 'Processo'}
            </Link>
          ) : (
            <span>—</span>
          )}
          {cliente?._id && (
            <>
              {' · '}
              <Link to={`/dashboard/clientes/detalhe/${cliente._id}`} className="link-interno">
                {cliente.nome}
              </Link>
            </>
          )}
        </p>

        {/* ── Os quatro números (DEC-040) ────────────────────────────────
            "Saldo adiantado" aparece NOMEADO e à parte — nunca dentro de
            recebido, nunca abatendo o em aberto. */}
        <div className="honorario-totais">
          <div className="honorario-total">
            <span className="honorario-total__rotulo">Contratado</span>
            <strong className="honorario-total__valor">{formatCurrency(totais?.contratado)}</strong>
          </div>
          <div className="honorario-total">
            <span className="honorario-total__rotulo">Recebido</span>
            <strong className="honorario-total__valor">{formatCurrency(totais?.pago)}</strong>
          </div>
          <div className="honorario-total">
            <span className="honorario-total__rotulo">Em aberto</span>
            <strong className="honorario-total__valor">{formatCurrency(totais?.emAberto)}</strong>
          </div>
          {/* Só quando existe: uma linha "R$ 0,00" em todo honorário sem
              crédito seria ruído. Quando existe, precisa aparecer — é ela que
              explica por que o em aberto não é "contratado menos recebido". */}
          {totais?.saldoAdiantado > 0 && (
            <div className="honorario-total honorario-total--credito">
              <span className="honorario-total__rotulo">Saldo adiantado</span>
              <strong className="honorario-total__valor">{formatCurrency(totais.saldoAdiantado)}</strong>
            </div>
          )}
        </div>
      </header>

      {/* ── 1. Parcelas ────────────────────────────────────────────────── */}
      <section className="honorario-bloco">
        <h2 className="honorario-bloco__titulo">
          Parcelas
          {honorario.contagemParcelas?.total > 0 && (
            <span className="honorario-bloco__contagem">
              {honorario.contagemParcelas.total}
            </span>
          )}
        </h2>

        {parcelas.length === 0 ? (
          <p className="honorario-vazio">
            Sem parcelas cadastradas. Enquanto não houver, este honorário conta
            como não recebido — e um pagamento registrado aqui fica como saldo
            adiantado até a primeira parcela nascer.
          </p>
        ) : (
          <ul className="honorario-parcelas">
            {parcelas.map((p) => {
              // Parcela SUBSTITUÍDA por reparcelamento: no banco é `cancelado`
              // com o vínculo preenchido, e a leitura é outra — foi
              // substituída, não desfeita. Mesma regra da ficha (F-1a.1).
              const reparcelada = Boolean(p.reparcelamentoId);
              return (
                <li
                  key={p._id}
                  className={`honorario-parcela${reparcelada ? ' honorario-parcela--reparcelada' : ''}`}
                >
                  <div className="honorario-parcela__linha">
                    <Link
                      to={`/dashboard/parcelas/editar/${p._id}`}
                      className="honorario-parcela__numero link-interno"
                    >
                      Parcela {p.numeroParcela}
                    </Link>
                    <span className="honorario-parcela__valores">
                      {formatCurrency(p.valor)}
                      {' · recebido '}{formatCurrency(p.valorPago)}
                      {/* O "em aberto" some na reparcelada, e só nela: ela não
                          é dívida viva, foi substituída por outras. */}
                      {!reparcelada && (
                        <>
                          {' · em aberto '}
                          <strong>{formatCurrency(p.emAberto)}</strong>
                        </>
                      )}
                    </span>
                    <span className="honorario-parcela__data">
                      vence {formatDate(p.dataVencimento)}
                    </span>
                    <StatusBadge status={reparcelada ? 'reparcelada' : p.status} />
                  </div>

                  {reparcelada && (
                    <p className="honorario-parcela__reparcelada">
                      Substituída pelo reparcelamento
                      {p.reparceladaEm ? ` de ${formatDate(p.reparceladaEm)}` : ''}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── 2. Extrato ─────────────────────────────────────────────────── */}
      <section className="honorario-bloco">
        <h2 className="honorario-bloco__titulo">Extrato</h2>
        <FeeStatement
          feeId={id}
          recarregar={versaoDoExtrato}
          onEstornar={(evento) => setModal({ pagamentoId: evento.pagamentoId })}
          onAnular={(evento) =>
            setModal({
              pagamentoId: evento.pagamentoId,
              estorno: { _id: evento.estornoId, valor: evento.valor },
            })
          }
        />
      </section>

      {/* ── 3. Ações, onde a decisão acontece ──────────────────────────── */}
      <section className="honorario-bloco honorario-acoes">
        <h2 className="honorario-bloco__titulo">Ações</h2>
        <div className="honorario-acoes__botoes">
          {/* Já com o honorário pré-selecionado: chegar ao formulário e ter de
              procurar de novo a cobrança que se estava olhando é o clique que
              esta fase existe para eliminar. */}
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--md"
            onClick={() => navigate(`/dashboard/pagamentos/novo?honorarioId=${id}`)}
          >
            Registrar pagamento
          </button>

          {/* Desabilitado COM EXPLICAÇÃO. Um botão morto sem texto faz a
              advogada clicar de novo achando que travou; a data diz que a
              função existe e está a caminho. */}
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            disabled
            title="O reparcelamento ponta a ponta chega na F-1c."
          >
            Reparcelar
          </button>
          <span className="honorario-acoes__nota">
            O reparcelamento ainda não tem tela: o backend já reparcela
            (DEC-037) e o fluxo completo chega na fase F-1c.
          </span>
        </div>
      </section>

      <ReversalModal
        open={Boolean(modal)}
        pagamentoId={modal?.pagamentoId}
        estorno={modal?.estorno}
        onFechar={() => setModal(null)}
        onConcluido={aoConcluirEstorno}
      />
    </div>
  );
}

export default FeeDetailPage;
