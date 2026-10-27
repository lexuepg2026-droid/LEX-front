import React from 'react';
import { Link } from 'react-router-dom';
import { seloDaData, TIPOS_DE_DATA } from '../../pages/dashboard/inicio.js';
import './LinhaDeData.css';

// ═══════════════════════════════════════════════════════════════════════════
// A LINHA DAS DATAS PRÓXIMAS — Fase 3.7 (DEC-131)
//
// Selo com o dia e o mês | título, subtítulo e "processo · cliente" | pílula.
// A linha inteira é o link para a origem. Saiu do Início para a Visão geral
// do Financeiro usar a mesma linha nas vencidas e nos próximos vencimentos.
//
// `item` é o que `datasProximas` (ou `vencidasDoAviso`) monta: `chave`,
// `data`, `tipo`, `titulo`, `subtitulo`, `contexto`, `destino`. A lista
// (`<ul className="datas-lista">`) é de quem usa: o componente é o `<li>`.
// ═══════════════════════════════════════════════════════════════════════════
function LinhaDeData({ item }) {
  const selo = seloDaData(item.data);
  const conteudo = (
    <>
      <span className="datas-item__selo">
        <span className="datas-item__dia">{selo?.dia}</span>
        <span className="datas-item__mes">{selo?.mes}</span>
      </span>
      <span className="datas-item__texto">
        <span className="datas-item__titulo">{item.titulo}</span>
        {item.subtitulo && <span className="datas-item__subtitulo">{item.subtitulo}</span>}
        {item.contexto && <span className="datas-item__contexto">{item.contexto}</span>}
      </span>
      <span className={`datas-item__pilula datas-item__pilula--${item.tipo}`}>
        {TIPOS_DE_DATA[item.tipo].rotulo}
      </span>
    </>
  );
  return (
    <li>
      {item.destino ? (
        <Link to={item.destino} className="datas-item">{conteudo}</Link>
      ) : (
        <div className="datas-item">{conteudo}</div>
      )}
    </li>
  );
}

export default LinhaDeData;
