import React, { useState, useEffect, useCallback } from 'react';
import authService from '../../api/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { maskCPF, maskCEP, maskPhone, unmask } from '../../utils/masks';
import { buscarEnderecoPorCEP } from '../../utils/viacep';
import { UFS } from '../../utils/enums';
import { prepararLogo, formatarTamanho } from '../../utils/imagem';
import { toast } from '../../utils/toast';
import '../processes/ProcessDetailPage.css';
import './ProfilePage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import Avatar from '../../components/ui/Avatar';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useConfirmacaoEmail from '../../hooks/useConfirmacaoEmail';
import { situacaoDoEmail } from '../../components/layout/confirmacaoEmail.js';

// Espelho plano do usuário. Guardamos o valor MASCARADO (é o que aparece no
// input) e desmascaramos só na hora de montar o payload.
const buildForm = (u) => ({
  nomeCompleto: u?.nomeCompleto || '',
  cpf: maskCPF(u?.cpf || ''),
  telefone: maskPhone(u?.telefone || ''),
  oabNumero: u?.oab?.numero || '',
  oabEstado: u?.oab?.estado || '',
  advNome: u?.advocacia?.nome || '',
  advChavePix: u?.advocacia?.chavePix || '',
  advInstagram: u?.advocacia?.instagram || '',
  advSite: u?.advocacia?.site || '',
  // String vazia representa "sem logo" no formulário; vira null no payload,
  // que é como o backend remove o campo.
  advLogo: u?.advocacia?.logoBase64 || '',
  cep: maskCEP(u?.endereco?.cep || ''),
  logradouro: u?.endereco?.logradouro || '',
  numero: u?.endereco?.numero || '',
  complemento: u?.endereco?.complemento || '',
  bairro: u?.endereco?.bairro || '',
  cidade: u?.endereco?.cidade || '',
  estado: u?.endereco?.estado || '',
  pais: u?.endereco?.pais || 'Brasil',
});

const SENHA_FRACA = 'A nova senha deve ter no mínimo 8 caracteres, com ao menos uma letra e um número.';

const senhaForte = (senha) => senha.length >= 8 && /[a-zA-Z]/.test(senha) && /\d/.test(senha);

