import { useCallback, useEffect, useRef, useState } from 'react';
import CampoComSugestoes from './CampoComSugestoes';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import {
  ESPERA_DA_BUSCA_MS,
  LIMITE_DO_SELETOR_COM_BUSCA,
  MENSAGENS_DO_SELETOR,
  acaoDaBusca,
  sugestoesDaResposta,
  textoDoEscolhido,
  escolhaContinuaValendo,
  precisaBuscarPorId,
} from '../../utils/seletorComBusca.js';

// ═══════════════════════════════════════════════════════════════════════════
// O SELETOR DE REGISTRO COM BUSCA NO SERVIDOR (Fase 3.2, DEC-101)
//
// O combobox é o `CampoComSugestoes` (ARIA, setas, Enter, Esc — DEC-046/047),
// no modo de busca no servidor. Este componente acrescenta o que um seletor de
// REGISTRO precisa e o campo de texto livre da F-4 não tem:
//
//   - guarda o ID (`valor`), e o texto do campo é só o rótulo dele;
//   - pergunta ao servidor a cada pausa de 300 ms, com no máximo 20 sugestões;
//   - sem sinal, não pergunta: diz que a busca precisa de conexão;
//   - falha de busca aparece EM LINHA, no próprio campo — a chamada vai com
//     `semToastGlobal` (DEC-084), porque dispara pela digitação;
//   - DEC-086: o id que chega pronto (da URL ou do registro em edição) aparece
//     ESCOLHIDO, com o rótulo completo, buscado pelo id quando preciso.
//
// Digitar por cima de uma escolha a desfaz (`onMudar('', null)`): um id antigo
// atrás de um texto novo mandaria ao servidor o registro que a advogada não
// está vendo. Quem confere que há escolha antes de salvar é a tela.
// ═══════════════════════════════════════════════════════════════════════════

