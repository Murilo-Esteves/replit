import React, { useState, createContext, useContext } from "react";
import { X, Info, Camera, Bell, BarChart3, ShoppingCart, ChefHat, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

interface TutorialContextType {
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
}

// Criando um contexto para o Tutorial
const TutorialContext = createContext<TutorialContextType>({
  showTutorial: false,
  setShowTutorial: () => {},
});

// Hook para acessar o contexto do tutorial
export const useTutorial = () => useContext(TutorialContext);

export const TutorialModal: React.FC = () => {
  const { showTutorial, setShowTutorial } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: "Bem-vindo ao Prazo Certo!",
      description: "Seu controle inteligente de validade de produtos. Controle facilmente as datas de validade dos seus produtos e reduza o desperdício com algumas funcionalidades incríveis.",
      icon: <Info className="h-12 w-12 text-primary" />
    },
    {
      title: "Adicione produtos facilmente",
      description: "Cadastre produtos manualmente ou escaneie a data de validade diretamente da embalagem usando a câmera do seu celular.",
      icon: <Camera className="h-12 w-12 text-primary" />
    },
    {
      title: "Receba notificações",
      description: "Fique tranquilo! O Prazo Certo vai te avisar quando algum produto estiver perto de vencer, evitando desperdícios.",
      icon: <Bell className="h-12 w-12 text-primary" />
    },
    {
      title: "Controle seu inventário",
      description: "Visualize todos os seus produtos organizados por categorias e filtrados por data de validade.",
      icon: <BarChart3 className="h-12 w-12 text-primary" />
    },
    {
      title: "Lista de compras inteligente",
      description: "Adicione produtos automaticamente à sua lista de compras quando descartá-los. Simples assim!",
      icon: <ShoppingCart className="h-12 w-12 text-primary" />
    },
    {
      title: "Receitas personalizadas",
      description: "Receba sugestões de receitas baseadas nos produtos que estão prestes a vencer. Economize e saboreie!",
      icon: <ChefHat className="h-12 w-12 text-primary" />
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completed
      setShowTutorial(false);
    }
  };

  const handleSkip = () => {
    setShowTutorial(false);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!showTutorial) {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={showTutorial} onOpenChange={(open) => !open && setShowTutorial(false)}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] overflow-hidden p-0">
        <div className="bg-primary/5 p-6 pb-8">
          <DialogHeader className="text-left relative">
            <div className="flex flex-col items-center justify-center mb-4">
              {currentStepData.icon}
              <DialogTitle className="text-xl font-semibold mt-4">
                {currentStepData.title}
              </DialogTitle>
            </div>
            
            <DialogDescription className="text-center mt-2">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>
          
          {currentStepData.image && (
            <div className="mt-4 flex justify-center items-center">
              <div className="bg-white rounded-lg p-4 shadow-sm max-w-[300px]">
                <img 
                  src={currentStepData.image} 
                  alt={currentStepData.title}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 flex justify-between items-center">
          <div className="flex space-x-1">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full w-6 ${idx === currentStep ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                Anterior
              </Button>
            )}
            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? "Próximo" : "Começar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente de provedor do contexto
export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showTutorial, setShowTutorial] = useLocalStorage("tutorial-shown", true);
  
  return (
    <TutorialContext.Provider value={{ showTutorial, setShowTutorial }}>
      {children}
      <TutorialModal />
    </TutorialContext.Provider>
  );
};

export default TutorialModal;