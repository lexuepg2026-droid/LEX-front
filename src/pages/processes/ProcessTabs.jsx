import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import './ProcessTabs.css';

// Componente "mini-formulário" reutilizável
const FormInline = ({ children, onSubmit }) => (
  <form className="form-inline" onSubmit={onSubmit}>{children}</form>
);

// Componente "botões" reutilizável
const FormActions = ({ onCancel, loading }) => (
  <div className="form-actions-inline">
    <button type="button" onClick={onCancel} className="btn-action btn-cancel">Cancelar</button>
    <button type="submit" disabled={loading} className="btn-action btn-edit">{loading ? '...' : 'Salvar'}</button>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
function ProcessoTabs({ processoId }) {
  // --- Estados ---
  const [abaAtiva, setAbaAtiva] = useState('honorarios');
  
  // Estados Financeiros
  const [honorarios, setHonorarios] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [honorarioSelecionado, setHonorarioSelecionado] = useState(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  
  // Estados de Documentos
  const [templates, setTemplates] = useState([]);
  const [documentosGerados, setDocumentosGerados] = useState([]);
  const [templateSelecionado, setTemplateSelecionado] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados dos Formulários
  const [showFormHon, setShowFormHon] = useState(false);
  const [newHon, setNewHon] = useState({ descricao: '', valor_total: '', tipo: 'fixo' });
  const [showFormPar, setShowFormPar] = useState(false);
  const [newPar, setNewPar] = useState({ descricao: '', valor: '', data_vencimento: '' });
  const [showFormPag, setShowFormPag] = useState(false);
  const [newPag, setNewPag] = useState({ valor_pago: '', data_pagamento: '', tipo_pagamento: 'pix' });

  // --- Funções de API (Fetch) ---
  // (Agora movidas para DENTRO do componente)
  const fetchHonorarios = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/honorarios/processo/${processoId}`);
      setHonorarios(res.data);
    } catch (err) { setError('Erro ao buscar honorários.'); console.error(err); }
    setLoading(false);
  };

  const fetchParcelas = async (honId) => {
    setLoading(true); setHonorarioSelecionado(honId); setParcelaSelecionada(null); setParcelas([]); setPagamentos([]);
    try {
      const res = await api.get(`/parcelas/honorario/${honId}`);
      setParcelas(res.data); setAbaAtiva('parcelas');
    } catch (err) { setError('Erro ao buscar parcelas.'); console.error(err); }
    setLoading(false);
  };

  const fetchPagamentos = async (parId) => {
    setLoading(true); setParcelaSelecionada(parId); setPagamentos([]);
    try {
      const res = await api.get(`/pagamentos/parcela/${parId}`);
      setPagamentos(res.data); setAbaAtiva('pagamentos');
    } catch (err) { setError('Erro ao buscar pagamentos.'); console.error(err); }
    setLoading(false);
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/documentos/templates');
      setTemplates(res.data);
      if(res.data.length > 0) setTemplateSelecionado(res.data[0].nome);
    } catch (err) { setError('Erro ao buscar templates.'); }
  };
  
  const fetchDocumentosGerados = async () => {
    try {
      const res = await api.get(`/documentos/processo/${processoId}`);
      setDocumentosGerados(res.data);
    } catch (err) { setError('Erro ao buscar documentos gerados.'); }
  };

  // Carrega os dados iniciais
  useEffect(() => {
    fetchHonorarios();
    fetchTemplates();
    fetchDocumentosGerados();
  }, [processoId]);

  // --- Funções de SALVAR (Handlers) ---
  const handleSaveHonorario = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/honorarios', { ...newHon, processo_id: processoId });
      setShowFormHon(false); setNewHon({ descricao: '', valor_total: '', tipo: 'fixo' });
      fetchHonorarios();
    } catch (err) { setError('Erro ao salvar honorário.'); }
    setLoading(false);
  };

  const handleSaveParcela = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/parcelas', { ...newPar, honorario_id: honorarioSelecionado });
      setShowFormPar(false); setNewPar({ descricao: '', valor: '', data_vencimento: '' });
      fetchParcelas(honorarioSelecionado);
    } catch (err) { setError('Erro ao salvar parcela.'); }
    setLoading(false);
  };
  
  const handleSavePagamento = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/pagamentos', { ...newPag, parcela_id: parcelaSelecionada });
      setShowFormPag(false); setNewPag({ valor_pago: '', data_pagamento: '', tipo_pagamento: 'pix' });
      fetchPagamentos(parcelaSelecionada);
    } catch (err) { setError('Erro ao salvar pagamento.'); }
    setLoading(false);
  };

  const handleGerarDocumento = async () => {
    if (!templateSelecionado) return;
    setLoading(true);
    try {
      await api.post('/documentos/gerar', {
        processo_id: processoId,
        nome_template: templateSelecionado
      });
      fetchDocumentosGerados();
    } catch (err) { setError('Erro ao gerar documento.'); }
    setLoading(false);
  };
  
  const handleDownloadDoc = async (docId, templateName) => {
    setLoading(true);
    try {
      const res = await api.get(`/documentos/${docId}`);
      const conteudo = res.data.conteudo_gerado;
      const element = document.createElement("a");
      const file = new Blob([conteudo], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${templateName}_${processoId}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      setError('Erro ao baixar documento.');
    }
    setLoading(false);
  };

  // --- Handlers de Mudança nos Forms ---
  const handleHonChange = (e) => setNewHon(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleParChange = (e) => setNewPar(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePagChange = (e) => setNewPag(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- JSX (Return) ---
  return (
    <div className="tabs-container">
      {/* Navegação das Abas */}
      <div className="tabs-nav">
        <button className={`tab-link ${abaAtiva === 'honorarios' ? 'active' : ''}`} onClick={() => setAbaAtiva('honorarios')}>Financeiro (1. Honorários)</button>
        <button className={`tab-link ${abaAtiva === 'parcelas' ? 'active' : ''} ${!honorarioSelecionado ? 'disabled' : ''}`} onClick={() => setAbaAtiva('parcelas')} disabled={!honorarioSelecionado}>Financeiro (2. Parcelas)</button>
        <button className={`tab-link ${abaAtiva === 'pagamentos' ? 'active' : ''} ${!parcelaSelecionada ? 'disabled' : ''}`} onClick={() => setAbaAtiva('pagamentos')} disabled={!parcelaSelecionada}>Financeiro (3. Pagamentos)</button>
        <button className={`tab-link ${abaAtiva === 'documentos' ? 'active' : ''}`} onClick={() => setAbaAtiva('documentos')}>Documentos</button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* --- ABA HONORÁRIOS --- */}
      <div className="tab-content" style={{ display: abaAtiva === 'honorarios' ? 'block' : 'none' }}>
        <h3>Contratos de Honorários do Processo</h3>
        <table className="data-table">
          <thead><tr><th>Descrição</th><th>Valor Total</th><th>Tipo</th><th>Ação</th></tr></thead>
          <tbody>
            {honorarios.map(h => (
              <tr key={h.honorario_id}>
                <td>{h.descricao}</td><td>R$ {h.valor_total}</td><td>{h.tipo}</td>
                <td><button onClick={() => fetchParcelas(h.honorario_id)} className="btn-action btn-edit">Ver Parcelas</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showFormHon && <button onClick={() => setShowFormHon(true)} className="btn-primary" style={{ marginTop: '15px' }}>Adicionar Honorário</button>}
        {showFormHon && (
          <FormInline onSubmit={handleSaveHonorario}>
            <h4>Novo Honorário</h4>
            <input type="text" name="descricao" placeholder="Descrição (Ex: Contrato Inicial)" value={newHon.descricao} onChange={handleHonChange} required />
            <input type="number" step="0.01" name="valor_total" placeholder="Valor Total (R$)" value={newHon.valor_total} onChange={handleHonChange} required />
            <select name="tipo" value={newHon.tipo} onChange={handleHonChange}>
              <option value="fixo">Fixo</option><option value="percentual">Percentual</option><option value="custas">Custas</option>
            </select>
            <FormActions onCancel={() => setShowFormHon(false)} loading={loading} />
          </FormInline>
        )}
      </div>

      {/* --- ABA PARCELAS --- */}
      <div className="tab-content" style={{ display: abaAtiva === 'parcelas' ? 'block' : 'none' }}>
        <h3>Parcelamento</h3>
        <table className="data-table">
          <thead><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Ação</th></tr></thead>
          <tbody>
            {parcelas.map(p => (
              <tr key={p.parcela_id} className={p.parcela_id === parcelaSelecionada ? 'row-selected' : ''}>
                <td>{p.descricao}</td><td>R$ {p.valor}</td><td>{new Date(p.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td><button onClick={() => fetchPagamentos(p.parcela_id)} className="btn-action btn-edit">Ver Pagamentos</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showFormPar && <button onClick={() => setShowFormPar(true)} className="btn-primary" style={{ marginTop: '15px' }}>Adicionar Parcela</button>}
        {showFormPar && (
          <FormInline onSubmit={handleSaveParcela}>
            <h4>Nova Parcela</h4>
            <input type="text" name="descricao" placeholder="Descrição (Ex: Entrada, 1/12)" value={newPar.descricao} onChange={handleParChange} required />
            <input type="number" step="0.01" name="valor" placeholder="Valor (R$)" value={newPar.valor} onChange={handleParChange} required />
            <input type="date" name="data_vencimento" value={newPar.data_vencimento} onChange={handleParChange} required />
            <FormActions onCancel={() => setShowFormPar(false)} loading={loading} />
          </FormInline>
        )}
      </div>

      {/* --- ABA PAGAMENTOS --- */}
      <div className="tab-content" style={{ display: abaAtiva === 'pagamentos' ? 'block' : 'none' }}>
        <h3>Pagamentos Recebidos</h3>
        <table className="data-table">
          <thead><tr><th>Data Pagto.</th><th>Valor Pago</th><th>Forma</th></tr></thead>
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.pagamento_id}>
                <td>{new Date(p.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td>R$ {p.valor_pago}</td><td>{p.tipo_pagamento}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showFormPag && <button onClick={() => setShowFormPag(true)} className="btn-primary" style={{ marginTop: '15px' }}>Registrar Pagamento</button>}
        {showFormPag && (
          <FormInline onSubmit={handleSavePagamento}>
            <h4>Novo Pagamento</h4>
            <input type="number" step="0.01" name="valor_pago" placeholder="Valor Pago (R$)" value={newPag.valor_pago} onChange={handlePagChange} required />
            <input type="date" name="data_pagamento" value={newPag.data_pagamento} onChange={handlePagChange} required />
            <select name="tipo_pagamento" value={newPag.tipo_pagamento} onChange={handlePagChange}>
              <option value="pix">Pix</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option>
            </select>
            <FormActions onCancel={() => setShowFormPag(false)} loading={loading} />
          </FormInline>
        )}
      </div>

      {/* --- ABA DOCUMENTOS --- */}
      <div className="tab-content" style={{ display: abaAtiva === 'documentos' ? 'block' : 'none' }}>
        <h3>Gerar Novo Documento</h3>
        <div className="form-inline">
          <select 
            value={templateSelecionado} 
            onChange={(e) => setTemplateSelecionado(e.target.value)}
            style={{ minWidth: '300px' }}
          >
            {templates.map(t => (
              <option key={t.nome} value={t.nome}>{t.descricao}</option>
            ))}
          </select>
          <button onClick={handleGerarDocumento} disabled={loading} className="btn-primary">
            {loading ? 'Gerando...' : 'Gerar Documento'}
          </button>
        </div>

        <h3 style={{ marginTop: '30px' }}>Documentos Gerados</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Data de Geração</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {documentosGerados.length === 0 && (
              <tr><td colSpan="3">Nenhum documento gerado para este processo.</td></tr>
            )}
            {documentosGerados.map(d => (
              <tr key={d.documento_id}>
                <td>{d.nome_template}</td>
                <td>{new Date(d.data_geracao).toLocaleString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>
                  <button 
                    onClick={() => handleDownloadDoc(d.documento_id, d.nome_template)} 
                    className="btn-action btn-edit"
                    disabled={loading}
                  >
                    Ver/Baixar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} // <--- FIM DO COMPONENTE 'ProcessoTabs'

export default ProcessoTabs; // <--- EXPORTAÇÃO (AGORA NA ÚLTIMA LINHA)