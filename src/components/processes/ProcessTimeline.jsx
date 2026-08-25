import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Flag, Zap, CalendarClock } from 'lucide-react';

import processService from '../../api/processService';
import Loading from '../common/Loading';
import { formatDate } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiError';
import './ProcessTimeline.css';

// ═══════════════════════════════════════════════════════════════════════════
// DEC-056 — A LINHA DO TEMPO DO PROCESSO
//
// > A Laís pediu: *"finalizado por etapa (fazer linha do tempo)"*.
//
// ── Apresentação, não coleta ──────────────────────────────────────────
// Nada aqui grava. O substrato é o `historicoFase` que a DEC-054 começou a
// gravar na F-2d — antes de existir tela, e de propósito: gravar só a partir
// de quando a tela existisse faria a linha do tempo NASCER SEM PASSADO.
//
// ── O FINANCEIRO NÃO ENTRA ────────────────────────────────────────────
// O extrato do honorário responde outra pergunta e já a responde bem. Misturar
// as duas faria uma tela que não responde nenhuma: cinco entradas de fase
// somem debaixo de quarenta linhas de um plano parcelado em doze. A ficha
// financeira continua onde estava, nesta mesma página, em seção própria.
//
// ── Os FUTUROS ficam VISIVELMENTE à frente do "hoje" ─────────────────
// O corte vem do backend (`futuro: true/false`), e não é calculado aqui: o
// navegador não sabe o "hoje" do servidor, e um relógio atrasado poria uma
// audiência de amanhã do lado errado da linha.
//
// A marca do "hoje" é uma LINHA na régua, e não só um estilo por item: o que a
// advogada procura ao abrir isto é onde o presente está, e um contorno
// diferente em cada item obriga a percorrer a lista para descobrir.
// ═══════════════════════════════════════════════════════════════════════════

const ICONE = {
  fase: GitBranch,
  encerramento: Flag,
  liminar: Zap,
  evento: CalendarClock,
};

// Os rótulos de FASE, ENCERRAMENTO e do tipo de evento vêm prontos do backend
// (`paraRotulo`, `tipoEventoRotulo`). O que fica aqui é só o nome da CATEGORIA
// da entrada, que é conceito da tela e não existe no domínio.
const CATEGORIA = {
  fase: 'Fase',
  encerramento: 'Encerramento',
  liminar: 'Liminar',
  evento: 'Compromisso',
};

function TextoDaEntrada({ entrada }) {
  if (entrada.tipo === 'fase') {
    // O nascimento é dito como nascimento. Sem isso, um processo criado direto
    // em "execução" apareceria como se sempre tivesse estado lá.
    if (entrada.nascimento) {
      return <>Processo cadastrado em <strong>{entrada.paraRotulo}</strong></>;
    }
    return (
      <>
        De <strong>{entrada.deRotulo}</strong> para <strong>{entrada.paraRotulo}</strong>
      </>
    );
  }

  if (entrada.tipo === 'encerramento') {
    return <>Trânsito em julgado</>;
  }

  if (entrada.tipo === 'liminar') {
    return <>Liminar registrada</>;
  }

  return (
    <>
      {entrada.hora && <span className="linha__hora">{entrada.hora}</span>}
      {/* O compromisso é clicável: quem está lendo a história do processo e vê
          uma audiência marcada quer abrir a audiência. */}
      <Link to={`/dashboard/agenda/editar/${entrada._id}`}>{entrada.titulo}</Link>
      <span className="linha__tipo-evento">{entrada.tipoEventoRotulo}</span>
    </>
  );
}

function ProcessTimeline({ processoId }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');

    processService
      .getTimeline(processoId)
      .then((res) => { if (ativo) setDados(res.data); })
      .catch((err) => {
        if (ativo) setError(getApiErrorMessage(err, 'Falha ao carregar a linha do tempo.'));
      })
      .finally(() => { if (ativo) setLoading(false); });

    return () => { ativo = false; };
  }, [processoId]);

  const entradas = dados?.entradas ?? [];

  // O índice da primeira entrada futura: é onde a régua ganha a marca do
  // "hoje". `-1` quando não há futuro nenhum, e aí a marca vai no fim.
  const primeiroFuturo = entradas.findIndex((e) => e.futuro);

  return (
    <div className="linha-tempo">
      <h3 className="linha-tempo__titulo">Linha do tempo</h3>

      {/* Carregando ≠ vazio, como no calendário: uma lista em branco e uma
          lista carregando são indistinguíveis. */}
      {loading ? (
        <Loading />
      ) : error ? (
        <p className="error-message" role="alert">{error}</p>
      ) : entradas.length === 0 ? (
        <p className="linha-tempo__vazio">
          Nada registrado ainda. Mudanças de fase, o encerramento e os
          compromissos deste processo aparecem aqui.
        </p>
      ) : (
        <ol className="linha-tempo__lista">
          {entradas.map((entrada, i) => {
            const Icone = ICONE[entrada.tipo] ?? CalendarClock;
            const classe = [
              'linha__item',
              `linha__item--${entrada.tipo}`,
              entrada.futuro ? 'linha__item--futuro' : '',
              entrada.tipo === 'evento' && entrada.concluido ? 'linha__item--concluido' : '',
            ].filter(Boolean).join(' ');

            return (
              <React.Fragment key={`${entrada.tipo}-${entrada.data}-${entrada._id ?? i}`}>
                {i === primeiroFuturo && (
                  <li className="linha__hoje" aria-hidden="true">
                    <span>hoje</span>
                  </li>
                )}
                <li className={classe}>
                  <span className="linha__marca"><Icone size={14} /></span>
                  <div className="linha__corpo">
                    <span className="linha__data">
                      {formatDate(entrada.data)}
                      <span className="linha__categoria">{CATEGORIA[entrada.tipo]}</span>
                    </span>
                    <span className="linha__texto"><TextoDaEntrada entrada={entrada} /></span>
                    {/* O motivo é OPCIONAL em toda a cadeia — *"não precisa
                        anotar o porquê, só se ela quiser mesmo"*. Quando existe,
                        aparece; quando não, a linha não fica com um vazio. */}
                    {entrada.motivo && <span className="linha__motivo">{entrada.motivo}</span>}
                    {entrada.observacao && <span className="linha__motivo">{entrada.observacao}</span>}
                    {entrada.local && <span className="linha__motivo">{entrada.local}</span>}
                  </div>
                </li>
              </React.Fragment>
            );
          })}

          {/* Não há futuro nenhum: a marca vai no fim, para a régua sempre
              dizer onde o presente está. */}
          {primeiroFuturo === -1 && (
            <li className="linha__hoje" aria-hidden="true"><span>hoje</span></li>
          )}
        </ol>
      )}
    </div>
  );
}

export default ProcessTimeline;
