import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

import calendarService from '../../api/calendarService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { destinoDoItem } from '../../utils/calendarLabels';
import './NotificationBell.css';

// ═══════════════════════════════════════════════════════════════════════════
// O SINO — CONTADOR DO QUE EXIGE ATENÇÃO, SEM ESTADO DE LIDO
//
// ── Por que NÃO existe "marcar como lido" ──────────────────────────────
// O número muda sozinho com o dia e com o que a advogada resolve. Um contador
// que só zera com clique treina a pessoa a zerar sem olhar — e a partir do dia
// em que zerar vira reflexo, ele deixa de significar qualquer coisa.
//
// Clicar no sino ABRE a lista, e não muda nenhum número. O que baixa a
// contagem é concluir o compromisso ou registrar o pagamento — ou seja, o
// mundo mudar, e não a leitura acontecer.
//
// **Não há nenhuma chamada de escrita neste arquivo.** É a regra, e há teste
// que varre a fonte por `post(`, `patch(`, `delete(` para travá-la.
//
// ── Zero NÃO aparece ──────────────────────────────────────────────────
// Nem como "0". Um badge com zero é ruído permanente no canto do olho: ele
// ocupa o mesmo espaço e a mesma cor de um badge que significa alguma coisa, e
// a pessoa aprende a ignorar os dois.
//
// ── O que a Parte 0 excluiu, e que este componente NÃO é ──────────────
// Não há Web Push aqui. Aviso é sino com contador DENTRO do sistema —
// notificação no celular com o app fechado exige service worker novo,
// permissão do navegador e chaves VAPID, e é decisão do Daniel de 24/08/2026
// que isso fica fora desta fase.
// ═══════════════════════════════════════════════════════════════════════════

// Recarrega sozinho de tempos em tempos. Cinco minutos: o número muda com o
// DIA e com o que ela resolve em outra aba — nenhum dos dois exige segundos, e
// um intervalo curto faria uma requisição por minuto num sistema de uma
// usuária só.
const INTERVALO_MS = 5 * 60 * 1000;

function NotificationBell() {
  const [avisos, setAvisos] = useState(null);
  const [aberto, setAberto] = useState(false);
  const container = useRef(null);

  const carregar = useCallback(() => {
    calendarService
      .getAvisos()
      .then((res) => setAvisos(res.data))
      // Falhar aqui NÃO derruba o cabeçalho nem mostra erro: o sino é
      // periférico, e um toast de erro a cada cinco minutos por causa de uma
      // rede instável seria pior que a informação que ele traz. Sem dado, ele
      // simplesmente não mostra badge.
      .catch(() => setAvisos(null));
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  // Recarrega ao ABRIR: entre um tique e outro a advogada pode ter concluído
  // algo noutra aba, e abrir a lista para ver um item já resolvido é o que faz
  // ela deixar de confiar no número.
  const alternar = () => {
    setAberto((estava) => {
      if (!estava) carregar();
      return !estava;
    });
  };

  // Fechar ao clicar fora e ao apertar Esc. Um painel que só fecha pelo próprio
  // botão prende o foco de quem navega por teclado.
  useEffect(() => {
    if (!aberto) return undefined;

    const foraDaCaixa = (evento) => {
      if (container.current && !container.current.contains(evento.target)) setAberto(false);
    };
    const escapou = (evento) => {
      if (evento.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', foraDaCaixa);
    document.addEventListener('keydown', escapou);
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa);
      document.removeEventListener('keydown', escapou);
    };
  }, [aberto]);

  const total = avisos?.total ?? 0;

  const secoes = [
    { chave: 'eventosHoje', titulo: 'Hoje', itens: avisos?.eventosHoje ?? [] },
    { chave: 'eventosAtrasados', titulo: 'Atrasados', itens: avisos?.eventosAtrasados ?? [] },
    { chave: 'parcelasVencidas', titulo: 'Parcelas vencidas', itens: avisos?.parcelasVencidas ?? [] },
  ];

  return (
    <div className="sino" ref={container}>
      <button
        type="button"
        className="sino__botao"
        onClick={alternar}
        aria-expanded={aberto}
        aria-haspopup="true"
        // O rótulo acessível carrega o NÚMERO. Um badge é informação visual
        // pura: sem isto, quem lê por áudio ouve só "avisos" e não sabe se há
        // três coisas pendentes ou nenhuma.
        aria-label={total > 0 ? `Avisos: ${total} item(ns) exigem atenção` : 'Avisos: nada pendente'}
      >
        <Bell size={18} />
        {/* Zero não aparece — nem como "0". */}
        {total > 0 && (
          <span className="sino__badge" aria-hidden="true">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="sino__painel" role="dialog" aria-label="Avisos">
          <div className="sino__cabecalho">
            <strong>Avisos</strong>
            <Link to="/dashboard/agenda" className="sino__link" onClick={() => setAberto(false)}>
              Abrir a agenda
            </Link>
          </div>

          {total === 0 ? (
            // Frase própria, e não um painel em branco. "Nada pendente" é uma
            // resposta; um painel vazio é uma dúvida sobre se carregou.
            <p className="sino__vazio">Nada exige atenção agora.</p>
          ) : (
            secoes
              .filter((s) => s.itens.length > 0)
              .map((secao) => (
                <section key={secao.chave} className="sino__secao">
                  <h3 className="sino__secao-titulo">
                    {secao.titulo}
                    <span className="sino__secao-contagem">{secao.itens.length}</span>
                  </h3>
                  <ul className="sino__lista">
                    {secao.itens.map((item) => {
                      const destino = destinoDoItem(item);
                      const conteudo = (
                        <>
                          <span className="sino__item-titulo">{item.titulo}</span>
                          <span className="sino__item-meta">
                            {formatDate(item.data)}
                            {item.hora ? ` · ${item.hora}` : ''}
                            {item.natureza === 'derivada' && item.valor !== null
                              ? ` · ${formatCurrency(item.valor)}`
                              : ''}
                          </span>
                        </>
                      );

                      return (
                        <li key={`${item.natureza}-${item._id}`} className="sino__item">
                          {destino ? (
                            // O destino sai do MESMO ponto único do calendário:
                            // a parcela vencida leva à parcela, o compromisso
                            // leva ao compromisso. Duplicar a regra aqui a faria
                            // divergir na primeira mudança de rota.
                            <Link to={destino} onClick={() => setAberto(false)}>{conteudo}</Link>
                          ) : (
                            <div>{conteudo}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
