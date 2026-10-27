import React from 'react';
import { indiceDaCor, inicialDoNome } from './avatar.js';
import './Avatar.css';

// ═══════════════════════════════════════════════════════════════════════════
// O AVATAR DO CLIENTE — Fase 3.5 (DEC-120), Figuras 19 e 21
//
// DECORATIVO (`aria-hidden`): o nome está sempre escrito ao lado, e o leitor
// de tela leria a inicial e depois o nome inteiro — "A, Ana Lima". Por isso
// também não tem `title` nem `role="img"`.
//
// `tamanho`: "pequeno" na lista, "grande" no cabeçalho do detalhe.
// ═══════════════════════════════════════════════════════════════════════════
function Avatar({ id, nome, tamanho = 'pequeno' }) {
  return (
    <span
      className={`avatar avatar--${tamanho} avatar--cor-${indiceDaCor(id)}`}
      aria-hidden="true"
    >
      {inicialDoNome(nome)}
    </span>
  );
}

export default Avatar;
