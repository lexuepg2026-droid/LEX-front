import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { List, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import calendarService from '../../api/calendarService';
import Icone from '../../components/ui/Icone';
import LinhaDeData from '../../components/dashboard/LinhaDeData';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import { MENSAGEM_ALTERACAO_NAO_ENVIADA } from '../../offline/outboxMessages';
import { useOutbox } from '../../contexts/OutboxContext';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/common/Loading';
import { formatMonthKey, formatDate } from '../../utils/formatters';
import {
  LEGENDA, classeDaNatureza, destinoDoItem, rotuloDaNatureza,
  MOTIVO_DA_DERIVADA_NAO_EDITAVEL,
} from '../../utils/calendarLabels';
import {
  DIAS_DA_SEMANA, VISTAS, construirGradeDoMes, mesVizinho, lerChaveDoMes,
  mesDaChave, vistaPadrao, recortarCelula, agruparPorDia, diasComItens,
} from './monthGrid';
import {
  NOMES_DOS_MESES, anosDoSeletor, itemRiscado, rotuloDoItemNaGrade, linhaDaAgenda,
} from './agenda.js';
import { toast } from '../../utils/toast';
import { classeDoTom, tipoDaDataDoItem } from '../../utils/tomDaData.js';
import '../../styles/tomDaData.css';
// O botão do estado vazio. Vinha de carona pelo `PageHeader`, que saiu da
// tela na 3.8 (o título e o "+" moram no balão): a folha é importada por quem
// aplica a classe.
import '../../components/ui/Button.css';
import './CalendarPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// A TELA DO CALENDÁRIO — DUAS VISTAS, E A ESTREITA É A QUE IMPORTA
//
// ── O estado que a URL guarda, e por quê ────────────────────────────────
// `?mes=2026-09` e `?vista=mes|agenda` vivem na query string, e não em
// `useState` puro. Três consequências, todas pedidas pela fase:
//
//   • navegar entre meses NÃO PERDE a vista escolhida — ela está no endereço;
//   • o botão "voltar" do navegador desfaz a navegação de mês, que é o que
//     alguém espera depois de clicar em ">" cinco vezes;
//   • um link para "setembro na agenda" existe, e é o que a página do processo
//     e o sino usam para levar a advogada ao dia certo.
//
// ── Grade construída à MÃO ─────────────────────────────────────────────
// Zero dependência nova — e isso inclui não instalar biblioteca de calendário.
// A conta inteira vive em `monthGrid.js`, é função pura e tem teste com
// fevereiro, ano bissexto e mês que começa no domingo.
// ═══════════════════════════════════════════════════════════════════════════

function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [diaAberto, setDiaAberto] = useState(null);
  const { entradas } = useOutbox();
  // Só as pendências DE AGENDA: uma mudança de fase esperando na fila não diz
  // nada sobre esta tela, e avisar por ela treinaria a advogada a ignorar o
  // aviso.
  const temPendenciaDeAgenda = entradas.some((e) => e.operacao !== 'mudarFase');

  // ── A VISTA PADRÃO É DECIDIDA UMA VEZ, PELA LARGURA ───────────────────
  //
  // `vistaPadrao` é função pura e testada: abaixo de 768 px devolve `agenda`.
  // A conta está lá, e não aqui, para que o teste possa provar "em 360 px o
  // padrão é agenda" sem montar componente nenhum.
  //
  // Só vale quando a URL NÃO diz nada: a escolha da advogada ganha sempre da
  // largura, e é ela que sobrevive à navegação entre meses.
  const [vistaInicial] = useState(() =>
    vistaPadrao(typeof window !== 'undefined' ? window.innerWidth : 1024)
  );

  const vistaDaUrl = searchParams.get('vista');
  const vista = VISTAS.includes(vistaDaUrl) ? vistaDaUrl : vistaInicial;

  // O mês da URL, ou — enquanto o backend não disse qual é o "hoje" dele — o do
  // relógio do navegador. Assim que a primeira resposta chega, o mês passa a
  // sair do `hoje` do servidor.
  const mesDaUrl = lerChaveDoMes(searchParams.get('mes'));
  const agora = new Date();
  const { ano, mes } = mesDaUrl ?? { ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() + 1 };

  const grade = useMemo(() => construirGradeDoMes(ano, mes), [ano, mes]);

  const irPara = useCallback(
    (proximo) => {
      const params = new URLSearchParams(searchParams);
      if (proximo.mes !== undefined) {
        params.set('mes', `${proximo.ano}-${String(proximo.mes).padStart(2, '0')}`);
      }
      // A vista é REESCRITA na navegação de mês, e não só quando muda: sem
      // isto, quem chegasse por um link sem `?vista=` e clicasse em ">" perderia
      // a vista implícita da largura e voltaria para a grade em 360 px.
      if (proximo.vista !== undefined) params.set('vista', proximo.vista);
      else params.set('vista', vista);
      setSearchParams(params, { replace: false });
      setDiaAberto(null);
    },
    [searchParams, setSearchParams, vista]
  );

  // O intervalo é o da GRADE, não o do mês: a primeira e a última linha
  // mostram dias vizinhos, e pedir só o mês as deixaria em branco — o que se
  // lê como "não há nada nesse dia", e não como "esse dia é de outro mês".
  //
  // DEC-058 (F-5a): o mês que ela já abriu continua legível sem sinal. As
  // chaves do cache são as datas do intervalo, então cada mês visitado tem a
  // sua entrada — e um mês nunca aberto diz que nunca foi aberto, em vez de
  // aparecer vazio (que se leria como "não há compromissos").
  const { data: dados, loading, error, updatedAt, fromCache } = useCachedResource({
    resource: 'events',
    params: { de: grade.primeiroDia, ate: grade.ultimoDia },
    fetcher: () =>
      calendarService
        .getCalendar({ de: grade.primeiroDia, ate: grade.ultimoDia })
        .then((res) => res.data),
    fallbackError: 'Falha ao carregar a agenda.'
  });

  // `?? []` dentro do `useMemo`, e não fora: um literal `[]` avaliado a cada
  // render é uma referência nova toda vez, e faria o agrupamento refazer-se em
  // toda pintura da tela — inclusive na do mês vazio, que é justamente quando
  // não há nada a agrupar.
  const itens = useMemo(() => dados?.itens ?? [], [dados]);
  const porDia = useMemo(() => agruparPorDia(itens), [itens]);
  const hoje = dados?.hoje ?? null;

  // ── O CLIQUE, e a DEC-055 na tela ────────────────────────────────────
  //
  // Evento próprio abre o formulário. Derivada LEVA À ORIGEM — e diz por quê
  // no caminho, porque uma linha que se comporta diferente sem explicação é
  // lida como tela quebrada.
  const abrirItem = (item) => {
    const destino = destinoDoItem(item);
    if (!destino) return;
    if (item.natureza === 'derivada') toast.info(MOTIVO_DA_DERIVADA_NAO_EDITAVEL);
    navigate(destino);
  };

  // Na vista Agenda a linha é a `LinhaDeData`, um link: a navegação é dele, e
  // a frase da DEC-055 sai no clique, pelo mesmo `toast.info`.
  const avisarDaDerivada = (linha) => {
    if (linha.derivada) toast.info(MOTIVO_DA_DERIVADA_NAO_EDITAVEL);
  };

  // Criar a partir do clique num DIA, com a data já preenchida. É o caminho que
  // faz a grade valer como ferramenta e não só como relatório.
  //
  // Sem sinal ela CONTINUA levando (F-5b): compromisso é uma das duas coisas
  // que a fila aceita, e o formulário avisa lá dentro o que vai acontecer.
  const criarNoDia = (chave) => navigate(`/dashboard/agenda/novo?data=${chave}`);

  const rotuloDoMes = formatMonthKey(grade.chaveDoMes);

  return (
    <div className="cal-page">
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}

      {/* Enquanto houver alteração na fila, a tela onde o registro aparece diz
          que o que está à vista é o do servidor — ver o dado antigo achando que
          é o atual é o mesmo defeito da idade do dado, na F-5a. */}
      {temPendenciaDeAgenda && (
        <p className="cal-pendencia" role="status">
          <Link to="/dashboard/pendencias">{MENSAGEM_ALTERACAO_NAO_ENVIADA}</Link>
        </p>
      )}

      {/* ── O BALÃO DA FIGURA 20 (Fase 3.8, DEC-136) ─────────────────────
          Título, "Hoje", as setas, mês e ano em pílula; à direita a vista e
          o "+". Sem a busca e sem "fins de semana" do desenho dela: busca é
          funcionalidade nova, e a grade mostra sempre os sete dias. */}
      <section className="cal-balao" aria-labelledby="cal-titulo">
        <div className="cal-toolbar">
          <div className="cal-toolbar__esquerda">
            <h1 id="cal-titulo" className="cal-titulo">Agenda</h1>

            {/* "Hoje" sai do backend. O relógio do navegador pode estar
                atrasado, e o botão que leva ao dia de hoje é justamente onde
                isso doeria. */}
            {hoje && (
              <button
                type="button"
                className="cal-pilula"
                onClick={() => irPara(mesDaChave(hoje))}
              >
                Hoje
              </button>
            )}

            <div className="cal-setas">
              <button
                type="button"
                className="cal-seta"
                onClick={() => irPara(mesVizinho(ano, mes, -1))}
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cal-seta"
                onClick={() => irPara(mesVizinho(ano, mes, 1))}
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Mês e ano: `<select>` nativos em pílula, que mudam o `?mes=`
                pelo mesmo `irPara` das setas — o "voltar" desfaz igual. */}
            <label htmlFor="cal-mes" className="sr-only">Mês</label>
            <select
              id="cal-mes"
              className="cal-pilula cal-seletor"
              value={mes}
              onChange={(e) => irPara({ ano, mes: Number(e.target.value) })}
            >
              {NOMES_DOS_MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
            <label htmlFor="cal-ano" className="sr-only">Ano</label>
            <select
              id="cal-ano"
              className="cal-pilula cal-seletor"
              value={ano}
              onChange={(e) => irPara({ ano: Number(e.target.value), mes })}
            >
              {anosDoSeletor(ano).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* O mês por extenso para quem lê por áudio, anunciado quando
                muda: os seletores dizem o mês, mas só quando focados. É o
                mesmo `formatMonthKey` do resumo financeiro. */}
            <h2 className="sr-only" aria-live="polite">{rotuloDoMes}</h2>
          </div>

          <div className="cal-toolbar__direita">
            {/* As duas vistas. `aria-pressed` e não `aria-selected`: são botões
                de alternância, não abas de um tablist. A semana do desenho
                dela não entra (DEC-136). */}
            <div className="cal-vistas" role="group" aria-label="Vista do calendário">
              <button
                type="button"
                className={vista === 'mes' ? 'cal-vista cal-vista--ativa' : 'cal-vista'}
                aria-pressed={vista === 'mes'}
                onClick={() => irPara({ ano, mes, vista: 'mes' })}
              >
                <Icone nome="calendario" tamanho={16} />
                <span>Mês</span>
              </button>
              <button
                type="button"
                className={vista === 'agenda' ? 'cal-vista cal-vista--ativa' : 'cal-vista'}
                aria-pressed={vista === 'agenda'}
                onClick={() => irPara({ ano, mes, vista: 'agenda' })}
              >
                <List size={16} aria-hidden="true" />
                <span>Agenda</span>
              </button>
            </div>

            {/* O "+". Sem `actionMotivo`: continua ativo sem sinal (F-5b). O
                que acontece com o que ela salvar está dito no formulário. */}
            <Link
              to="/dashboard/agenda/novo"
              className="cal-novo"
              aria-label="Novo compromisso"
              title="Novo compromisso"
            >
              <Plus size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* A LEGENDA. A distinção visual sozinha não basta: cor sem legenda
            obriga a advogada a descobrir sozinha por que uma linha abre um
            formulário e a outra a leva embora. Os três tons da DEC-134, a
            forma de cada um, e o riscado. */}
        <ul className="cal-legenda">
          {LEGENDA.map((n) => (
            <li key={n.tipo} className="cal-legenda__item">
              <span className={`cal-legenda__marca ${n.classe} ${classeDoTom(n.tipo)}`} aria-hidden="true" />
              <strong>{n.rotulo}</strong>
              <span className="cal-legenda__texto">{n.legenda}</span>
            </li>
          ))}
          <li className="cal-legenda__item">
            <s className="cal-legenda__riscado" aria-hidden="true">Abc</s>
            <strong>Concluído ou pago</strong>
            <span className="cal-legenda__texto">Continua à vista, riscado.</span>
          </li>
        </ul>

        {error && <p className="cal-erro" role="alert">{error}</p>}

        {/* ── CARREGANDO ≠ VAZIO (regra do passo 116) ──────────────────────
            Grade vazia e grade carregando são indistinguíveis, e a segunda faz
            esperar por algo que não vem. Por isso o `Loading` tem ramo
            próprio, e o estado vazio tem frase própria — nunca uma grade
            muda. */}
        {loading ? (
          <Loading />
        ) : vista === 'mes' ? (
          <VistaDeMes
            grade={grade}
            porDia={porDia}
            hoje={hoje}
            diaAberto={diaAberto}
            onAbrirDia={setDiaAberto}
            onCriarNoDia={criarNoDia}
            onAbrirItem={abrirItem}
            onAbrirLinha={avisarDaDerivada}
            rotuloDoMes={rotuloDoMes}
          />
        ) : (
          <VistaDeAgenda
            itens={itens}
            hoje={hoje}
            rotuloDoMes={rotuloDoMes}
            onAbrirLinha={avisarDaDerivada}
            onCriarNoDia={criarNoDia}
          />
        )}
      </section>
    </div>
  );
}

