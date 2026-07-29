import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, FileStack, FileText, Loader2 } from 'lucide-react';
import documentService from '../../api/documentService';
import DocumentCanvas from '../../components/documents/DocumentCanvas';
import SecaoLibraryPanel from '../../components/documents/SecaoLibraryPanel';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../contexts/AuthContext';
import useSerialQueue from '../../hooks/useSerialQueue';
import { TIPO_DOCUMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import './DocumentAssemblyPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// TELA DE MONTAGEM — UMA TELA, DOIS MODOS
//
// A mesma tela serve para criar modelo e para gerar documento, com duas portas
// de entrada distintas na navegação. O modo fica explícito no cabeçalho o tempo
// todo: a advogada precisa saber sempre se está construindo um modelo
// reutilizável ou um documento de um cliente.
//
//   modo=modelo     sem processo e sem cliente. O que se salva é modelo
//                   (ehModelo: true), reutilizável em quantos documentos ela
//                   quiser.
//   modo=documento  monta e, ao final, gera para um processo e um cliente.
//
// ── Por que os dois modos montam sobre um MODELO ──────────────────────────
//
// Não é atalho de implementação: é o único caminho que o backend oferece. A
// geração é `POST /documents/modelos/:id/gerar`, e `carregarModelo` filtra por
// `ehModelo: true`. Documento gerado é congelado — `textoResolvido` e
// `variaveisResolvidas` ficam gravados e o PATCH não os aceita.
//
// Então montar é sempre montar um modelo. No modo documento, o modelo é
// escolhido (ou criado) e em seguida gerado. Isso também é o que faz a
// reutilização funcionar: gerar a mesma procuração para o segundo litisconsorte
// é escolher o mesmo modelo outra vez, não montar tudo de novo.
//
// ── Salvamento ────────────────────────────────────────────────────────────
//
// Sem botão "Salvar": cada operação persiste na hora. Reordenar e remover são
// otimistas, com rollback visível se a requisição falhar. Inserir espera a
// resposta, porque a inserção reordena as demais no servidor (empurrão de
// posição) e a tela não tem como adivinhar a sequência resultante.
//
// Todas as chamadas passam pela fila serial — ver `useSerialQueue`.
// ═══════════════════════════════════════════════════════════════════════════

const MODO_MODELO = 'modelo';
const MODO_DOCUMENTO = 'documento';

const ehModoValido = (modo) => modo === MODO_MODELO || modo === MODO_DOCUMENTO;

function DocumentAssemblyPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const enfileirar = useSerialQueue();

  const modo = ehModoValido(searchParams.get('modo')) ? searchParams.get('modo') : MODO_MODELO;

  const [documento, setDocumento] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  const [secaoArmada, setSecaoArmada] = useState(null);

  // Indicador discreto de salvamento. `emVoo` é contador, não booleano: com
  // operações serializadas ainda pode haver mais de uma enfileirada, e um
  // booleano apagaria o "salvando" na primeira que terminasse.
  const [emVoo, setEmVoo] = useState(0);
  const [salvoEm, setSalvoEm] = useState(null);
  const [erroSalvamento, setErroSalvamento] = useState('');

  // Evita setState depois do unmount — a tela navega para o editor de texto
  // final assim que a geração dá certo, e as promises em voo continuam vivas.
  const montado = useRef(true);
  useEffect(() => () => { montado.current = false; }, []);

  const idsUsados = useMemo(
    () => new Set(vinculos.map((v) => String(v.secaoId?._id ?? v.secaoId))),
    [vinculos]
  );

  // ── Carga ────────────────────────────────────────────────────────────────

  const recarregarVinculos = useCallback(async () => {
    const res = await documentService.listDocumentSecoes(id);
    const lista = res.data.data ?? res.data;
    if (montado.current) setVinculos(Array.isArray(lista) ? lista : []);
    return lista;
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let ativo = true;
    setLoading(true);
    setError('');

    Promise.all([documentService.getDocumentById(id), documentService.listDocumentSecoes(id)])
      .then(([resDoc, resVinculos]) => {
        if (!ativo) return;
        setDocumento(resDoc.data);
        const lista = resVinculos.data.data ?? resVinculos.data;
        setVinculos(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => {
        if (!ativo) return;
        setError(getApiErrorMessage(err, 'Falha ao carregar a montagem.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => { ativo = false; };
  }, [id]);

  // ── Execução das operações ───────────────────────────────────────────────

  // Envolve uma operação com: fila serial, indicador de salvamento e rollback.
  //
  // `snapshot` é o estado exatamente anterior à mudança otimista. Em caso de
  // falha ele volta à tela — é o rollback visível — e só então tentamos
  // reconciliar com o servidor. A reconciliação é rede de segurança e não pode
  // apagar o rollback: se ela também falhar (queda de rede), o snapshot fica.
  const executar = useCallback(
    ({ acao, snapshot, mensagemDeErro }) =>
      enfileirar(async () => {
        if (montado.current) {
          setEmVoo((n) => n + 1);
          setErroSalvamento('');
        }

        try {
          await acao();
          if (montado.current) setSalvoEm(new Date());
        } catch (err) {
          const mensagem = getApiErrorMessage(err, mensagemDeErro);

          if (montado.current) {
            if (snapshot) setVinculos(snapshot);
            setErroSalvamento(mensagem);
          }
          toast.error(mensagem);

          // Reconcilia com o servidor. Silenciosa de propósito: o erro que
          // importa já foi mostrado, e falha aqui só significa que o snapshot
          // continua sendo a melhor verdade disponível.
          try {
            await recarregarVinculos();
          } catch {
            /* mantém o rollback */
          }

          throw err;
        } finally {
          if (montado.current) setEmVoo((n) => Math.max(0, n - 1));
        }
      }),
    [enfileirar, recarregarVinculos]
  );

  // ── Inserção — os dois caminhos ──────────────────────────────────────────
  //
  // Botão "Adicionar" chama sem `ordem` (anexa ao fim). Arrastar e "Inserir
  // aqui" chamam com `ordem` (insere e empurra). É o MESMO método de serviço:
  // o empurrão é regra do backend e não se reimplementa aqui.

  const inserir = useCallback(
    (secaoId, ordem) => {
      if (!id) return Promise.resolve();

      if (idsUsados.has(String(secaoId))) {
        // Antecipação do índice único {documentoId, secaoId}. O backend
        // recusaria com 409 de qualquer forma; avisar aqui poupa a viagem.
        toast.error('Esta seção já está no documento. Cada seção entra uma vez só.');
        return Promise.resolve();
      }

      setSecaoArmada(null);

      return executar({
        // Sem otimismo aqui: a inserção com `ordem` empurra as seguintes no
        // servidor, e a sequência resultante é dele. Reproduzir o empurrão na
        // tela seria duplicar a regra — a releitura é mais curta e não mente.
        acao: async () => {
          await documentService.vincularSecao(id, { secaoId, ordem });
          await recarregarVinculos();
        },
        mensagemDeErro: 'Não foi possível inserir a seção.',
      }).catch(() => {});
    },
    [id, idsUsados, executar, recarregarVinculos]
  );

  const adicionarAoFim = useCallback((secao) => inserir(secao._id, undefined), [inserir]);

  const inserirNaPosicao = useCallback((secaoId, posicao) => inserir(secaoId, posicao), [inserir]);

  // ── Reordenar — otimista, com rollback ───────────────────────────────────

  const aplicarOrdem = useCallback(
    (de, para) => {
      if (!id) return;
      if (de === para || de < 0 || para < 0 || de >= vinculos.length || para >= vinculos.length) {
        return;
      }

      const snapshot = vinculos;
      const reordenado = [...vinculos];
      const [movido] = reordenado.splice(de, 1);
      reordenado.splice(para, 0, movido);

      setVinculos(reordenado);
      setSecaoArmada(null);

      const ids = reordenado.map((v) => String(v.secaoId?._id ?? v.secaoId));

      executar({
        // `secoes` precisa conter exatamente as seções vinculadas — reordenar é
        // permutar. Montamos a partir do array já reordenado na tela, e é por
        // isso que a fila serial importa: sem ela, duas reordenações rápidas
        // mandariam arrays construídos sobre estados que o servidor ainda não
        // confirmou.
        acao: () => documentService.reordenarSecoes(id, ids),
        snapshot,
        mensagemDeErro: 'Não foi possível salvar a nova ordem.',
      }).catch(() => {});
    },
    [id, vinculos, executar]
  );

  // ── Remover — otimista, com rollback ─────────────────────────────────────

  const remover = useCallback(
    (vinculo) => {
      if (!id) return;

      const secaoId = String(vinculo.secaoId?._id ?? vinculo.secaoId);
      const snapshot = vinculos;

      setVinculos(vinculos.filter((v) => String(v.secaoId?._id ?? v.secaoId) !== secaoId));
      setSecaoArmada(null);

      executar({
        acao: () => documentService.desvincularSecao(id, secaoId),
        snapshot,
        mensagemDeErro: 'Não foi possível remover a seção.',
      }).catch(() => {});
    },
    [id, vinculos, executar]
  );

  // ── Porta de entrada: escolher ou criar o modelo ─────────────────────────

  if (!id) {
    return <AssemblyStartCard modo={modo} navigate={navigate} />;
  }

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

  const salvando = emVoo > 0;

  return (
    <div className="module-container montagem">
      {/* O modo fica no cabeçalho o tempo todo, não só na entrada. */}
      <header className={`montagem__cabecalho montagem__cabecalho--${modo}`}>
        <div className="montagem__identidade">
          <span className="montagem__selo">
            {modo === MODO_MODELO ? <FileStack size={14} /> : <FileText size={14} />}
            {modo === MODO_MODELO ? 'Montando um MODELO' : 'Montando um DOCUMENTO'}
          </span>
          <h1 className="montagem__titulo">{documento?.nome}</h1>
          <p className="montagem__subtitulo">
            {labelDe(TIPO_DOCUMENTO_OPTIONS, documento?.tipo)}
            {modo === MODO_MODELO
              ? ' · reutilizável, sem processo e sem cliente'
              : ' · escolha o processo e o cliente no painel abaixo'}
          </p>
        </div>

        <div className="montagem__estado" aria-live="polite">
          {salvando ? (
            <span className="montagem__estado-item montagem__estado-item--salvando">
              <Loader2 size={14} className="montagem__girando" />
              salvando…
            </span>
          ) : erroSalvamento ? (
            <span className="montagem__estado-item montagem__estado-item--erro">
              <AlertTriangle size={14} />
              não salvo — a ordem anterior foi restaurada
            </span>
          ) : salvoEm ? (
            <span className="montagem__estado-item montagem__estado-item--salvo">
              <Check size={14} />
              salvo às {salvoEm.toLocaleTimeString('pt-BR')}
            </span>
          ) : (
            <span className="montagem__estado-item montagem__estado-item--ocioso">
              cada mudança salva sozinha
            </span>
          )}
        </div>
      </header>

      {erroSalvamento && <p className="error-message">{erroSalvamento}</p>}

      {secaoArmada && (
        <p className="montagem__armada">
          <strong>“{secaoArmada.titulo}”</strong> pronta para entrar. Escolha o ponto na folha com
          “Inserir aqui”, ou{' '}
          <button type="button" className="montagem__cancelar-armada" onClick={() => setSecaoArmada(null)}>
            cancelar
          </button>
          .
        </p>
      )}

      <div className="montagem__area">
        <SecaoLibraryPanel
          idsUsados={idsUsados}
          secaoArmada={secaoArmada}
          onArmar={setSecaoArmada}
          onAdicionarAoFim={adicionarAoFim}
          desabilitado={salvando}
        />

        <DocumentCanvas
          usuario={user}
          vinculos={vinculos}
          secaoArmada={secaoArmada}
          onInserirNaPosicao={inserirNaPosicao}
          onMover={aplicarOrdem}
          onRemover={remover}
          onReordenarPorArraste={aplicarOrdem}
          desabilitado={salvando}
        />
      </div>

      {modo === MODO_MODELO && (
        <footer className="montagem__rodape">
          <p>
            Modelo pronto. Para emitir um documento a partir dele, use{' '}
            <Link to="/dashboard/documentos/montar?modo=documento">Gerar documento</Link> no menu e
            escolha este modelo.
          </p>
        </footer>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTA DE ENTRADA
//
// modo=modelo     nomeia e cria um modelo novo
// modo=documento  escolhe um modelo já montado (o caminho normal — a
//                 reutilização é o ponto do modelo) ou monta um novo
// ═══════════════════════════════════════════════════════════════════════════
function AssemblyStartCard({ modo, navigate }) {
  const [modelos, setModelos] = useState([]);
  const [carregandoModelos, setCarregandoModelos] = useState(modo === MODO_DOCUMENTO);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');
  const [criarNovo, setCriarNovo] = useState(modo === MODO_MODELO);

  useEffect(() => {
    if (modo !== MODO_DOCUMENTO) return;

    let ativo = true;
    documentService
      .listModelos({ limit: 100 })
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        setModelos(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Falha ao carregar os modelos.'));
      })
      .finally(() => {
        if (ativo) setCarregandoModelos(false);
      });

    return () => { ativo = false; };
  }, [modo]);

  const criar = async (evento) => {
    evento.preventDefault();

    if (!nome.trim() || !tipo) {
      setErro('Informe o nome e o tipo do documento.');
      return;
    }

    setCriando(true);
    setErro('');

    try {
      const res = await documentService.criarModelo({ nome: nome.trim(), tipo });
      navigate(`/dashboard/documentos/montar/${res.data._id}?modo=${modo}`, { replace: true });
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível criar o modelo.'));
      setCriando(false);
    }
  };

  return (
    <div className="module-container">
      <header className={`montagem__cabecalho montagem__cabecalho--${modo}`}>
        <div className="montagem__identidade">
          <span className="montagem__selo">
            {modo === MODO_MODELO ? <FileStack size={14} /> : <FileText size={14} />}
            {modo === MODO_MODELO ? 'Novo MODELO' : 'Novo DOCUMENTO'}
          </span>
          <h1 className="montagem__titulo">
            {modo === MODO_MODELO ? 'Montar um modelo' : 'Gerar um documento'}
          </h1>
          <p className="montagem__subtitulo">
            {modo === MODO_MODELO
              ? 'Modelo é a peça reutilizável: monte uma vez e emita para quantos clientes precisar. Sem processo e sem cliente.'
              : 'Escolha o modelo que serve de base. O processo e o cliente vêm depois, na mesma tela.'}
          </p>
        </div>
      </header>

      {erro && <p className="error-message">{erro}</p>}

      {modo === MODO_DOCUMENTO && !criarNovo && (
        <section className="inicio-bloco">
          <h2 className="inicio-bloco__titulo">Escolha o modelo</h2>

          {carregandoModelos ? (
            <Loading />
          ) : modelos.length === 0 ? (
            <p className="inicio-bloco__vazio">
              Não há modelo montado ainda. Comece por um:{' '}
              <button type="button" className="inicio-bloco__link" onClick={() => setCriarNovo(true)}>
                montar um modelo novo
              </button>
              .
            </p>
          ) : (
            <>
              <ul className="inicio-modelos">
                {modelos.map((modelo) => (
                  <li key={modelo._id}>
                    <button
                      type="button"
                      className="inicio-modelo"
                      onClick={() =>
                        navigate(`/dashboard/documentos/montar/${modelo._id}?modo=${MODO_DOCUMENTO}`)
                      }
                    >
                      <span className="inicio-modelo__nome">{modelo.nome}</span>
                      <span className="inicio-modelo__tipo">
                        {labelDe(TIPO_DOCUMENTO_OPTIONS, modelo.tipo)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="inicio-bloco__alternativa">
                Nenhum serve?{' '}
                <button type="button" className="inicio-bloco__link" onClick={() => setCriarNovo(true)}>
                  montar um modelo novo
                </button>
                .
              </p>
            </>
          )}
        </section>
      )}

      {(modo === MODO_MODELO || criarNovo) && (
        <section className="inicio-bloco">
          <h2 className="inicio-bloco__titulo">
            {modo === MODO_MODELO ? 'Nome e tipo' : 'Montar um modelo novo'}
          </h2>

          <form onSubmit={criar} className="inicio-form">
            <div className="inicio-form__campo">
              <label htmlFor="montagem-nome">Nome *</label>
              <input
                id="montagem-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Procuração Ad Judicia"
                maxLength={120}
                required
              />
            </div>

            <div className="inicio-form__campo">
              <label htmlFor="montagem-tipo">Tipo *</label>
              <select
                id="montagem-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {TIPO_DOCUMENTO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inicio-form__acoes">
              {modo === MODO_DOCUMENTO && (
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--md"
                  onClick={() => setCriarNovo(false)}
                >
                  Voltar aos modelos
                </button>
              )}
              <button type="submit" className="ui-btn ui-btn--primary ui-btn--md" disabled={criando}>
                {criando ? 'Criando…' : 'Começar a montar'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default DocumentAssemblyPage;
