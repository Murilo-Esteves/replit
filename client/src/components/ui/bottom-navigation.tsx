import React from "react";
import { Link, useLocation } from "wouter";

const BottomNavigation: React.FC = () => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    // Tratar "/" e "/home" como o mesmo para destacar o botão "Início" em ambos os casos
    if (path === "/" && location === "/home") return true;
    return location === path;
  };

  return (
    <nav className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pt-2 pb-safe fixed bottom-0 left-0 right-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between">
          <NavItem 
            icon="home" 
            label="Início" 
            path="/home" 
            isActive={isActive("/") || isActive("/home")} 
          />
          <NavItem 
            icon="inventory_2" 
            label="Produtos" 
            path="/inventory" 
            isActive={isActive("/inventory")} 
          />
          <div className="invisible w-16">{/* Spacer for center FAB */}</div>
          <NavItem 
            icon="shopping_cart" 
            label="Lista" 
            path="/shopping-list" 
            isActive={isActive("/shopping-list")} 
          />
          <NavItem 
            icon="person" 
            label="Perfil" 
            path="/profile" 
            isActive={isActive("/profile")} 
          />
        </div>
      </div>
    </nav>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  path: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, path, isActive }) => {
  return (
    <Link href={path} className={`flex flex-col items-center px-4 py-2 ${isActive ? 'text-primary' : 'text-neutral-400'}`}>
      <span className="material-icons text-base">{icon}</span>
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};

export default BottomNavigation;
