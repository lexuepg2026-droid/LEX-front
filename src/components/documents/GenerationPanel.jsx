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
    [modeloId, processoId, clienteId, honorarioId, onGerado]
  );

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
            onClick={() => gerar()}
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

      <div className="geracao__acoes">
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--md"
          onClick={() => gerar()}
          disabled={!podeGerar}
        >
          {gerando ? 'Gerando…' : 'Gerar documento'}
        </button>
      </div>

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
          'Ele continua recuperável, apontando para a versão nova, mas a revisão não volta sozinha.'
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
