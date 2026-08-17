import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import processService from '../../api/processService';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import {
  PAPEL_PROCESSO_OPTIONS,
  documentoDoCliente,
  nomeDoCliente,
} from '../../utils/enums';
import { getApiErrorMessage, getApiErrorField } from '../../utils/apiError';
import './ProcessPage.css';

const STATUS_OPTIONS = ['ativo', 'encerrado', 'suspenso'];

const PAPEL_PADRAO = 'autor';

function ProcessoFormPage() {
  const [formData, setFormData] = useState({
    titulo: '',
    numeroProcesso: '',
    tipoAcao: '',
    area: '',
    orgao: '',
    vara: '',
    comarca: '',
    status: 'ativo',
    descricao: '',
    observacoes: '',
    dataDistribuicao: '',
  });
  const [clientes, setClientes] = useState([]);
  // Participantes do processo: [{ clienteId, papel, principal }]. Substitui o
  // seletor único de cliente — um processo pode ter litisconsórcio.
  const [participantes, setParticipantes] = useState([]);
  // Cópia do que veio do servidor, para a edição saber o que mudou. Os
  // participantes de um processo existente são alterados pelos endpoints
  // próprios, um por operação — não por PUT do processo inteiro.
  const [participantesOriginais, setParticipantesOriginais] = useState([]);
  const [clienteParaAdicionar, setClienteParaAdicionar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [campoComErro, setCampoComErro] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  // ── Carregamento da leitura em modo edição (Fase F-0) ────────────────────
  //
  // `loading`, logo acima, é o do botão Salvar. Não havia estado nenhum para a
  // LEITURA: abrir a edição pintava o formulário vazio e os campos apareciam de
  // repente quando o GET voltava. Numa conexão lenta a advogada começa a digitar
  // por cima de um formulário que ainda vai ser sobrescrito.
  //
  // Inicia em `true` já no primeiro render quando há `id` — inicia em `false`
  // faria o formulário vazio piscar antes do spinner, que é o defeito com um
  // quadro a mais.
  const [carregandoRegistro, setCarregandoRegistro] = useState(Boolean(id));


  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await clientService.getAllClients({ limit: 100 });
        setClientes(response.data.data ?? response.data);
      } catch {
        setError('Falha ao carregar a lista de clientes.');
      }
    };
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const fetchProcesso = async () => {
      try {
        const response = await processService.getProcessById(id);
        const d = response.data;
        const vindos = (d.participantes ?? []).map((p) => ({
          clienteId: (p.clienteId?._id ?? p.clienteId)?.toString() ?? '',
          papel: p.papel,
          principal: p.principal === true,
        }));
        setParticipantes(vindos);
        setParticipantesOriginais(vindos);
        setFormData({
          titulo: d.titulo || '',
          numeroProcesso: d.numeroProcesso || '',
          tipoAcao: d.tipoAcao || '',
          area: d.area || '',
          orgao: d.orgao || '',
          vara: d.vara || '',
          comarca: d.comarca || '',
          status: d.status || 'ativo',
          descricao: d.descricao || '',
          observacoes: d.observacoes || '',
          dataDistribuicao: d.dataDistribuicao
            ? new Date(d.dataDistribuicao).toISOString().split('T')[0]
            : '',
        });
      } catch {
        setError('Falha ao carregar dados do processo.');
      } finally {
        setCarregandoRegistro(false);
      }
    };
    fetchProcesso();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Participantes ────────────────────────────────────────────────────────

  const adicionarParticipante = () => {
    if (!clienteParaAdicionar) return;
    if (participantes.some(p => p.clienteId === clienteParaAdicionar)) {
      setError('Este cliente já é participante do processo.');
      return;
    }
    setError('');
    setParticipantes(prev => [
      ...prev,
      {
        clienteId: clienteParaAdicionar,
        papel: PAPEL_PADRAO,
        // O primeiro entra como principal: um processo com participantes e
        // nenhum principal não é salvável, e obrigar a marcar o único que
        // existe seria só uma etapa a mais para errar.
        principal: prev.length === 0,
      },
    ]);
    setClienteParaAdicionar('');
  };

  const removerParticipante = (clienteId) => {
    setParticipantes(prev => {
      const restantes = prev.filter(p => p.clienteId !== clienteId);
      // Se saiu o principal e ainda há gente, o primeiro assume — senão a lista
      // ficaria sem principal e o submit seria barrado sem o usuário entender.
      if (restantes.length > 0 && !restantes.some(p => p.principal)) {
        restantes[0] = { ...restantes[0], principal: true };
      }
      return restantes;
    });
  };

  const alterarPapel = (clienteId, papel) => {
    setParticipantes(prev =>
      prev.map(p => (p.clienteId === clienteId ? { ...p, papel } : p))
    );
  };

  // Exatamente um principal: marcar um desmarca o anterior no mesmo passo.
  const marcarPrincipal = (clienteId) => {
    setParticipantes(prev =>
      prev.map(p => ({ ...p, principal: p.clienteId === clienteId }))
    );
  };

  const clientesDisponiveis = clientes.filter(
    c => !participantes.some(p => p.clienteId === c._id)
  );

  // Aplica ao processo já existente a diferença entre o que veio do servidor e
  // o que está na tela. A ORDEM importa: promover o novo principal antes de
  // remover qualquer um, porque o backend recusa (409) remover o principal
  // enquanto houver outros participantes.
  const sincronizarParticipantes = async () => {
    const original = new Map(participantesOriginais.map(p => [p.clienteId, p]));
    const atual = new Map(participantes.map(p => [p.clienteId, p]));

    for (const [clienteId, p] of atual) {
      if (!original.has(clienteId)) {
        await processService.addProcessCliente(id, { clienteId, papel: p.papel });
      } else if (original.get(clienteId).papel !== p.papel) {
        await processService.updateProcessClientePapel(id, clienteId, p.papel);
      }
    }

    const novoPrincipal = participantes.find(p => p.principal);
    const principalAntigo = participantesOriginais.find(p => p.principal);
    if (novoPrincipal && novoPrincipal.clienteId !== principalAntigo?.clienteId) {
      await processService.setProcessClientePrincipal(id, novoPrincipal.clienteId);
    }

    for (const clienteId of original.keys()) {
      if (!atual.has(clienteId)) {
        await processService.removeProcessCliente(id, clienteId);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validado aqui, antes de qualquer chamada: o backend recusa os dois casos,
    // mas deixar a requisição sair só para receber 400 gasta viagem e mostra a
    // mensagem no lugar errado.
    if (participantes.length === 0) {
      setError('Adicione ao menos um cliente ao processo.');
      return;
    }
    const principais = participantes.filter(p => p.principal).length;
    if (principais !== 1) {
      setError(
        principais === 0
          ? 'Marque um dos participantes como principal.'
          : 'Apenas um participante pode ser o principal.'
      );
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      titulo: formData.titulo,
      status: formData.status,
      numeroProcesso: formData.numeroProcesso || undefined,
      tipoAcao: formData.tipoAcao || undefined,
      area: formData.area || undefined,
      orgao: formData.orgao || undefined,
      vara: formData.vara || undefined,
      comarca: formData.comarca || undefined,
      descricao: formData.descricao || undefined,
      observacoes: formData.observacoes || undefined,
      dataDistribuicao: formData.dataDistribuicao || undefined,
    };

    try {
      if (isEditing) {
        await processService.updateProcess(id, payload);
        await sincronizarParticipantes();
      } else {
        // Na criação os participantes vão no mesmo payload: o backend grava
        // processo e vínculos na mesma transação, e processo sem participante
        // não chega a existir.
        await processService.createProcess({ ...payload, clientes: participantes });
      }
      toast.success(isEditing ? 'Processo atualizado com sucesso.' : 'Processo cadastrado com sucesso.');
      navigate('/dashboard/processos');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar processo. Verifique os dados.'));
      // O backend informa qual campo causou o 409; destacamos o input em vez de
      // deixar a advogada caçar o duplicado numa mensagem no rodapé.
      setCampoComErro(getApiErrorField(err));
    } finally {
      setLoading(false);
    }
  };

  const clienteLabel = (c) => `${nomeDoCliente(c)} — ${documentoDoCliente(c)}`;

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="page-container">
      <h1 className="page-title">{isEditing ? 'Editar Processo' : 'Registrar Novo Processo'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid">

          <div className="form-group span-3">
            <label htmlFor="clienteParaAdicionar">Clientes do processo*</label>
            <p className="participantes-ajuda">
              Um processo pode ter mais de um cliente (litisconsórcio). Marque
              qual deles é o principal — é a qualificação usada quando um
              documento é gerado sem cliente escolhido.
            </p>

            <div className="participantes-adicionar">
              <select
                id="clienteParaAdicionar"
                value={clienteParaAdicionar}
                onChange={(e) => setClienteParaAdicionar(e.target.value)}
              >
                <option value="">Selecione um cliente...</option>
                {clientesDisponiveis.map(c => (
                  <option key={c._id} value={c._id}>{clienteLabel(c)}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={adicionarParticipante}
                disabled={!clienteParaAdicionar}
              >
                Adicionar
              </button>
            </div>

            {participantes.length === 0 ? (
              <p className="participantes-vazio">Nenhum cliente adicionado ainda.</p>
            ) : (
              <ul className="participantes-lista">
                {participantes.map(p => {
                  const cliente = clientes.find(c => c._id === p.clienteId);
                  return (
                    <li key={p.clienteId} className="participante-item">
                      <div className="participante-nome">
                        <strong>{nomeDoCliente(cliente)}</strong>
                        <span className="participante-doc">{documentoDoCliente(cliente)}</span>
                      </div>

                      <select
                        aria-label={`Papel de ${nomeDoCliente(cliente)}`}
                        value={p.papel}
                        onChange={(e) => alterarPapel(p.clienteId, e.target.value)}
                      >
                        {PAPEL_PROCESSO_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>

                      <label className="participante-principal">
                        <input
                          type="radio"
                          name="participantePrincipal"
                          checked={p.principal}
                          onChange={() => marcarPrincipal(p.clienteId)}
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => removerParticipante(p.clienteId)}
                      >
                        Remover
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="form-group span-2">
            <label htmlFor="titulo">Título do Processo*</label>
            <input type="text" id="titulo" name="titulo" value={formData.titulo} onChange={handleChange} required />
          </div>

          <div className="form-group span-1">
            <label htmlFor="numeroProcesso">Nº do Processo (CNJ)</label>
            <input type="text" id="numeroProcesso" name="numeroProcesso" value={formData.numeroProcesso} onChange={handleChange}
                   className={campoComErro === 'numeroProcesso' ? 'input-erro' : undefined} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group span-1">
            <label htmlFor="tipoAcao">Tipo de Ação</label>
            <input type="text" id="tipoAcao" name="tipoAcao" value={formData.tipoAcao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="area">Área</label>
            <input type="text" id="area" name="area" value={formData.area} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="dataDistribuicao">Data de Distribuição</label>
            <input type="date" id="dataDistribuicao" name="dataDistribuicao" value={formData.dataDistribuicao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="orgao">Órgão</label>
            <input type="text" id="orgao" name="orgao" value={formData.orgao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="vara">Vara</label>
            <input type="text" id="vara" name="vara" value={formData.vara} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="comarca">Comarca</label>
            <input type="text" id="comarca" name="comarca" value={formData.comarca} onChange={handleChange} />
          </div>

          <div className="form-group span-3">
            <label htmlFor="descricao">Descrição / Fatos</label>
            <textarea id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} rows="4" />
          </div>

          <div className="form-group span-3">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows="3" />
          </div>

        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/processos')} className="btn-cancel">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProcessoFormPage;
