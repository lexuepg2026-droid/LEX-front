import React, { useState, useEffect, useCallback } from 'react';
import feeService from '../../api/feeService';
import Loading from '../common/Loading';
import EmptyState from '../ui/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import {
  rotuloDoEvento,
  tomDoEvento,
  temValor,
  vinculoDoEvento,
  pagamentoDoEvento,
  podeAnular,
  refDoPagamento,
  eventoAtenuado,
} from './statementEntry.js';
import './FeeStatement.css';

// ═══════════════════════════════════════════════════════════════════════════
// A LINHA DO TEMPO DO HONORÁRIO — Fase F-1b
//
// Renderiza `GET /fees/:id/statement`: pagamentos, estornos, anulações,
// alocações, desalocações, reparcelamentos e mudanças de status, mesclados por
// data pelo backend.
//
// ── A tela não mescla, não ordena e não soma ──────────────────────────────
// O backend já entrega os eventos ordenados por data, com os vínculos
// resolvidos. Reordenar aqui seria a segunda regra sobre a mesma pergunta — e
// no dia em que o extrato ganhasse página 2, a ordem seria a da página, não a
// do honorário.
//
// ── "Carregar mais", e não paginador ──────────────────────────────────────
// O contrato é paginado (`page`/`limit`, padrão da F-0) e o PAGINADOR REAL é
// da F-1b.2 — junto com os filtros e a barra de busca, que são a mesma
// família de trabalho. Aqui o padrão honesto é acumular: o extrato se lê de
// cima para baixo, como história, e trocar de página no meio de uma história
// obriga a lembrar o que ficou na anterior.
//
// O botão só aparece quando há mais o que carregar, e diz quantos faltam —
// silêncio no lugar dele seria uma lista curta com cara de completa, que é
// exatamente o defeito que a F-0 corrigiu nas listagens.
// ═══════════════════════════════════════════════════════════════════════════

const POR_PAGINA = 20;

function FeeStatement({ feeId, onEstornar, onAnular, recarregar = 0 }) {
  const [eventos, setEventos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState('');

  const carregar = useCallback(async (pagina, { acumular }) => {
    try {
      const res = await feeService.getStatement(feeId, { page: pagina, limit: POR_PAGINA });
      const { data, total: quantos } = res.data;
      setTotal(quantos ?? 0);
      setEventos((anteriores) => (acumular ? [...anteriores, ...data] : data));
      setPage(pagina);
    } catch (err) {
      setError(getFinancialErrorMessage(err, 'Falha ao carregar o extrato.'));
    }
  }, [feeId]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');
    // A primeira página SEMPRE recomeça a lista: quando o pai manda recarregar
    // (um estorno acabou de ser registrado), acumular por cima deixaria o
    // evento antigo e o novo lado a lado, contando o mesmo fato duas vezes.
    feeService.getStatement(feeId, { page: 1, limit: POR_PAGINA })
      .then((res) => {
        if (!ativo) return;
        setEventos(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
        setPage(1);
      })
      .catch((err) => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao carregar o extrato.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => { ativo = false; };
  }, [feeId, recarregar]);

  const carregarMais = async () => {
    setCarregandoMais(true);
    await carregar(page + 1, { acumular: true });
    setCarregandoMais(false);
  };

  // `<Loading />` em toda leitura — regra do projeto. Só na PRIMEIRA: trocar a
  // lista inteira por um spinner ao carregar mais faria a advogada perder o
  // ponto onde estava lendo.
  if (loading) return <Loading />;

  if (error) return <p className="error-message">{error}</p>;

  // Estado vazio com frase própria, nunca tabela em branco.
  if (eventos.length === 0) {
    return (
      <EmptyState
        title="Nenhuma movimentação registrada"
        description="Quando houver pagamento, estorno ou reparcelamento neste honorário, a linha do tempo aparece aqui."
      />
    );
  }

  const faltam = total - eventos.length;

  return (
    <div className="extrato">
      <ol className="extrato__lista">
        {eventos.map((evento) => {
          const vinculo = vinculoDoEvento(evento);
          const pagamentoId = pagamentoDoEvento(evento);
          // DEC-044: a linha que não vale mais é ATENUADA, e a frase do
          // vínculo diz por quê. Atenuar em vez de esconder — o extrato é
          // rastreabilidade, e sumir com a linha apagaria o fato de a
          // alocação ter existido.
          const atenuado = eventoAtenuado(evento);
          return (
            <li
              key={evento.id}
              className={
                `extrato__item extrato__item--${tomDoEvento(evento.tipo)}` +
                (atenuado ? ' extrato__item--desfeita' : '')
              }
            >
              <div className="extrato__cabecalho">
                <span className="extrato__tipo">{rotuloDoEvento(evento.tipo)}</span>
                <span className="extrato__data">{formatDate(evento.data)}</span>
                {/* Mudança de status não move dinheiro: o backend manda
                    `valor: null` e a linha fica sem número, em vez de exibir
                    "R$ 0,00" — que seria afirmar que zero reais mudaram de
                    lugar. */}
                {temValor(evento) && (
                  <span className="extrato__valor">{formatCurrency(evento.valor)}</span>
                )}
              </div>

              <p className="extrato__descricao">{evento.descricao}</p>

              {/* O VÍNCULO. É o que separa extrato de lista — ver o cabeçalho
                  de `statementEntry.js`. */}
              {vinculo && <p className="extrato__vinculo">{vinculo}</p>}

              <div className="extrato__acoes">
                {/* Estornar a partir da linha do pagamento (Parte 5): a ação
                    mora onde a decisão acontece, e não numa tela adiante. */}
                {evento.tipo === 'pagamento' && onEstornar && (
                  <button
                    type="button"
                    className="btn-action btn-edit"
                    onClick={() => onEstornar(evento)}
                  >
                    Estornar
                  </button>
                )}
                {/* Anular o estorno pelo extrato — o caminho que a própria
                    mensagem do backend indica ("para desfazer um estorno,
                    anule-o pelo extrato"). */}
                {podeAnular(evento) && onAnular && (
                  <button
                    type="button"
                    className="btn-action btn-edit"
                    onClick={() => onAnular(evento)}
                  >
                    Anular estorno
                  </button>
                )}
                {/* A mesma referência curta que o vínculo das alocações usa
                    (DEC-044): um formato só, vindo de `refDoPagamento`. Dois
                    formatos para a mesma coisa não seriam referência. */}
                {pagamentoId && evento.tipo === 'pagamento' && (
                  <span className="extrato__ref">Pagamento {refDoPagamento(pagamentoId)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {faltam > 0 && (
        <div className="extrato__mais">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={carregarMais}
            disabled={carregandoMais}
          >
            {carregandoMais ? 'Carregando…' : `Carregar mais (${faltam} restantes)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default FeeStatement;
