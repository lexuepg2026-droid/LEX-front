import React from 'react';
import {
  PRESETS_PERIODO,
  ROTULO_PRESET,
  descricaoDoPeriodo
} from '../ui/periodo.js';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import './FinancialFilters.css';

// ═══════════════════════════════════════════════════════════════════════════
// A BARRA DE FILTROS DAS LISTAGENS FINANCEIRAS — Fase F-1b.3
//
// ── Por que um componente, e não a barra copiada em três telas ───────────
// Porque a regra que ele carrega é a que se perde na cópia: o campo de busca
// NÃO PODE ser desmontado quando a lista atualiza. Este componente é declarado
// no escopo do módulo (nunca dentro do render de uma página — isso o
// remontaria a cada consulta) e é renderizado SEMPRE, inclusive durante o
// carregamento. O indicador fica ABAIXO dele, dentro do JSX da página.
//
// É a causa que a F-1a.1 corrigiu, que o passo 155 do roteiro valida à mão e
// que a varredura estática de `tests/regressions/` trava.
//
// ── Os filtros aplicados ficam VISÍVEIS ──────────────────────────────────
// Quem chega numa lista de três linhas precisa saber se a lista é curta ou se
// está filtrada. A barra abaixo dos controles diz, em palavras, o recorte
// ativo — e oferece o botão que o desfaz.
//
// ── Composição, não configuração ─────────────────────────────────────────
// `children` recebe os filtros que só uma listagem tem (status, tipo, forma de
// pagamento). O componente não os conhece: uma prop `mostrarStatus` por
// listagem viraria uma lista de bandeiras que só cresce, e a quinta listagem
// acrescentaria a quinta bandeira.
// ═══════════════════════════════════════════════════════════════════════════

function FinancialFilters({
  filtros,
  definirFiltro,
  aplicarPreset,
  limpar,
  temFiltro,
  honorarios = null,
  placeholderBusca = 'Buscar por descrição, processo ou observação…',
  descricaoDoRecorte = null,
  children
}) {
  const personalizado = filtros.preset === PRESETS_PERIODO.PERSONALIZADO;

  return (
    <div className="filtros-financeiros">
      <div className="filter-bar">
        <input
          type="search"
          className="filtros-financeiros__busca"
          placeholder={placeholderBusca}
          value={filtros.busca}
          onChange={(e) => definirFiltro('busca', e.target.value)}
          maxLength={80}
          aria-label="Buscar"
        />

        {/* O seletor de honorário só existe onde a listagem tem esse recorte —
            a de honorários, obviamente, não tem. `null` é a ausência, e não
            uma lista vazia: lista vazia é "nenhum honorário cadastrado", que é
            outro estado e merece o `<option>` que o diz. */}
        {honorarios !== null && (
          <select
            value={filtros.honorarioId}
            onChange={(e) => definirFiltro('honorarioId', e.target.value)}
            aria-label="Filtrar por honorário"
          >
            <option value="">Todos os honorários</option>
            {honorarios.length === 0 ? (
              <option value="" disabled>Nenhum honorário cadastrado</option>
            ) : (
              honorarios.map((h) => (
                <option key={h._id} value={h._id}>
                  {rotuloCurtoDoHonorario(h.descricao)}
                  {h.processoId?.titulo ? ` — ${h.processoId.titulo}` : ''}
                </option>
              ))
            )}
          </select>
        )}

        {children}

        <select
          value={filtros.preset}
          onChange={(e) => aplicarPreset(e.target.value)}
          aria-label="Período"
        >
          {Object.values(PRESETS_PERIODO).map((p) => (
            <option key={p} value={p}>{ROTULO_PRESET[p]}</option>
          ))}
        </select>

        {/* As duas datas só aparecem no modo personalizado. Nos presets elas
            seriam dois campos preenchidos que não se pode editar — e um campo
            que parece editável e não é ensina a pessoa a desconfiar da tela. */}
        {personalizado && (
          <>
            <input
              type="date"
              value={filtros.de}
              onChange={(e) => definirFiltro('de', e.target.value)}
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={filtros.ate}
              onChange={(e) => definirFiltro('ate', e.target.value)}
              aria-label="Data final"
            />
          </>
        )}
      </div>

      {temFiltro && (
        <p className="filtros-financeiros__aplicados" role="status">
          <span className="filtros-financeiros__rotulo">Filtros aplicados:</span>{' '}
          {descricaoDoRecorte || 'recorte ativo'}
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm filtros-financeiros__limpar"
            onClick={limpar}
          >
            Limpar filtros
          </button>
        </p>
      )}
    </div>
  );
}

export { descricaoDoPeriodo };
export default FinancialFilters;
