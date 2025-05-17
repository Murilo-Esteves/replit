import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductItem from "@/components/product-item";
import CategoryItem from "@/components/category-item";
import type { Category } from "@shared/schema";

const Inventory: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Fetch products based on selected category
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products', selectedCategory ? `?categoryId=${selectedCategory}` : ''],
  });

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category.id);
  };

  const handleResetFilter = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Meus Produtos</h1>
        {selectedCategory && (
          <button 
            className="text-primary text-sm flex items-center"
            onClick={handleResetFilter}
          >
            <span className="material-icons text-sm mr-1">filter_list_off</span>
            Limpar filtro
          </button>
        )}
      </div>
      
      {/* Categories Section */}
      {!selectedCategory && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Categorias</h2>
          
          {categoriesLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categories?.map((category: any) => (
                <CategoryItem 
                  key={category.id} 
                  category={category} 
                  onClick={handleCategorySelect}
                />
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Products Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          {selectedCategory 
            ? `Produtos em ${categories?.find((c: any) => c.id === selectedCategory)?.name || 'categoria'}`
            : 'Todos os Produtos'
          }
        </h2>
        
        {productsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products && products.length > 0 ? (
          products.map((product: any) => (
            <ProductItem key={product.id} product={product} />
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <span className="material-icons text-4xl text-neutral-300 mb-2">inventory_2</span>
            <p className="text-neutral-500">Nenhum produto encontrado</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Inventory;
