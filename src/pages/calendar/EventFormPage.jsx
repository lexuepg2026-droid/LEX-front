import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import eventService from '../../api/eventService';
import processService from '../../api/processService';
import SeletorComBusca from '../../components/ui/SeletorComBusca';
import { rotuloDoProcessoNoSeletor } from '../../utils/feeLabel';
import Loading from '../../components/common/Loading';
import { toast } from '../../utils/toast';
import { getApiErrorField, getApiErrorMessage } from '../../utils/apiError';
import { TIPO_EVENTO_OPTIONS } from '../../utils/calendarLabels';
import { dataDaChave } from './monthGrid';
// `Button.css` importado EXPLICITAMENTE. `ClientPage.css` traz a grade do
// formulário, mas não as regras de `.ui-btn` — e sem este import os três
// botões desta tela ficariam sem estilo nenhum, exatamente como o
// `.input-error` da Fase 2E.1 que originou a varredura de classes. Foi ela
// que pegou isto aqui, antes de a tela existir para alguém ver.
import '../../components/ui/Button.css';
import '../clients/ClientPage.css';
import OfflineQueueNotice from '../../components/ui/OfflineQueueNotice';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import { usePublicarContexto } from '../../contexts/ContextoContext';

// ═══════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DO EVENTO
//
// ── A data entra e sai como `AAAA-MM-DD`, sem passar por `Date` ─────────
// `<input type="date">` já fala esse formato nativamente — `value` e
// `onChange` são a string, não um objeto. É o encaixe que fecha a decisão de
// fuso da fase de ponta a ponta: nenhuma linha desta tela constrói um `Date`
// a partir da data do evento, então não há hora local para deslocar nada.
//
// ── `?data=` é o clique num DIA da grade ───────────────────────────────
// A tela abre com o dia já preenchido. Sem isso, criar um compromisso a partir
// da grade custaria abrir o formulário e redigitar a data que a advogada
// acabou de clicar.
//
// ── O `null` que apaga ─────────────────────────────────────────────────
// Os quatro opcionais vão como `null` quando o campo está vazio, e nunca como
// `""` nem `undefined`: é a convenção do projeto, e é o que faz um campo
// limpo ser de fato apagado em vez de gravar uma string vazia que toda
// checagem de existência lê como preenchida.
// ═══════════════════════════════════════════════════════════════════════════

const FORM_VAZIO = {
  tipo: 'audiencia',
  titulo: '',
  data: '',
  hora: '',
  local: '',
  descricao: '',
  processoId: '',
};

