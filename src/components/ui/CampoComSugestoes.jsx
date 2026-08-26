import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { filtrarSugestoes, LIMITE_PADRAO } from '../../utils/sugestoes.js';
import './CampoComSugestoes.css';

// ═══════════════════════════════════════════════════════════════════════════
// O CAMPO QUE SUGERE E NÃO OBRIGA (DEC-057)
//
// ── A garantia central, e ela é a fase inteira ────────────────────────────
// **O que a advogada digitou é o que fica.** Não há `onBlur` que corrija, não
// há validação contra a tabela, não há "escolha uma opção da lista". Se a
// comarca não estiver na tabela — e um dia não vai estar, porque a tabela é de
// 22/08/2026 e envelhece —, ela digita e salva.
//
// O `value` deste componente é sempre a string do `<input>`. A lista de
// sugestões só tem um poder: **escrever nele quando alguém escolhe**. Nunca
// impedir, nunca reverter, nunca limpar.
//
// ── Teclado (DEC-046/DEC-047, mesmo raciocínio do menu ⋮) ─────────────────
// ↓ e ↑ percorrem (circulando), Enter escolhe, Esc fecha. A diferença para o
// `ActionMenu` é deliberada: lá o requisito era Tab, e generalizar antes do
// segundo caso seria inventar requisito; aqui o segundo caso chegou, e é um
// `combobox` — onde ↓/↑ é o que o leitor de tela e a advogada esperam, e Tab
// precisa continuar SAINDO do campo.
//
// Sem `autoFocus` (a tela não rouba o foco de quem chegou nela) e sem tocar em
// `outline`: o anel vem da regra global de `:focus-visible`.
//
// ── Sem portal, ao contrário da DEC-046 ───────────────────────────────────
// O menu ⋮ precisou de portal porque vivia dentro de `<td overflow:hidden>` e
// de duas caixas roláveis. Este campo vive num formulário, cujo `form-group`
// não recorta nada. Portal aqui traria o custo de posicionar por viewport sem
// nenhum recorte para resolver.
// ═══════════════════════════════════════════════════════════════════════════

const CampoComSugestoes = ({
  id,
  name,
  value,
  onChange,               // recebe SEMPRE a string do campo, nunca o item
  itens = [],
  rotulo = (item) => item,
  limite = LIMITE_PADRAO,
  aoPrimeiroUso,          // dispara o carregamento sob demanda da tabela
  carregando = false,
  erro = null,
  descricao = null,       // dica curta abaixo do campo, opcional
  ...resto
}) => {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [tocado, setTocado] = useState(false);

  const listaId = `${useId()}-sugestoes`;
  const listaRef = useRef(null);

  const sugestoes = useMemo(
    () => filtrarSugestoes(itens, value, { limite, rotulo }),
    [itens, value, limite, rotulo]
  );

  // O item ativo tem que continuar visível quando se percorre com o teclado —
  // senão a seleção "some" para fora da caixa e quem usa teclado navega às
  // cegas. `block: 'nearest'` não rola a página, só a lista.
  useEffect(() => {
    if (!aberto || ativo < 0) return;
    listaRef.current?.querySelector(`[data-indice="${ativo}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativo]);

  // Carrega a tabela na primeira vez que o campo é usado, e só nela. É o que
  // mantém os 658 KB do CNJ fora de toda tela que não é esta.
  const acordar = useCallback(() => {
    if (!tocado) {
      setTocado(true);
      aoPrimeiroUso?.();
    }
  }, [tocado, aoPrimeiroUso]);

  const fechar = useCallback(() => {
    setAberto(false);
    setAtivo(-1);
  }, []);

  const escolher = useCallback(
    (item) => {
      // Grava-se o TEXTO, exatamente como está na tabela. Não há campo de
      // código, e é decisão: ver a DEC-057 e o trade-off no relatório da F-4.
      onChange(rotulo(item));
      fechar();
    },
    [onChange, rotulo, fechar]
  );

  const aoDigitar = (e) => {
    acordar();
    onChange(e.target.value);
    setAberto(true);
    setAtivo(-1);
  };

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      if (!aberto) return;
      // `stopPropagation` porque um Esc aqui não pode fechar o modal em volta
      // — o mesmo cuidado que o `ActionMenu` toma.
      e.preventDefault();
      e.stopPropagation();
      fechar();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      acordar();
      if (sugestoes.length === 0) return;
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        setAtivo(e.key === 'ArrowDown' ? 0 : sugestoes.length - 1);
        return;
      }
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      // Circula, como toda lista de opções: chegar ao fim e parar faz quem
      // passou do item procurar o caminho de volta com a seta oposta.
      setAtivo((i) => (i + passo + sugestoes.length) % sugestoes.length);
      return;
    }

    if (e.key === 'Enter') {
      // Só intercepta quando há um item ESCOLHIDO. Sem isso, o Enter que
      // salvaria o formulário passaria a não fazer nada enquanto a lista
      // estivesse aberta — e o campo viraria uma armadilha.
      if (!aberto || ativo < 0) return;
      e.preventDefault();
      escolher(sugestoes[ativo]);
      return;
    }

    // Tab sai do campo, e sair fecha. O componente não prende o foco: prender
    // faz sentido em menu, não em campo de formulário.
    if (e.key === 'Tab') fechar();
  };

  const semResultado =
    aberto && !carregando && !erro && String(value ?? '') !== '' && sugestoes.length === 0;

  return (
    <div className="sugestoes">
      <input
        {...resto}
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={aoDigitar}
        onFocus={acordar}
        onKeyDown={aoTeclar}
        onBlur={fechar}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={aberto && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
      />

      {aberto && sugestoes.length > 0 && (
        <ul className="sugestoes__lista" id={listaId} role="listbox" ref={listaRef}>
          {sugestoes.map((item, i) => (
            <li
              key={`${rotulo(item)}-${i}`}
              id={`${listaId}-${i}`}
              data-indice={i}
              role="option"
              aria-selected={i === ativo}
              className={`sugestoes__item${i === ativo ? ' sugestoes__item--ativo' : ''}`}
              // `mousedown` preventDefault para o `blur` do input não fechar a
              // lista ANTES do clique chegar no item.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(item)}
              onMouseEnter={() => setAtivo(i)}
            >
              {rotulo(item)}
            </li>
          ))}
        </ul>
      )}

      {carregando && <p className="sugestoes__aviso">Carregando sugestões…</p>}

      {/* Falhar em carregar a tabela NÃO impede de preencher o campo. */}
      {erro && (
        <p className="sugestoes__aviso sugestoes__aviso--erro">
          Não foi possível carregar as sugestões. Pode digitar normalmente.
        </p>
      )}

      {semResultado && (
        <p className="sugestoes__aviso">
          Nada na lista casa com isso — <strong>pode salvar assim mesmo</strong>.
        </p>
      )}

      {descricao && !semResultado && !carregando && !erro && (
        <p className="sugestoes__aviso">{descricao}</p>
      )}
    </div>
  );
};

export default CampoComSugestoes;
