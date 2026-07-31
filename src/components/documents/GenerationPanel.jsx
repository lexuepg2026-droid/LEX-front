import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CircleDollarSign, Sparkles } from 'lucide-react';
import documentService from '../../api/documentService';
import processService from '../../api/processService';
import Modal from '../ui/Modal';
import {
  PAPEL_PROCESSO_OPTIONS,
  documentoDoCliente,
  labelDe,
  nomeDoCliente,
} from '../../utils/enums';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getApiErrorDetails, getApiErrorMessage, getApiErrorPendencias } from '../../utils/apiError';
import './GenerationPanel.css';

// ═══════════════════════════════════════════════════════════════════════════
// GERAÇÃO
//
// Escolha do processo e, dentro dele, do cliente vinculado — com o papel
// aparecendo. O papel importa: uma procuração qualifica quem assina, e num
// litisconsórcio são duas peças, uma por outorgante. Por isso o cliente é
// explícito e não "o principal do processo".
//
// Três respostas do backend que esta tela precisa saber ler:
//
//   422  pendência de cadastro. `errors.pendencias[]` já vem com RÓTULO e
//        orientação escritos — exibir como vêm. Nunca montar o texto a partir
//        de `variavel`: a chave é identificador, não nome legível, e despejar
//        JSON na tela não diz a ninguém qual campo preencher.
//
//   422  com `opcoes` em `honorarioId`: o processo tem mais de um honorário
//        ativo e o backend se recusa a adivinhar qual alimenta o contrato.
//        A escolha é oferecida aqui mesmo e o pedido é reenviado.
//
//   409  já existe documento gerado desta combinação E ele foi editado à mão.
//        Regerar descarta a revisão dela — que é exatamente a parte que o
//        sistema não sabe refazer. Só reenvia com `confirmarSobrescrita: true`,
//        depois de diálogo explícito.
//
// ═══════════════════════════════════════════════════════════════════════════
// O AVISO DE VISIBILIDADE — correção de uma premissa da Fase 3.1
//
// A 3.1 pôs o aviso "este documento sairá do portal" dentro da resposta do 409.
// Isso cobre menos do que parece: o 409 SÓ dispara para documento
// `editadoManualmente`. Regerar um documento que está visível no portal e NÃO
// foi editado à mão o tira do portal do mesmo jeito — o novo nasce com
// `visivelPortal: false` — e não há 409 nenhum, porque não há conflito a
// confirmar. O aviso alcançava exatamente o caminho que já parava sozinho.
//
// Aqui o aviso passa a valer para TODA regeração de documento que esteja
// visível, nos dois caminhos. O COMPORTAMENTO não muda: `visivelPortal`
// continua nascendo `false`, que é segurança por omissão — a alternativa é uma
// peça nova aparecer para o cliente sem ninguém ter liberado. O que muda é a
// tela deixar de ser silenciosa.
//
// Para saber se há documento anterior visível, a tela consulta a listagem de
// documentos do processo e procura pela mesma combinação modelo × processo ×
// cliente que o backend usa em `buscarGeradoAnterior`
// (`documentGenerationService.js:376`). É leitura, não regra duplicada: quem
// decide o que é "o mesmo documento" continua sendo o backend.
// ═══════════════════════════════════════════════════════════════════════════

