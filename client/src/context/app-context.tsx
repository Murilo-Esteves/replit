import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Category, Product, ShoppingItem } from "@shared/schema";

interface User {
  id: number;
  username: string;
  settings?: {
    notificationDays: number[];
    defaultCategory?: number;
  };
}

type AppContextType = {
  user: User | null;
  isFirstVisit: boolean;
  isLoading: boolean;
  setIsFirstVisit: (value: boolean) => void;
  showAddProductModal: boolean;
  setShowAddProductModal: (value: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  showRecipeSuggestionsModal: boolean;
  setShowRecipeSuggestionsModal: (value: boolean) => void;
  selectedExpiringProducts: Product[];
  setSelectedExpiringProducts: (products: Product[]) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRecipeSuggestionsModal, setShowRecipeSuggestionsModal] = useState<boolean>(false);
  const [selectedExpiringProducts, setSelectedExpiringProducts] = useState<Product[]>([]);
  const [isCreatingDemoUser, setIsCreatingDemoUser] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Criar usuário demo automaticamente
  const createDemoUser = async () => {
    try {
      setIsCreatingDemoUser(true);
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const demoUserData = await response.json();
        console.log("Usuário demo criado com sucesso:", demoUserData);
        setUser({
          id: demoUserData.id,
          username: demoUserData.username,
          settings: demoUserData.settings || {
            notificationDays: [1, 3, 7]
          }
        });
        
        // Invalidar o cache para recarregar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        
        // Check if it's the first visit
        const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
        if (!hasVisitedBefore) {
          setIsFirstVisit(true);
          localStorage.setItem('hasVisitedBefore', 'true');
        }
      } else {
        console.error("Falha ao criar usuário demo");
      }
    } catch (error) {
      console.error("Erro ao criar usuário demo:", error);
    } finally {
      setIsCreatingDemoUser(false);
    }
  };

  // Em vez de buscar o usuário, criar demo automaticamente
  useEffect(() => {
    // Criar usuário demo automaticamente ao iniciar
    createDemoUser();
  }, []);
  
  // Definir isLoading considerando a criação do usuário demo
  const isLoading = isCreatingDemoUser;

  const value = {
    user,
    isFirstVisit,
    isLoading,
    setIsFirstVisit,
    showAddProductModal,
    setShowAddProductModal,
    selectedProduct,
    setSelectedProduct,
    showRecipeSuggestionsModal,
    setShowRecipeSuggestionsModal,
    selectedExpiringProducts,
    setSelectedExpiringProducts
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook para usar o contexto
function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export { useApp };
