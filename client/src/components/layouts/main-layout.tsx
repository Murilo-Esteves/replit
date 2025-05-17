import React, { ReactNode, useEffect } from "react";
import HeaderBar from "@/components/header-bar";
import BottomNavigation from "@/components/ui/bottom-navigation";
import { useApp } from "@/context/app-context";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { useExpirationNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useApp();
  const isMobile = useMobile();
  
  // Fetch products that are expiring soon
  const { data: expiringProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products/expiring'],
  });
  
  // Set up notifications for expiring products
  const { checkExpirations } = useExpirationNotifications(
    expiringProducts,
    user?.settings?.notificationDays || [1, 3, 7]
  );
  
  // Check for expiring products and send notifications
  useEffect(() => {
    if (expiringProducts.length > 0) {
      const interval = setInterval(() => {
        checkExpirations();
      }, 1000 * 60 * 60); // Check every hour
      
      // Initial check
      checkExpirations();
      
      return () => clearInterval(interval);
    }
  }, [expiringProducts, checkExpirations]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderBar />
      
      <main className="flex-1 pb-20">
        <div className={`container mx-auto px-4 ${isMobile ? 'max-w-md' : 'max-w-4xl'}`}>
          {children}
        </div>
      </main>
      
      {/* Floating Action Button */}
      <div className="fixed right-6 bottom-20 z-10">
        <FloatingActionButton />
      </div>
      
      <BottomNavigation />
      
      {/* Modals and Overlays */}
      {/* Removemos o modal daqui para evitar que apareça repetidamente */}
    </div>
  );
};

const FloatingActionButton: React.FC = () => {
  const [, setLocation] = useLocation();
  
  const handleAddProduct = () => {
    // Redirecionar para a página de adicionar produto
    setLocation("/add-product");
  };
  
  return (
    <button 
      className="bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary/90"
      onClick={handleAddProduct}
    >
      <span className="material-icons">add_a_photo</span>
    </button>
  );
};

export default MainLayout;