function GenerationPanel({ modeloId, totalSecoes, onGerado }) {
  const [processos, setProcessos] = useState([]);
  const [processoId, setProcessoId] = useState('');

  const [participantes, setParticipantes] = useState([]);
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false);
  const [clienteId, setClienteId] = useState('');

  const [pendencias, setPendencias] = useState([]);
  const [honorarioId, setHonorarioId] = useState('');
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);

  // Dados do 409, que abrem o diálogo de sobrescrita.
  const [conflito, setConflito] = useState(null);

  // Documento gerado anterior desta combinação que está VISÍVEL no portal.
  // `null` quando não há — e é a ausência que libera a geração direta.
  const [anteriorVisivel, setAnteriorVisivel] = useState(null);
  // Diálogo de "isto sai do portal", no caminho SEM 409.
  const [avisoDePortal, setAvisoDePortal] = useState(false);
  // Documento recém-gerado que substituiu um visível: a oferta de liberar o
  // novo ali mesmo, sem obrigar a advogada a ir à lista de documentos.
  const [ofertaDeLiberacao, setOfertaDeLiberacao] = useState(null);
  const [liberando, setLiberando] = useState(false);

  useEffect(() => {
    let ativo = true;
    processService
      .listProcesses({ limit: 100 })
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        setProcessos(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Falha ao carregar os processos.'));
      });
    return () => { ativo = false; };
  }, []);

  // Participantes do processo escolhido. Só os vinculados podem receber a peça:
  // o vínculo é o que autoriza qualificar alguém como parte.
  useEffect(() => {
    setParticipantes([]);
    setClienteId('');
    setPendencias([]);
    setHonorarioId('');

    if (!processoId) return;

    let ativo = true;
    setCarregandoParticipantes(true);

    processService
      .listProcessClientes(processoId)
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        const vinculos = Array.isArray(lista) ? lista : [];
        setParticipantes(vinculos);
        // Um participante só: escolhe sozinho. Dois ou mais, ela decide — não
        // há critério automático honesto para saber de quem é a peça.
        if (vinculos.length === 1) {
          setClienteId(String(vinculos[0].clienteId?._id ?? vinculos[0].clienteId));
        }
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Falha ao carregar os participantes.'));
      })
      .finally(() => {
        if (ativo) setCarregandoParticipantes(false);
      });

    return () => { ativo = false; };
  }, [processoId]);

  // Há documento anterior desta combinação visível no portal? A consulta roda
  // quando processo E cliente estão escolhidos — antes disso não há combinação
  // para procurar.
  useEffect(() => {
    setAnteriorVisivel(null);
    if (!processoId || !clienteId || !modeloId) return;

    let ativo = true;
    documentService
      .listDocuments({ processoId, limit: 100 })
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        const anterior = (Array.isArray(lista) ? lista : []).find(
          (d) =>
            d.ehModelo !== true &&
            String(d.geradoDeModeloId ?? '') === String(modeloId) &&
            String(d.clienteId ?? '') === String(clienteId) &&
            d.visivelPortal === true
        );
        setAnteriorVisivel(anterior ?? null);
      })
      .catch(() => {
        // Falha aqui NÃO bloqueia a geração e NÃO é reportada como erro da
        // tela: o pior caso é o aviso não aparecer, que é exatamente o
        // comportamento que existia antes desta fase. Bloquear a geração
        // porque uma consulta auxiliar falhou seria pior que o silêncio.
        if (ativo) setAnteriorVisivel(null);
      });

    return () => { ativo = false; };
  }, [modeloId, processoId, clienteId]);

  // A pendência de escolha de honorário é a única que a tela resolve sozinha —
  // as outras dependem de a advogada ir ao cadastro.
  const escolhaDeHonorario = useMemo(
    () => pendencias.find((p) => p.variavel === 'honorarioId' && Array.isArray(p.opcoes)),
    [pendencias]
  );

  // Sem `honorarioId` resolvido, o backend não tem de onde tirar NENHUMA
  // variável de honorário — e todas elas voltam como pendência junto. São
  // sintoma da mesma causa, e é por isso que o backend põe a escolha em
  // primeiro lugar na lista.
  //
  // Listá-las como dado faltando seria mentir para a advogada: diria
  // "preencha Valor do honorário no honorário vinculado ao processo" quando o
  // valor está cadastrado e o que falta é ela dizer QUAL honorário. Enquanto a
  // escolha estiver pendente, as de origem `honorario` ficam de fora.
  const pendenciasDeCadastro = useMemo(() => {
    const semEscolha = pendencias.filter((p) => p !== escolhaDeHonorario);
    if (!escolhaDeHonorario) return semEscolha;
    return semEscolha.filter((p) => p.origem !== 'honorario');
  }, [pendencias, escolhaDeHonorario]);

  // Quantas variáveis de honorário estão esperando só a escolha. Vale dizer o
  // número: explica por que a lista encolhe depois que ela escolhe.
  const sintomasDeHonorario = useMemo(() => {
    if (!escolhaDeHonorario) return 0;
    return pendencias.filter((p) => p !== escolhaDeHonorario && p.origem === 'honorario').length;
  }, [pendencias, escolhaDeHonorario]);

  const gerar = useCallback(
    async ({ confirmarSobrescrita } = {}) => {
      setGerando(true);
      setErro('');

      try {
        const res = await documentService.gerarDocumento(modeloId, {
          processoId,
          clienteId: clienteId || undefined,
          honorarioId: honorarioId || undefined,
          confirmarSobrescrita,
        });
        setPendencias([]);

        // Se o anterior estava visível, o novo NASCEU INVISÍVEL. Em vez de
        // navegar direto e deixar o cliente sem o documento em silêncio, a
        // tela oferece liberar o novo aqui mesmo. `onGerado` só é chamado
        // depois que a advogada decide.
        if (anteriorVisivel) {
          setOfertaDeLiberacao(res.data);
          return;
        }

        onGerado(res.data);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 422) {
          const lista = getApiErrorPendencias(err);
          setPendencias(lista);
          // Sem lista estruturada não há o que renderizar item a item — cai na
          // mensagem do backend, que ainda é melhor que JSON cru.
          if (lista.length === 0) {
            setErro(getApiErrorMessage(err, 'Há informações faltando no cadastro.'));
          }
          return;
        }

        if (status === 409) {
          setConflito(getApiErrorDetails(err) ?? {});
          return;
        }

        setErro(getApiErrorMessage(err, 'Não foi possível gerar o documento.'));
      } finally {
        setGerando(false);
      }
    },
    [modeloId, processoId, clienteId, honorarioId, onGerado, anteriorVisivel]
  );

  // O botão de gerar não chama `gerar()` direto quando há documento visível:
  // passa pelo aviso primeiro. Este é o caminho SEM 409 — o que a Fase 3.1 não
  // cobria, e o mais comum, porque a maioria dos documentos não é editada à
  // mão. O caminho COM 409 recebe o mesmo aviso, dentro do diálogo de
  // sobrescrita.
  const tentarGerar = useCallback(() => {
    if (anteriorVisivel) {
      setAvisoDePortal(true);
      return;
    }
    gerar();
  }, [anteriorVisivel, gerar]);

  const liberarNovoNoPortal = useCallback(async () => {
    setLiberando(true);
    try {
      await documentService.alternarVisibilidadePortal(ofertaDeLiberacao._id, true);
      const gerado = ofertaDeLiberacao;
      setOfertaDeLiberacao(null);
      onGerado(gerado);
    } catch (err) {
      setErro(getApiErrorMessage(err, 'O documento foi gerado, mas não foi possível liberá-lo no portal.'));
    } finally {
      setLiberando(false);
    }
  }, [ofertaDeLiberacao, onGerado]);

  const podeGerar = Boolean(processoId) && Boolean(clienteId) && totalSecoes > 0 && !gerando;

  return (
    <section className="geracao">
      <h2 className="geracao__titulo">
        <Sparkles size={16} aria-hidden="true" />
        Gerar o documento
      </h2>

      {totalSecoes === 0 && (
        <p className="geracao__aviso">
          A folha está vazia. Acrescente ao menos uma seção antes de gerar.
        </p>
      )}

      {erro && <p className="error-message">{erro}</p>}

      <div className="geracao__campos">
        <div className="geracao__campo">
          <label htmlFor="geracao-processo">Processo *</label>
          <select
            id="geracao-processo"
            value={processoId}
            onChange={(e) => setProcessoId(e.target.value)}
          >
            <option value="">Selecione o processo</option>
            {processos.map((p) => (
              <option key={p._id} value={p._id}>
                {p.titulo}
                {p.numeroProcesso ? ` — ${p.numeroProcesso}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="geracao__campo">
          <label htmlFor="geracao-cliente">Cliente do processo *</label>
          <select
            id="geracao-cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            disabled={!processoId || carregandoParticipantes}
          >
            <option value="">
              {!processoId
                ? 'Escolha o processo primeiro'
                : carregandoParticipantes
                  ? 'Carregando participantes…'
                  : 'Selecione o cliente'}
            </option>
            {participantes.map((vinculo) => {
              const cliente = vinculo.clienteId ?? {};
              const id = String(cliente._id ?? vinculo.clienteId);
              const documento = documentoDoCliente(cliente);
              return (
                <option key={id} value={id}>
                  {nomeDoCliente(cliente)} — {labelDe(PAPEL_PROCESSO_OPTIONS, vinculo.papel)}
                  {vinculo.principal ? ' (principal)' : ''}
                  {documento ? ` · ${documento}` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* ── 422: escolha de honorário ─────────────────────────────────────── */}
      {escolhaDeHonorario && (
        <div className="geracao__honorario">
          <p className="geracao__honorario-titulo">
            <CircleDollarSign size={15} aria-hidden="true" />
            {escolhaDeHonorario.rotulo}
          </p>
          <p className="geracao__honorario-orientacao">{escolhaDeHonorario.orientacao}</p>

          {sintomasDeHonorario > 0 && (
            <p className="geracao__honorario-nota">
              {sintomasDeHonorario === 1
                ? 'Há 1 variável de honorário no texto esperando esta escolha.'
                : `Há ${sintomasDeHonorario} variáveis de honorário no texto esperando esta escolha.`}{' '}
              Elas se resolvem sozinhas quando você escolher — não é dado faltando no cadastro.
            </p>
          )}

          <ul className="geracao__opcoes">
            {escolhaDeHonorario.opcoes.map((opcao) => {
              const id = String(opcao.honorarioId);
              return (
                <li key={id}>
                  <label className={`geracao__opcao${honorarioId === id ? ' geracao__opcao--ativa' : ''}`}>
                    <input
                      type="radio"
                      name="honorario"
                      value={id}
                      checked={honorarioId === id}
                      onChange={() => setHonorarioId(id)}
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
            onClick={tentarGerar}
            disabled={!honorarioId || gerando}
          >
            {gerando ? 'Gerando…' : 'Gerar com este honorário'}
          </button>
        </div>
      )}

      {/* ── 422: pendências de cadastro ───────────────────────────────────── */}
      {pendenciasDeCadastro.length > 0 && (
        <div className="geracao__pendencias">
          <p className="geracao__pendencias-titulo">
            <AlertCircle size={15} aria-hidden="true" />
            {pendenciasDeCadastro.length === 1
              ? 'Falta um dado no cadastro'
              : `Faltam ${pendenciasDeCadastro.length} dados no cadastro`}
          </p>
          <p className="geracao__pendencias-ajuda">
            O documento não é gerado pela metade. Preencha o que falta e volte aqui.
          </p>

          <ul className="geracao__pendencias-lista">
            {pendenciasDeCadastro.map((pendencia) => (
              <li key={pendencia.variavel} className="geracao__pendencia">
                {/* O RÓTULO é o que a advogada reconhece. A chave aparece
                    discreta, no fim, só para quem for conferir a seção. */}
                <span className="geracao__pendencia-rotulo">{pendencia.rotulo}</span>
                <span className="geracao__pendencia-orientacao">{pendencia.orientacao}</span>
                <code className="geracao__pendencia-chave">{`{{${pendencia.variavel}}}`}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aviso permanente, antes de qualquer clique: a advogada precisa saber
          que este documento está no portal ANTES de decidir regerar, e não
          depois, num diálogo que ela vai fechar no automático. */}
      {anteriorVisivel && !ofertaDeLiberacao && (
        <p className="geracao__aviso-portal">
          <AlertCircle size={15} aria-hidden="true" />
          O documento atual desta combinação está <strong>visível no portal do
          cliente</strong>. Regerar o tira de lá: o documento novo nasce
          invisível, e o cliente deixa de vê-lo até você liberar de novo.
        </p>
      )}

      <div className="geracao__acoes">
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--md"
          onClick={tentarGerar}
          disabled={!podeGerar}
        >
          {gerando ? 'Gerando…' : 'Gerar documento'}
        </button>
      </div>

      {/* ── Depois de regerar por cima de um visível ──────────────────────── */}
      {ofertaDeLiberacao && (
        <div className="geracao__liberacao">
          <p className="geracao__liberacao-titulo">
            Documento gerado. Ele ainda <strong>não</strong> está no portal.
          </p>
          <p className="geracao__liberacao-texto">
            A versão anterior estava visível para o cliente e saiu do portal
            agora. O documento novo nasce invisível de propósito — assim
            nenhuma peça chega ao cliente sem alguém ter liberado. Se este já
            pode ser lido por ele, libere aqui.
          </p>
          <div className="geracao__acoes">
            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--sm"
              onClick={liberarNovoNoPortal}
              disabled={liberando}
            >
              {liberando ? 'Liberando…' : 'Liberar no portal e continuar'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={() => {
                const gerado = ofertaDeLiberacao;
                setOfertaDeLiberacao(null);
                onGerado(gerado);
              }}
              disabled={liberando}
            >
              Deixar invisível por enquanto
            </button>
          </div>
        </div>
      )}

      {/* ── Caminho SEM 409: documento visível e NÃO editado à mão ───────────
          Este é o caso que a Fase 3.1 não cobria. Não há conflito a confirmar,
          o backend gera sem reclamar, e o documento simplesmente sai do portal.
          O diálogo existe só para a tela deixar de ser silenciosa. */}
      <Modal
        open={avisoDePortal}
        title="Este documento sairá do portal do cliente"
        message={
          'O documento atual desta combinação está visível para o cliente no portal. ' +
          'O documento novo nasce INVISÍVEL — é assim de propósito, para que nenhuma peça chegue ao cliente sem alguém ter liberado. ' +
          'Na prática: ao regerar, o cliente deixa de ver este documento até você liberar o novo. ' +
          'Você poderá liberá-lo logo depois de gerar, aqui mesmo.'
        }
        variant="danger"
        confirmLabel="Regerar mesmo assim"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setAvisoDePortal(false);
          gerar();
        }}
        onCancel={() => setAvisoDePortal(false)}
      />

      {/* ── 409: regeração sobre texto revisado à mão ─────────────────────── */}
      <Modal
        open={Boolean(conflito)}
        title="Este documento já foi revisado à mão"
        message={
          'Já existe um documento gerado para este modelo, processo e cliente, e o texto dele foi editado manualmente. ' +
          'Se você regerar, o texto revisado será SUBSTITUÍDO pelo texto novo, montado a partir das seções — e o documento atual sai da lista. ' +
          (conflito?.dataGeracao
            ? `O documento atual foi gerado em ${formatDate(conflito.dataGeracao)}. `
            : '') +
          'Ele continua recuperável, apontando para a versão nova, mas a revisão não volta sozinha. ' +
          // O MESMO aviso do caminho sem 409. A condição vem de duas fontes: o
          // `sairaDoPortal` que o backend manda no 409 (Fase 3.1) e a consulta
          // que esta tela já faz. Qualquer uma bastando, o aviso aparece — não
          // depender só do backend é o que faz o texto valer também no dia em
          // que a chave mudar de nome.
          (conflito?.sairaDoPortal || anteriorVisivel
            ? 'Além disso, este documento está VISÍVEL no portal do cliente e sairá de lá: o novo nasce invisível, e você poderá liberá-lo logo depois de gerar.'
            : '')
        }
        variant="danger"
        confirmLabel="Regerar e substituir"
        cancelLabel="Manter o texto revisado"
        onConfirm={() => {
          setConflito(null);
          gerar({ confirmarSobrescrita: true });
        }}
        onCancel={() => setConflito(null)}
      />
    </section>
  );
}

export default GenerationPanel;
