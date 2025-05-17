import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Inventory from "@/pages/inventory";
import AddProduct from "@/pages/add-product";
import ShoppingList from "@/pages/shopping-list";
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import { AppProvider } from "@/context/app-context";
import MainLayout from "@/components/layouts/main-layout";
import { TutorialProvider } from "@/components/tutorial-modal";
import { useEffect } from "react";
import { ProtectedRoute, AuthRoute } from "@/lib/protected-route";
import { useApp } from "@/context/app-context";

function Router() {
  const [, setLocation] = useLocation();
  
  // Sem verificação de autenticação
  return (
    <Switch>
      {/* Redirecionar diretamente para home */}
      <Route path="/">
        {() => {
          setTimeout(() => setLocation('/home'), 0);
          return (
            <div className="h-screen w-screen flex flex-col items-center justify-center">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p>Carregando aplicativo...</p>
            </div>
          );
        }}
      </Route>
      
      {/* Rotas principais sem proteção de autenticação */}
      <Route path="/home">
        <MainLayout>
          <Home />
        </MainLayout>
      </Route>
      
      <Route path="/inventory">
        <MainLayout>
          <Inventory />
        </MainLayout>
      </Route>
      
      <Route path="/add-product">
        <MainLayout>
          <AddProduct />
        </MainLayout>
      </Route>
      
      <Route path="/shopping-list">
        <MainLayout>
          <ShoppingList />
        </MainLayout>
      </Route>
      
      <Route path="/profile">
        <MainLayout>
          <Profile />
        </MainLayout>
      </Route>
      
      {/* Redirecionar para home se tentar acessar uma rota inexistente */}
      <Route>
        {() => {
          setLocation('/home');
          return (
            <div className="h-screen w-screen flex items-center justify-center">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  // Set document title
  useEffect(() => {
    document.title = "Prazo Certo - Seu controle inteligente de validade";
    
    // Add Poppins font
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    
    // Add Material icons
    const iconLink = document.createElement("link");
    iconLink.rel = "stylesheet";
    iconLink.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    document.head.appendChild(iconLink);
    
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(iconLink);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TutorialProvider>
          <Router />
          <Toaster />
        </TutorialProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
