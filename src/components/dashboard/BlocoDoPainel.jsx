import { ChevronDown } from 'lucide-react';
import './BlocoDoPainel.css';

// ═══════════════════════════════════════════════════════════════════════════
// UM BLOCO DO PAINEL — colapsável, com a AÇÃO que ele sugere (F-4)
//
// ── A pergunta que o painel passou a responder ────────────────────────────
// O painel respondia *"como está o escritório"*. A pergunta que a advogada faz
// ao abrir o sistema é outra: **"o que eu preciso fazer hoje"**. Um número sem
// ação ao lado obriga a decorar o caminho — ver "3 parcelas vencidas", ir ao
// menu, achar Pagamentos, achar a parcela. A ação mora no bloco que a sugere.
//
// ── O cabeçalho é um `<button>`, e isso não é detalhe ─────────────────────
// Um `<h2>` com `onClick` não recebe foco, não responde a Enter nem a espaço, e
// o leitor de tela anuncia um título — não um controle. O botão carrega
// `aria-expanded`, e o anel de foco vem da regra global de `:focus-visible`,
// que este componente não sobrescreve.
//
// A AÇÃO fica FORA do botão, ao lado: aninhar um link dentro de um botão é
// HTML inválido, e foi a mesma razão pela qual "Próximos vencimentos" precisou
// de dois irmãos em vez de um link dentro do outro (F-1b).
// ═══════════════════════════════════════════════════════════════════════════

const BlocoDoPainel = ({
  chave,
  titulo,
  Icone = null,
  contagem = null,     // número em destaque ao lado do título, quando houver
  aberto,
  aoAlternar,
  acao = null,         // { rotulo, para } — o que este bloco manda fazer
  children,
}) => {
  const idConteudo = `bloco-${chave}`;

  return (
    <section className={`bloco${aberto ? '' : ' bloco--fechado'}`}>
      <div className="bloco__cabecalho">
        <button
          type="button"
          className="bloco__gatilho"
          aria-expanded={aberto}
          aria-controls={idConteudo}
          onClick={() => aoAlternar(chave)}
        >
          <ChevronDown size={18} className="bloco__seta" aria-hidden="true" />
          {Icone && <Icone size={18} className="bloco__icone" aria-hidden="true" />}
          <span className="bloco__titulo">{titulo}</span>
          {contagem !== null && contagem > 0 && (
            <span className="bloco__contagem">{contagem}</span>
          )}
        </button>

        {acao && <div className="bloco__acao">{acao}</div>}
      </div>

      {/* Desmonta o conteúdo quando fechado, em vez de escondê-lo por CSS: o
          bloco de gráficos é `lazy` e pesado, e mantê-lo montado atrás de um
          `display: none` desfaria metade do motivo de ele ser colapsável. */}
      {aberto && (
        <div className="bloco__conteudo" id={idConteudo}>
          {children}
        </div>
      )}
    </section>
  );
};

export default BlocoDoPainel;
