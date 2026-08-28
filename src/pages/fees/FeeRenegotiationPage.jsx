import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import feeService from '../../api/feeService';
import Loading from '../../components/common/Loading';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import MoneyInput from '../../components/ui/MoneyInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { toast } from '../../utils/toast';
import { usePublicarBreadcrumb } from '../../contexts/BreadcrumbContext';
import { rotuloNaLista } from '../../components/financeiro/installmentLabel';
import {
  montarPlano,
  diferencaDoPlano,
  particionarParcelas
} from './renegotiationPlan.js';
import '../../styles/modules.css';
import './FeeRenegotiationPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';

// ═══════════════════════════════════════════════════════════════════════════
// A TELA DO REPARCELAMENTO — DEC-049 (Fase F-1c.2)
//
// ── O que ela liga ───────────────────────────────────────────────────────
// O backend reparcela desde a DEC-037 (F-1a). A página do honorário tinha um
// botão "Reparcelar" DESABILITADO, com a promessa de que a tela chegaria.
// **Botão morto numa demonstração é promessa quebrada.**
//
// ── DEC-049: rota dedicada, e não modal ─────────────────────────────────
// Estorno e anulação usam modal, e esta tela DIVERGE do padrão de propósito.
//
// O plano novo tem N linhas editáveis e uma SOMA CORRENTE que precisa ficar
// visível o tempo todo — é ela, e só ela, que decide se o botão pode ser
// apertado. Num modal, N cresce, o corpo rola, e a soma sai da tela justamente
// quando há mais linhas para conferir.
//
// **Modal serve para decisão curta; isto é montagem de plano.** A divergência
// é a decisão, não o descuido — quem for "corrigir" a inconsistência depois
// precisa ler isto antes.
//
// ── A ordem da tela não é arbitrária ────────────────────────────────────
//   1. o SALDO em aberto, que é a âncora — tudo existe em função dele;
//   2. o que SAI (as em aberto, que serão canceladas);
//   3. o que FICA (as pagas, intactas);
//   4. o plano novo, com a soma corrente;
//   5. o motivo;
//   6. a confirmação em português.
//
// O item 3 é o que faz a função ser usada. Sem a lista do que fica, a advogada
// não tem como saber se reparcelar apaga o que o cliente já pagou — e, na
// dúvida, ela não aperta o botão. **A ausência dessa lista é o que faz uma
// função existir e não ser usada.**
//
// ── A tela valida, o backend DECIDE ─────────────────────────────────────
// A conferência da soma aqui é conveniência: ela evita uma viagem e mostra
// QUANTO falta. A autoridade continua sendo o 422 do
// `renegotiationService` — e o `getFinancialErrorMessage` é quem escreve a
// mensagem, nunca um texto inventado nesta tela.
// ═══════════════════════════════════════════════════════════════════════════

// O padrão da tela ao abrir: 3 parcelas, mensais, a partir do mês que vem. É
// um ponto de partida editável, não uma regra — o gerador serve para não
// obrigar a digitar doze datas à mão.
const QUANTIDADE_PADRAO = 3;
const INTERVALO_PADRAO = 1;

const primeiroVencimentoSugerido = () => {
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  const dia = hoje.getUTCDate();
  const total = mes;
  const anoFinal = ano + Math.floor(total / 12);
  const mesFinal = total % 12;
  const ultimo = new Date(Date.UTC(anoFinal, mesFinal + 1, 0)).getUTCDate();
  const diaFinal = String(Math.min(dia, ultimo)).padStart(2, '0');
  return `${anoFinal}-${String(mesFinal + 1).padStart(2, '0')}-${diaFinal}`;
};

function FeeRenegotiationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [honorario, setHonorario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // Os controles do gerador. Mudá-los REGERA as linhas — inclusive por cima de
  // edições manuais, o que é o comportamento certo: quem mexe no gerador está
  // pedindo um plano novo.
  const [quantidade, setQuantidade] = useState(QUANTIDADE_PADRAO);
  const [intervalo, setIntervalo] = useState(INTERVALO_PADRAO);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(primeiroVencimentoSugerido);
  const [motivo, setMotivo] = useState('');

  // As linhas do plano. Estado próprio, e não derivado: cada uma continua
  // EDITÁVEL depois de gerada, e é isso que permite à advogada acertar a
  // quebra com o cliente ("a primeira fica em 350 e as outras em 325").
  const [linhas, setLinhas] = useState([]);

  usePublicarBreadcrumb(honorario ? `Reparcelar — ${honorario.descricao}` : null);

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

  // O SALDO é `totais.emAberto`, e não uma conta desta tela. É a MESMA fórmula
  // que o backend usa para validar (`max(0, contratado − alocado)`, DEC-040) —
  // recalcular aqui abriria a segunda fonte de verdade que a F-1b fechou, e a
  // divergência apareceria como um 422 num plano que a tela dizia estar certo.
  const saldo = Number(honorario?.totais?.emAberto ?? 0);
  const saldoAdiantado = Number(honorario?.totais?.saldoAdiantado ?? 0);

  const { saem, ficam } = useMemo(
    () => particionarParcelas(honorario?.parcelas ?? []),
    [honorario]
  );

  const gerar = useCallback(() => {
    setLinhas(montarPlano({
      saldo,
      quantidade,
      primeiroVencimento,
      intervaloMeses: intervalo
    }));
  }, [saldo, quantidade, primeiroVencimento, intervalo]);

  // Gera o plano assim que o saldo é conhecido. A tela abre com uma proposta
  // pronta em vez de um formulário vazio: o caso comum é aceitar a divisão e
  // ajustar o vencimento.
  useEffect(() => {
    if (saldo > 0) gerar();
  }, [saldo, gerar]);

  const diferenca = useMemo(() => diferencaDoPlano(linhas, saldo), [linhas, saldo]);

  const alterarLinha = (indice, campo, valor) => {
    setLinhas((atuais) =>
      atuais.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha))
    );
  };

  // ── Os motivos para NÃO poder reparcelar, cada um com sua frase ──────────
  // Botão desabilitado sem explicação faz a advogada clicar de novo achando
  // que travou. A frase fica ao lado, sempre.
  const impedimento = (() => {
    if (saldo <= 0) {
      return 'Este honorário não tem saldo em aberto. Não há o que redistribuir ' +
        'entre parcelas novas.';
    }
    if (saem.length === 0) {
      return 'Não há parcela em aberto para reparcelar. Todas as parcelas deste ' +
        'honorário já estão quitadas ou já foram substituídas.';
    }
    if (linhas.length === 0) {
      return 'O saldo em aberto não comporta esta quantidade de parcelas — cada ' +
        'parcela precisa de ao menos um centavo.';
    }
    if (!diferenca.fecha) {
      return `A soma do plano precisa ser igual ao saldo em aberto. Hoje ` +
        `${diferenca.sentido} ${formatCurrency(diferenca.diferenca)}.`;
    }
    if (linhas.some((l) => !l.dataVencimento)) {
      return 'Toda parcela precisa de uma data de vencimento.';
    }
    return null;
  })();

  const confirmar = async () => {
    // Nenhum formulário aceita envio que vai falhar (F-5a, Parte 4): o botão
    // é anunciado como desabilitado, e a recusa acontece aqui, porque
    // `aria-disabled` só ANUNCIA (DEC-053).
    if (!online) return;

    setSalvando(true);
    try {
      await feeService.createRenegotiation(id, {
        parcelas: linhas.map((l) => ({
          valor: Number(l.valor),
          dataVencimento: l.dataVencimento
        })),
        // Campo vazio envia `null`, nunca string vazia (convenção do projeto).
        motivo: motivo.trim() || null
      });
      toast.success('Reparcelamento registrado.');
      // Volta para a página do honorário. O extrato dela abre na página 1 e a
      // linha do reparcelamento é a mais recente — ficar numa página antiga de
      // uma história que acabou de mudar de tamanho mostraria uma janela
      // deslocada (regra da F-1b.3).
      navigate(`/dashboard/honorarios/${id}`);
    } catch (err) {
      setConfirmando(false);
      // A mensagem vem do servidor pelos helpers do projeto. O 422 de soma
      // divergente traz o saldo esperado, e é ele que a advogada precisa ler.
      setError(getFinancialErrorMessage(err, 'Falha ao registrar o reparcelamento.'));
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loading />;
  if (!honorario) return <p className="error-message">{error || 'Honorário não encontrado.'}</p>;

  const parcelas = honorario.parcelas ?? [];

  // A frase da confirmação, em português — não um "tem certeza?". Ela nomeia o
  // que sai, o que nasce e entre que datas: é o resumo que a advogada leria em
  // voz alta para o cliente antes de confirmar.
  const numerosQueSaem = saem.map((p) => p.numeroParcela).join(' e ');
  const somaQueSai = saem.reduce((t, p) => t + Number(p.emAberto || 0), 0);
  const resumoDaConfirmacao =
    `${saem.length} ${saem.length === 1 ? 'parcela em aberto será cancelada' : 'parcelas em aberto serão canceladas'} ` +
    `(nº ${numerosQueSaem}, ${formatCurrency(somaQueSai)}) e ` +
    `${linhas.length} ${linhas.length === 1 ? 'nova nascerá' : 'novas nascerão'}, ` +
    `somando ${formatCurrency(diferenca.soma)}, com ${linhas.length === 1 ? 'vencimento em' : 'vencimentos entre'} ` +
    `${formatDate(linhas[0]?.dataVencimento)}` +
    (linhas.length > 1 ? ` e ${formatDate(linhas[linhas.length - 1]?.dataVencimento)}` : '') +
    '.';

  return (
    <div className="module-container reparcelar-page">
      <header className="reparcelar-cabecalho">
        <h1 className="page-title">Reparcelar</h1>
        <p className="reparcelar-cabecalho__contexto">
          <Link to={`/dashboard/honorarios/${id}`} className="link-interno">
            {honorario.descricao}
          </Link>
          {' · '}
          <StatusBadge status={honorario.status} />
        </p>
      </header>

      {error && <p className="error-message">{error}</p>}

      {/* ── 1. A ÂNCORA ────────────────────────────────────────────────────
          O número que o plano novo precisa somar. Em destaque, com o peso dos
          cartões de resumo: tudo nesta tela existe em função dele. */}
      <section className="reparcelar-bloco reparcelar-saldo">
        <span className="reparcelar-saldo__rotulo">Saldo em aberto</span>
        <strong className="reparcelar-saldo__valor">{formatCurrency(saldo)}</strong>
        <p className="reparcelar-saldo__nota">
          É o que o plano novo precisa somar, exatamente. Reparcelar redistribui
          prazo — não muda o valor devido.
        </p>
      </section>

      {/* ── 2. O QUE SAI ───────────────────────────────────────────────── */}
      <section className="reparcelar-bloco">
        <h2 className="reparcelar-bloco__titulo">O que sai</h2>
        {saem.length === 0 ? (
          <p className="reparcelar-vazio">Nenhuma parcela em aberto.</p>
        ) : (
          <>
            <p className="reparcelar-bloco__nota">
              {saem.length === 1
                ? 'Esta parcela será cancelada e substituída pelo plano novo.'
                : 'Estas parcelas serão canceladas e substituídas pelo plano novo.'}
              {' '}Elas continuam visíveis no histórico, marcadas como
              «Reparcelada» — não são apagadas.
            </p>
            <ul className="reparcelar-lista">
              {saem.map((p) => (
                <li key={p._id} className="reparcelar-lista__item">
                  <span className="reparcelar-lista__numero">
                    {rotuloNaLista(p, parcelas)}
                  </span>
                  <span className="reparcelar-lista__valor">
                    em aberto <strong>{formatCurrency(p.emAberto)}</strong>
                    {Number(p.valorPago) > 0 && (
                      <> · já recebido {formatCurrency(p.valorPago)}</>
                    )}
                  </span>
                  <span className="reparcelar-lista__data">
                    vence {formatDate(p.dataVencimento)}
                  </span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── 3. O QUE FICA ──────────────────────────────────────────────────
          A lista que faz a função ser usada. Ver o cabeçalho do arquivo. */}
      <section className="reparcelar-bloco">
        <h2 className="reparcelar-bloco__titulo">O que fica</h2>
        {ficam.length === 0 ? (
          <p className="reparcelar-vazio">
            Nenhuma parcela quitada neste honorário — não há o que preservar.
          </p>
        ) : (
          <>
            <p className="reparcelar-bloco__nota reparcelar-bloco__nota--tranquila">
              <strong>
                {ficam.length === 1
                  ? 'Esta parcela já foi paga e NÃO será tocada.'
                  : 'Estas parcelas já foram pagas e NÃO serão tocadas.'}
              </strong>
              {' '}O reparcelamento não apaga o que o cliente já pagou: só
              redistribui o que ainda está em aberto.
            </p>
            <ul className="reparcelar-lista reparcelar-lista--intacta">
              {ficam.map((p) => (
                <li key={p._id} className="reparcelar-lista__item">
                  <span className="reparcelar-lista__numero">
                    {rotuloNaLista(p, parcelas)}
                  </span>
                  <span className="reparcelar-lista__valor">
                    {formatCurrency(p.valor)} · recebido {formatCurrency(p.valorPago)}
                  </span>
                  <span className="reparcelar-lista__data">
                    vence {formatDate(p.dataVencimento)}
                  </span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── 4. O PLANO NOVO ────────────────────────────────────────────── */}
      <section className="reparcelar-bloco">
        <h2 className="reparcelar-bloco__titulo">O plano novo</h2>

        <div className="reparcelar-gerador">
          <label className="reparcelar-campo">
            <span>Parcelas</span>
            <input
              type="number"
              min="1"
              max="60"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              disabled={saldo <= 0}
            />
          </label>

          <label className="reparcelar-campo">
            <span>Primeiro vencimento</span>
            <input
              type="date"
              value={primeiroVencimento}
              onChange={(e) => setPrimeiroVencimento(e.target.value)}
              disabled={saldo <= 0}
            />
          </label>

          <label className="reparcelar-campo">
            <span>Intervalo</span>
            <select
              value={intervalo}
              onChange={(e) => setIntervalo(Number(e.target.value))}
              disabled={saldo <= 0}
            >
              <option value={1}>Mensal</option>
              <option value={2}>Bimestral</option>
              <option value={3}>Trimestral</option>
              <option value={6}>Semestral</option>
              <option value={12}>Anual</option>
            </select>
          </label>

          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={gerar}
            disabled={saldo <= 0}
          >
            Recalcular plano
          </button>
        </div>

        {linhas.length > 0 && (
          <ul className="reparcelar-plano">
            {linhas.map((linha, i) => (
              <li
                key={i}
                className={`reparcelar-plano__linha${i === 0 && linhas.length > 1 ? ' reparcelar-plano__linha--quebra' : ''}`}
              >
                <span className="reparcelar-plano__numero">Parcela {i + 1} de {linhas.length}</span>

                <label className="reparcelar-campo">
                  <span className="sr-only">Valor da parcela {i + 1}</span>
                  <MoneyInput
                    id={`valor-${i}`}
                    name={`valor-${i}`}
                    value={linha.valor}
                    onChange={(valor) => alterarLinha(i, 'valor', valor)}
                  />
                </label>

                <label className="reparcelar-campo">
                  <span className="sr-only">Vencimento da parcela {i + 1}</span>
                  <input
                    type="date"
                    value={linha.dataVencimento}
                    onChange={(e) => alterarLinha(i, 'dataVencimento', e.target.value)}
                  />
                </label>

                {/* A sobra da divisão vai para a PRIMEIRA parcela, e ela se
                    identifica na tela: sem a marca, a advogada vê um valor
                    diferente e não sabe se errou ao digitar. */}
                {i === 0 && linhas.length > 1 && linha.valor !== linhas[1]?.valor && (
                  <span className="reparcelar-plano__marca">
                    inclui a sobra da divisão
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* ── A SOMA CORRENTE, sempre visível ─────────────────────────────
            É ela que decide se o botão pode ser apertado, e é por causa dela
            que esta tela não é um modal (DEC-049). A diferença sai NOMEADA em
            reais: a advogada precisa saber quanto ajustar, não que errou. */}
        <div
          className={`reparcelar-soma${diferenca.fecha ? ' reparcelar-soma--fecha' : ' reparcelar-soma--diverge'}`}
          aria-live="polite"
        >
          <span className="reparcelar-soma__linha">
            Soma do plano <strong>{formatCurrency(diferenca.soma)}</strong>
          </span>
          <span className="reparcelar-soma__linha">
            Saldo em aberto <strong>{formatCurrency(saldo)}</strong>
          </span>
          <span className="reparcelar-soma__veredito">
            {diferenca.fecha
              ? 'A soma fecha com o saldo.'
              : `${diferenca.sentido === 'faltam' ? 'Faltam' : 'Sobram'} ${formatCurrency(diferenca.diferenca)}.`}
          </span>
        </div>
      </section>

      {/* ── 5. MOTIVO ──────────────────────────────────────────────────── */}
      <section className="reparcelar-bloco">
        <h2 className="reparcelar-bloco__titulo">Motivo</h2>
        <label className="reparcelar-campo reparcelar-campo--largo">
          <span>Opcional — fica no histórico do honorário</span>
          <textarea
            value={motivo}
            maxLength={500}
            rows={2}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: cliente pediu prazo maior após redução de renda."
          />
        </label>
      </section>

      {/* ── O AVISO DO SALDO ADIANTADO (DEC-036) ────────────────────────
          Se há crédito, ele se auto-aloca nas parcelas novas assim que elas
          nascem — e algumas já aparecem quitadas ou parciais. Sem o aviso, a
          advogada monta um plano de três em aberto e encontra uma já paga. */}
      {saldoAdiantado > 0 && (
        <p className="reparcelar-aviso">
          Este honorário tem <strong>{formatCurrency(saldoAdiantado)}</strong> de
          saldo adiantado. Assim que as parcelas novas nascerem, esse crédito
          será aplicado nelas automaticamente, da primeira em diante — então
          algumas podem já nascer quitadas ou parcialmente pagas.
        </p>
      )}

      <div className="reparcelar-acoes">
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--md"
          disabled={Boolean(impedimento) || salvando}
          aria-disabled={online ? undefined : 'true'}
          onClick={() => {
            if (!online) return;
            setConfirmando(true);
          }}
        >
          Reparcelar
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--secondary ui-btn--md"
          onClick={() => navigate(`/dashboard/honorarios/${id}`)}
        >
          Cancelar
        </button>
        {impedimento && <span className="reparcelar-impedimento">{impedimento}</span>}
        {!online && <OfflineWriteReason />}
      </div>

      {/* ── 6. A CONFIRMAÇÃO, em português ─────────────────────────────── */}
      <Modal
        open={confirmando}
        title="Confirmar reparcelamento"
        message={resumoDaConfirmacao}
        variant="danger"
        confirmLabel={salvando ? 'Reparcelando…' : 'Confirmar'}
        onConfirm={confirmar}
        onCancel={() => setConfirmando(false)}
      />
    </div>
  );
}

export default FeeRenegotiationPage;
