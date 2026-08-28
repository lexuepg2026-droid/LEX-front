import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import secaoService from '../../api/secaoService';
import VariableSelector from '../../components/secoes/VariableSelector';
import Loading from '../../components/common/Loading';
import { TIPO_SECAO_OPTIONS } from '../../utils/enums';
import { getApiErrorMessage, getApiErrorField } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../clients/ClientPage.css';
import '../../components/ui/Button.css';
import './SecaoPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const EMPTY_FORM = { titulo: '', tipo: '', texto: '' };

function SecaoFormPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [error, setError] = useState('');
  const [campoErro, setCampoErro] = useState('');

  const textoRef = useRef(null);
  // Última posição do cursor dentro do textarea. Guardada porque clicar num
  // botão do seletor tira o foco do textarea, e nesse momento selectionStart
  // já não vale mais.
  const cursorRef = useRef({ inicio: 0, fim: 0 });

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!isEditing) return;
    setCarregando(true);
    secaoService
      .getSecaoById(id)
      .then((res) => {
        const s = res.data;
        setForm({ titulo: s.titulo ?? '', tipo: s.tipo ?? '', texto: s.texto ?? '' });
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Não foi possível carregar a seção.')))
      .finally(() => setCarregando(false));
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    if (campoErro === name) setCampoErro('');
  };

  // Registra a posição do cursor a cada interação com o textarea.
  const guardarCursor = (e) => {
    cursorRef.current = {
      inicio: e.target.selectionStart,
      fim: e.target.selectionEnd,
    };
  };

  // Insere {{chave}} EXATAMENTE onde o cursor está, substituindo a seleção se
  // houver. Concatenar no fim do texto obrigaria a advogada a recortar e colar
  // a variável até o lugar certo — que é o oposto do que o seletor promete.
  const inserirVariavel = (chave) => {
    const textarea = textoRef.current;
    const marcador = `{{${chave}}}`;

    // Prefere a posição viva do textarea; cai para a última guardada quando o
    // foco já saiu (que é o caso ao clicar no botão do seletor).
    const inicio = textarea?.selectionStart ?? cursorRef.current.inicio;
    const fim = textarea?.selectionEnd ?? cursorRef.current.fim;

    const textoAtual = form.texto;
    const novoTexto = textoAtual.slice(0, inicio) + marcador + textoAtual.slice(fim);
    setForm((atual) => ({ ...atual, texto: novoTexto }));

    // Devolve o foco com o cursor logo DEPOIS do marcador inserido, para a
    // digitação continuar de onde parou. O setTimeout espera o React aplicar o
    // novo value — sem ele, o cursor é reposicionado antes e o navegador o
    // joga para o fim.
    const posicaoFinal = inicio + marcador.length;
    setTimeout(() => {
      const el = textoRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(posicaoFinal, posicaoFinal);
      cursorRef.current = { inicio: posicaoFinal, fim: posicaoFinal };
    }, 0);
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
    setCampoErro('');

    if (!form.titulo.trim() || !form.tipo || !form.texto.trim()) {
      setError('Preencha o título, o tipo e o texto da seção.');
      return;
    }

    setLoading(true);
    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      texto: form.texto,
    };

    try {
      if (isEditing) {
        await secaoService.updateSecao(id, payload);
        toast.success('Seção atualizada com sucesso.');
      } else {
        await secaoService.createSecao(payload);
        toast.success('Seção criada com sucesso.');
      }
      navigate('/dashboard/secoes');
    } catch (err) {
      // O backend recusa variável desconhecida no cadastro e devolve 400 com a
      // mensagem certa. O frontend não repete essa validação — só mostra.
      setError(getApiErrorMessage(err, 'Erro ao salvar a seção. Verifique os dados.'));
      const campo = getApiErrorField(err);
      if (campo) setCampoErro(campo);
    } finally {
      setLoading(false);
    }
  };

  if (carregando) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Seção' : 'Nova Seção'}</h1>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineWriteReason />}
        <div className="secao-editor">
          <div className="secao-editor__campos">
            <div className="form-group">
              <label htmlFor="titulo">Título</label>
              <input
                id="titulo"
                name="titulo"
                type="text"
                value={form.titulo}
                onChange={handleChange}
                maxLength={120}
                className={campoErro === 'titulo' ? 'campo-erro' : undefined}
                placeholder="Ex.: Qualificação do outorgante — pessoa física"
              />
              <p className="form-note">
                É por ele que você vai encontrar a seção na biblioteca. Dois
                títulos iguais não são aceitos.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <select
                id="tipo"
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                className={campoErro === 'tipo' ? 'campo-erro' : undefined}
              >
                <option value="">Selecione o tipo...</option>
                {TIPO_SECAO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="texto">Texto</label>
              <textarea
                id="texto"
                name="texto"
                ref={textoRef}
                value={form.texto}
                onChange={(e) => {
                  handleChange(e);
                  guardarCursor(e);
                }}
                onClick={guardarCursor}
                onKeyUp={guardarCursor}
                onSelect={guardarCursor}
                onBlur={guardarCursor}
                rows={16}
                className={`secao-textarea ${campoErro === 'texto' ? 'campo-erro' : ''}`}
                placeholder="Escreva o texto da seção. Use o painel ao lado para inserir variáveis onde o dado do cliente, do processo ou do honorário deve entrar."
              />
              <p className="form-note">
                As variáveis ficam entre chaves duplas, como{' '}
                <code>{'{{nomeCliente}}'}</code>, e são preenchidas na hora de
                gerar o documento.
              </p>
            </div>
          </div>

          <div className="secao-editor__painel">
            <VariableSelector onInserir={inserirVariavel} disabled={loading} />
          </div>
        </div>

        <div className="secao-form-actions">
          <Link to="/dashboard/secoes" className="ui-btn ui-btn--secondary ui-btn--md">
            Cancelar
          </Link>
          <button
            type="submit"
            aria-disabled={online ? undefined : 'true'}
            className="ui-btn ui-btn--primary ui-btn--md"
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar seção'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SecaoFormPage;
