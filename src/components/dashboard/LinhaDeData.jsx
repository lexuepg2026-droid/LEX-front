import React from 'react';
import { Link } from 'react-router-dom';
import { seloDaData, TIPOS_DE_DATA } from '../../pages/dashboard/inicio.js';
import { classeDoTom } from '../../utils/tomDaData.js';
import '../../styles/tomDaData.css';
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
//
// Fase 3.8 (DEC-136): a vista Agenda usa a mesma linha. Dois acréscimos
// opcionais, que o Início e a Visão geral não passam (e não mudam):
// - `item.situacao` ("Concluído", "Pago"): o título sai riscado e a situação
//   aparece escrita ao lado — a forma e o texto, nunca só a cor;
// - `onAbrir(item)`: chamado no clique, antes da navegação do link. A Agenda
//   o usa para a frase da derivada (DEC-055).
// ═══════════════════════════════════════════════════════════════════════════
function LinhaDeData({ item, onAbrir = null }) {
  const selo = seloDaData(item.data);
  const classe = item.situacao ? 'datas-item datas-item--riscado' : 'datas-item';
  const conteudo = (
    <>
      <span className="datas-item__selo">
        <span className="datas-item__dia">{selo?.dia}</span>
        <span className="datas-item__mes">{selo?.mes}</span>
      </span>
      <span className="datas-item__texto">
        <span className="datas-item__titulo">{item.titulo}</span>
        {item.situacao && <span className="datas-item__situacao">{item.situacao}</span>}
        {item.subtitulo && <span className="datas-item__subtitulo">{item.subtitulo}</span>}
        {item.contexto && <span className="datas-item__contexto">{item.contexto}</span>}
      </span>
      {/* Fase 3.8 (DEC-134): o tom sai de `tomDaData`, a mesma fonte da Agenda. */}
      <span className={`datas-item__pilula ${classeDoTom(item.tipo)}`}>
        {TIPOS_DE_DATA[item.tipo].rotulo}
      </span>
    </>
  );
  return (
    <li>
      {item.destino ? (
        <Link to={item.destino} className={classe} onClick={onAbrir ? () => onAbrir(item) : undefined}>{conteudo}</Link>
      ) : (
        <div className={classe}>{conteudo}</div>
      )}
    </li>
  );
}

export default LinhaDeData;
