import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  FileDown,
  Info,
  PencilLine,
} from 'lucide-react';
import documentService from '../../api/documentService';
import Loading from '../../components/common/Loading';
import { TIPO_DOCUMENTO_OPTIONS, TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { formatDate } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import '../../components/ui/Button.css';
import './DocumentFinalTextPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DE TEXTO FINAL
//
// O poder moderador: depois de gerado, a advogada edita o texto final sem
// precisar corrigir a seção de origem. `textoResolvido` passa a ser a ÚNICA
// fonte da verdade do documento.
//
// Os vínculos de seção continuam visíveis — mas como RASTREABILIDADE DE ORIGEM,
// com aviso de que o texto já não vem deles. Se fossem recompostos, a edição
// dela sumiria no próximo download, em silêncio.
//
// Lacuna (`[...]`, linha de sublinhados, chave que escapou) é AVISO, nunca
// impedimento: aparece com o trecho de contexto e o download continua liberado.
// Não confundir com pendência de cadastro, que bloqueia a geração com 422.
// ═══════════════════════════════════════════════════════════════════════════

function DocumentFinalTextPage() {
  const { id } = useParams();

  const [documento, setDocumento] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [texto, setTexto] = useState('');
  const [textoSalvo, setTextoSalvo] = useState('');
  const [lacunas, setLacunas] = useState([]);
  const [editadoManualmente, setEditadoManualmente] = useState(false);
  const [visivelPortal, setVisivelPortal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState('');
  const [alternandoPortal, setAlternandoPortal] = useState(false);

  const areaRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');

    Promise.all([
      documentService.getDocumentById(id),
      // Para documento já gerado, o preview devolve o texto CONGELADO do banco
      // mais as lacunas dele — é nele que a advogada precisa enxergar o que
      // ficou por preencher, não no modelo.
      documentService.previewDocumento(id),
      documentService.listDocumentSecoes(id),
    ])
      .then(([resDoc, resPreview, resVinculos]) => {
        if (!ativo) return;

        setDocumento(resDoc.data);
        setVisivelPortal(resDoc.data?.visivelPortal === true);

        const preview = resPreview.data ?? {};
        const conteudo = preview.textoResolvido ?? resDoc.data?.textoResolvido ?? '';
        setTexto(conteudo);
        setTextoSalvo(conteudo);
        setLacunas(Array.isArray(preview.lacunas) ? preview.lacunas : []);
        setEditadoManualmente(
          preview.editadoManualmente === true || resDoc.data?.editadoManualmente === true
        );

        const lista = resVinculos.data.data ?? resVinculos.data;
        setVinculos(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => {
        if (ativo) setError(getApiErrorMessage(err, 'Falha ao carregar o documento.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => { ativo = false; };
  }, [id]);

  const sujo = texto !== textoSalvo;

  const salvar = useCallback(async () => {
    if (!sujo) return;

    setSalvando(true);
    try {
      const res = await documentService.atualizarTexto(id, texto);
      setTextoSalvo(texto);
      setEditadoManualmente(res.data?.editadoManualmente === true);
      setLacunas(Array.isArray(res.data?.lacunas) ? res.data.lacunas : []);
      toast.success('Texto final salvo.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o texto.'));
    } finally {
      setSalvando(false);
    }
  }, [id, texto, sujo]);

  const baixar = useCallback(
    async (formato) => {
      setBaixando(formato);
      try {
        const { nome, tamanho } = await documentService.baixarEsalvar(id, formato);
        const kb = tamanho ? ` (${Math.round(tamanho / 1024)} kB)` : '';
        toast.success(`${nome}${kb}`);
      } catch (err) {
        toast.error(getApiErrorMessage(err, `Não foi possível baixar em ${formato.toUpperCase()}.`));
      } finally {
        setBaixando('');
      }
    },
    [id]
  );

  const alternarPortal = useCallback(async () => {
    const alvo = !visivelPortal;
    setAlternandoPortal(true);
    try {
      const res = await documentService.alternarVisibilidadePortal(id, alvo);
      setVisivelPortal(res.data?.visivelPortal === true);
      toast.success(
        res.data?.visivelPortal
          ? 'Documento visível no portal do cliente.'
          : 'Documento oculto do portal do cliente.'
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar a visibilidade.'));
    } finally {
      setAlternandoPortal(false);
    }
  }, [id, visivelPortal]);

  // Leva o cursor até a lacuna. `inicio` vem do backend em posição de caractere
  // sobre o mesmo texto que está no textarea — só vale enquanto a advogada não
  // editou, e é por isso que só oferecemos o salto com o texto limpo.
  const irParaLacuna = useCallback(
    (lacuna) => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(lacuna.inicio, lacuna.fim);
      // Aproxima a linha da lacuna do meio da caixa, em vez de deixá-la no topo.
      const linhas = String(texto).slice(0, lacuna.inicio).split('\n').length;
      const alturaLinha = 22;
      area.scrollTop = Math.max(0, (linhas - 6) * alturaLinha);
    },
    [texto]
  );

  const secoesDeOrigem = useMemo(
    () =>
      vinculos.map((v) => ({
        id: String(v.secaoId?._id ?? v.secaoId),
        titulo: v.secaoId?.titulo ?? 'Seção removida da biblioteca',
        tipo: v.secaoId?.tipo,
        ordem: v.ordem,
      })),
    [vinculos]
  );

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="module-container">
        <p className="error-message">{error}</p>
        <Link to="/dashboard/documentos" className="ui-btn ui-btn--secondary ui-btn--md">
          Voltar para Documentos
        </Link>
      </div>
    );
  }

  return (
    <div className="module-container final">
      <header className="final__cabecalho">
        <div className="final__identidade">
          <h1 className="final__titulo">{documento?.nome}</h1>
          <p className="final__subtitulo">
            {labelDe(TIPO_DOCUMENTO_OPTIONS, documento?.tipo)}
            {documento?.dataGeracao ? ` · gerado em ${formatDate(documento.dataGeracao)}` : ''}
            {documento?.processoId?.titulo ? ` · ${documento.processoId.titulo}` : ''}
          </p>

          <div className="final__selos">
            {editadoManualmente && (
              <span className="final__selo final__selo--editado">
                <PencilLine size={13} aria-hidden="true" />
                editado à mão
              </span>
            )}
            {documento?.substituidoPorId && (
              <span className="final__selo final__selo--substituido">
                substituído por uma versão mais nova
              </span>
            )}
          </div>
        </div>

        <div className="final__acoes-topo">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={() => baixar('pdf')}
            disabled={Boolean(baixando)}
          >
            <Download size={15} aria-hidden="true" />
            {baixando === 'pdf' ? 'Baixando…' : 'PDF'}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={() => baixar('docx')}
            disabled={Boolean(baixando)}
          >
            <FileDown size={15} aria-hidden="true" />
            {baixando === 'docx' ? 'Baixando…' : 'DOCX'}
          </button>
        </div>
      </header>

      {/* ── Aviso de lacuna — não bloqueia nada ───────────────────────────── */}
      {lacunas.length > 0 && (
        <section className="final__lacunas">
          <p className="final__lacunas-titulo">
            <AlertTriangle size={15} aria-hidden="true" />
            {lacunas.length === 1
              ? '1 trecho a preencher neste documento'
              : `${lacunas.length} trechos a preencher neste documento`}
          </p>
          <p className="final__lacunas-ajuda">
            Aviso, não impedimento — o download continua liberado. Se o espaço foi deixado de
            propósito para preencher à mão depois, está certo assim.
          </p>
          <ul className="final__lacunas-lista">
            {lacunas.map((lacuna) => (
              <li key={`${lacuna.tipo}-${lacuna.inicio}`} className="final__lacuna">
                <span className="final__lacuna-rotulo">
                  {lacuna.rotulo} · linha {lacuna.linha}
                </span>
                <span className="final__lacuna-contexto">{lacuna.contexto}</span>
                <button
                  type="button"
                  className="final__lacuna-ir"
                  onClick={() => irParaLacuna(lacuna)}
                  disabled={sujo}
                  title={
                    sujo
                      ? 'Salve o texto para as posições voltarem a corresponder'
                      : 'Levar o cursor até este trecho'
                  }
                >
                  ir até o trecho
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="final__area">
        <section className="final__editor">
          <div className="final__editor-barra">
            <h2 className="final__editor-titulo">Texto final</h2>
            <div className="final__editor-acoes">
              {sujo && <span className="final__sujo">alterações não salvas</span>}
              <button
                type="button"
                className="ui-btn ui-btn--primary ui-btn--sm"
                onClick={salvar}
                disabled={!sujo || salvando}
              >
                {salvando ? 'Salvando…' : 'Salvar texto'}
              </button>
            </div>
          </div>

          <textarea
            ref={areaRef}
            className="final__textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            spellCheck
            aria-label="Texto final do documento"
          />

          <p className="final__contador">
            {texto.length.toLocaleString('pt-BR')} caracteres ·{' '}
            {texto.split(/\n{2,}/).filter((p) => p.trim()).length} parágrafos
          </p>
        </section>

        <aside className="final__lateral">
          {/* ── Visibilidade no portal ────────────────────────────────────── */}
          <section className="final__cartao">
            <h2 className="final__cartao-titulo">Portal do cliente</h2>
            <p className="final__cartao-texto">
              Desligado por padrão. Ligue só quando o documento estiver pronto para o cliente ver.
            </p>
            <button
              type="button"
              className={`final__portal${visivelPortal ? ' final__portal--ligado' : ''}`}
              onClick={alternarPortal}
              disabled={alternandoPortal}
              aria-pressed={visivelPortal}
            >
              {visivelPortal ? <Eye size={15} /> : <EyeOff size={15} />}
              {alternandoPortal ? 'alterando…' : visivelPortal ? 'Visível no portal' : 'Oculto do portal'}
            </button>
          </section>

          {/* ── Rastreabilidade de origem ─────────────────────────────────── */}
          <section className="final__cartao">
            <h2 className="final__cartao-titulo">Seções de origem</h2>
            <p className="final__cartao-aviso">
              <Info size={13} aria-hidden="true" />
              <span>
                Rastreabilidade, não conteúdo. O texto acima <strong>já não vem daqui</strong> —
                depois de gerado, ele é a única fonte da verdade. Editar estas seções não muda este
                documento.
              </span>
            </p>

            {secoesDeOrigem.length === 0 ? (
              <p className="final__cartao-texto">Nenhum vínculo de seção registrado.</p>
            ) : (
              <ol className="final__secoes">
                {secoesDeOrigem.map((secao) => (
                  <li key={secao.id} className="final__secao">
                    <span className="final__secao-titulo">{secao.titulo}</span>
                    <span className="final__secao-tipo">{labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default DocumentFinalTextPage;
