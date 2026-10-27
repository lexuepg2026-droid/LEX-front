import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage, getApiErrorField } from '../../utils/apiError';
import { maskCPF, maskCNPJ, maskCEP, maskPhone, unmask } from '../../utils/masks';
import { montarPayloadCliente } from '../../utils/clientePayload';
import RevogacaoPortal from '../../components/clients/RevogacaoPortal';
import { UFS, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS, TIPO_PESSOA_OPTIONS } from '../../utils/enums';
import { buscarEnderecoPorCEP } from '../../utils/viacep';
import { emailValido, MENSAGEM_EMAIL_INVALIDO } from '../../utils/email';
import CampoComSugestoes from '../../components/ui/CampoComSugestoes';
import useTabelaDominio from '../../hooks/useTabelaDominio';
import { rotuloProfissao, gentilicos } from '../../utils/tabelasDominio';
import './ClientPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { usePublicarContexto } from '../../contexts/ContextoContext';

function ClienteFormPage() {
  const [tipoPessoa, setTipoPessoa] = useState('fisica');
  // O tipo que está GRAVADO (F-6.2). Só a edição o preenche; serve para saber se
  // a advogada está trocando o tipo e para avisar o que a gravação vai remover.
  const [tipoOriginal, setTipoOriginal] = useState(null);
  // O e-mail que está GRAVADO (A-2). Serve para a mesma regra do servidor: o
  // formato só é cobrado de um e-mail que MUDOU — a tela reenvia o e-mail em todo
  // salvamento, e um cliente antigo com e-mail torto não pode travar a edição do
  // telefone por causa de um campo que ninguém tocou.
  const [emailOriginal, setEmailOriginal] = useState('');
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
  const [error, setError] = useState('');
  // Campo apontado pelo backend no 409 ("cpf" | "cnpj" | "email"), para
  // destacar o input em vez de só exibir a mensagem no rodapé.
  const [campoComErro, setCampoComErro] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  // Fase 2b (DEC-085): publica para a faixa de contexto o cliente (na edição).
  usePublicarContexto({ clienteId: id });
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
        setTipoOriginal(d.tipoPessoa);
        setEmailOriginal(d.email || '');
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

  // ── Troca de tipo (F-6.2) ────────────────────────────────────────────────
  //
  // Trocar o rádio NÃO apaga nada do estado: os campos dos dois tipos ficam
  // guardados em `formData`, e voltar ao tipo original antes de salvar
  // devolve tudo como estava. O que sai de verdade é decidido no envio —
  // `handleSubmit` só monta o payload com os campos do tipo escolhido, e o
  // servidor remove do cadastro os do tipo oposto (hook do model `Client`).
  //
  // Um PJ carregado para edição tem `nacionalidade` vazia, e virar PF com o
  // campo vazio gravaria `null` — enquanto o cadastro novo de PF nasce com
  // "brasileira". Repõe o mesmo padrão da criação, sem sobrescrever nada que
  // já esteja preenchido.
  const trocarTipoPessoa = (novoTipo) => {
    setTipoPessoa(novoTipo);
    if (novoTipo === 'fisica') {
      setFormData(prev => (prev.nacionalidade ? prev : { ...prev, nacionalidade: 'brasileira' }));
    }
  };

  // O que a gravação vai REMOVER, dito na língua da advogada. Só existe
  // enquanto o tipo escolhido difere do gravado.
  const trocandoTipo = isEditing && tipoOriginal !== null && tipoPessoa !== tipoOriginal;
  const perdaNaTroca = tipoPessoa === 'juridica'
    ? {
        remove: 'pessoa física (nome completo, CPF, RG, data de nascimento, sexo, estado civil, profissão e nacionalidade)',
        preencha: 'os dados empresariais',
      }
    : {
        remove: 'pessoa jurídica (CNPJ, razão social, nome fantasia e representante legal)',
        preencha: 'os dados pessoais',
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

  const online = useOnlineStatus();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ── Nenhum formulário aceita envio que vai falhar (F-5a, Parte 4) ────
    //
    // A primeira barreira é o botão anunciado como desabilitado; esta é a
    // segunda, no handler, porque `aria-disabled` só ANUNCIA (DEC-053). A
    // terceira é o interceptor de `api/axiosConfig.js`, que recusa a escrita
    // antes da rede — ela cobre o sinal que cai ENTRE o clique e o envio.
    //
    // Deixar salvar para dar erro depois perde o que foi digitado.
    if (!online) return;
    setError('');
    setCampoComErro(null);

    // ── A-2 (DEC-064): o formato do e-mail do cliente, conferido na tela ─────
    // A MESMA função do login e do cadastro (`utils/email.js`, DEC-063), e a
    // mesma exceção do servidor: só vale para e-mail que mudou. O campo segue
    // OPCIONAL — vazio passa. Conveniência que poupa a viagem; o servidor é
    // quem recusa de verdade.
    const emailDigitado = formData.email.trim();
    if (
      emailDigitado &&
      emailDigitado.toLowerCase() !== emailOriginal.trim().toLowerCase() &&
      !emailValido(emailDigitado)
    ) {
      setError(MENSAGEM_EMAIL_INVALIDO);
      setCampoComErro('email');
      return;
    }

    setLoading(true);

    // Fase 3.5 (DEC-125): o payload sai de `utils/clientePayload.js`, que a
    // suíte executa — `null` para campo apagado na edição, só os campos do
    // tipo escolhido, e a senha só quando digitada. As regras estão lá.
    const payload = montarPayloadCliente(formData, { tipoPessoa, isEditing });

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

  // A revogação é a de `RevogacaoPortal` (Fase 3.5), a mesma da aba "Portal"
  // do detalhe. Revogado, o estado da tela volta a "sem acesso".
  const aoRevogar = () => {
    setPortal({ provisoria: false, definidaEm: null });
    setFormData((prev) => ({ ...prev, senhaPortal: '' }));
  };

  if (carregandoRegistro) return <Loading />;

  // ── As seções (Fase 3.5, DEC-125) ─────────────────────────────────────────
  // No padrão do formulário de processo da 3.4 (`form-grid section`):
  // Identificação (o tipo de pessoa e os dados de cada tipo), Contato,
  // Endereço, Dados profissionais (PF), Representante legal (PJ), Acesso ao
  // portal e Observações. A lógica é a de antes — só a ordem e os títulos
  // mudaram, e os campos do tipo que não está escolhido continuam guardados no
  // estado (F-6.2).
  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar cliente' : 'Novo cliente'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineWriteReason />}

        <div className="form-grid section">
          <h3>Identificação</h3>

          {/* O seletor aparece na criação E na edição (F-6.2). Na edição ele
              troca o tipo de um cliente já cadastrado — o `_id` não muda,
              então processos e honorários continuam ligados a ele. */}
          <div className="form-group tipo-pessoa-seletor span-3">
            <label>Tipo de pessoa</label>
            <div className="radio-group">
              {TIPO_PESSOA_OPTIONS.map(({ value, label }) => (
                <React.Fragment key={value}>
                  <input type="radio" id={`tipo_${value}`} name="tipoPessoa" value={value}
                         checked={tipoPessoa === value} onChange={() => trocarTipoPessoa(value)} />
                  <label htmlFor={`tipo_${value}`}>{label}</label>
                </React.Fragment>
              ))}
            </div>
            {trocandoTipo && (
              <p className="tipo-pessoa-aviso" role="status">
                Ao salvar, os dados de {perdaNaTroca.remove} deste cliente serão
                removidos. Preencha {perdaNaTroca.preencha} abaixo. Processos e
                honorários continuam ligados ao cliente; documentos já gerados
                mantêm o texto de quando foram criados. Para desistir, escolha o
                tipo anterior antes de salvar.
              </p>
            )}
          </div>

          {tipoPessoa === 'fisica' ? (
            <>
              <div className="form-group span-2">
                <label htmlFor="nomeCompleto">Nome completo*</label>
                <input id="nomeCompleto" type="text" name="nomeCompleto" value={formData.nomeCompleto} onChange={handleChange} required />
              </div>
              <div className="form-group span-1">
                <label htmlFor="cpf">CPF*</label>
                <input id="cpf" type="text" name="cpf" value={formData.cpf} onChange={handleMaskedChange(maskCPF)}
                       placeholder="000.000.000-00" inputMode="numeric" required
                       className={campoComErro === 'cpf' ? 'input-erro' : undefined} />
              </div>

              <p className="form-note span-3">
                Campos usados na geração automática de documentos (procuração, contrato).
                Opcionais, mas recomendados.
              </p>

              <div className="form-group span-1">
                <label htmlFor="rg">RG</label>
                <input id="rg" type="text" name="rg" value={formData.rg} onChange={handleChange} maxLength={20} />
              </div>
              <div className="form-group span-1">
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input id="dataNascimento" type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} />
              </div>
              <div className="form-group span-1">
                <label htmlFor="sexo">Sexo</label>
                <select id="sexo" name="sexo" value={formData.sexo} onChange={handleChange}>
                  <option value="">Selecione…</option>
                  {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group span-1">
                <label htmlFor="estadoCivil">Estado civil</label>
                <select id="estadoCivil" name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                  <option value="">Selecione…</option>
                  {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group span-1">
                <label htmlFor="cnpj">CNPJ*</label>
                <input id="cnpj" type="text" name="cnpj" value={formData.cnpj} onChange={handleMaskedChange(maskCNPJ)}
                       placeholder="00.000.000/0000-00" inputMode="numeric" required
                       className={campoComErro === 'cnpj' ? 'input-erro' : undefined} />
              </div>
              <div className="form-group span-2">
                <label htmlFor="razaoSocial">Razão social*</label>
                <input id="razaoSocial" type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} required />
              </div>
              <div className="form-group span-3">
                <label htmlFor="nomeFantasia">Nome fantasia*</label>
                <input id="nomeFantasia" type="text" name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} required />
              </div>
            </>
          )}
        </div>

        <div className="form-grid section">
          <h3>Contato</h3>
          <div className="form-group span-2">
            <label htmlFor="email">E-mail</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange}
                   className={campoComErro === 'email' ? 'input-erro' : undefined} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="telefone">Telefone</label>
            <input id="telefone" type="tel" name="telefone" value={formData.telefone} onChange={handleMaskedChange(maskPhone)}
                   placeholder="(00) 00000-0000" inputMode="numeric" />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Endereço</h3>
          <div className="form-group span-1">
            <label htmlFor="cep">CEP {cepLoading && <span className="cep-hint">buscando…</span>}</label>
            <input id="cep" type="text" name="cep" value={formData.cep} onChange={handleCepChange}
                   placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="form-group span-2">
            <label htmlFor="logradouro">Logradouro</label>
            <input id="logradouro" type="text" name="logradouro" value={formData.logradouro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="numero">Número</label>
            <input id="numero" type="text" name="numero" value={formData.numero} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="complemento">Complemento</label>
            <input id="complemento" type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="bairro">Bairro</label>
            <input id="bairro" type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="cidade">Cidade</label>
            <input id="cidade" type="text" name="cidade" value={formData.cidade} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="estado">Estado (UF)</label>
            {/* Select, não texto livre: o backend tem enum de UF e texto solto gera 400. */}
            <select id="estado" name="estado" value={formData.estado} onChange={handleChange}>
              <option value="">Selecione…</option>
              {UFS.map(uf => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>
          <div className="form-group span-1">
            <label htmlFor="pais">País</label>
            <input id="pais" type="text" name="pais" value={formData.pais} onChange={handleChange} />
          </div>
        </div>

        {tipoPessoa === 'fisica' && (
          <div className="form-grid section">
            <h3>Dados profissionais</h3>
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
            <h3>Representante legal</h3>
            <p className="form-note span-3">
              Quem assina pela empresa em procuração e contrato.
              Opcional, mas recomendado.
            </p>
            <div className="form-group span-2">
              <label htmlFor="repNome">Nome</label>
              <input id="repNome" type="text" name="repNome" value={formData.repNome} onChange={handleChange} maxLength={255} />
            </div>
            <div className="form-group span-1">
              <label htmlFor="repCpf">CPF</label>
              <input id="repCpf" type="text" name="repCpf" value={formData.repCpf} onChange={handleMaskedChange(maskCPF)}
                     placeholder="000.000.000-00" inputMode="numeric" />
            </div>
            <div className="form-group span-1">
              <label htmlFor="repCargo">Cargo</label>
              <input id="repCargo" type="text" name="repCargo" value={formData.repCargo} onChange={handleChange} maxLength={60} />
            </div>
          </div>
        )}

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
                como texto em lugar nenhum. A tela mostra estado, não valor. */}
            <p className="cep-hint">
              A senha não pode ser consultada depois de salva — o sistema guarda
              só uma versão embaralhada dela. Se o cliente esquecer, cadastre uma
              nova aqui: ele será obrigado a trocá-la no próximo acesso.
            </p>
          </div>

          <div className="form-group span-2">
            <label htmlFor="senhaPortal">{temAcesso ? 'Cadastrar nova senha (redefinir)' : 'Senha inicial do portal'}</label>
            <input
              id="senhaPortal"
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
                : 'Opcional. Ela cria o código de acesso pessoal do cliente; entregue os dois, por canais diferentes — ele será obrigado a trocar a senha no primeiro acesso.'}
            </span>
          </div>

          {isEditing && temAcesso && (
            <div className="form-group span-1">
              <span className="form-group__rotulo">Revogar acesso</span>
              <RevogacaoPortal clienteId={id} online={online} onRevogado={aoRevogar} />
            </div>
          )}
        </div>

        <div className="form-grid section">
          <h3>Observações</h3>
          <div className="form-group span-3">
            <textarea id="observacoes" aria-label="Observações" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/clientes')} className="btn-cancel">Cancelar</button>
          <button type="submit"
            aria-disabled={online ? undefined : 'true'} disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClienteFormPage;
