import React from 'react';
import { AlertCircle, CircleDollarSign, UserX } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './PendenciaList.css';

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE PENDÊNCIAS — uma só, para as duas telas (Fase 4.6)
//
// Vivia inteira dentro de `GenerationPanel`. A tela do documento
// (`DocumentFinalTextPage`), que ganhou "Regerar" na Fase 4.4, tratava o mesmo
// 422 com um `toast.error(message)` seco — e o `message` do backend é
// "Não é possível gerar o documento: há informações faltando no cadastro",
// **que não nomeia nada**. Os nomes vivem em `errors.pendencias[]`, que aquela
// tela descartava.
//
// O comentário que estava lá afirmava "a mensagem do backend já nomeia o que
// falta". Não nomeia. O Raio-X do módulo registrou isso como o pior dos sete
// becos: a advogada clicava em Regerar, via "faltam informações", e não tinha
// como descobrir quais sem voltar à montagem.
//
// Extraído em componente em vez de duplicado porque duas cópias divergem — e
// aqui divergiriam justamente nas mensagens, que são o produto desta fase.
//
// ── Os três motivos, e por que a tela os separa ──────────────────────────
// `motivo` vem do vocabulário fechado de `config/templateVariables.js`:
//
//   campoVazio                → falta preencher. A ação é ir ao cadastro.
//   tipoIncompativel          → a variável é de PF e o cliente é PJ (ou o
//                               contrário). **Não se resolve preenchendo**:
//                               o hook do Client apaga os campos do outro tipo.
//                               Exibi-la junto das outras convidaria a advogada
//                               a procurar um campo que não existe.
//   tipoHonorarioIncompativel
//   parcelasDesiguais         → o dado existe, mas não naquela forma.
//
// Misturar os três numa lista só de "faltam N dados" foi o que produziu o beco:
// o número dizia "preencha", e um dos itens não era preenchível.
// ═══════════════════════════════════════════════════════════════════════════

const INCOMPATIVEIS = ['tipoIncompativel', 'tipoHonorarioIncompativel', 'parcelasDesiguais'];

const ehIncompativel = (p) => INCOMPATIVEIS.includes(p.motivo);

function ItemPendencia({ pendencia }) {
  const incompativel = ehIncompativel(pendencia);

  return (
    <li className={`pendencia${incompativel ? ' pendencia--incompativel' : ''}`}>
      <span className="pendencia__rotulo">{pendencia.rotulo}</span>

      {/* A causa aparece separada da ação quando o backend a manda. Ler
          "por que" antes de "o que fazer" é o que evita a advogada tentar a
          ação sem entender que o problema é outro. */}
      {pendencia.causa && (
        <span className="pendencia__causa">{pendencia.causa}</span>
      )}

      <span className="pendencia__orientacao">{pendencia.orientacao}</span>

      {/* A chave fica discreta, no fim, só para quem for conferir a seção. */}
      <code className="pendencia__chave">{`{{${pendencia.variavel}}}`}</code>
    </li>
  );
}

// ── Escolha de honorário: a única pendência que a tela resolve sozinha ─────
export function EscolhaDeHonorario({ escolha, sintomas, honorarioId, onEscolher, onConfirmar, gerando }) {
  if (!escolha) return null;

  return (
    <div className="geracao__honorario">
      <p className="geracao__honorario-titulo">
        <CircleDollarSign size={15} aria-hidden="true" />
        {escolha.rotulo}
      </p>
      <p className="geracao__honorario-orientacao">{escolha.orientacao}</p>

      {sintomas > 0 && (
        <p className="geracao__honorario-nota">
          {sintomas === 1
            ? 'Há 1 variável de honorário no texto esperando esta escolha.'
            : `Há ${sintomas} variáveis de honorário no texto esperando esta escolha.`}{' '}
          Elas se resolvem sozinhas quando você escolher — não é dado faltando no cadastro.
        </p>
      )}

      <ul className="geracao__opcoes">
        {escolha.opcoes.map((opcao) => {
          const id = String(opcao.honorarioId);
          return (
            <li key={id}>
              <label className={`geracao__opcao${honorarioId === id ? ' geracao__opcao--ativa' : ''}`}>
                <input
                  type="radio"
                  name="honorario"
                  value={id}
                  checked={honorarioId === id}
                  onChange={() => onEscolher(id)}
                />
                <span className="geracao__opcao-texto">
                  <strong>{formatCurrency(opcao.valor)}</strong>
                  {opcao.descricao ? ` — ${opcao.descricao}` : ''}
                  <span className="geracao__opcao-meta">
                    {opcao.tipo ? `tipo: ${opcao.tipo}` : ''}
                    {opcao.dataVencimento ? ` · vence em ${formatDate(opcao.dataVencimento)}` : ''}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="ui-btn ui-btn--primary ui-btn--sm"
        onClick={onConfirmar}
        disabled={!honorarioId || gerando}
      >
        {gerando ? 'Gerando…' : 'Gerar com este honorário'}
      </button>
    </div>
  );
}

export default function PendenciaList({ pendencias }) {
  if (!pendencias || pendencias.length === 0) return null;

  const bloqueios = pendencias.filter(ehIncompativel);
  const faltantes = pendencias.filter((p) => !ehIncompativel(p));

  return (
    <div className="geracao__pendencias">
      {/* Os bloqueios vêm PRIMEIRO e com título próprio: não adianta preencher
          cadastro enquanto o modelo não serve para aquele cliente. */}
      {bloqueios.length > 0 && (
        <>
          <p className="geracao__pendencias-titulo geracao__pendencias-titulo--bloqueio">
            <UserX size={15} aria-hidden="true" />
            {bloqueios.length === 1
              ? 'Uma variável não se aplica a esta combinação'
              : `${bloqueios.length} variáveis não se aplicam a esta combinação`}
          </p>
          <p className="geracao__pendencias-ajuda">
            Estas <strong>não se resolvem preenchendo cadastro</strong> — o campo não existe
            para este cliente ou para este honorário.
          </p>
          <ul className="geracao__pendencias-lista">
            {bloqueios.map((p) => <ItemPendencia key={p.variavel} pendencia={p} />)}
          </ul>
        </>
      )}

      {faltantes.length > 0 && (
        <>
          <p className="geracao__pendencias-titulo">
            <AlertCircle size={15} aria-hidden="true" />
            {faltantes.length === 1
              ? 'Falta um dado no cadastro'
              : `Faltam ${faltantes.length} dados no cadastro`}
          </p>
          <p className="geracao__pendencias-ajuda">
            O documento não é gerado pela metade. Preencha o que falta e volte aqui.
          </p>
          <ul className="geracao__pendencias-lista">
            {faltantes.map((p) => <ItemPendencia key={p.variavel} pendencia={p} />)}
          </ul>
        </>
      )}
    </div>
  );
}