// ── UMA PÍLULA DA GRADE ──────────────────────────────────────────────────
//
// Uma linha, com reticências. O tom é o da DEC-134 (a classe de
// `tomDaData`); a forma é a da DEC-055 — cheia no compromisso, listrada e
// tracejada no vencimento; o riscado diz concluído ou pago. O rótulo
// acessível e o `title` levam o texto inteiro, com o nome da natureza
// (`rotuloDoItemNaGrade`): quem lê por áudio não recebe a cor, e é essa
// pessoa que mais precisa saber que aquela linha não se edita ali.
function ItemDoCalendario({ item, onAbrir }) {
  const clicavel = Boolean(destinoDoItem(item));
  const rotulo = rotuloDoItemNaGrade(item);
  const classe = [
    'cal-item',
    classeDaNatureza(item.natureza),
    // Fase 3.8 (DEC-134): o tom da mesma fonte da `LinhaDeData`.
    classeDoTom(tipoDaDataDoItem(item)),
    itemRiscado(item) ? 'cal-item--concluido' : '',
  ].filter(Boolean).join(' ');

  const conteudo = (
    <>
      {item.hora && <span className="cal-item__hora">{item.hora}</span>}
      <span className="cal-item__titulo">{item.titulo}</span>
      <span className="sr-only">{rotuloDaNatureza(item.natureza)}</span>
    </>
  );

  if (!clicavel) {
    return <div className={classe} role="img" aria-label={rotulo} title={rotulo}>{conteudo}</div>;
  }

  return (
    <button type="button" className={classe} onClick={() => onAbrir(item)} aria-label={rotulo} title={rotulo}>
      {conteudo}
    </button>
  );
}

