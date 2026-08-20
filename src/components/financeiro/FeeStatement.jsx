import React, { useState, useEffect } from 'react';
import feeService from '../../api/feeService';
import Loading from '../common/Loading';
import EmptyState from '../ui/EmptyState';
import Paginador from '../ui/Paginador';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import {
  rotuloDoEvento,
  tomDoEvento,
  temValor,
  vinculoDoEvento,
  pagamentoDoEvento,
  podeAnular,
  referenciaDaLinhaDePagamento,
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
// ── De "Carregar mais" para PAGINADOR (F-1b.3) ────────────────────────────
// A F-1b acumulava: o extrato se lê de cima para baixo, como história, e
// trocar de página no meio de uma história obriga a lembrar o que ficou na
// anterior. O argumento continua verdadeiro para quem LÊ a história inteira.
//
// O que ele não cobre é quem procura UM lançamento — que é a pergunta desta
// fase. Com "carregar mais", chegar ao evento mais antigo de um honorário com
// duzentos movimentos custa dez cliques e uma lista de duzentas linhas na
// tela; e não há como VOLTAR, porque não existe posição para onde voltar.
//
// O paginador é o mesmo componente das três listagens financeiras — um lugar
// só onde as contas de página vivem. A ordem continua sendo a do backend, e a
// tela continua não mesclando, não ordenando e não somando.
// ═══════════════════════════════════════════════════════════════════════════

const POR_PAGINA = 20;

function FeeStatement({ feeId, onEstornar, onAnular, recarregar = 0 }) {
  const [eventos, setEventos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Um estorno acabou de ser registrado (o pai mudou `recarregar`), ou o
  // honorário mudou: a leitura volta para a página 1. Ficar na página 4 de um
  // extrato que acabou de ganhar um evento mostraria uma janela deslocada
  // sobre uma história que mudou de tamanho.
  useEffect(() => { setPage(1); }, [feeId, recarregar]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');
    feeService.getStatement(feeId, { page, limit: POR_PAGINA })
      .then((res) => {
        if (!ativo) return;
        setEventos(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch((err) => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao carregar o extrato.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => { ativo = false; };
  }, [feeId, recarregar, page]);

  // `<Loading />` em toda leitura — regra do projeto. Aqui o `return`
  // antecipado é legítimo, e a diferença com as LISTAGENS é a razão de ele
  // continuar: o extrato não tem controle de filtro nenhum dentro de si, então
  // não há input para desmontar. É a causa do defeito do passo 155, e não a
  // forma dele, que a regra proíbe.
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
                {/* A MESMA identidade que o vínculo das alocações escreve
                    (DEC-045): valor, forma, data e — como desempate — o sufixo
                    do id, tudo saindo de `identidadeDoPagamento`. Um formato
                    só, para as duas linhas se casarem quando a advogada olha a
                    tela. Dois formatos para a mesma coisa não seriam
                    referência: foi exatamente esse o defeito do passo 166. */}
                {pagamentoId && evento.tipo === 'pagamento' && (
                  <span className="extrato__ref">
                    Pagamento {referenciaDaLinhaDePagamento(evento)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <Paginador
        page={page}
        limit={POR_PAGINA}
        total={total}
        rotulo="movimentação"
        onMudarPagina={setPage}
      />
    </div>
  );
}

export default FeeStatement;
