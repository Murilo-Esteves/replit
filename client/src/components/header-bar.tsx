import React from "react";
import { useApp } from "@/context/app-context";
import { useMobile } from "@/hooks/use-mobile";
import { useTutorial } from "@/components/tutorial-modal";
import { HelpCircle } from "lucide-react";

const HeaderBar: React.FC = () => {
  const isMobile = useMobile();
  const { setShowTutorial } = useTutorial();
  
  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="material-icons text-primary">schedule</span>
          <h1 className="text-xl font-semibold text-primary">Prazo Certo</h1>
        </div>
        <div className="flex space-x-3">
          <button 
            className="text-neutral-500 hover:text-primary p-1 rounded-full transition-colors flex items-center"
            onClick={handleOpenTutorial}
            title="Ver tutorial"
          >
            <HelpCircle size={20} />
          </button>
          <button className="text-neutral-500 hover:text-primary p-1 rounded-full transition-colors">
            <span className="material-icons">{isMobile ? "notifications" : "notifications_none"}</span>
          </button>
          <button className="text-neutral-500 hover:text-primary p-1 rounded-full transition-colors">
            <span className="material-icons">search</span>
          </button>
          <button className="text-neutral-500 hover:text-primary p-1 rounded-full transition-colors">
            <span className="material-icons">more_vert</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
