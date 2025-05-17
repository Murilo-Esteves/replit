import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ProductItem from "@/components/product-item";
import CategoryItem from "@/components/category-item";
import RecipeSuggestionsModal from "@/components/recipe-suggestions-modal";
import { useApp } from "@/context/app-context";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

const Home: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  
  // Fetch summary data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/summary'],
  });
  
  // Fetch expiring products
  const { data: expiringProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products/expiring'],
  });
  
  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Handle recipe suggestions
  const handleOpenRecipes = () => {
    if (expiringProducts && expiringProducts.length > 0) {
      setShowRecipeModal(true);
    }
  };

  // Notificação quando tentar adicionar um novo produto
  const handleAddProductAction = () => {
    toast({
      title: "Funcionalidade indisponível",
      description: "O cadastro de produtos está temporariamente desativado.",
      variant: "destructive"
    });
  };

  return (
    <div id="tab-home" className="container mx-auto px-4 py-6">
      {/* Dashboard Summary */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Visão Geral</h2>
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-3 rounded-lg border border-neutral-100">
              <span className="text-destructive font-bold text-2xl">
                {summaryLoading ? "-" : summary?.expiringToday || 0}
              </span>
              <span className="text-sm text-neutral-500">Vencendo Hoje</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg border border-neutral-100">
              <span className="text-[#FBBC05] font-bold text-2xl">
                {summaryLoading ? "-" : summary?.expiringInThreeDays || 0}
              </span>
              <span className="text-sm text-neutral-500">Vence em 3 dias</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg border border-neutral-100">
              <span className="text-secondary font-bold text-2xl">
                {summaryLoading ? "-" : summary?.nonExpiring || 0}
              </span>
              <span className="text-sm text-neutral-500">Produtos OK</span>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex space-x-3 overflow-x-auto pb-2 smooth-scroll">
          <div className="flex-shrink-0">
            <Link 
              href="/add-product"
              className="bg-primary text-white rounded-full py-2 px-4 flex items-center shadow-sm hover:bg-primary/90 transition-colors"
            >
              <span className="material-icons mr-1 text-sm">add_photo_alternate</span>
              <span>{isMobile ? "Novo" : "Novo Item"}</span>
            </Link>
          </div>
          <div className="flex-shrink-0">
            <Link href="/shopping-list" className="bg-white text-primary border border-primary rounded-full py-2 px-4 flex items-center hover:bg-primary/5 transition-colors">
              <span className="material-icons mr-1 text-sm">shopping_cart</span>
              <span>{isMobile ? "Lista" : "Lista de Compras"}</span>
            </Link>
          </div>
          <div className="flex-shrink-0">
            <Link href="/inventory" className="bg-white text-neutral-700 border border-neutral-200 rounded-full py-2 px-4 flex items-center hover:bg-neutral-50 transition-colors">
              <span className="material-icons mr-1 text-sm">category</span>
              <span>{isMobile ? "Categorias" : "Categorias"}</span>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Expiration Alerts */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Alertas de Vencimento</h2>
          <Link href="/inventory" className="text-primary text-sm">Ver todos</Link>
        </div>
        
        {productsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : expiringProducts && expiringProducts.length > 0 ? (
          <>
            <div className="mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 border-dashed"
                onClick={handleOpenRecipes}
              >
                <ChefHat size={14} />
                <span>Sugerir receitas com produtos quase vencendo</span>
              </Button>
            </div>
            {expiringProducts.slice(0, 3).map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
            {showRecipeModal && (
              <RecipeSuggestionsModal 
                products={expiringProducts} 
                onClose={() => setShowRecipeModal(false)} 
              />
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <span className="material-icons text-4xl text-neutral-300 mb-2">check_circle</span>
            <p className="text-neutral-500">Nenhum produto próximo do vencimento! 🎉</p>
          </div>
        )}
      </section>
      
      {/* Product Categories */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Categorias</h2>
          <Link href="/inventory" className="text-primary text-sm">Ver todas</Link>
        </div>
        
        {categoriesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : categories && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.slice(0, 4).map((category: any) => (
              <CategoryItem key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;