function SeletorComBusca({
  id,
  name,
  valor,                  // o id escolhido, ou ''
  onMudar,                // (id, item) — id '' quando a escolha se desfaz
  onEscolhido = null,     // (item) — também quando o item vem pelo id (DEC-085)
  buscar,                 // (termo) → Promise<envelope de listagem>
  buscarPorId,            // (id) → Promise<item>
  rotulo,                 // (item) → texto
  itemInicial = null,     // item já conhecido (o registro em edição traz populado)
  filtrar = null,         // (item) → boolean, a regra própria da tela
  placeholder,
  className,
  // Fase 3.8 (DEC-137): o processo do compromisso é OPCIONAL. Os seletores
  // dos formulários financeiros continuam obrigatórios (o padrão).
  obrigatorio = true,
  ...resto
}) {
  const online = useOnlineStatus();
  const [escolhido, setEscolhido] = useState(itemInicial);
  const [texto, setTexto] = useState(() => textoDoEscolhido(itemInicial, rotulo));
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState(null); // 'semConexao' | 'erro' | null
  const [estadoDoId, setEstadoDoId] = useState(null); // 'carregando' | 'indisponivel' | null
  // O termo que o usuário DIGITOU. Escrever o rótulo da escolha não dispara
  // busca — só a digitação dispara.
  const [termo, setTermo] = useState(null);
  const seq = useRef(0);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;
  const buscarPorIdRef = useRef(buscarPorId);
  buscarPorIdRef.current = buscarPorId;
  const filtrarRef = useRef(filtrar);
  filtrarRef.current = filtrar;
  const onEscolhidoRef = useRef(onEscolhido);
  onEscolhidoRef.current = onEscolhido;

  // ── DEC-086: o id que chega pronto aparece escolhido ────────────────────
  useEffect(() => {
    if (!valor) {
      // Fase 3.10 (DEC-151): o valor ESVAZIADO de fora — o "voltar" do
      // navegador ou o "Limpar filtros" de uma lista — desfaz a escolha, e o
      // campo não fica dizendo um honorário que já não filtra nada. A
      // digitação não passa por aqui com escolha de pé: `aoDigitar` desfaz a
      // escolha ANTES de avisar o pai.
      if (escolhido) {
        setEscolhido(null);
        setTexto('');
        setEstadoDoId(null);
      }
      return undefined;
    }
    if (itemInicial && String(itemInicial._id) === String(valor)) {
      setEscolhido(itemInicial);
      setTexto(rotulo(itemInicial));
      setEstadoDoId(null);
      onEscolhidoRef.current?.(itemInicial);
      return undefined;
    }
    if (!precisaBuscarPorId(valor, escolhido)) return undefined;
    let ativo = true;
    setEstadoDoId('carregando');
    buscarPorIdRef.current(valor)
      .then((item) => {
        if (!ativo || !item) return;
        setEscolhido(item);
        setTexto(rotulo(item));
        setEstadoDoId(null);
        // A faixa de contexto (DEC-085) precisa do processo do item que
        // chegou pelo id, e não só do que foi clicado.
        onEscolhidoRef.current?.(item);
      })
      .catch(() => { if (ativo) setEstadoDoId('indisponivel'); });
    return () => { ativo = false; };
    // `escolhido` fora de propósito: a busca é pelo VALOR que chegou, e
    // reexecutar quando a escolha muda por clique buscaria o que já se tem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, itemInicial]);

  // ── A busca pela digitação, com espera de 300 ms ────────────────────────
  useEffect(() => {
    if (termo === null) return undefined;
    const { acao, termo: limpo } = acaoDaBusca(termo, online);
    const meu = ++seq.current;
    if (acao === 'nada') {
      setSugestoes([]); setBuscando(false); setAviso(null);
      return undefined;
    }
    if (acao === 'semConexao') {
      setSugestoes([]); setBuscando(false); setAviso('semConexao');
      return undefined;
    }
    setBuscando(true);
    setAviso(null);
    const timer = setTimeout(() => {
      buscarRef.current(limpo)
        .then((res) => {
          if (meu !== seq.current) return;
          setSugestoes(sugestoesDaResposta(res?.data ?? res, {
            filtrar: filtrarRef.current,
            limite: LIMITE_DO_SELETOR_COM_BUSCA,
          }));
        })
        .catch(() => {
          if (meu !== seq.current) return;
          setSugestoes([]);
          setAviso('erro');
        })
        .finally(() => { if (meu === seq.current) setBuscando(false); });
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(timer);
  }, [termo, online]);

  const aoDigitar = useCallback((novo) => {
    setTexto(novo);
    setTermo(novo);
    setEstadoDoId(null);
    if (escolhido && !escolhaContinuaValendo(novo, escolhido, rotulo)) {
      setEscolhido(null);
      onMudar('', null);
    }
  }, [escolhido, rotulo, onMudar]);

  const aoEscolher = useCallback((item) => {
    setEscolhido(item);
    setTexto(rotulo(item));
    setTermo(null);
    setSugestoes([]);
    setAviso(null);
    onMudar(String(item._id), item);
    onEscolhidoRef.current?.(item);
  }, [rotulo, onMudar]);

  const mensagemErro = aviso === 'semConexao' ? MENSAGENS_DO_SELETOR.semConexao : MENSAGENS_DO_SELETOR.erro;
  const descricao = estadoDoId === 'carregando'
    ? MENSAGENS_DO_SELETOR.carregandoEscolhido
    : estadoDoId === 'indisponivel'
      ? MENSAGENS_DO_SELETOR.indisponivel
      : null;

  return (
    <CampoComSugestoes
      {...resto}
      id={id}
      name={name}
      value={texto}
      onChange={aoDigitar}
      onEscolher={aoEscolher}
      itens={sugestoes}
      rotulo={rotulo}
      chaveDoItem={(item) => String(item._id)}
      filtrarLocalmente={false}
      limite={LIMITE_DO_SELETOR_COM_BUSCA}
      carregando={buscando}
      mensagemCarregando={MENSAGENS_DO_SELETOR.buscando}
      erro={aviso}
      mensagemErro={mensagemErro}
      mensagemSemResultado={MENSAGENS_DO_SELETOR.semResultado}
      descricao={descricao}
      placeholder={placeholder}
      className={className}
      aria-required={obrigatorio ? 'true' : undefined}
    />
  );
}

export default SeletorComBusca;
