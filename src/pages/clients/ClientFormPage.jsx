import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage, getApiErrorField } from '../../utils/apiError';
import { maskCPF, maskCNPJ, maskCEP, maskPhone, unmask } from '../../utils/masks';
import { UFS, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS, TIPO_PESSOA_OPTIONS, labelDe } from '../../utils/enums';
import { buscarEnderecoPorCEP } from '../../utils/viacep';
import CampoComSugestoes from '../../components/ui/CampoComSugestoes';
import useTabelaDominio from '../../hooks/useTabelaDominio';
import { rotuloProfissao, gentilicos } from '../../utils/tabelasDominio';
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
    observacoes: '',
    // Senha de portal. Sempre começa vazia, inclusive na edição: o campo é
    // ENTRADA de senha nova, nunca exibição da atual — a atual é hash e não
    // existe em lugar nenhum como texto. Ver `estadoDoPortal` abaixo.
    senhaPortal: ''
  });

  // Estado do acesso ao portal, lido do cliente. Três estados possíveis, e a
  // tela precisa dos três:
  //   sem acesso   — `senhaPortalDefinidaEm` nulo e `senhaPortalProvisoria`
  //                  falso. É estado VÁLIDO: cliente que não usa o portal não
  //                  precisa de senha, e isso não é pendência.
  //   provisória   — a advogada gravou uma senha e o cliente ainda não trocou.
  //   própria      — o cliente trocou, na data registrada.
  const [portal, setPortal] = useState({ provisoria: false, definidaEm: null });
  const [revogando, setRevogando] = useState(false);
  const [confirmandoRevogacao, setConfirmandoRevogacao] = useState(false);
  const [error, setError] = useState('');
  // Campo apontado pelo backend no 409 ("cpf" | "cnpj" | "email"), para
  // destacar o input em vez de só exibir a mensagem no rodapé.
  const [campoComErro, setCampoComErro] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [loading, setLoading] = useState(false);

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
          observacoes: d.observacoes || '',
          senhaPortal: ''
        });
        setPortal({
          provisoria: d.senhaPortalProvisoria === true,
          definidaEm: d.senhaPortalDefinidaEm ?? null
        });
      } catch {
        setError('Falha ao carregar dados do cliente.');
      } finally {
        setCarregandoRegistro(false);
      }
    };
    fetchCliente();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── DEC-057 — profissão e nacionalidade sugerem, e não obrigam ───────────
  // As duas tabelas só descem quando o campo é usado, e nenhuma das duas
  // recusa o que foi digitado. Profissão fora da CBO entra; gentílico fora da
  // lista entra.
  const profissoes = useTabelaDominio('profissoes');
  const nacionalidades = useTabelaDominio('nacionalidades');

  const definirCampo = (nome, valor) =>
    setFormData(prev => ({ ...prev, [nome]: valor }));

  // A nacionalidade continua sendo UM campo de texto, como sempre foi — o que
  // mudou é que a sugestão sai flexionada pelo `sexo` já preenchido no
  // cadastro, porque é isso que a procuração precisa ler ("brasileira,
  // casada, professora"). Sem sexo escolhido, oferece as duas formas e não
  // decide por ela. Ver `gentilicos` e o relatório da F-4.
  const listaGentilicos = React.useMemo(
    () => gentilicos(nacionalidades.envelope, formData.sexo),
    [nacionalidades.envelope, formData.sexo]
  );

  const handleMaskedChange = (mask) => (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: mask(value) }));
  };

  // Mesmo comportamento de RegisterPage e ProfilePage: 8 dígitos disparam a
  // busca, os campos seguem editáveis e a falha é silenciosa — CEP é
  // conveniência, não pode travar o cadastro.
  const handleCepChange = async (e) => {
    const masked = maskCEP(e.target.value);
    setFormData(prev => ({ ...prev, cep: masked }));

    if (unmask(masked).length !== 8) return;

    setCepLoading(true);
    const endereco = await buscarEnderecoPorCEP(masked);
    setCepLoading(false);
    if (!endereco) return;

    setFormData(prev => ({
      ...prev,
      logradouro: endereco.logradouro || prev.logradouro,
      bairro: endereco.bairro || prev.bairro,
      cidade: endereco.cidade || prev.cidade,
      estado: endereco.estado || prev.estado,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCampoComErro(null);

    // Campo opcional esvaziado precisa ir como `null` na edição: `undefined`
    // some no JSON.stringify, a chave nem chega ao backend e o merge parcial
    // preserva o valor antigo — era impossível apagar um telefone digitado
    // errado. Na criação `undefined` é o certo, para o schema aplicar os
    // defaults (ex.: nacionalidade "brasileira") em vez de gravar null.
    const opcional = (valor) => {
      const v = typeof valor === 'string' ? valor.trim() : valor;
      if (v) return v;
      return isEditing ? null : undefined;
    };

    const endereco = {
      cep: opcional(unmask(formData.cep)),
      logradouro: opcional(formData.logradouro),
      numero: opcional(formData.numero),
      complemento: opcional(formData.complemento),
      bairro: opcional(formData.bairro),
      cidade: opcional(formData.cidade),
      estado: opcional(formData.estado),
      pais: opcional(formData.pais),
    };

    const payload = {
      tipoPessoa,
      email: opcional(formData.email),
      telefone: opcional(unmask(formData.telefone)),
      observacoes: opcional(formData.observacoes),
      endereco,
    };

    // A senha só entra no payload quando a advogada DIGITOU algo. Mandá-la
    // vazia na edição regravaria o acesso a cada salvamento do formulário —
    // e como toda gravação volta `senhaPortalProvisoria` para `true`, trocar
    // o telefone de um cliente derrubaria a senha que ele já tinha definido.
    // Campo em branco significa "não mexer no acesso", não "apagar".
    if (formData.senhaPortal !== '') {
      payload.senhaPortal = formData.senhaPortal;
    }

    if (tipoPessoa === 'fisica') {
      payload.nomeCompleto = formData.nomeCompleto;
      payload.cpf = unmask(formData.cpf);
      // Enum vazio nunca vai como string vazia: '' reprova no enum do schema,
      // null passa (o validador do Mongoose ignora null) e limpa o campo.
      payload.rg = opcional(formData.rg);
      payload.dataNascimento = opcional(formData.dataNascimento);
      payload.sexo = opcional(formData.sexo);
      payload.estadoCivil = opcional(formData.estadoCivil);
      payload.profissao = opcional(formData.profissao);
      payload.nacionalidade = opcional(formData.nacionalidade);
    } else {
      payload.razaoSocial = formData.razaoSocial;
      payload.nomeFantasia = formData.nomeFantasia;
      payload.cnpj = unmask(formData.cnpj);

      const repNome = formData.repNome.trim();
      const repCpf = unmask(formData.repCpf);
      const repCargo = formData.repCargo.trim();
      // Com algum dado preenchido manda o trio (campo vazio como null, para
      // limpar); com os três vazios manda null, que remove o subdocumento.
      payload.representanteLegal = (repNome || repCpf || repCargo)
        ? { nome: opcional(repNome), cpf: opcional(repCpf), cargo: opcional(repCargo) }
        : (isEditing ? null : undefined);
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
      // O backend informa qual campo causou o 409; destacamos o input em vez de
      // deixar o usuário caçar o duplicado numa mensagem no rodapé.
      setCampoComErro(getApiErrorField(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Acesso ao portal ─────────────────────────────────────────────────────
  //
  // Os três estados saem de dois campos, sem ambiguidade e sem consulta extra:
  // `senhaPortalHash` não sai da API (é `select: false` E é apagado no `toJSON`
  // global), então quem responde "tem acesso?" é a combinação abaixo.
  const temAcesso = portal.provisoria || portal.definidaEm !== null;

  const textoDoEstadoDoPortal = portal.provisoria
    ? 'senha provisória cadastrada — aguardando o cliente entrar e definir a dele'
    : portal.definidaEm !== null
      ? `o cliente definiu a própria senha em ${new Date(portal.definidaEm).toLocaleDateString('pt-BR')}`
      : 'sem acesso ao portal';

  const revogarAcessoPortal = async () => {
    setRevogando(true);
    setError('');
    try {
      await clientService.revogarSenhaPortal(id);
      setPortal({ provisoria: false, definidaEm: null });
      setFormData((prev) => ({ ...prev, senhaPortal: '' }));
      setConfirmandoRevogacao(false);
      toast.success('Acesso ao portal revogado. O cliente não consegue mais entrar.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível revogar o acesso ao portal.'));
    } finally {
      setRevogando(false);
    }
  };

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Cliente' : 'Registrar Novo Cliente'}</h1>

      {!isEditing && (
        <div className="form-group tipo-pessoa-seletor">
          <label>Tipo de Pessoa:</label>
          <div className="radio-group">
            {TIPO_PESSOA_OPTIONS.map(({ value, label }) => (
              <React.Fragment key={value}>
                <input type="radio" id={`tipo_${value}`} name="tipoPessoa" value={value}
                       checked={tipoPessoa === value} onChange={() => setTipoPessoa(value)} />
                <label htmlFor={`tipo_${value}`}>{label}</label>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {isEditing && (
        <p className="tipo-pessoa-label">
          Tipo: <strong>{labelDe(TIPO_PESSOA_OPTIONS, tipoPessoa)}</strong>
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
                     placeholder="000.000.000-00" inputMode="numeric" required
                     className={campoComErro === 'cpf' ? 'input-erro' : undefined} />
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
              <label htmlFor="profissao">Profissão</label>
              <CampoComSugestoes
                id="profissao"
                name="profissao"
                value={formData.profissao}
                onChange={(valor) => definirCampo('profissao', valor)}
                itens={profissoes.envelope?.itens ?? []}
                rotulo={rotuloProfissao}
                aoPrimeiroUso={profissoes.ativar}
                carregando={profissoes.carregando}
                erro={profissoes.erro}
                maxLength={60}
              />
            </div>
            <div className="form-group span-1">
              <label htmlFor="nacionalidade">Nacionalidade</label>
              <CampoComSugestoes
                id="nacionalidade"
                name="nacionalidade"
                value={formData.nacionalidade}
                onChange={(valor) => definirCampo('nacionalidade', valor)}
                itens={listaGentilicos}
                aoPrimeiroUso={nacionalidades.ativar}
                carregando={nacionalidades.carregando}
                erro={nacionalidades.erro}
                maxLength={50}
                descricao={formData.sexo ? null : 'Escolha o sexo para a sugestão vir já flexionada.'}
              />
            </div>
          </div>
        )}

        {tipoPessoa === 'juridica' && (
          <div className="form-grid section">
            <h3>Dados Empresariais</h3>
            <div className="form-group span-1">
              <label>CNPJ*</label>
              <input type="text" name="cnpj" value={formData.cnpj} onChange={handleMaskedChange(maskCNPJ)}
                     placeholder="00.000.000/0000-00" inputMode="numeric" required
                     className={campoComErro === 'cnpj' ? 'input-erro' : undefined} />
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
            <input type="email" name="email" value={formData.email} onChange={handleChange}
                   className={campoComErro === 'email' ? 'input-erro' : undefined} />
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
            <label>CEP {cepLoading && <span className="cep-hint">buscando…</span>}</label>
            <input type="text" name="cep" value={formData.cep} onChange={handleCepChange}
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

        {/* ── Acesso ao portal do cliente ────────────────────────────────────
            Bloco opcional. Cliente que não usa o portal não precisa de senha,
            e "sem acesso" é estado válido — não pendência a resolver. */}
        <div className="form-grid section">
          <h3>Acesso ao portal</h3>

          <div className="form-group span-3">
            <p className="portal-estado">
              <strong>Situação:</strong> {textoDoEstadoDoPortal}
            </p>
            {/* A senha NUNCA é exibida depois de gravada — é hash, não existe
                como texto em lugar nenhum. A tela mostra estado, não valor.
                Isto está escrito porque a pergunta "onde vejo a senha dele?"
                é inevitável, e a resposta precisa estar na tela, não numa
                conversa. */}
            <p className="cep-hint">
              A senha não pode ser consultada depois de salva — o sistema guarda
              só uma versão embaralhada dela. Se o cliente esquecer, cadastre uma
              nova aqui: ele será obrigado a trocá-la no próximo acesso.
            </p>
          </div>

          <div className="form-group span-2">
            <label>{temAcesso ? 'Cadastrar nova senha (redefinir)' : 'Senha inicial do portal'}</label>
            <input
              type="password"
              name="senhaPortal"
              value={formData.senhaPortal}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder={temAcesso ? 'Deixe em branco para não alterar' : 'Opcional'}
              className={campoComErro === 'senhaPortal' ? 'input-erro' : undefined}
            />
            <span className="cep-hint">
              {temAcesso
                ? 'Gravar uma senha nova volta o acesso para "provisória": o cliente terá de trocá-la de novo no próximo acesso. É o caminho para quando ele esquece.'
                : 'Opcional. Entregue-a ao cliente junto com o código de acesso do processo — ele será obrigado a trocá-la no primeiro acesso.'}
            </span>
          </div>

          {isEditing && temAcesso && (
            <div className="form-group span-1">
              <label>Revogar acesso</label>
              {confirmandoRevogacao ? (
                <div className="portal-revogar-confirma">
                  <p className="cep-hint">
                    O cliente perde o acesso ao portal imediatamente. As
                    confirmações que ele já registrou <strong>não</strong> são
                    apagadas.
                  </p>
                  <button
                    type="button"
                    className="btn-portal-revogar"
                    onClick={revogarAcessoPortal}
                    disabled={revogando}
                  >
                    {revogando ? 'Revogando…' : 'Confirmar revogação'}
                  </button>
                  <button
                    type="button"
                    className="btn-portal-cancelar"
                    onClick={() => setConfirmandoRevogacao(false)}
                    disabled={revogando}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-portal-revogar"
                  onClick={() => setConfirmandoRevogacao(true)}
                >
                  Revogar acesso ao portal
                </button>
              )}
            </div>
          )}
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
