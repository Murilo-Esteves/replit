import { useApp } from "@/context/app-context";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Componente para rotas que exigem autenticação
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Se o usuário não estiver autenticado, redireciona para a página de login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // Se o usuário estiver autenticado, renderiza o componente normalmente
  return <Route path={path} component={Component} />;
}

// Componente para a rota de autenticação (redireciona se já estiver logado)
export function AuthRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Se o usuário já estiver autenticado, redireciona para a home
  if (user) {
    return (
      <Route path={path}>
        <Redirect to="/home" />
      </Route>
    );
  }

  // Se o usuário não estiver autenticado, renderiza a página de login
  return <Route path={path} component={Component} />;
}