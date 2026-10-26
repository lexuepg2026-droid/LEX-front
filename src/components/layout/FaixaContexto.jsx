import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAvisoProprioPublicado, useContextoPublicado } from '../../contexts/ContextoContext';
import useContextoResolvido from '../../hooks/useContextoResolvido';
import OfflineNotice from '../ui/OfflineNotice';
import { destinoDoVoltar, faixaMostraAviso, textoDoContexto } from './contexto.js';
import './FaixaContexto.css';

// ═══════════════════════════════════════════════════════════════════════════
// A FAIXA DE CONTEXTO — "← Voltar" e "Cliente: … · Processo: …" (DEC-085)
//
// No lugar da trilha, logo abaixo da barra verde. Aparece só onde há para
// onde voltar (detalhe e formulário, e as listas filtradas por processo); no
// Início e nas listas, nada — lá a trilha só repetia o link ativo do menu.
//
// O "Voltar" é um LINK para um destino determinístico (`destinoDoVoltar`), e
// não `navigate(-1)`: quem abriu a tela por um link do e-mail, por um
// favorito ou numa aba nova não tem "anterior" no histórico, e o -1 a levaria
// para fora do sistema.
// ═══════════════════════════════════════════════════════════════════════════
// A query que cada caminho tinha da última vez que foi visto nesta aba — é o
// que faz o Voltar de uma parcela aberta a partir de `/parcelas?processoId=X`
// voltar à lista filtrada. Só caminho e query, em memória: some ao recarregar,
// e não guarda dado de ninguém (DEC-058 é sobre o que vai para o navegador).
const ultimaQuery = new Map();

function FaixaContexto() {
  const location = useLocation();

  // Gravada DEPOIS do render: no render da tela filha o mapa ainda tem a
  // visita ao pai, e não a própria.
  useEffect(() => {
    ultimaQuery.set(location.pathname, location.search);
  }, [location.pathname, location.search]);

  const ids = useContextoPublicado(location.pathname);
  // DEC-109: um aviso de idade por tela. Quando a tela já mostra o dela, a
  // faixa não repete.
  const avisoProprio = useAvisoProprioPublicado(location.pathname);
  const { contexto, carregando, fromCache, updatedAt } = useContextoResolvido(ids);

  const destino = destinoDoVoltar(location, ultimaQuery);
  if (!destino) return null;

  const texto = textoDoContexto(contexto);
  const temId = Boolean(ids.processoId || ids.clienteId);

  return (
    <>
      <nav className="faixa-contexto" aria-label="Contexto da página">
        <Link to={destino} className="faixa-contexto__voltar">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>

        {contexto && (
          <p className="faixa-contexto__texto" title={texto}>
            {contexto.cliente && (
              <span className="faixa-contexto__parte">
                <span className="faixa-contexto__rotulo">Cliente:</span>{' '}
                <Link to={`/dashboard/clientes/detalhe/${contexto.cliente.id}`} className="faixa-contexto__link">
                  {contexto.cliente.nome}
                </Link>
                {contexto.cliente.outros > 0 && (
                  <span
                    className="faixa-contexto__outros"
                    title={`e mais ${contexto.cliente.outros} ${contexto.cliente.outros === 1 ? 'participante' : 'participantes'}`}
                  >
                    {' '}(+{contexto.cliente.outros})
                  </span>
                )}
              </span>
            )}
            {contexto.cliente && contexto.processo && (
              <span className="faixa-contexto__sep" aria-hidden="true"> · </span>
            )}
            {contexto.processo && (
              <span className="faixa-contexto__parte">
                <span className="faixa-contexto__rotulo">Processo:</span>{' '}
                <Link to={`/dashboard/processos/detalhe/${contexto.processo.id}`} className="faixa-contexto__link">
                  {contexto.processo.rotulo}
                </Link>
              </span>
            )}
          </p>
        )}

        {!contexto && temId && carregando && (
          <p className="faixa-contexto__texto faixa-contexto__texto--carregando">Carregando…</p>
        )}
      </nav>
      {faixaMostraAviso({ fromCache, avisoProprio }) && <OfflineNotice atualizadoEm={updatedAt} />}
    </>
  );
}

export default FaixaContexto;
