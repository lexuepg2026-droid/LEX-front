import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import Letterhead from './Letterhead';
import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import './DocumentCanvas.css';

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS — A FOLHA
//
// Proporção A4 com as margens de 2,5 cm reproduzidas em CSS, para a advogada
// ver onde o corpo começa e quanto texto cabe. É aproximação visual: ver a nota
// em `Letterhead.jsx`.
//
// Dois caminhos para tudo, sempre:
//
//   arrastar   HTML5 nativo — dragstart / dragover / drop
//   botões     ↑ ↓ Remover, e os slots "Inserir aqui"
//
// Os eventos de drag NÃO disparam em toque, e o LEX é um PWA que a advogada
// abre no tablet. Além disso, uma demonstração de banca não pode depender de
// arrastar dar certo na primeira tentativa. Por isso o caminho por botões não é
// acessório: é o caminho principal, e o arrastar é o atalho.
//
// Os dois chamam exatamente os mesmos callbacks — não há um "serviço do drag" e
// um "serviço do botão".
// ═══════════════════════════════════════════════════════════════════════════

const TAMANHO_TRECHO = 400;

const trechoDoTexto = (texto) => {
  const limpo = String(texto ?? '').trim();
  if (limpo.length <= TAMANHO_TRECHO) return limpo;
  return `${limpo.slice(0, TAMANHO_TRECHO).trimEnd()}…`;
};

function DocumentCanvas({
  usuario,
  vinculos,
  // Seção "armada" na barra lateral, esperando escolha de posição. Quando
  // existe, os slots de inserção aparecem — é o equivalente por toque do
  // arrastar-para-a-posição.
  secaoArmada,
  onInserirNaPosicao,
  onMover,
  onRemover,
  onReordenarPorArraste,
  desabilitado,
}) {
  // Índice do slot sob o cursor durante o arraste. Só visual.
  const [slotAtivo, setSlotAtivo] = useState(null);
  const [arrastando, setArrastando] = useState(null);

  const total = vinculos.length;

  const encerrarArraste = () => {
    setSlotAtivo(null);
    setArrastando(null);
  };

  // `posicao` é 1-based, como o backend espera: 1 põe no começo, total + 1 no
  // fim. O slot de índice i representa "antes do bloco i", logo posicao = i + 1.
  const soltarNoSlot = (indiceSlot) => (evento) => {
    evento.preventDefault();
    encerrarArraste();
    if (desabilitado) return;

    const secaoId = evento.dataTransfer.getData('text/lex-secao-id');
    const origem = evento.dataTransfer.getData('text/lex-origem');

    if (origem === 'biblioteca' && secaoId) {
      onInserirNaPosicao(secaoId, indiceSlot + 1);
      return;
    }

    if (origem === 'canvas' && secaoId) {
      const de = vinculos.findIndex((v) => String(v.secaoId?._id ?? v.secaoId) === secaoId);
      if (de === -1) return;
      // Ao tirar o bloco da posição `de`, todo slot depois dele desloca um.
      const para = indiceSlot > de ? indiceSlot - 1 : indiceSlot;
      if (para === de) return;
      onReordenarPorArraste(de, para);
    }
  };

  const permitirSoltar = (indiceSlot) => (evento) => {
    if (desabilitado) return;
    // preventDefault no dragover é o que autoriza o drop. Sem ele, o cursor
    // mostra "proibido" e o drop nunca acontece.
    evento.preventDefault();
    setSlotAtivo(indiceSlot);
  };

  const Slot = ({ indice }) => {
    const ativo = slotAtivo === indice;
    const mostraBotao = Boolean(secaoArmada) && !desabilitado;

    return (
      <div
        className={[
          'canvas-slot',
          ativo ? 'canvas-slot--ativo' : '',
          mostraBotao ? 'canvas-slot--armado' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={permitirSoltar(indice)}
        onDragLeave={() => setSlotAtivo((atual) => (atual === indice ? null : atual))}
        onDrop={soltarNoSlot(indice)}
      >
        {mostraBotao && (
          <button
            type="button"
            className="canvas-slot__botao"
            onClick={() => onInserirNaPosicao(secaoArmada._id, indice + 1)}
          >
            <Plus size={13} />
            Inserir “{secaoArmada.titulo}” aqui
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="canvas-scroll">
      <div className="canvas-folha" aria-label="Pré-visualização do documento em A4">
        <Letterhead usuario={usuario} />

        <div className="canvas-corpo">
          {total === 0 ? (
            <div className="canvas-vazio">
              <p className="canvas-vazio__titulo">A folha está em branco.</p>
              <p>
                Use <strong>Adicionar</strong> numa seção da biblioteca, à esquerda, para pôr a
                primeira no fim do documento — ou arraste-a para cá.
              </p>
              <Slot indice={0} />
            </div>
          ) : (
            <>
              <Slot indice={0} />

              {vinculos.map((vinculo, indice) => {
                const secao = vinculo.secaoId ?? {};
                const secaoId = String(secao._id ?? vinculo.secaoId);
                const ehArrastado = arrastando === secaoId;

                return (
                  <React.Fragment key={vinculo._id ?? secaoId}>
                    <article
                      className={`canvas-bloco${ehArrastado ? ' canvas-bloco--arrastando' : ''}`}
                      draggable={!desabilitado}
                      onDragStart={(evento) => {
                        if (desabilitado) return;
                        evento.dataTransfer.setData('text/lex-secao-id', secaoId);
                        evento.dataTransfer.setData('text/lex-origem', 'canvas');
                        evento.dataTransfer.effectAllowed = 'move';
                        setArrastando(secaoId);
                      }}
                      onDragEnd={encerrarArraste}
                    >
                      <div className="canvas-bloco__barra">
                        <span className="canvas-bloco__punho" aria-hidden="true">
                          <GripVertical size={14} />
                        </span>
                        <span className="canvas-bloco__ordem">{indice + 1}</span>
                        <span className="canvas-bloco__titulo">{secao.titulo ?? 'Seção'}</span>
                        <span className="canvas-bloco__tipo">
                          {labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}
                        </span>

                        <div className="canvas-bloco__acoes">
                          <button
                            type="button"
                            className="canvas-bloco__acao"
                            onClick={() => onMover(indice, indice - 1)}
                            disabled={desabilitado || indice === 0}
                            aria-label={`Mover “${secao.titulo}” para cima`}
                            title="Mover para cima"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="canvas-bloco__acao"
                            onClick={() => onMover(indice, indice + 1)}
                            disabled={desabilitado || indice === total - 1}
                            aria-label={`Mover “${secao.titulo}” para baixo`}
                            title="Mover para baixo"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="canvas-bloco__acao canvas-bloco__acao--remover"
                            onClick={() => onRemover(vinculo)}
                            disabled={desabilitado}
                            aria-label={`Remover “${secao.titulo}” do documento`}
                          >
                            <Trash2 size={14} />
                            Remover
                          </button>
                        </div>
                      </div>

                      {/* Texto CRU, com as chaves como estão. Resolver variável
                          aqui daria a impressão de que o documento já está
                          pronto — e o que resolve é a geração, no backend. */}
                      <pre className="canvas-bloco__texto">{trechoDoTexto(secao.texto)}</pre>
                    </article>

                    <Slot indice={indice + 1} />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* O rodapé real numera "página X de Y". A tela não pagina, então diz o
            que é, sem inventar um número que seria sempre 1. */}
        <footer className="canvas-rodape">página 1 de 1 — na montagem, a folha não é paginada</footer>
      </div>
    </div>
  );
}

export default DocumentCanvas;
