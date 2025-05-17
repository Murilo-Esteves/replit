import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ShoppingItem } from "@shared/schema";

const ShoppingList: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  // Fetch shopping list
  const { data: shoppingItems, isLoading } = useQuery({
    queryKey: ['/api/shopping-list'],
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Create new shopping item mutation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return await apiRequest("POST", "/api/shopping-list", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
      setNewItemName("");
      setSelectedCategoryId("");
      toast({
        title: "Item adicionado",
        description: "Item adicionado à lista de compras com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item à lista de compras.",
        variant: "destructive"
      });
    }
  });

  // Toggle purchased status mutation
  const togglePurchasedMutation = useMutation({
    mutationFn: async ({ id, purchased }: { id: number; purchased: boolean }) => {
      return await apiRequest("PUT", `/api/shopping-list/${id}/purchase`, { purchased });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item.",
        variant: "destructive"
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/shopping-list/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
      toast({
        title: "Item removido",
        description: "Item removido da lista de compras com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o item da lista de compras.",
        variant: "destructive"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o nome do item.",
        variant: "destructive"
      });
      return;
    }
    
    createItemMutation.mutate({
      name: newItemName,
      categoryId: selectedCategoryId || undefined
    });
  };

  const handleTogglePurchased = (item: ShoppingItem) => {
    togglePurchasedMutation.mutate({
      id: item.id,
      purchased: !item.purchased
    });
  };

  const handleDeleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  // Grouping and sorting shopping items
  const groupedItems = () => {
    if (!shoppingItems) return {};
    
    return shoppingItems.reduce((acc: any, item: ShoppingItem) => {
      const categoryName = item.category?.name || 'Sem categoria';
      
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      
      acc[categoryName].push(item);
      return acc;
    }, {});
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Lista de Compras</h1>
      
      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col space-y-3">
          <input 
            type="text" 
            className="w-full rounded-lg border border-neutral-300 p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
            placeholder="Adicionar novo item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          
          <select 
            className="w-full rounded-lg border border-neutral-300 p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Selecione uma categoria (opcional)</option>
            {categories?.map((category: any) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          
          <button 
            type="submit" 
            className="bg-primary text-white rounded-lg py-3 font-medium flex justify-center items-center"
            disabled={createItemMutation.isPending}
          >
            {createItemMutation.isPending ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              <>
                <span className="material-icons mr-2">add_shopping_cart</span>
                Adicionar à lista
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Shopping List Items */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : shoppingItems && shoppingItems.length > 0 ? (
        Object.entries(groupedItems()).map(([categoryName, items]: [string, any]) => (
          <div key={categoryName} className="mb-6">
            <h2 className="text-lg font-medium mb-3">{categoryName}</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {items.map((item: ShoppingItem) => (
                <div 
                  key={item.id} 
                  className={`flex items-center p-4 border-b border-neutral-100 last:border-b-0 ${item.purchased ? 'bg-neutral-50' : ''}`}
                >
                  <button 
                    className={`h-5 w-5 rounded-full border flex-shrink-0 mr-3 flex items-center justify-center ${
                      item.purchased ? 'bg-primary border-primary' : 'border-neutral-400'
                    }`}
                    onClick={() => handleTogglePurchased(item)}
                  >
                    {item.purchased && (
                      <span className="material-icons text-white text-sm">check</span>
                    )}
                  </button>
                  <div className="flex-1">
                    <span className={`${item.purchased ? 'line-through text-neutral-400' : ''}`}>
                      {item.name}
                    </span>
                  </div>
                  <button 
                    className="text-neutral-400 hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <span className="material-icons">delete_outline</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <span className="material-icons text-4xl text-neutral-300 mb-2">shopping_cart</span>
          <p className="text-neutral-500">Sua lista de compras está vazia</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;
