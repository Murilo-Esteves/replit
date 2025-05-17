import React from "react";
import type { Category } from "@shared/schema";

interface CategoryItemProps {
  category: Category;
  onClick?: (category: Category) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onClick }) => {
  const handleClick = () => {
    if (onClick) onClick(category);
  };

  // Get color styles
  const getColorStyle = () => {
    const bgColor = category.color ? `${category.color}10` : 'bg-primary/10';
    const textColor = category.color || 'text-primary';
    
    return {
      background: category.color ? `${category.color}10` : undefined,
      color: category.color
    };
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center cursor-pointer hover:bg-neutral-50 transition-colors"
      onClick={handleClick}
    >
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
        style={{ background: `${category.color}10` }}
      >
        <span className="material-icons" style={{ color: category.color }}>{category.icon}</span>
      </div>
      <span className="text-sm font-medium">{category.name}</span>
      <span className="text-xs text-neutral-500">
        {category.products?.length || 0} {category.products?.length === 1 ? 'item' : 'itens'}
      </span>
    </div>
  );
};

export default CategoryItem;
