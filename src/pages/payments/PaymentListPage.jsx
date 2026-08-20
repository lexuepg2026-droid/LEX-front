import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import feeService from '../../api/feeService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Paginador from '../../components/ui/Paginador';
import ActionMenu from '../../components/ui/ActionMenu';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import { descricaoDoRecorteFinanceiro } from '../../components/financeiro/filterSummary.js';
import useListFilters from '../../hooks/useListFilters';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { FORMA_PAGAMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { rotuloDasParcelas, temEstorno, estornadoIntegralmente } from './paymentRow.js';
import ReversalModal from '../../components/financeiro/ReversalModal';
import '../../styles/modules.css';

const POR_PAGINA = 20;

function PaymentListPage({ embedded = false }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  // Um recibo por vez, por id: sem isso o botão de TODAS as linhas ficaria em
  // "Baixando…" enquanto um só está sendo gerado.
  const [reciboEmCurso, setReciboEmCurso] = useState(null);
  // O id do pagamento cujo modal de estorno está aberto (F-1b).
  const [estornoAberto, setEstornoAberto] = useState(null);
  // ── O modo "desativados" SAIU na F-1a ────────────────────────────────────
  //
  // Ele existia para a rota de reativação ter porta de entrada na interface. A
  // rota morreu (DEC-034) e o pagamento deixou de ser desativável: desfazer
  // entrada é ESTORNO, e o pagamento estornado continua na listagem — com o
  // valor líquido dizendo quanto dele ainda vale.
  const [total, setTotal] = useState(0);
  // Os honorários que alimentam o seletor. Carregados uma vez: a lista muda
  // devagar, e recarregá-la a cada consulta de pagamento faria duas chamadas
  // por tecla digitada na busca.
  const [honorarios, setHonorarios] = useState([]);

  // ── O teto 100 + "Mostrando N de M" SAIU (F-1b.3) ───────────────────────
  //
  // A tela pedia 100 (o teto da API) e avisava quando o conjunto era maior,
  // sugerindo "use os filtros". Era honesto e não era navegação: quem tinha
  // 137 pagamentos não tinha como chegar no 101º. Agora são 20 por página e um
  // paginador de verdade — e os filtros que o aviso mandava usar existem.
  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters({ formaPagamento: '' });

  useEffect(() => {
    let ativo = true;
    feeService.listFees({ page: 1, limit: 100 })
      .then((res) => { if (ativo) setHonorarios(res.data.data ?? res.data ?? []); })
      // Falhar ao carregar o seletor NÃO derruba a listagem: o filtro por
      // honorário some, a busca por texto continua respondendo à mesma
      // pergunta, e a tela principal segue de pé.
      .catch(() => { if (ativo) setHonorarios([]); });
    return () => { ativo = false; };
  }, []);

  // Uma função só para as duas ocasiões de ler a lista: a consulta e a volta
  // do modal de estorno. Duplicar a chamada faria as duas divergirem no dia em
  // que um filtro novo entrasse.
  const carregarPagamentos = useCallback(({ comSpinner }) => {
    if (comSpinner) setLoading(true);
    setError('');
    return paymentService.listPayments({
      page,
      limit: POR_PAGINA,
      processoId,
      honorarioId: filtros.honorarioId || undefined,
      formaPagamento: filtros.formaPagamento || undefined,
      busca: buscaDebounced || undefined,
      de: filtros.de || undefined,
      ate: filtros.ate || undefined
    })
      .then(res => {
        const corpo = res.data;
        setPayments(corpo.data ?? corpo);
        setTotal(typeof corpo.total === 'number' ? corpo.total : 0);
      })
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar pagamentos.')))
      .finally(() => { if (comSpinner) setLoading(false); });
  }, [
    processoId, page, buscaDebounced,
    filtros.honorarioId, filtros.formaPagamento, filtros.de, filtros.ate
  ]);

  useEffect(() => {
    carregarPagamentos({ comSpinner: true });
  }, [carregarPagamentos]);

  // ── `handleReativar`, `confirmDelete` e `handleRemove` SAÍRAM na F-1a ────
  //
  // As três rotas por trás delas morreram: `PATCH /:id/reativar` e
  // `DELETE /:id` respondem 404 desde a DEC-032/DEC-034.
  //
  // Não há "Remover pagamento" porque um registro de dinheiro não se apaga —
  // ele se ESTORNA, e o estorno diz QUANDO e POR QUÊ o valor voltou.

  // ── Recibo ────────────────────────────────────────────────────────────────
  //
  // Blob + <a download> temporário, com o nome vindo do `Content-Disposition`
  // (`api/paymentService.js`). Não se abre a URL crua em nova aba: o cookie é
  // httpOnly e quem o carrega é o axios, e um pagamento desativado mostraria a
  // tela de erro do navegador em vez da mensagem tratada.
  const baixarRecibo = async (id) => {
    setReciboEmCurso(id);
    try {
      const { nome } = await paymentService.baixarEsalvarRecibo(id);
      toast.success(`Recibo baixado: ${nome}`);
    } catch (err) {
      // 404 quando o pagamento (ou a parcela, o honorário, o processo) está
      // desativado. Recibo de pagamento estornado é justamente o papel que não
      // pode existir.
      toast.error(getFinancialErrorMessage(err, 'Não foi possível gerar o recibo.'));
    } finally {
      setReciboEmCurso(null);
    }
  };

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

  const recorte = descricaoDoRecorteFinanceiro({
    filtros,
    busca: buscaDebounced,
    honorarios,
    extras: [
      filtros.formaPagamento
        ? `pagos em ${labelDe(FORMA_PAGAMENTO_OPTIONS, filtros.formaPagamento).toLowerCase()}`
        : null
    ]
  });

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <FinancialFilters
        filtros={filtros}
        definirFiltro={definirFiltro}
        aplicarPreset={aplicarPreset}
        limpar={limpar}
        temFiltro={temFiltro}
        honorarios={honorarios}
        descricaoDoRecorte={recorte}
      >
        <select
          value={filtros.formaPagamento}
          onChange={e => definirFiltro('formaPagamento', e.target.value)}
          aria-label="Forma de pagamento"
        >
          <option value="">Todas as formas</option>
          {FORMA_PAGAMENTO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FinancialFilters>

      {loading ? (
        <Loading />
      ) : payments.length === 0 ? (
        // O estado vazio DIZ o que está filtrando (F-1b.3): "nenhum
        // recebimento encontrado" numa tela com três filtros ativos faz
        // procurar o pagamento em vez de olhar os controles.
        <EmptyState
          title="Nenhum recebimento encontrado"
          description={
            temFiltro
              ? `Nenhum pagamento ${recorte}. Limpe os filtros para ver a lista inteira.`
              : 'Registre um novo pagamento para vê-lo aqui.'
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`.
              "Observações" é texto livre digitado pela advogada, sem teto: era
              a coluna mais exposta ao defeito que a fase corrigiu. */}
          <table className="data-table data-table--fixed">
            {/* ── As larguras, e o que a F-1b.2 corrigiu ──────────────────
                "Honorário" era `col-xs` (100 px) e cortava em ~8 caracteres:
                como quase toda descrição começa por "Honorários advocatícios",
                a coluna inteira dizia "Honorári…" e não distinguia linha
                nenhuma. "Líquido" era `col-xs` pelo mesmo motivo e saía
                "R$ 3.50…".

                Dinheiro vai em `col-money`, data em `col-data`, e o texto
                livre ("Processo", "Aplicado em", "Forma") fica `auto`: é ele
                que cede espaço quando a tabela não cabe, porque é o único que
                tem `title` devolvendo o texto inteiro.

                ── F-1b.3 ─────────────────────────────────────────────────
                A coluna de ações era `col-acoes-2-lg` (230 px) e carregava
                TRÊS botões — o terceiro ficava fora da tela. Agora é
                `col-acoes-menu`: um botão de três pontos, largura fixa,
                imune ao número de ações. */}
            <colgroup>
              <col className="col-lg" />
              <col />
              <col />
              <col className="col-money" />
              <col className="col-money" />
              <col className="col-data" />
              <col />
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                {/* "Parcela" virou "Honorário" na primeira coluna: o pagamento
                    deixou de pertencer a UMA parcela (DEC-032). Quais parcelas
                    ele tocou sai na coluna "Aplicado em", que pode dizer duas. */}
                <th>Honorário</th>
                <th>Processo</th>
                <th>Aplicado em</th>
                <th>Valor</th>
                <th>Líquido</th>
                <th>Data</th>
                <th>Forma</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const liquido = p.valorLiquido ?? p.valor;
                return (
                <tr key={p._id}>
                  {/* Do pagamento ao honorário (F-1b). */}
                  {/* O TRECHO DISTINTIVO, não a descrição inteira (F-1b.2):
                      "Honorários advocatícios — " é prefixo de quase toda
                      linha, e era só ele que cabia na coluna. O texto integral
                      continua no `title` e na página para onde o link leva. */}
                  <td className="cell-truncate" title={p.honorarioId?.descricao ?? undefined}>
                    {p.honorarioId?._id ? (
                      <Link to={`/dashboard/honorarios/${p.honorarioId._id}`} className="link-interno">
                        {rotuloCurtoDoHonorario(p.honorarioId.descricao)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="cell-truncate" title={p.honorarioId?.processoId?.titulo ?? undefined}>{p.honorarioId?.processoId?.titulo ?? '—'}</td>
                  <td className="cell-truncate" title={rotuloDasParcelas(p)}>{rotuloDasParcelas(p)}</td>
                  <td className="cell-num">{formatCurrency(p.valor)}</td>
                  {/* O líquido é o que ainda vale depois dos estornos. Exibido
                      ao lado do bruto, e não no lugar dele: os dois números são
                      fatos distintos, e trocar um pelo outro apagaria a
                      informação de que houve estorno. */}
                  <td className={`cell-num${temEstorno(p) ? ' valor-estornado' : ''}`}>
                    {formatCurrency(liquido)}
                    {/* O BADGE (F-1b.2). "R$ 0,00" sozinho no líquido é um
                        número correto e mudo: não diz se o pagamento foi
                        estornado, se foi lançado errado ou se a tela falhou.
                        O rótulo sai do `statusVisual`, como todo rótulo de
                        estado desde a 4.3 — nunca de string escrita aqui. */}
                    {estornadoIntegralmente(p) && (
                      <StatusBadge status="estornado_integralmente" />
                    )}
                  </td>
                  <td>{formatDate(p.data)}</td>
                  <td className="cell-truncate">{labelDe(FORMA_PAGAMENTO_OPTIONS, p.formaPagamento)}</td>
                  <td className="actions-cell actions-cell--menu">
                    {/* ── A NOTA "sem recibo" FICA FORA DO MENU (F-1b.3) ──
                        Pagamento integralmente estornado não tem recibo: a
                        rota responde 404 de propósito. A nota que explica isso
                        é EXPLICAÇÃO, não ação — escondê-la dentro do menu
                        devolveria o buraco silencioso que a F-1b fechou, com
                        um passo a mais: a advogada teria de abrir um menu para
                        descobrir por que falta um botão. */}
                    {liquido <= 0 && (
                      <span className="sem-recibo" title="A emissão de recibo é recusada pelo servidor para pagamento sem valor líquido.">
                        sem recibo
                      </span>
                    )}
                    <ActionMenu
                      rotulo={`Ações do pagamento de ${formatCurrency(p.valor)}`}
                      itens={[
                        // Recibo e estorno só existem enquanto sobra líquido —
                        // a mesma regra de antes, agora dentro do menu.
                        ...(liquido > 0
                          ? [
                              {
                                rotulo: reciboEmCurso === p._id ? 'Baixando…' : 'Baixar recibo',
                                onSelecionar: () => baixarRecibo(p._id),
                                desabilitado: reciboEmCurso === p._id
                              },
                              {
                                // Estornar a partir da LINHA do pagamento
                                // (F-1b): é onde a advogada está quando percebe
                                // que o dinheiro voltou.
                                rotulo: 'Estornar',
                                onSelecionar: () => setEstornoAberto(p._id)
                              }
                            ]
                          : []),
                        { rotulo: 'Editar', to: `/dashboard/pagamentos/editar/${p._id}` }
                      ]}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* O paginador fica FORA do `loading`: some-lo durante a consulta faria
          a página pular a cada clique em "Próxima". */}
      {!loading && total > 0 && (
        <Paginador
          page={page}
          limit={POR_PAGINA}
          total={total}
          rotulo="pagamento"
          onMudarPagina={setPage}
        />
      )}
    </>
  );

  // O modal é montado UMA vez para a tela, e não uma por linha: são dezenas de
  // linhas, e o estado (`aberto`, `pagamentoId`) é da tela, não da linha.
  const modal = (
    <ReversalModal
      open={Boolean(estornoAberto)}
      pagamentoId={estornoAberto}
      onFechar={() => setEstornoAberto(null)}
      onConcluido={async (mensagem) => {
        setEstornoAberto(null);
        toast.success(mensagem);
        // Sem spinner: trocar a lista inteira por um `<Loading />` depois de um
        // estorno faria a advogada perder de vista a linha que ela acabou de
        // mexer. Os números se atualizam no lugar.
        await carregarPagamentos({ comSpinner: false });
      }}
    />
  );

  if (embedded) return <>{body}{modal}</>;

  return (
    <div className="module-container">
      <PageHeader title="Pagamentos" actionLabel="+ Novo Pagamento" actionTo="/dashboard/pagamentos/novo" />
      {body}
      {modal}
    </div>
  );
}

export default PaymentListPage;
