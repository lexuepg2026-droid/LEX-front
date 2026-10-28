import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  FileDown,
  Info,
  PencilLine,
  RefreshCw,
} from 'lucide-react';
import documentService from '../../api/documentService';
import Loading from '../../components/common/Loading';
import Modal from '../../components/ui/Modal';
import { TIPO_DOCUMENTO_OPTIONS, TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { formatDate } from '../../utils/formatters';
import PendenciaList from '../../components/documents/PendenciaList';
import { getApiErrorDetails, getApiErrorMessage, getApiErrorPendencias } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import {
  motivoParaNaoRegerar,
  parametrosDeRegeracao,
  textoDaSobrescrita,
} from './regeneration.js';
import { contextoDoDocumento } from './textoFinal.js';
import '../../styles/modules.css';
import '../../components/ui/Button.css';
import './DocumentFinalTextPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import { usePublicarContexto } from '../../contexts/ContextoContext';
import { idDoProcesso } from '../../components/layout/contexto.js';

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
  const navigate = useNavigate();

  const [documento, setDocumento] = useState(null);
  // Fase 2b (DEC-085): publica para a faixa de contexto o processo — o do documento.
  usePublicarContexto({ processoId: idDoProcesso(documento?.processoId) });
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

  // ── Regeração (Fase 4.4) ─────────────────────────────────────────────────
  // `conflito` guarda as chaves do 409; enquanto ele existe, o diálogo de
  // sobrescrita está aberto. `avisoDeNaoSalvo` é o caso anterior a ele: regerar
  // com edição não salva descartaria o que está na caixa sem nunca ter passado
  // pelo servidor — e aí não haveria 409 nenhum, porque o backend não sabe da
  // edição.
  const [regerando, setRegerando] = useState(false);
  const [conflito, setConflito] = useState(null);
  // Pendências do 422 de regeração (Fase 4.6). Ver o `catch` de `regerar`.
  const [pendencias, setPendencias] = useState([]);
  const [avisoDeNaoSalvo, setAvisoDeNaoSalvo] = useState(false);

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

  const online = useOnlineStatus();

  const salvar = useCallback(async () => {
    if (!sujo) return;
    // Sem sinal não se grava (F-5a, Parte 4). O botão é anunciado como
    // desabilitado e o motivo aparece ao lado; a recusa acontece aqui porque
    // `aria-disabled` só ANUNCIA (DEC-053).
    if (!online) return;

    setSalvando(true);
    try {
      const res = await documentService.atualizarTexto(id, texto);
      setTextoSalvo(texto);
      setEditadoManualmente(res.data?.editadoManualmente === true);
      setLacunas(Array.isArray(res.data?.lacunas) ? res.data.lacunas : []);
      toast.success('Texto final salvo.');
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível salvar o texto.'));
    } finally {
      setSalvando(false);
    }
  }, [id, texto, sujo, online]);

  const baixar = useCallback(
    async (formato) => {
      setBaixando(formato);
      try {
        const { nome, tamanho } = await documentService.baixarEsalvar(id, formato);
        const kb = tamanho ? ` (${Math.round(tamanho / 1024)} kB)` : '';
        toast.success(`${nome}${kb}`);
      } catch (err) {
        if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, `Não foi possível baixar em ${formato.toUpperCase()}.`));
      } finally {
        setBaixando('');
      }
    },
    [id]
  );

  const alternarPortal = useCallback(async () => {
    // Fase 3.10 (DEC-155): durante o pedido o interruptor é `aria-disabled` (e
    // não `disabled`, que tirava o foco dele depois do Espaço) — a recusa do
    // clique em voo mora aqui, no padrão da DEC-053.
    if (alternandoPortal) return;
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
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível alterar a visibilidade.'));
    } finally {
      setAlternandoPortal(false);
    }
  }, [id, visivelPortal, alternandoPortal]);

  // ── Regerar a partir das seções ──────────────────────────────────────────
  //
  // A tela NÃO decide se pode sobrescrever: ela tenta, e o backend responde
  // 409 quando o documento foi editado à mão. Antecipar a decisão aqui
  // duplicaria a regra — e a flag da tela poderia divergir da do banco.
  const regerar = useCallback(
    async ({ confirmarSobrescrita } = {}) => {
      const parametros = parametrosDeRegeracao(documento);
      if (!parametros) return;

      const { modeloId, ...payload } = parametros;

      setRegerando(true);
      try {
        const res = await documentService.gerarDocumento(modeloId, {
          ...payload,
          confirmarSobrescrita,
        });
        setConflito(null);
        setPendencias([]);
        toast.success('Documento regerado a partir das seções.');
        // O documento novo é OUTRO registro. Navegar para ele é o que evita a
        // tela continuar mostrando um documento que acabou de ser substituído.
        navigate(`/dashboard/documentos/${res.data._id}/texto`, { replace: true });
      } catch (err) {
        if (err?.response?.status === 409) {
          setConflito(getApiErrorDetails(err) ?? {});
          return;
        }
        // ── 422: a lista completa, aqui mesmo (Fase 4.6) ──────────────────
        //
        // Até a 4.5 este caminho caía num `toast.error(message)` seco, com o
        // comentário afirmando que "a mensagem do backend já nomeia o que
        // falta". **Ela não nomeia**: o `message` é "Não é possível gerar o
        // documento: há informações faltando no cadastro", e os nomes vivem em
        // `errors.pendencias[]` — que esta tela descartava.
        //
        // O resultado prático era o pior beco do módulo: a advogada clicava em
        // Regerar, lia "faltam informações" e não tinha como descobrir QUAIS
        // sem voltar à montagem e refazer a escolha de processo e cliente.
        //
        // A lista é o MESMO componente da tela de montagem, não uma segunda
        // implementação — duas cópias divergiriam justamente nas mensagens,
        // que são o produto desta fase.
        if (err?.response?.status === 422) {
          const lista = getApiErrorPendencias(err);
          if (lista.length > 0) {
            setPendencias(lista);
            return;
          }
        }
        if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível regerar o documento.'));
      } finally {
        setRegerando(false);
      }
    },
    [documento, navigate]
  );

  const tentarRegerar = useCallback(() => {
    if (sujo) {
      setAvisoDeNaoSalvo(true);
      return;
    }
    regerar();
  }, [sujo, regerar]);

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

  const impedimentoDeRegerar = useMemo(() => motivoParaNaoRegerar(documento), [documento]);

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
      {/* ── Fase 3.9b2 (DEC-148): o cabeçalho em balão ─────────────────────
          O nome, "processo · cliente", os selos da lista e o "não salvo" à
          direita. A faixa de contexto continua acima (DEC-085). */}
      <header className="final__cabecalho" aria-labelledby="final-titulo">
        <div className="final__topo">
          <div className="final__identidade">
            <h1 id="final-titulo" className="final__titulo">{documento?.nome}</h1>
            {contextoDoDocumento(documento) && (
              <p className="final__contexto">{contextoDoDocumento(documento)}</p>
            )}
            <p className="final__subtitulo">
              {labelDe(TIPO_DOCUMENTO_OPTIONS, documento?.tipo)}
              {documento?.dataGeracao ? ` · gerado em ${formatDate(documento.dataGeracao)}` : ''}
            </p>

            {/* Os selos da lista de Documentos (DEC-139), com a mesma regra. */}
            <div className="final__selos">
              {editadoManualmente && (
                <span className="final__selo final__selo--editado">
                  <PencilLine size={13} aria-hidden="true" />
                  editado à mão
                </span>
              )}
              {visivelPortal && <span className="final__selo final__selo--portal">no portal</span>}
              {!editadoManualmente && !visivelPortal && (
                <span className="final__selo final__selo--neutro">gerado</span>
              )}
              {documento?.substituidoPorId && (
                <span className="final__selo final__selo--substituido">
                  substituído por uma versão mais nova
                </span>
              )}
            </div>
          </div>

          <p className="final__estado" aria-live="polite">
            {sujo && <span className="final__sujo">alterações não salvas</span>}
          </p>
        </div>

        {/* ── A barra de ações (DEC-149), nesta ordem: Salvar, Baixar PDF,
            Baixar DOCX, Portal e Regerar. Os tratadores são os de sempre. */}
        <div className="final__barra" role="group" aria-label="Ações do documento">
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--md"
            onClick={salvar}
            disabled={!sujo || salvando}
            aria-disabled={online ? undefined : 'true'}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={() => {
              // O arquivo é gerado pelo servidor e não fica guardado aqui
              // (Parte 2 da F-5a) — sem sinal, o botão não dispara.
              if (!online) return;
              baixar('pdf');
            }}
            disabled={Boolean(baixando)}
            aria-disabled={online ? undefined : 'true'}
          >
            <Download size={15} aria-hidden="true" />
            {baixando === 'pdf' ? 'Baixando…' : 'Baixar PDF'}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={() => {
              // O arquivo é gerado pelo servidor e não fica guardado aqui
              // (Parte 2 da F-5a) — sem sinal, o botão não dispara.
              if (!online) return;
              baixar('docx');
            }}
            disabled={Boolean(baixando)}
            aria-disabled={online ? undefined : 'true'}
          >
            <FileDown size={15} aria-hidden="true" />
            {baixando === 'docx' ? 'Baixando…' : 'Baixar DOCX'}
          </button>

          {/* O interruptor do `LiberacaoPortal` (DEC-111) no VISUAL, com o
              comportamento de hoje: liga e desliga sem confirmar. */}
          <button
            type="button"
            role="switch"
            aria-checked={visivelPortal}
            aria-describedby="final-portal-ajuda"
            className={`final__interruptor${visivelPortal ? ' final__interruptor--sim' : ''}`}
            onClick={alternarPortal}
            aria-disabled={alternandoPortal ? 'true' : undefined}
          >
            <span className="final__trilho" aria-hidden="true">
              <span className="final__botao-trilho" />
            </span>
            {alternandoPortal ? 'alterando…' : `No portal: ${visivelPortal ? 'sim' : 'não'}`}
          </button>

          {!impedimentoDeRegerar && (
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--md"
              onClick={tentarRegerar}
              disabled={regerando}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {regerando ? 'Regerando…' : 'Regerar'}
            </button>
          )}
        </div>

        {!online && <OfflineWriteReason />}

        {/* A lista completa do 422, aqui mesmo (Fase 4.6), junto da barra
            onde está o Regerar. É o MESMO componente da tela de geração. */}
        {!impedimentoDeRegerar && <PendenciaList pendencias={pendencias} />}
      </header>

      <div className="final__area">
        {/* ── Fase 3.9b2 (DEC-150): o texto num balão, com a fonte e a largura
            de leitura de antes. */}
        <section className="final__balao final__editor" aria-labelledby="final-texto-titulo">
          <h2 id="final-texto-titulo" className="final__balao-titulo">Texto final</h2>

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
          {/* ── Lacunas: ao lado do texto a partir de 1024 px, abaixo dele em
              telas menores (DEC-150). Aviso, não impedimento. */}
          {lacunas.length > 0 && (
            <section className="final__balao final__lacunas">
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

          {/* ── O que o portal e o regerar fazem — a explicação que ficava nos
              cartões, agora que os controles estão na barra. */}
          <section className="final__balao">
            <h2 className="final__balao-titulo">Portal e regeração</h2>
            <p id="final-portal-ajuda" className="final__cartao-texto">
              Desligado por padrão. Ligue só quando o documento estiver pronto para o cliente ver.
            </p>
            <p className="final__cartao-texto">
              Regerar recompõe o texto a partir das seções e do cadastro de hoje. Use quando o
              cadastro do cliente mudou, ou quando uma seção foi corrigida na biblioteca.
            </p>

            {impedimentoDeRegerar ? (
              <p className="final__cartao-impedimento">{impedimentoDeRegerar}</p>
            ) : (
              editadoManualmente && (
                <p className="final__cartao-aviso final__cartao-aviso--risco">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>
                    Este texto foi editado à mão. Regerar <strong>substitui</strong> a
                    revisão — o sistema vai pedir confirmação.
                  </span>
                </p>
              )
            )}
          </section>

          {/* ── Rastreabilidade de origem ─────────────────────────────────── */}
          <section className="final__balao">
            <h2 className="final__balao-titulo">Seções de origem</h2>
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

      {/* Texto não salvo: o backend não sabe desta edição, então não haveria
          409 nenhum — o aviso precisa vir da tela. */}
      <Modal
        open={avisoDeNaoSalvo}
        title="Há alterações não salvas"
        message="O texto na caixa ainda não foi salvo. Regerar agora descarta essas alterações, e elas não são recuperáveis porque nunca chegaram ao servidor."
        variant="danger"
        confirmLabel="Descartar e regerar"
        cancelLabel="Voltar e salvar"
        onConfirm={() => {
          setAvisoDeNaoSalvo(false);
          regerar();
        }}
        onCancel={() => setAvisoDeNaoSalvo(false)}
      />

      {/* O 409 do backend vira confirmação explícita. O reenvio leva
          `confirmarSobrescrita: true` — é o contrato da 2C. */}
      <Modal
        open={conflito !== null}
        title="Substituir o texto editado à mão?"
        message={textoDaSobrescrita(conflito, { formatarData: formatDate })}
        variant="danger"
        confirmLabel="Substituir e regerar"
        cancelLabel="Manter o texto atual"
        onConfirm={() => regerar({ confirmarSobrescrita: true })}
        onCancel={() => setConflito(null)}
      />
    </div>
  );
}

export default DocumentFinalTextPage;
