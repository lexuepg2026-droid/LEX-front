import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../../utils/storage';

// Este componente é o "Porteiro"
function ProtectedRoute() {
  // 1. Ele verifica se o "crachá" (token) está guardado
  const token = getToken();

  // 2. Se não houver token, ele expulsa o usuário para a página de login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se houver um token, ele deixa o usuário ver o conteúdo (o Dashboard)
  // <Outlet /> é o "prêmio" (a página que estava sendo protegida)
  return <Outlet />;
}

export default ProtectedRoute;