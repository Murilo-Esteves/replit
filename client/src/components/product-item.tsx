import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Product, Category } from "@shared/schema";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMobile } from "@/hooks/use-mobile";

// Interface estendendo o tipo Product para incluir a propriedade category conforme relação definida
interface ProductWithCategory extends Product {
  category?: Category;
}
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProductItemProps {
  product: ProductWithCategory;
}

const ProductItem: React.FC<ProductItemProps> = ({ product }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  const [showClearAllAlert, setShowClearAllAlert] = useState(false);

  // Calculate days until expiration
  const daysUntilExpiration = () => {
    const today = new Date();
    const expirationDate = new Date(product.expirationDate);
    return differenceInDays(expirationDate, today);
  };

  // Format expiration date for display
  const formatExpirationDate = () => {
    const expirationDate = new Date(product.expirationDate);
    
    if (isToday(expirationDate)) {
      return "Vence hoje";
    } else if (isTomorrow(expirationDate)) {
      return "Vence amanhã";
    } else if (daysUntilExpiration() > 0) {
      return `Vence em ${daysUntilExpiration()} dias`;
    } else {
      return `Venceu há ${Math.abs(daysUntilExpiration())} dias`;
    }
  };

  // Get status color
  const getStatusColor = () => {
    const days = daysUntilExpiration();
    
    if (days < 0) {
      return "bg-destructive"; // Red - Vencido
    } else if (days === 0) {
      return "bg-[#FF6D00]"; // Laranja - Vence hoje
    } else if (days <= 3) {
      return "bg-[#FBBC05]"; // Yellow/warning - Vence em breve
    } else {
      return "bg-secondary"; // Green - Dentro da validade
    }
  };

  // Get badge text
  const getBadgeText = () => {
    const days = daysUntilExpiration();
    
    if (days < 0) {
      return "VENCIDO";
    } else if (days === 0) {
      return "HOJE";
    } else if (days === 1) {
      return "AMANHÃ";
    } else {
      return `${days} DIAS`;
    }
  };

  // Handle marking as consumed
  const handleMarkConsumed = async () => {
    try {
      await apiRequest("PUT", `/api/products/${product.id}/consume`, {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      
      toast({
        title: "Produto consumido",
        description: "Produto marcado como consumido com sucesso!",
      });
    } catch (error) {
      console.error("Error marking product as consumed:", error);
      toast({
        title: "Erro",
        description: "Erro ao marcar produto como consumido.",
        variant: "destructive"
      });
    }
  };

  // Handle adding to shopping list
  const handleAddToShoppingList = async () => {
    try {
      await apiRequest("POST", `/api/products/${product.id}/shopping-list`, {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
      
      toast({
        title: "Produto adicionado",
        description: "Produto adicionado à lista de compras!",
      });
    } catch (error) {
      console.error("Error adding product to shopping list:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto à lista de compras.",
        variant: "destructive"
      });
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    try {
      await apiRequest("DELETE", `/api/products/${product.id}`, {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      
      toast({
        title: "Produto excluído",
        description: "Produto excluído com sucesso!",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto.",
        variant: "destructive"
      });
    }
  };

  // Handle expired products deletion
  const handleDeleteExpiredProducts = async () => {
    try {
      const response = await apiRequest("DELETE", "/api/products/expired/all", {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      
      const count = response && typeof response === 'object' && 'count' in response ? response.count : 0;
      
      toast({
        title: "Produtos vencidos excluídos",
        description: `${count} produtos vencidos foram excluídos com sucesso!`,
      });
    } catch (error) {
      console.error("Error deleting expired products:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produtos vencidos.",
        variant: "destructive"
      });
    }
  };

  // Handle all products deletion
  const handleClearAllProducts = async () => {
    try {
      const response = await apiRequest("DELETE", "/api/products/all/clear", {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      
      const count = response && typeof response === 'object' && 'count' in response ? response.count : 0;
      
      toast({
        title: "Todos os produtos excluídos",
        description: `${count} produtos foram excluídos com sucesso!`,
      });
    } catch (error) {
      console.error("Error clearing all products:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir todos os produtos.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Delete Product Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{product.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProduct}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Expired Products Alert */}
      <AlertDialog open={showExpiredAlert} onOpenChange={setShowExpiredAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produtos vencidos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir todos os produtos vencidos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteExpiredProducts}
            >
              Excluir vencidos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Clear All Products Alert */}
      <AlertDialog open={showClearAllAlert} onOpenChange={setShowClearAllAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os produtos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir TODOS os produtos do seu inventário?
              Esta ação não pode ser desfeita e excluirá todos os seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearAllProducts}
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center">
          <div className={`relative ${isMobile ? 'w-14 h-14' : 'w-16 h-16'} bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 mr-3`}>
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="object-contain w-full h-full max-w-full" 
                style={{maxHeight: '100%', maxWidth: '100%'}}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                <span className="material-icons text-neutral-400">image</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 right-0 ${getStatusColor()} text-white text-[10px] text-center font-medium`}>
              {getBadgeText()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="truncate pr-2">
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-neutral-500 truncate">{product.category?.name || ''}</p>
              </div>
              <span className={`status-indicator ${getStatusColor()} flex-shrink-0`}></span>
            </div>
            <div className="mt-1 flex justify-between items-center">
              <div className={`text-sm font-medium ${
                daysUntilExpiration() < 0 ? "text-destructive" : 
                daysUntilExpiration() === 0 ? "text-[#FF6D00]" :
                daysUntilExpiration() <= 3 ? "text-[#FBBC05]" : 
                "text-secondary"
              }`}>
                {formatExpirationDate()}
              </div>
              <div className="flex space-x-2 flex-shrink-0">
                <button 
                  className="text-neutral-400 hover:text-secondary p-1"
                  onClick={handleMarkConsumed}
                  title="Marcar como consumido"
                >
                  <span className="material-icons text-sm">check_circle_outline</span>
                </button>
                <button 
                  className="text-neutral-400 hover:text-primary p-1"
                  onClick={handleAddToShoppingList}
                  title="Adicionar à lista de compras"
                >
                  <span className="material-icons text-sm">add_shopping_cart</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="text-neutral-400 hover:text-neutral-700 p-1" 
                      title="Mais opções"
                    >
                      <span className="material-icons text-sm">more_vert</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive" 
                      onClick={() => setShowDeleteAlert(true)}
                    >
                      <span className="material-icons text-sm mr-2">delete</span>
                      Excluir produto
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowExpiredAlert(true)}
                    >
                      <span className="material-icons text-sm mr-2">auto_delete</span>
                      Excluir produtos vencidos
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowClearAllAlert(true)}
                    >
                      <span className="material-icons text-sm mr-2">delete_sweep</span>
                      Limpar todos os produtos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductItem;