// ── A GRADE DO MÊS ───────────────────────────────────────────────────────
function VistaDeMes({
  grade, porDia, hoje, diaAberto, onAbrirDia, onCriarNoDia, onAbrirItem, onAbrirLinha, rotuloDoMes,
}) {
  const totalNoMes = grade.semanas
    .flat()
    .filter((c) => c.noMes)
    .reduce((soma, c) => soma + (porDia.get(c.chave)?.length ?? 0), 0);

  if (totalNoMes === 0) {
    return (
      <EstadoVazio rotuloDoMes={rotuloDoMes} />
    );
  }

  const itensDoDiaAberto = diaAberto ? (porDia.get(diaAberto) ?? []) : [];

  return (
    <>
      <div className="cal-grade" role="grid" aria-label={`Calendário de ${rotuloDoMes}`}>
        <div className="cal-grade__cabecalho" role="row">
          {DIAS_DA_SEMANA.map((d) => (
            <div key={d.indice} className="cal-grade__dia-semana" role="columnheader">
              {/* O nome curto na tela, o longo para quem lê por áudio: "seg"
                  lido em voz alta não é uma palavra. */}
              <span aria-hidden="true">{d.curto}</span>
              <span className="sr-only">{d.longo}</span>
            </div>
          ))}
        </div>

        {grade.semanas.map((semana) => (
          <div key={semana[0].chave} className="cal-grade__semana" role="row">
            {semana.map((celula) => {
              const doDia = porDia.get(celula.chave) ?? [];
              const { visiveis, ocultos } = recortarCelula(doDia);
              const ehHoje = celula.chave === hoje;

              const classe = [
                'cal-celula',
                celula.noMes ? '' : 'cal-celula--fora',
                ehHoje ? 'cal-celula--hoje' : '',
              ].filter(Boolean).join(' ');

              return (
                <div key={celula.chave} className={classe} role="gridcell">
                  <div className="cal-celula__topo">
                    {/* Criar a partir do clique no DIA, com a data preenchida.
                        O número do dia é o alvo, porque é para ele que a
                        advogada olha ao decidir "vou marcar aqui". */}
                    <button
                      type="button"
                      className="cal-celula__numero"
                      onClick={() => onCriarNoDia(celula.chave)}
                      aria-label={`Novo compromisso em ${formatDate(celula.chave)}${ehHoje ? ' (hoje)' : ''}`}
                    >
                      {celula.dia}
                    </button>
                    {/* HOJE é visualmente distinto — sempre, e não só quando
                        tem compromisso, e não só pela cor: o número no disco
                        cheio, o anel na célula e a palavra "hoje". */}
                    {ehHoje && <span className="cal-celula__hoje">hoje</span>}
                  </div>

                  <div className="cal-celula__itens">
                    {visiveis.map((item) => (
                      <ItemDoCalendario
                        key={`${item.natureza}-${item._id}`}
                        item={item}
                        onAbrir={onAbrirItem}
                      />
                    ))}

                    {/* A célula NÃO estica. O "Mais N" é quantos FICARAM DE
                        FORA — um "Mais 8" quando 3 já aparecem mandaria
                        procurar oito itens dos quais três estão à vista. Abre
                        o dia inteiro embaixo da grade, como antes. */}
                    {ocultos > 0 && (
                      <button
                        type="button"
                        className="cal-celula__mais"
                        onClick={() => onAbrirDia(celula.chave)}
                        aria-label={`Mais ${ocultos} em ${formatDate(celula.chave)}: abrir o dia`}
                      >
                        Mais {ocultos}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {diaAberto && (
        <div className="cal-dia-aberto">
          <div className="cal-dia-aberto__cabecalho">
            <h3>{formatDate(diaAberto)}</h3>
            <button type="button" className="cal-dia-aberto__fechar" onClick={() => onAbrirDia(null)}>
              Fechar
            </button>
          </div>
          <ul className="datas-lista">
            {itensDoDiaAberto.map((item) => {
              const linha = linhaDaAgenda(item);
              return <LinhaDeData key={linha.chave} item={linha} onAbrir={onAbrirLinha} />;
            })}
          </ul>
        </div>
      )}
    </>
  );
}

// ── A AGENDA — lista por dia, em ordem de data ───────────────────────────
//
// É a vista que importa em 360 px, e é a que abre lá. Só os dias que TÊM
// alguma coisa viram grupo: uma agenda que imprime os trinta dias do mês para
// mostrar três compromissos esconde os três. Cada item é a `LinhaDeData`
// (DEC-131), a mesma do Início e da Visão geral (DEC-136).
function VistaDeAgenda({ itens, hoje, rotuloDoMes, onAbrirLinha, onCriarNoDia }) {
  const dias = useMemo(() => diasComItens(itens), [itens]);

  if (dias.length === 0) return <EstadoVazio rotuloDoMes={rotuloDoMes} />;

  return (
    <ol className="cal-agenda">
      {dias.map(({ chave, itens: doDia }) => (
        <li key={chave} className={chave === hoje ? 'cal-agenda__dia cal-agenda__dia--hoje' : 'cal-agenda__dia'}>
          <div className="cal-agenda__cabecalho">
            <h3 className="cal-agenda__data">
              {formatDate(chave)}
              {chave === hoje && <span className="cal-agenda__hoje">Hoje</span>}
            </h3>
            <button
              type="button"
              className="cal-agenda__novo"
              onClick={() => onCriarNoDia(chave)}
              aria-label={`Novo compromisso em ${formatDate(chave)}`}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <ul className="datas-lista">
            {doDia.map((item) => {
              const linha = linhaDaAgenda(item);
              return <LinhaDeData key={linha.chave} item={linha} onAbrir={onAbrirLinha} />;
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}

// ── O ESTADO VAZIO, com FRASE PRÓPRIA ────────────────────────────────────
//
// "Nenhum compromisso em setembro/2026", e não uma grade muda. Grade vazia e
// grade carregando são indistinguíveis, e a segunda faz esperar por algo que
// não vem — é a regra do passo 116, e é por isso que o vazio nomeia o MÊS: sem
// o nome, a advogada não sabe se está vendo o mês que pediu.
function EstadoVazio({ rotuloDoMes }) {
  return (
    <EmptyState
      icon={<Icone nome="calendario" tamanho={40} />}
      title={`Nenhum compromisso em ${rotuloDoMes}`}
      description="Audiências, prazos e reuniões que você registrar aparecem aqui, junto dos vencimentos do financeiro."
      action={
        <Link to="/dashboard/agenda/novo" className="ui-btn ui-btn--primary ui-btn--md">
          Novo compromisso
        </Link>
      }
    />
  );
}

export default CalendarPage;