function EventFormPage() {
  const [formData, setFormData] = useState(FORM_VAZIO);
  // O processo que o compromisso já tem, como o `GET /events/:id` o projeta
  // (número e título, sem o cliente). Só é usado SEM SINAL, para o seletor
  // mostrar a escolha sem buscar pelo id — o compromisso grava offline.
  const [processoDoEvento, setProcessoDoEvento] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);
  const [concluido, setConcluido] = useState(false);
  // O `updatedAt` que esta tela leu (DEC-060). `null` na criação: não há
  // versão anterior a preservar.
  const [versaoVista, setVersaoVista] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  // Fase 2b (DEC-085): publica para a faixa de contexto o processo — o vinculado, se houver.
  usePublicarContexto({ processoId: formData.processoId });
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  // Inicia em `true` quando há `id`: começar em `false` faria o formulário
  // vazio piscar antes do spinner — o mesmo defeito com um quadro a mais. É a
  // mesma escolha do formulário de parcela.
  const [carregandoRegistro, setCarregandoRegistro] = useState(Boolean(id));

  // A data pré-preenchida do clique na grade. Validada por `dataDaChave`: uma
  // query string é digitável, e `?data=amanhã` não pode virar `value` de um
  // `<input type="date">`.
  useEffect(() => {
    if (isEditing) return;
    const daUrl = searchParams.get('data');
    if (daUrl && dataDaChave(daUrl)) {
      setFormData((atual) => ({ ...atual, data: daUrl }));
    }
  }, [isEditing, searchParams]);

  // Fase 3.8 (DEC-137): o seletor de processo tinha teto — os 100 processos
  // mais recentes (`listProcesses({ limit: 100 })`), e o 101º não aparecia.
  // Virou o `SeletorComBusca` da DEC-101: busca no servidor por número,
  // título e cliente, até 20 sugestões, e o processo em edição é buscado
  // pelo id (DEC-086). Sem sinal a busca diz que precisa de conexão; o
  // processo já escolhido continua, e o compromisso vai para a fila.
  const buscarProcessos = (termo) => processService.buscarProcessos(termo);
  const buscarProcessoPorId = (pid) => processService.getProcessById(pid).then((res) => res.data);

  useEffect(() => {
    if (!isEditing) return undefined;
    let ativo = true;

    eventService
      .getEventById(id)
      .then((res) => {
        if (!ativo) return;
        const e = res.data;
        setFormData({
          tipo: e.tipo ?? 'audiencia',
          titulo: e.titulo ?? '',
          // A data vem do backend já como `AAAA-MM-DD` e vai direto para o
          // input. Nenhuma conversão — é o ponto inteiro da decisão de fuso.
          data: e.data ?? '',
          hora: e.hora ?? '',
          local: e.local ?? '',
          descricao: e.descricao ?? '',
          processoId: e.processoId ?? '',
        });
        setProcessoDoEvento(e.processo ?? null);
        setConcluido(Boolean(e.concluido));
        // DEC-060: a versão que ESTA tela leu. Ela viaja no cabeçalho na hora
        // de salvar, e é o que faz o servidor recusar a gravação atrasada em
        // vez de atropelar a de outro aparelho — inclusive horas depois, se a
        // gravação tiver ido para a fila.
        setVersaoVista(e.updatedAt ?? null);
      })
      .catch((err) => {
        if (ativo) setError(getApiErrorMessage(err, 'Falha ao carregar o compromisso.'));
      })
      .finally(() => { if (ativo) setCarregandoRegistro(false); });

    return () => { ativo = false; };
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((atual) => ({ ...atual, [name]: value }));
    if (campoComErro === name) setCampoComErro(null);
  };

  // Campo vazio vira `null`, e não `""`. Ver a nota do cabeçalho.
  const ouNulo = (valor) => {
    const limpo = typeof valor === 'string' ? valor.trim() : valor;
    return limpo ? limpo : null;
  };

  const online = useOnlineStatus();

  // ── ESTA TELA GRAVA SEM SINAL (F-5b, DEC-059) ─────────────────────────
  //
  // É uma das duas exceções da fase à regra da F-5a: compromisso da agenda vale
  // por si, não depende de saldo nem de nenhum estado do servidor que o
  // aparelho offline não possa conferir. O pior caso de um conflito é uma data
  // que a advogada revê — e ela revê na tela de pendências, com as duas
  // versões à vista.
  //
  // Não há mais `if (!online) return` aqui: o interceptor **enfileira** em vez
  // de recusar, e devolve um erro marcado `enfileirado`, que o `catch` abaixo
  // trata como o que é — o oposto de uma perda.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setError('');
    setCampoComErro(null);

    const payload = {
      tipo: formData.tipo,
      titulo: formData.titulo.trim(),
      data: formData.data,
      hora: ouNulo(formData.hora),
      local: ouNulo(formData.local),
      descricao: ouNulo(formData.descricao),
      processoId: ouNulo(formData.processoId),
    };

    try {
      if (isEditing) await eventService.updateEvent(id, payload, { versaoVista });
      else await eventService.createEvent(payload);

      toast.success(isEditing ? 'Compromisso atualizado.' : 'Compromisso registrado.');
      navigate('/dashboard/agenda');
    } catch (err) {
      // Sem sinal, a gravação foi para a FILA. Não é erro, e a tela não pode
      // dizer que é: o que a advogada digitou está guardado e sobe sozinho.
      // Ela sai do formulário como sairia se tivesse salvado — com a diferença
      // dita em português, e com a pendência visível ao lado do sino.
      if (err?.enfileirado) {
        toast.info(err.message);
        navigate('/dashboard/agenda');
        return;
      }
      // O 409 da DEC-053 (processo desativado) chega aqui com a frase que
      // NOMEIA o processo. Ela é exibida inteira: é a mensagem que diz qual
      // registro reativar, e resumi-la mandaria a advogada procurar.
      setError(getApiErrorMessage(err, 'Erro ao salvar o compromisso.'));
      setCampoComErro(getApiErrorField(err));
    } finally {
      setSalvando(false);
    }
  };

  // A conclusão vai por ROTA PRÓPRIA, e por isso não é um checkbox do
  // formulário: `concluido` e `concluidoEm` são um fato só com carimbo, e o
  // PATCH comum os recusa com uma mensagem que manda para cá. Misturar os dois
  // faria um "Salvar" disparar duas requisições com semânticas diferentes — a
  // mesma razão pela qual a mudança de fase não mora no formulário do processo.
  const alternarConclusao = async () => {
    try {
      const res = await eventService.concludeEvent(id, !concluido, { versaoVista });
      setConcluido(Boolean(res.data.concluido));
      setVersaoVista(res.data.updatedAt ?? null);
      toast.success(res.data.concluido ? 'Compromisso concluído.' : 'Compromisso reaberto.');
    } catch (err) {
      if (err?.enfileirado) {
        // A conclusão também entra na fila. O estado da tela acompanha o que
        // ela pediu — desfazê-lo faria parecer que o clique não funcionou.
        setConcluido((atual) => !atual);
        toast.info(err.message);
        return;
      }
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Erro ao mudar a conclusão.'));
    }
  };

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar compromisso' : 'Novo compromisso'}</h1>

      {error && <p className="error-message" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineQueueNotice />}
        {/* Fase 3.8 (DEC-137): em seções, no padrão dos formulários de
            processo e de cliente (3.4, 3.5): o que é, quando e onde, o
            processo vinculado e as observações. Os campos e o payload são os
            de antes. */}
        <div className="form-grid section">
          <h3>O que é</h3>

          <div className="form-group span-1">
            <label htmlFor="evento-tipo">Tipo *</label>
            {/* Os rótulos saem de `calendarLabels`, ponto único espelhado do
                backend. Nenhuma tela monta rótulo de tipo por conta própria. */}
            <select
              id="evento-tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
              className={campoComErro === 'tipo' ? 'input-erro' : undefined}
            >
              {TIPO_EVENTO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group span-2">
            <label htmlFor="evento-titulo">Título *</label>
            <input
              id="evento-titulo"
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              maxLength={200}
              className={campoComErro === 'titulo' ? 'input-erro' : undefined}
            />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Quando e onde</h3>

          <div className="form-group span-1">
            <label htmlFor="evento-data">Data *</label>
            {/* `type="date"` fala `AAAA-MM-DD` nativamente. É o que fecha a
                decisão de fuso: a string que sai daqui é a que o backend grava,
                e nenhum `Date` é construído no caminho. */}
            <input
              id="evento-data"
              type="date"
              name="data"
              value={formData.data}
              onChange={handleChange}
              required
              className={campoComErro === 'data' ? 'input-erro' : undefined}
            />
          </div>

          <div className="form-group span-1">
            <label htmlFor="evento-hora">Hora</label>
            {/* Opcional: um prazo é do dia inteiro, uma audiência tem horário.
                A hora é de PAREDE do escritório e vai como texto — nunca dentro
                da data, que voltaria a ser um instante. */}
            <input
              id="evento-hora"
              type="time"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              className={campoComErro === 'hora' ? 'input-erro' : undefined}
            />
          </div>

          <div className="form-group span-1">
            <label htmlFor="evento-local">Local</label>
            <input
              id="evento-local"
              type="text"
              name="local"
              value={formData.local}
              onChange={handleChange}
              maxLength={200}
            />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Processo vinculado</h3>

          <div className="form-group span-3">
            <label htmlFor="evento-processo">Processo</label>
            {/* OPCIONAL, e a ausência é o caso comum: nem toda reunião é de um
                processo. Exigir vínculo obrigaria a advogada a inventar um para
                registrar o que ela de fato tem na agenda. Apagar o campo
                desfaz a escolha e o compromisso fica solto (`null`). */}
            <SeletorComBusca
              id="evento-processo"
              name="processoId"
              valor={formData.processoId}
              onMudar={(pid) => {
                setFormData((atual) => ({ ...atual, processoId: pid }));
                if (campoComErro === 'processoId') setCampoComErro(null);
              }}
              buscar={buscarProcessos}
              buscarPorId={buscarProcessoPorId}
              rotulo={rotuloDoProcessoNoSeletor}
              itemInicial={online ? null : processoDoEvento}
              obrigatorio={false}
              aria-describedby="evento-processo-ajuda"
              placeholder="Busque pelo número, título ou cliente"
              className={campoComErro === 'processoId' ? 'input-erro' : undefined}
            />
            <p id="evento-processo-ajuda" className="form-note">
              Opcional. Para deixar sem processo, apague o campo.
            </p>
          </div>
        </div>

        <div className="form-grid section">
          <h3>Observações</h3>

          <div className="form-group span-3">
            <label htmlFor="evento-descricao">Descrição</label>
            <textarea
              id="evento-descricao"
              name="descricao"
              rows={3}
              value={formData.descricao}
              onChange={handleChange}
              maxLength={2000}
            />
          </div>
        </div>

        {isEditing && (
          <div className="form-grid section">
            <h3>Conclusão</h3>
            <div className="form-info-box span-3">
              <div className="form-info-item">
                <span className="form-info-label">Situação</span>
                <span className="form-info-value">
                  {concluido ? 'Concluído' : 'Em aberto'}
                </span>
              </div>
              <div className="form-info-item">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={alternarConclusao}>
                  {concluido ? 'Reabrir' : 'Marcar como concluído'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--md" onClick={() => navigate('/dashboard/agenda')}>
            Cancelar
          </button>
          <button type="submit"
            className="ui-btn ui-btn--primary ui-btn--md" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventFormPage;
