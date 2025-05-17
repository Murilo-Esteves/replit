import React from "react";
import { useApp } from "@/context/app-context";

const OnboardingOverlay: React.FC = () => {
  const { setIsFirstVisit } = useApp();
  
  const handleStartUsing = () => {
    setIsFirstVisit(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-bold mb-8">Bem-vindo ao Prazo Certo!</h2>
        
        <div className="max-w-md">
          <div className="flex items-start mb-6">
            <div className="bg-primary/20 rounded-full p-2 mr-4">
              <span className="material-icons text-primary text-3xl">photo_camera</span>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">Fotografe seus produtos</h3>
              <p className="text-neutral-300">Tire uma foto do produto e da data de validade para cadastro rápido.</p>
            </div>
          </div>
          
          <div className="flex items-start mb-6">
            <div className="bg-[#FBBC05]/20 rounded-full p-2 mr-4">
              <span className="material-icons text-[#FBBC05] text-3xl">notifications</span>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">Receba notificações</h3>
              <p className="text-neutral-300">Seja alertado antes que seus produtos vençam e evite desperdícios.</p>
            </div>
          </div>
          
          <div className="flex items-start mb-10">
            <div className="bg-secondary/20 rounded-full p-2 mr-4">
              <span className="material-icons text-secondary text-3xl">shopping_cart</span>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">Lista de compras inteligente</h3>
              <p className="text-neutral-300">Itens vencidos ou consumidos vão automaticamente para sua lista de compras.</p>
            </div>
          </div>
        </div>
        
        <button 
          className="bg-primary text-white rounded-full py-3 px-8 font-medium shadow-lg"
          onClick={handleStartUsing}
        >
          Começar a Usar
        </button>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
