import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/common/Loading';
import LayoutAutenticacao from '../../components/layout/LayoutAutenticacao.jsx';
import './InicioPublico.css';

// ═══════════════════════════════════════════════════════════════════════════
// A PÁGINA INICIAL PÚBLICA, em `/` (Fase 2a, DEC-082 — Figura 14)
//
// Até aqui `/` renderizava o login. Agora é a porta de entrada das três
// pessoas que chegam ao LEX: a advogada que tem conta, a que vai criar uma, e
// o CLIENTE dela, que acompanha o processo pelo portal. O login mora em
// `/login`, e todo lugar que mandava alguém entrar já apontava para lá.
//
// Com sessão da advogada, `/` vai direto ao Início — a mesma pergunta do
// `ProtectedRoute` (`isLoading`/`isAuthenticated` do `AuthContext`), sem
// chamada nova à API. O portal é outro contexto e não decide nada aqui.
//
// O link do portal é só um link: o bundle do portal continua em `lazy()` e só
// é baixado quando alguém entra em `/portal`.
// ═══════════════════════════════════════════════════════════════════════════
function InicioPublico() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <LayoutAutenticacao>
      <nav className="inicio-publico" aria-label="Entrar no LEX">
        <h1 className="sr-only">LEX — gestão para advocacia</h1>
        <Link to="/login" className="btn-primary">Fazer login</Link>
        <Link to="/registrar" className="btn-primary">Criar nova conta</Link>
        <Link to="/portal" className="btn-primary">Acompanhe seu processo</Link>
      </nav>
    </LayoutAutenticacao>
  );
}

export default InicioPublico;
