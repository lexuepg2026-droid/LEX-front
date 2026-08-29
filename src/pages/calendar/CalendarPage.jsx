import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, List, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import calendarService from '../../api/calendarService';
import PageHeader from '../../components/ui/PageHeader';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import { MENSAGEM_ALTERACAO_NAO_ENVIADA } from '../../offline/outboxMessages';
import { useOutbox } from '../../contexts/OutboxContext';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/common/Loading';
import { formatMonthKey, formatDate, formatCurrency } from '../../utils/formatters';
import {
  LEGENDA, classeDaNatureza, destinoDoItem, rotuloDaNatureza,
  MOTIVO_DA_DERIVADA_NAO_EDITAVEL,
} from '../../utils/calendarLabels';
import {
  DIAS_DA_SEMANA, VISTAS, construirGradeDoMes, mesVizinho, lerChaveDoMes,
  mesDaChave, vistaPadrao, recortarCelula, agruparPorDia, diasComItens,
} from './monthGrid';
import { toast } from '../../utils/toast';
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

  // Criar a partir do clique num DIA, com a data já preenchida. É o caminho que
  // faz a grade valer como ferramenta e não só como relatório.
  //
  // Sem sinal ela CONTINUA levando (F-5b): compromisso é uma das duas coisas
  // que a fila aceita, e o formulário avisa lá dentro o que vai acontecer.
  const criarNoDia = (chave) => navigate(`/dashboard/agenda/novo?data=${chave}`);

  const rotuloDoMes = formatMonthKey(grade.chaveDoMes);

  return (
    <div className="cal-page">
      {/* Sem `actionMotivo`: o botão continua ativo sem sinal (F-5b). O que
          acontece com o que ela salvar está dito no formulário, e a pendência
          aparece no contador ao lado do sino. */}
      <PageHeader
        title="Agenda"
        actionLabel="Novo compromisso"
        actionTo="/dashboard/agenda/novo"
      />

      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}

      {/* Enquanto houver alteração na fila, a tela onde o registro aparece diz
          que o que está à vista é o do servidor — ver o dado antigo achando que
          é o atual é o mesmo defeito da idade do dado, na F-5a. */}
      {temPendenciaDeAgenda && (
        <p className="cal-pendencia" role="status">
          <Link to="/dashboard/pendencias">{MENSAGEM_ALTERACAO_NAO_ENVIADA}</Link>
        </p>
      )}

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav__btn"
            onClick={() => irPara(mesVizinho(ano, mes, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>

          {/* O mês por extenso, e não "09/2026": é o que a advogada lê num
              calendário de parede, e é o mesmo `formatMonthKey` que o resumo
              financeiro já usa para rotular os cartões. */}
          <h2 className="cal-nav__mes">{rotuloDoMes}</h2>

          <button
            type="button"
            className="cal-nav__btn"
            onClick={() => irPara(mesVizinho(ano, mes, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>

          {/* "Hoje" sai do backend. O relógio do navegador pode estar atrasado,
              e o botão que leva ao dia de hoje é justamente onde isso doeria. */}
          {hoje && (
            <button
              type="button"
              className="cal-nav__hoje"
              onClick={() => irPara(mesDaChave(hoje))}
            >
              Hoje
            </button>
          )}
        </div>

        {/* As duas vistas. `aria-pressed` e não `aria-selected`: são botões de
            alternância, não abas de um tablist. */}
        <div className="cal-vistas" role="group" aria-label="Vista do calendário">
          <button
            type="button"
            className={vista === 'mes' ? 'cal-vista cal-vista--ativa' : 'cal-vista'}
            aria-pressed={vista === 'mes'}
            onClick={() => irPara({ ano, mes, vista: 'mes' })}
          >
            <CalendarDays size={16} />
            <span>Mês</span>
          </button>
          <button
            type="button"
            className={vista === 'agenda' ? 'cal-vista cal-vista--ativa' : 'cal-vista'}
            aria-pressed={vista === 'agenda'}
            onClick={() => irPara({ ano, mes, vista: 'agenda' })}
          >
            <List size={16} />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* A LEGENDA. A distinção visual sozinha não basta: cor sem legenda
          obriga a advogada a descobrir sozinha por que uma linha abre um
          formulário e a outra a leva embora. */}
      <ul className="cal-legenda">
        {LEGENDA.map((n) => (
          <li key={n.valor} className="cal-legenda__item">
            <span className={`cal-legenda__marca ${n.classe}`} aria-hidden="true" />
            <strong>{n.rotulo}</strong>
            <span className="cal-legenda__texto">{n.legenda}</span>
          </li>
        ))}
      </ul>

      {error && <p className="cal-erro" role="alert">{error}</p>}

      {/* ── CARREGANDO ≠ VAZIO (regra do passo 116) ────────────────────────
          Grade vazia e grade carregando são indistinguíveis, e a segunda faz
          esperar por algo que não vem. Por isso o `Loading` tem ramo próprio,
          e o estado vazio tem frase própria — nunca uma grade muda. */}
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
          rotuloDoMes={rotuloDoMes}
        />
      ) : (
        <VistaDeAgenda
          itens={itens}
          hoje={hoje}
          rotuloDoMes={rotuloDoMes}
          onAbrirItem={abrirItem}
          onCriarNoDia={criarNoDia}
        />
      )}
    </div>
  );
}

// ── UM ITEM, nas duas vistas ─────────────────────────────────────────────
//
// O mesmo componente na grade e na agenda: se fossem dois, a distinção visual
// entre as naturezas teria de ser mantida em dois lugares — e é exatamente o
// tipo de coisa que passa a divergir na terceira fase.
function ItemDoCalendario({ item, onAbrir, compacto = false }) {
  const clicavel = Boolean(destinoDoItem(item));
  const classe = [
    'cal-item',
    classeDaNatureza(item.natureza),
    compacto ? 'cal-item--compacto' : '',
    item.concluido ? 'cal-item--concluido' : '',
  ].filter(Boolean).join(' ');

  const conteudo = (
    <>
      <span className="cal-item__marca" aria-hidden="true" />
      {item.hora && <span className="cal-item__hora">{item.hora}</span>}
      <span className="cal-item__titulo">{item.titulo}</span>
      {!compacto && item.subtitulo && (
        <span className="cal-item__subtitulo">{item.subtitulo}</span>
      )}
      {!compacto && item.natureza === 'derivada' && item.valor !== null && (
        <span className="cal-item__valor">{formatCurrency(item.valor)}</span>
      )}
      {/* O nome da natureza vai no texto acessível, e não só na cor: quem lê
          por leitor de tela não recebe a cor, e é justamente essa pessoa que
          mais precisa saber que aquela linha não se edita ali. */}
      <span className="sr-only">{rotuloDaNatureza(item.natureza)}</span>
    </>
  );

  if (!clicavel) return <div className={classe}>{conteudo}</div>;

  return (
    <button type="button" className={classe} onClick={() => onAbrir(item)}>
      {conteudo}
    </button>
  );
}

// ── A GRADE DO MÊS ───────────────────────────────────────────────────────
function VistaDeMes({
  grade, porDia, hoje, diaAberto, onAbrirDia, onCriarNoDia, onAbrirItem, rotuloDoMes,
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
                      aria-label={`Novo compromisso em ${formatDate(celula.chave)}`}
                    >
                      {celula.dia}
                      {/* HOJE é visualmente distinto — sempre, e não só quando
                          tem compromisso. É a única pergunta que um calendário
                          precisa responder sem que ninguém a faça. */}
                      {ehHoje && <span className="sr-only"> (hoje)</span>}
                    </button>
                  </div>

                  <div className="cal-celula__itens">
                    {visiveis.map((item) => (
                      <ItemDoCalendario
                        key={`${item.natureza}-${item._id}`}
                        item={item}
                        onAbrir={onAbrirItem}
                        compacto
                      />
                    ))}

                    {/* A célula NÃO estica. O "+N" é quantos FICARAM DE FORA —
                        um "+8" quando 3 já aparecem mandaria procurar oito
                        itens dos quais três estão à vista. */}
                    {ocultos > 0 && (
                      <button
                        type="button"
                        className="cal-celula__mais"
                        onClick={() => onAbrirDia(celula.chave)}
                      >
                        +{ocultos}
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
          <div className="cal-dia-aberto__itens">
            {itensDoDiaAberto.map((item) => (
              <ItemDoCalendario
                key={`${item.natureza}-${item._id}`}
                item={item}
                onAbrir={onAbrirItem}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── A AGENDA — lista por dia, em ordem de data ───────────────────────────
//
// É a vista que importa em 360 px, e é a que abre lá. Só os dias que TÊM
// alguma coisa viram linha: uma agenda que imprime os trinta dias do mês para
// mostrar três compromissos esconde os três.
function VistaDeAgenda({ itens, hoje, rotuloDoMes, onAbrirItem, onCriarNoDia }) {
  const dias = useMemo(() => diasComItens(itens), [itens]);

  if (dias.length === 0) return <EstadoVazio rotuloDoMes={rotuloDoMes} />;

  return (
    <ol className="cal-agenda">
      {dias.map(({ chave, itens: doDia }) => (
        <li key={chave} className={chave === hoje ? 'cal-agenda__dia cal-agenda__dia--hoje' : 'cal-agenda__dia'}>
          <div className="cal-agenda__cabecalho">
            <h3 className="cal-agenda__data">
              {formatDate(chave)}
              {chave === hoje && <span className="cal-agenda__hoje">hoje</span>}
            </h3>
            <button
              type="button"
              className="cal-agenda__novo"
              onClick={() => onCriarNoDia(chave)}
              aria-label={`Novo compromisso em ${formatDate(chave)}`}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="cal-agenda__itens">
            {doDia.map((item) => (
              <ItemDoCalendario
                key={`${item.natureza}-${item._id}`}
                item={item}
                onAbrir={onAbrirItem}
              />
            ))}
          </div>
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
      icon={<CalendarDays size={40} />}
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