function ProfilePage() {
  const { user, updateUser } = useAuth();

  // `inicial` é a fotografia do que veio da API: o PATCH envia só o que difere.
  const [form, setForm] = useState(() => buildForm(user));
  const [inicial, setInicial] = useState(() => buildForm(user));
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  const [senhas, setSenhas] = useState({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  const [senhaError, setSenhaError] = useState('');
  const [senhaSaving, setSenhaSaving] = useState(false);

  // Ressincroniza quando o contexto troca de usuário (bootstrap do /me e após
  // salvar). Reposiciona também a fotografia, zerando o diff.
  const resync = useCallback((usuario) => {
    setForm(buildForm(usuario));
    setInicial(buildForm(usuario));
  }, []);

  useEffect(() => {
    if (user) resync(user);
  }, [user, resync]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setHint('');
  };

  const handleChange = (e) => setField(e.target.name, e.target.value);
  const handleMaskedChange = (mask) => (e) => setField(e.target.name, mask(e.target.value));

  const handleCepChange = async (e) => {
    const masked = maskCEP(e.target.value);
    setField('cep', masked);
    const digits = unmask(masked);
    if (digits.length !== 8) return;

    setCepLoading(true);
    const endereco = await buscarEnderecoPorCEP(digits);
    setCepLoading(false);
    if (!endereco) return;

    setForm((prev) => ({
      ...prev,
      logradouro: endereco.logradouro || prev.logradouro,
      bairro: endereco.bairro || prev.bairro,
      cidade: endereco.cidade || prev.cidade,
      estado: endereco.estado || prev.estado,
    }));
  };

  // ── Logo do escritório ───────────────────────────────────────────────────
  // Validação e redimensionamento acontecem AQUI, antes de qualquer PATCH:
  // enviar 8 MB para receber 400 gasta a transferência inteira à toa, e numa
  // conexão ruim isso é o suficiente para a advogada desistir.
  const handleLogoChange = async (e) => {
    const arquivo = e.target.files?.[0];
    // Zera o input para o mesmo arquivo poder ser escolhido de novo depois de
    // um erro — sem isso o onChange não dispara na segunda tentativa.
    e.target.value = '';
    if (!arquivo) return;

    setLogoLoading(true);
    setError('');
    setHint('');

    try {
      const { dataUri, redimensionada, tamanhoOriginal, tamanhoFinal } =
        await prepararLogo(arquivo);

      setField('advLogo', dataUri);

      if (redimensionada) {
        toast.success(
          `Logo redimensionado de ${formatarTamanho(tamanhoOriginal)} para ${formatarTamanho(tamanhoFinal)}.`
        );
      }
      setHint('Logo carregado. Clique em "Salvar alterações" para gravar.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoverLogo = () => {
    setField('advLogo', '');
    setHint('Logo removido. Clique em "Salvar alterações" para gravar.');
  };

  // Campo alterado entra no payload; se ficou vazio vai como null, porque
  // `undefined` some no JSON e o merge parcial do backend não apagaria nada.
  const buildPayload = () => {
    const payload = {};

    const compara = (destino, chave, atual, base) => {
      if (atual === base) return;
      destino[chave] = atual === '' ? null : atual;
    };

    compara(payload, 'nomeCompleto', form.nomeCompleto.trim(), inicial.nomeCompleto.trim());
    compara(payload, 'cpf', unmask(form.cpf), unmask(inicial.cpf));
    compara(payload, 'telefone', unmask(form.telefone), unmask(inicial.telefone));

    const oab = {};
    compara(oab, 'numero', unmask(form.oabNumero), unmask(inicial.oabNumero));
    compara(oab, 'estado', form.oabEstado, inicial.oabEstado);
    if (Object.keys(oab).length > 0) payload.oab = oab;

    const advocacia = {};
    compara(advocacia, 'nome', form.advNome.trim(), inicial.advNome.trim());
    compara(advocacia, 'chavePix', form.advChavePix.trim(), inicial.advChavePix.trim());
    compara(advocacia, 'instagram', form.advInstagram.trim(), inicial.advInstagram.trim());
    compara(advocacia, 'site', form.advSite.trim(), inicial.advSite.trim());
    compara(advocacia, 'logoBase64', form.advLogo, inicial.advLogo);
    if (Object.keys(advocacia).length > 0) payload.advocacia = advocacia;

    const endereco = {};
    compara(endereco, 'cep', unmask(form.cep), unmask(inicial.cep));
    compara(endereco, 'pais', form.pais.trim(), inicial.pais.trim());
    compara(endereco, 'estado', form.estado, inicial.estado);
    compara(endereco, 'cidade', form.cidade.trim(), inicial.cidade.trim());
    compara(endereco, 'bairro', form.bairro.trim(), inicial.bairro.trim());
    compara(endereco, 'logradouro', form.logradouro.trim(), inicial.logradouro.trim());
    compara(endereco, 'numero', form.numero.trim(), inicial.numero.trim());
    compara(endereco, 'complemento', form.complemento.trim(), inicial.complemento.trim());
    if (Object.keys(endereco).length > 0) payload.endereco = endereco;

    return payload;
  };

  const online = useOnlineStatus();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Nenhum formulário aceita envio que vai falhar (F-5a, Parte 4): o botão
    // é anunciado como desabilitado, e a recusa acontece aqui, porque
    // `aria-disabled` só ANUNCIA (DEC-053).
    if (!online) return;
    setError('');
    setHint('');

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setHint('Nenhuma alteração para salvar.');
      return;
    }

    setSaving(true);
    try {
      const res = await authService.updateMe(payload);
      updateUser(res.data.usuario);
      resync(res.data.usuario);
      toast.success('Perfil atualizado com sucesso.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar o perfil. Verifique os dados.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSenhaChange = (e) => {
    const { name, value } = e.target;
    setSenhas((prev) => ({ ...prev, [name]: value }));
    setSenhaError('');
  };

  const handleSenhaSubmit = async (e) => {
    e.preventDefault();
    // Nenhum formulário aceita envio que vai falhar (F-5a, Parte 4): o botão
    // é anunciado como desabilitado, e a recusa acontece aqui, porque
    // `aria-disabled` só ANUNCIA (DEC-053).
    if (!online) return;
    setSenhaError('');

    const { senhaAtual, novaSenha, confirmarNovaSenha } = senhas;
    if (!senhaForte(novaSenha)) return setSenhaError(SENHA_FRACA);
    if (novaSenha !== confirmarNovaSenha) return setSenhaError('A confirmação não corresponde à nova senha.');
    if (novaSenha === senhaAtual) return setSenhaError('A nova senha deve ser diferente da senha atual.');

    setSenhaSaving(true);
    try {
      await authService.changePassword(senhaAtual, novaSenha);
      setSenhas({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
      toast.success('Senha alterada com sucesso.');
    } catch (err) {
      // Fica no bloco, ao lado dos campos — um toast global some do contexto.
      setSenhaError(getApiErrorMessage(err, 'Não foi possível alterar a senha.'));
    } finally {
      setSenhaSaving(false);
    }
  };

  // ── E-mail: a situação e o reenvio (DEC-127) ────────────────────────────
  // O mesmo hook da faixa, do menu e do "Mais" (DEC-088): o mesmo POST e os
  // mesmos textos. O resultado sai num toast só — o reenvio leva
  // `semToastGlobal` (`SO_A_TELA_AVISA`), então o global não repete.
  const { pendente, enviando, reenviar } = useConfirmacaoEmail();
  const situacao = situacaoDoEmail(user);

  const handleReenviar = async () => {
    if (!online) return;
    const resultado = await reenviar();
    if (resultado.tipo === 'ok') toast.success(resultado.texto);
    else if (!resultado.jaAvisado) toast.error(resultado.texto);
  };

  const oab = user?.oab?.numero && user?.oab?.estado ? `OAB ${user.oab.estado} ${user.oab.numero}` : '';

  return (
    <div className="profile-page-container">
      {/* ── O cabeçalho de identidade (DEC-127), no molde do cliente (DEC-123).
          Mostra o que está SALVO: o formulário abaixo é o rascunho. ───────── */}
      <section className="processo-balao processo-cabecalho perfil-cabecalho" aria-labelledby="perfil-titulo">
        <div className="processo-cabecalho__identidade perfil-cabecalho__identidade">
          <Avatar id={user?.id} nome={user?.nomeCompleto} tamanho="grande" cor={1} />
          <div className="processo-cabecalho__textos">
            <h1 id="perfil-titulo" className="processo-cabecalho__titulo">{user?.nomeCompleto || 'Meu perfil'}</h1>
            {oab && <p className="processo-cabecalho__subtitulo">{oab}</p>}
            <p className="processo-cabecalho__subtitulo perfil-cabecalho__email">
              <span>{user?.email}</span>
              {situacao && (
                <span className={`perfil-situacao-email ${pendente ? 'perfil-situacao-email--pendente' : 'perfil-situacao-email--ok'}`}>
                  {situacao}
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineWriteReason />}

        {/* ── 1. Dados da conta ─────────────────────────────────────────── */}
        <div className="form-grid section" role="group" aria-labelledby="perfil-secao-conta">
          <h3 id="perfil-secao-conta">Dados da conta</h3>
          <div className="form-group span-2">
            <label htmlFor="perfil-nomeCompleto">Nome completo*</label>
            <input id="perfil-nomeCompleto" type="text" name="nomeCompleto" value={form.nomeCompleto}
                   onChange={handleChange} aria-describedby="perfil-nomeCompleto-ajuda" required />
            <small id="perfil-nomeCompleto-ajuda" className="perfil-ajuda">Também sai no timbrado e na assinatura do recibo.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-cpf">CPF*</label>
            <input id="perfil-cpf" type="text" name="cpf" value={form.cpf} onChange={handleMaskedChange(maskCPF)}
                   placeholder="000.000.000-00" inputMode="numeric" aria-describedby="perfil-cpf-ajuda" required />
            <small id="perfil-cpf-ajuda" className="perfil-ajuda">Identifica a sua conta.</small>
          </div>
          <div className="form-group span-2">
            <label htmlFor="perfil-email">E-mail</label>
            {/* Só leitura, e não `disabled`: o campo continua focável, o rótulo
                o alcança e o leitor de tela lê a situação junto. */}
            <input id="perfil-email" type="email" value={user?.email || ''} readOnly
                   aria-describedby="perfil-email-situacao perfil-email-ajuda" />
            <div id="perfil-email-situacao" className="perfil-email-situacao">
              {situacao && (
                <span className={pendente ? 'perfil-situacao-email--pendente' : 'perfil-situacao-email--ok'}>{situacao}</span>
              )}
              {pendente && (
                <button type="button" className="btn-secundario perfil-email-reenviar" onClick={handleReenviar}
                        disabled={enviando} aria-disabled={online ? undefined : 'true'}>
                  {enviando ? 'Enviando…' : 'Reenviar confirmação'}
                </button>
              )}
            </div>
            {pendente && !online && <OfflineWriteReason />}
            <small id="perfil-email-ajuda" className="perfil-ajuda">
              Não pode ser alterado por aqui. Também sai no timbrado, ao lado do telefone.
            </small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-oabNumero">Número da OAB*</label>
            <input id="perfil-oabNumero" type="text" name="oabNumero" value={form.oabNumero}
                   onChange={(e) => setField('oabNumero', unmask(e.target.value).slice(0, 6))}
                   inputMode="numeric" aria-describedby="perfil-oab-ajuda" required />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-oabEstado">UF da OAB*</label>
            <select id="perfil-oabEstado" name="oabEstado" value={form.oabEstado} onChange={handleChange}
                    aria-describedby="perfil-oab-ajuda" required>
              <option value="" disabled>Selecione…</option>
              {UFS.map((uf) => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>
          <p id="perfil-oab-ajuda" className="perfil-ajuda span-3">A OAB sai no timbrado, ao lado do seu nome.</p>
        </div>

        {/* ── 2. Dados do escritório ────────────────────────────────────── */}
        <div className="form-grid section" role="group" aria-labelledby="perfil-secao-escritorio">
          <h3 id="perfil-secao-escritorio">Dados do escritório — aparecem nos documentos</h3>
          <div className="form-group span-2">
            <label htmlFor="perfil-advNome">Nome do escritório (no timbrado)*</label>
            <input id="perfil-advNome" type="text" name="advNome" value={form.advNome} onChange={handleChange}
                   maxLength={100} aria-describedby="perfil-advNome-ajuda" required />
            <small id="perfil-advNome-ajuda" className="perfil-ajuda">A primeira linha do timbrado, em destaque, nos documentos e recibos.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-telefone">Telefone</label>
            <input id="perfil-telefone" type="tel" name="telefone" value={form.telefone}
                   onChange={handleMaskedChange(maskPhone)} placeholder="(00) 00000-0000" inputMode="numeric"
                   aria-describedby="perfil-telefone-ajuda" />
            <small id="perfil-telefone-ajuda" className="perfil-ajuda">No timbrado, com o e-mail.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-advChavePix">Chave PIX</label>
            <input id="perfil-advChavePix" type="text" name="advChavePix" value={form.advChavePix}
                   onChange={handleChange} maxLength={120} aria-describedby="perfil-advChavePix-ajuda" />
            <small id="perfil-advChavePix-ajuda" className="perfil-ajuda">Não sai no timbrado: entra no texto dos documentos que usam {'{{chavePix}}'}.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-advInstagram">Instagram</label>
            <input id="perfil-advInstagram" type="text" name="advInstagram" value={form.advInstagram}
                   onChange={handleChange} maxLength={50} aria-describedby="perfil-advInstagram-ajuda" />
            <small id="perfil-advInstagram-ajuda" className="perfil-ajuda">Com ou sem @. Hoje não sai no timbrado nem no recibo.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-advSite">Site</label>
            <input id="perfil-advSite" type="text" name="advSite" value={form.advSite}
                   onChange={handleChange} maxLength={200} aria-describedby="perfil-advSite-ajuda" />
            <small id="perfil-advSite-ajuda" className="perfil-ajuda">Hoje não sai no timbrado nem no recibo.</small>
          </div>

          <div className="form-group span-3" role="group" aria-labelledby="perfil-logo-titulo" aria-describedby="perfil-logo-ajuda">
            <p id="perfil-logo-titulo" className="perfil-campo-titulo">Logo do escritório</p>
            <small id="perfil-logo-ajuda" className="perfil-ajuda perfil-ajuda--antes">
              À esquerda do timbrado, nos documentos (PDF e DOCX) e nos recibos.
              PNG ou JPEG. Imagens grandes são reduzidas automaticamente.
            </small>

            <div className="logo-bloco">
              <div className="logo-preview">
                {form.advLogo ? (
                  <img src={form.advLogo} alt="Logo do escritório" />
                ) : (
                  <span className="logo-vazio">Sem logo</span>
                )}
              </div>

              <div className="logo-acoes">
                <label className="btn-secundario" htmlFor="advLogoInput">
                  {logoLoading ? 'Processando…' : form.advLogo ? 'Trocar logo' : 'Escolher logo'}
                </label>
                <input
                  id="advLogoInput"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoChange}
                  disabled={logoLoading}
                  className="input-arquivo"
                />
                {form.advLogo && (
                  <button type="button" className="btn-remover" onClick={handleRemoverLogo}>
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Endereço do escritório ─────────────────────────────────── */}
        <div className="form-grid section" role="group" aria-labelledby="perfil-secao-endereco" aria-describedby="perfil-endereco-ajuda">
          <h3 id="perfil-secao-endereco">Endereço do escritório</h3>
          <p id="perfil-endereco-ajuda" className="perfil-ajuda perfil-ajuda--secao">
            Sai numa linha do timbrado. A cidade é também a da data e da assinatura dos documentos.
          </p>
          <div className="form-group span-1">
            <label htmlFor="perfil-cep">CEP {cepLoading && <span className="cep-hint">buscando…</span>}</label>
            <input id="perfil-cep" type="text" name="cep" value={form.cep} onChange={handleCepChange}
                   placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="form-group span-2">
            <label htmlFor="perfil-logradouro">Logradouro</label>
            <input id="perfil-logradouro" type="text" name="logradouro" value={form.logradouro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-numero">Número</label>
            <input id="perfil-numero" type="text" name="numero" value={form.numero} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-complemento">Complemento</label>
            <input id="perfil-complemento" type="text" name="complemento" value={form.complemento} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-bairro">Bairro</label>
            <input id="perfil-bairro" type="text" name="bairro" value={form.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-cidade">Cidade</label>
            <input id="perfil-cidade" type="text" name="cidade" value={form.cidade} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-estado">Estado (UF)</label>
            <select id="perfil-estado" name="estado" value={form.estado} onChange={handleChange}>
              <option value="">Selecione…</option>
              {UFS.map((uf) => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-pais">País</label>
            <input id="perfil-pais" type="text" name="pais" value={form.pais} onChange={handleChange} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        {hint && <p className="form-hint">{hint}</p>}

        <div className="form-actions">
          <button type="submit" disabled={saving} aria-disabled={online ? undefined : 'true'} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* ── 4. Segurança: a troca de senha, à parte e como antes ─────────── */}
      <form onSubmit={handleSenhaSubmit} className="data-form">
        {!online && <OfflineWriteReason />}
        <div className="form-grid section" role="group" aria-labelledby="perfil-secao-seguranca">
          <h3 id="perfil-secao-seguranca">Segurança</h3>
          <div className="form-group span-1">
            <label htmlFor="perfil-senhaAtual">Senha atual*</label>
            <input id="perfil-senhaAtual" type="password" name="senhaAtual" value={senhas.senhaAtual}
                   onChange={handleSenhaChange} autoComplete="current-password" required />
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-novaSenha">Nova senha*</label>
            <input id="perfil-novaSenha" type="password" name="novaSenha" value={senhas.novaSenha}
                   onChange={handleSenhaChange} autoComplete="new-password" aria-describedby="perfil-novaSenha-ajuda" required />
            <small id="perfil-novaSenha-ajuda" className="perfil-ajuda">Mínimo de 8 caracteres, com letra e número.</small>
          </div>
          <div className="form-group span-1">
            <label htmlFor="perfil-confirmarNovaSenha">Confirmar nova senha*</label>
            <input id="perfil-confirmarNovaSenha" type="password" name="confirmarNovaSenha" value={senhas.confirmarNovaSenha}
                   onChange={handleSenhaChange} autoComplete="new-password" required />
          </div>

          {senhaError && <p className="error-message span-3">{senhaError}</p>}

          <div className="form-actions span-3">
            <button type="submit" disabled={senhaSaving} aria-disabled={online ? undefined : 'true'} className="btn-primary">
              {senhaSaving ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
