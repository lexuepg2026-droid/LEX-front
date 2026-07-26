import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { maskCPF, maskCNPJ, maskCEP, maskPhone, unmask } from '../../utils/masks';
import { UFS, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS } from '../../utils/enums';
import './ClientPage.css';

function ClienteFormPage() {
  const [tipoPessoa, setTipoPessoa] = useState('fisica');
  const [formData, setFormData] = useState({
    nomeCompleto: '', cpf: '',
    rg: '', dataNascimento: '', sexo: '', estadoCivil: '', profissao: '', nacionalidade: 'brasileira',
    razaoSocial: '', nomeFantasia: '', cnpj: '',
    repNome: '', repCpf: '', repCargo: '',
    email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: '',
    observacoes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!isEditing) return;
    const fetchCliente = async () => {
      try {
        const response = await clientService.getClientById(id);
        const d = response.data;
        setTipoPessoa(d.tipoPessoa);
        // A API guarda dígitos puros; a UI trabalha com o valor mascarado.
        setFormData({
          nomeCompleto: d.nomeCompleto || '',
          cpf: maskCPF(d.cpf || ''),
          rg: d.rg || '',
          dataNascimento: d.dataNascimento ? String(d.dataNascimento).slice(0, 10) : '',
          sexo: d.sexo || '',
          estadoCivil: d.estadoCivil || '',
          profissao: d.profissao || '',
          nacionalidade: d.nacionalidade || '',
          razaoSocial: d.razaoSocial || '',
          nomeFantasia: d.nomeFantasia || '',
          cnpj: maskCNPJ(d.cnpj || ''),
          repNome: d.representanteLegal?.nome || '',
          repCpf: maskCPF(d.representanteLegal?.cpf || ''),
          repCargo: d.representanteLegal?.cargo || '',
          email: d.email || '',
          telefone: maskPhone(d.telefone || ''),
          cep: maskCEP(d.endereco?.cep || ''),
          logradouro: d.endereco?.logradouro || '',
          numero: d.endereco?.numero || '',
          complemento: d.endereco?.complemento || '',
          bairro: d.endereco?.bairro || '',
          cidade: d.endereco?.cidade || '',
          estado: d.endereco?.estado || '',
          pais: d.endereco?.pais || '',
          observacoes: d.observacoes || ''
        });
      } catch {
        setError('Falha ao carregar dados do cliente.');
      }
    };
    fetchCliente();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMaskedChange = (mask) => (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: mask(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endereco = {
      cep: unmask(formData.cep) || undefined,
      logradouro: formData.logradouro || undefined,
      numero: formData.numero || undefined,
      complemento: formData.complemento || undefined,
      bairro: formData.bairro || undefined,
      cidade: formData.cidade || undefined,
      estado: formData.estado || undefined,
      pais: formData.pais || undefined,
    };

    const payload = {
      tipoPessoa,
      email: formData.email || undefined,
      telefone: unmask(formData.telefone) || undefined,
      observacoes: formData.observacoes || undefined,
      endereco,
    };

    if (tipoPessoa === 'fisica') {
      payload.nomeCompleto = formData.nomeCompleto;
      payload.cpf = unmask(formData.cpf);
      // Enums vazios vão como undefined: string vazia não passa no enum do schema.
      payload.rg = formData.rg || undefined;
      payload.dataNascimento = formData.dataNascimento || undefined;
      payload.sexo = formData.sexo || undefined;
      payload.estadoCivil = formData.estadoCivil || undefined;
      payload.profissao = formData.profissao || undefined;
      payload.nacionalidade = formData.nacionalidade || undefined;
    } else {
      payload.razaoSocial = formData.razaoSocial;
      payload.nomeFantasia = formData.nomeFantasia;
      payload.cnpj = unmask(formData.cnpj);

      const repNome = formData.repNome.trim();
      const repCpf = unmask(formData.repCpf);
      const repCargo = formData.repCargo.trim();
      payload.representanteLegal = (repNome || repCpf || repCargo)
        ? { nome: repNome || undefined, cpf: repCpf || undefined, cargo: repCargo || undefined }
        : undefined;
    }

    try {
      if (isEditing) {
        await clientService.updateClient(id, payload);
      } else {
        await clientService.createClient(payload);
      }
      toast.success(isEditing ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
      navigate('/dashboard/clientes');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar cliente. Verifique os dados.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Cliente' : 'Registrar Novo Cliente'}</h1>

      {!isEditing && (
        <div className="form-group tipo-pessoa-seletor">
          <label>Tipo de Pessoa:</label>
          <div className="radio-group">
            <input type="radio" id="tipo_fisica" name="tipoPessoa" value="fisica"
                   checked={tipoPessoa === 'fisica'} onChange={() => setTipoPessoa('fisica')} />
            <label htmlFor="tipo_fisica">Pessoa Física</label>
            <input type="radio" id="tipo_juridica" name="tipoPessoa" value="juridica"
                   checked={tipoPessoa === 'juridica'} onChange={() => setTipoPessoa('juridica')} />
            <label htmlFor="tipo_juridica">Pessoa Jurídica</label>
          </div>
        </div>
      )}
      {isEditing && (
        <p className="tipo-pessoa-label">
          Tipo: <strong>{tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</strong>
        </p>
      )}

      <form onSubmit={handleSubmit} className="data-form">

        {tipoPessoa === 'fisica' && (
          <div className="form-grid section">
            <h3>Dados Pessoais</h3>
            <div className="form-group span-2">
              <label>Nome Completo*</label>
              <input type="text" name="nomeCompleto" value={formData.nomeCompleto} onChange={handleChange} required />
            </div>
            <div className="form-group span-1">
              <label>CPF*</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleMaskedChange(maskCPF)}
                     placeholder="000.000.000-00" inputMode="numeric" required />
            </div>

            <p className="form-note span-3">
              Campos usados na geração automática de documentos (procuração, contrato).
              Opcionais, mas recomendados.
            </p>

            <div className="form-group span-1">
              <label>RG</label>
              <input type="text" name="rg" value={formData.rg} onChange={handleChange} maxLength={20} />
            </div>
            <div className="form-group span-1">
              <label>Data de nascimento</label>
              <input type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} />
            </div>
            <div className="form-group span-1">
              <label>Sexo</label>
              <select name="sexo" value={formData.sexo} onChange={handleChange}>
                <option value="">Selecione…</option>
                {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group span-1">
              <label>Estado civil</label>
              <select name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                <option value="">Selecione…</option>
                {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group span-1">
              <label>Profissão</label>
              <input type="text" name="profissao" value={formData.profissao} onChange={handleChange} maxLength={60} />
            </div>
            <div className="form-group span-1">
              <label>Nacionalidade</label>
              <input type="text" name="nacionalidade" value={formData.nacionalidade} onChange={handleChange} maxLength={50} />
            </div>
          </div>
        )}

        {tipoPessoa === 'juridica' && (
          <div className="form-grid section">
            <h3>Dados Empresariais</h3>
            <div className="form-group span-1">
              <label>CNPJ*</label>
              <input type="text" name="cnpj" value={formData.cnpj} onChange={handleMaskedChange(maskCNPJ)}
                     placeholder="00.000.000/0000-00" inputMode="numeric" required />
            </div>
            <div className="form-group span-2">
              <label>Razão Social*</label>
              <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} required />
            </div>
            <div className="form-group span-3">
              <label>Nome Fantasia*</label>
              <input type="text" name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} required />
            </div>

            <fieldset className="form-fieldset span-3">
              <legend>Representante legal</legend>
              <p className="form-note">
                Quem assina pela empresa em procuração e contrato.
                Opcional, mas recomendado.
              </p>
              <div className="form-grid-inner">
                <div className="form-group span-2">
                  <label>Nome</label>
                  <input type="text" name="repNome" value={formData.repNome} onChange={handleChange} maxLength={255} />
                </div>
                <div className="form-group span-1">
                  <label>CPF</label>
                  <input type="text" name="repCpf" value={formData.repCpf} onChange={handleMaskedChange(maskCPF)}
                         placeholder="000.000.000-00" inputMode="numeric" />
                </div>
                <div className="form-group span-1">
                  <label>Cargo</label>
                  <input type="text" name="repCargo" value={formData.repCargo} onChange={handleChange} maxLength={60} />
                </div>
              </div>
            </fieldset>
          </div>
        )}

        <div className="form-grid section">
          <h3>Contato</h3>
          <div className="form-group span-2">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Telefone</label>
            <input type="tel" name="telefone" value={formData.telefone} onChange={handleMaskedChange(maskPhone)}
                   placeholder="(00) 00000-0000" inputMode="numeric" />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Endereço</h3>
          <div className="form-group span-1">
            <label>CEP</label>
            <input type="text" name="cep" value={formData.cep} onChange={handleMaskedChange(maskCEP)}
                   placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input type="text" name="logradouro" value={formData.logradouro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Número</label>
            <input type="text" name="numero" value={formData.numero} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Complemento</label>
            <input type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Bairro</label>
            <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Cidade</label>
            <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Estado (UF)</label>
            {/* Select, não texto livre: o backend tem enum de UF e texto solto gera 400. */}
            <select name="estado" value={formData.estado} onChange={handleChange}>
              <option value="">Selecione…</option>
              {UFS.map(uf => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>
          <div className="form-group span-1">
            <label>País</label>
            <input type="text" name="pais" value={formData.pais} onChange={handleChange} />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Observações</h3>
          <div className="form-group span-3">
            <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/clientes')} className="btn-cancel">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClienteFormPage;
