import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import ActionMenu from '../../components/ui/ActionMenu';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import OfflineNotice from '../../components/ui/OfflineNotice';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import ClientTabs from '../../components/clients/ClientTabs';
import ClientProcessesTab from '../../components/clients/ClientProcessesTab';
import ClientPortalTab from '../../components/clients/ClientPortalTab';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useDesativacaoCliente from '../../hooks/useDesativacaoCliente';
import { blockReason } from '../../offline/offlineMessages';
import {
  abaDaUrl,
  documentoDoCabecalho,
  gruposDeDados,
  nomeDoCliente,
  tipoPorExtenso,
} from './detalheCliente.js';
import '../processes/ProcessDetailPage.css';
import './ClientPage.css';
import { usePublicarContexto } from '../../contexts/ContextoContext';

// ═══════════════════════════════════════════════════════════════════════════
// O DETALHE DO CLIENTE — Fase 3.5 (DEC-123), Figura 21
//
// O cabeçalho de identidade em balão (avatar grande, nome, "Pessoa física" ou
// "Pessoa jurídica", o documento com o botão de copiar do número do processo,
// o selo "Desativado" e o ⋮) e as abas em pílulas na URL: Detalhes (os dados
// em balões por grupo, só leitura — editar continua no formulário), Processos
// (apontamento 3 da banca) e Portal (a pendência da 2.5). A aba "Pagamentos"
// da Figura 21 não entra: o financeiro é por processo (decisão 5).
//
// Os balões, o cabeçalho e o botão de copiar são os do detalhe do processo
// (`ProcessDetailPage.css`, DEC-111): o mesmo desenho para o mesmo papel.
// Nenhum `transform` nem `filter` nas folhas: os ⋮ abrem em portal (DEC-046).
// ═══════════════════════════════════════════════════════════════════════════
function ClientDetailPage() {
  const { id } = useParams();
  // Fase 2b (DEC-085): publica para a faixa de contexto o cliente.
  // DEC-109: o aviso de idade é o desta tela, do mesmo cliente.
  usePublicarContexto({ clienteId: id, avisoProprio: true });
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();
  const aba = abaDaUrl(location.search);

  // DEC-058: o detalhe que ela já abriu continua legível sem sinal, com a
  // idade do dado no topo. As abas Processos e Portal não têm espelho (ver os
  // componentes): sem sinal, dizem que não sabem.
  const { data: cliente, loading, error, updatedAt, fromCache } = useCachedResource({
    resource: 'client',
    params: { id },
    fetcher: () => clientService.getClientById(id).then((res) => res.data),
    fallbackError: 'Não foi possível carregar o cliente.'
  });

  // DEC-052/053 (DEC-122): o mesmo hook da lista. Desativado, o cliente não
  // tem detalhe (o back responde 404): a tela vai para a lista.
  const desativacao = useDesativacaoCliente({
    aoConcluir: ({ acao, recusado }) => {
      if (acao === 'desativar' && !recusado) navigate('/dashboard/clientes');
    },
  });

  // Padrão de carregamento do projeto (varredura B.5 da Fase 4.3).
  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!cliente) return <p className="error-message">Não foi possível carregar o cliente.</p>;

  const nome = nomeDoCliente(cliente);
  const documento = documentoDoCabecalho(cliente);
  const desativado = cliente.ativo === false;
  const motivoSemSinal = blockReason(null, { online });

  // A área de transferência pode estar bloqueada; o documento continua na
  // tela, selecionável de uma vez (`user-select: all`), e a mensagem diz isso.
  const copiarDocumento = async () => {
    try {
      await navigator.clipboard.writeText(documento.valor);
      toast.success(`${documento.rotulo} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar. Selecione o ${documento.rotulo} e copie à mão.`);
    }
  };

  return (
    <div className="page-container processo-detalhe">
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {!online && <OfflineWriteReason />}

      {/* ── O cabeçalho de identidade (DEC-123) ─────────────────────────── */}
      <section className="processo-balao processo-cabecalho" aria-labelledby="cliente-titulo">
        <div className="processo-cabecalho__topo">
          <div className="processo-cabecalho__identidade cliente-cabecalho__identidade">
            <Avatar id={cliente._id} nome={nome} tamanho="grande" />
            <div className="processo-cabecalho__textos">
              <h1 id="cliente-titulo" className="processo-cabecalho__titulo">
                {nome}
                {desativado && <span className="tag-desativado processo-cabecalho__selo">Desativado</span>}
              </h1>
              <p className="processo-cabecalho__subtitulo">{tipoPorExtenso(cliente)}</p>
              {documento && (
                <p className="processo-cabecalho__numero">
                  <span className="processo-cabecalho__numero-valor">
                    {documento.rotulo} {documento.valor}
                  </span>
                  <button
                    type="button"
                    className="processo-cabecalho__copiar"
                    aria-label={`Copiar o ${documento.rotulo}`}
                    title={`Copiar o ${documento.rotulo}`}
                    onClick={copiarDocumento}
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                </p>
              )}
            </div>
          </div>

          <ActionMenu
            rotulo={`Ações do cliente ${nome}`}
            itens={
              cliente.ativo === false
                ? [{ rotulo: 'Reativar', motivo: motivoSemSinal, onSelecionar: () => desativacao.abrir(id, 'reativar') }]
                : [
                    { rotulo: 'Editar', to: `/dashboard/clientes/editar/${id}`, motivo: motivoSemSinal },
                    { rotulo: 'Desativar', destrutivo: true, motivo: motivoSemSinal, onSelecionar: () => desativacao.abrir(id, 'desativar') },
                  ]
            }
          />
        </div>

        <ClientTabs aba={aba} />
      </section>

      {aba === 'detalhes' && (
        <div className="cliente-grade">
          {gruposDeDados(cliente).map((grupo) => (
            <section
              key={grupo.id}
              className={`processo-balao${grupo.largo ? ' cliente-grade__largo' : ''}`}
              aria-labelledby={`grupo-${grupo.id}`}
            >
              <h2 id={`grupo-${grupo.id}`} className="processo-balao__titulo">{grupo.titulo}</h2>
              <dl className="processo-dados cliente-dados">
                {grupo.itens.map(([rotulo, valor]) => (
                  <div key={rotulo} className="processo-dados__item">
                    <dt>{rotulo}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {aba === 'processos' && <ClientProcessesTab clienteId={id} online={online} />}

      {aba === 'portal' && <ClientPortalTab clienteId={id} nomeCliente={nome} online={online} />}

      <Modal {...desativacao.propsDoModal} />
    </div>
  );
}

export default ClientDetailPage;
