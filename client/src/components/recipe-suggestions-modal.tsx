import React, { useState, useEffect } from "react";
import { X, ChefHat, Clock3, ShoppingBasket, Utensils, Search, Check, Camera, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AiFoodScanner } from "./ai-food-scanner";

interface RecipeSuggestion {
  title: string;
  ingredients: string[];
  instructions: string[];
  difficulty: "Fácil" | "Médio" | "Difícil";
  time: string;
}

interface RecipeSuggestionsModalProps {
  products: Product[];
  onClose: () => void;
}

// Simple recipes based on common expiring products
const recipeDatabase: Record<string, RecipeSuggestion[]> = {
  "leite": [
    {
      title: "Torradas com Leite",
      ingredients: ["4 fatias de pão", "200ml de leite", "2 colheres (sopa) de açúcar", "1/2 colher (chá) de canela em pó (opcional)"],
      instructions: [
        "Aqueça o leite em uma panela até ficar morno",
        "Corte o pão em fatias",
        "Adicione açúcar e canela ao leite (opcional)",
        "Sirva o leite em uma xícara com as fatias de pão ao lado para molhar"
      ],
      difficulty: "Fácil",
      time: "5 minutos"
    },
    {
      title: "Pudim de Leite Condensado",
      ingredients: ["1 lata (395g) de leite condensado", "400ml de leite (mesma medida da lata)", "3 ovos", "1 xícara (chá) de açúcar para a calda"],
      instructions: [
        "Prepare a calda: derreta o açúcar até dourar e forre uma forma",
        "Bata no liquidificador o leite condensado, o leite e os ovos",
        "Despeje na forma caramelizada",
        "Asse em banho-maria por cerca de 40 minutos",
        "Espere esfriar e desenforme"
      ],
      difficulty: "Médio",
      time: "1 hora"
    },
    {
      title: "Vitamina de Frutas",
      ingredients: ["1 banana média", "300ml de leite", "1 colher (sopa) de açúcar ou mel a gosto", "1 xícara de frutas de sua preferência picadas"],
      instructions: [
        "Corte as frutas em pedaços pequenos",
        "Coloque todos os ingredientes no liquidificador",
        "Bata até ficar homogêneo",
        "Sirva geladinho"
      ],
      difficulty: "Fácil",
      time: "5 minutos"
    }
  ],
  "pão": [
    {
      title: "Rabanada",
      ingredients: ["6 fatias de pão francês ou de fôrma", "300ml de leite", "2 ovos", "4 colheres (sopa) de açúcar", "1 colher (chá) de canela em pó"],
      instructions: [
        "Corte o pão em fatias de 2cm",
        "Misture o leite e os ovos em uma tigela",
        "Mergulhe as fatias de pão na mistura",
        "Frite em óleo ou azeite até dourar",
        "Passe as fatias em açúcar e canela misturados"
      ],
      difficulty: "Fácil",
      time: "15 minutos"
    },
    {
      title: "Torradas de Alho",
      ingredients: ["4 fatias de pão", "2 dentes de alho", "2 colheres (sopa) de azeite", "1 pitada de sal", "1 pitada de orégano (opcional)"],
      instructions: [
        "Corte o pão em fatias",
        "Misture o alho amassado com azeite",
        "Passe a mistura nas fatias de pão",
        "Polvilhe sal e orégano",
        "Leve ao forno ou frigideira até dourar"
      ],
      difficulty: "Fácil",
      time: "10 minutos"
    }
  ],
  "presunto": [
    {
      title: "Misto Quente",
      ingredients: ["2 fatias de pão de forma", "2 fatias de presunto", "2 fatias de queijo", "1 colher (chá) de manteiga"],
      instructions: [
        "Passe manteiga nas fatias de pão",
        "Coloque presunto e queijo entre as fatias",
        "Aqueça uma frigideira em fogo médio",
        "Doure o sanduíche dos dois lados"
      ],
      difficulty: "Fácil",
      time: "10 minutos"
    },
    {
      title: "Salada com Presunto",
      ingredients: ["1 pé de alface", "1 tomate médio", "100g de presunto fatiado", "2 colheres (sopa) de azeite", "1 pitada de sal"],
      instructions: [
        "Lave e rasgue as folhas de alface",
        "Corte os tomates em fatias ou cubos",
        "Corte o presunto em tiras",
        "Misture tudo em uma tigela",
        "Tempere com sal e azeite a gosto"
      ],
      difficulty: "Fácil",
      time: "5 minutos"
    },
    {
      title: "Omelete de Presunto",
      ingredients: ["2 ovos", "50g de presunto picado", "2 colheres (sopa) de queijo ralado", "1 pitada de sal", "1 pitada de pimenta"],
      instructions: [
        "Bata os ovos em uma tigela",
        "Adicione sal, pimenta e queijo ralado",
        "Corte o presunto em pequenos pedaços e adicione à mistura",
        "Aqueça uma frigideira com um pouco de óleo",
        "Despeje a mistura e cozinhe até dourar dos dois lados"
      ],
      difficulty: "Fácil",
      time: "8 minutos"
    }
  ],
  "alface": [
    {
      title: "Salada César Simples",
      ingredients: ["1 pé de alface americana", "2 fatias de pão para croutons", "2 colheres (sopa) de queijo parmesão ralado", "3 colheres (sopa) de molho César"],
      instructions: [
        "Lave e rasgue as folhas de alface",
        "Corte o pão em cubos e torre-os",
        "Misture a alface com o molho",
        "Adicione os croutons e finalize com queijo parmesão ralado"
      ],
      difficulty: "Fácil",
      time: "10 minutos"
    },
    {
      title: "Wrap de Alface",
      ingredients: ["4 folhas grandes de alface", "150g de frango desfiado", "1 tomate médio", "1 cenoura média ralada", "2 colheres (sopa) de maionese"],
      instructions: [
        "Lave bem as folhas de alface e seque-as",
        "Misture o frango com a maionese",
        "Corte o tomate em cubos pequenos",
        "Monte colocando o frango, tomate e cenoura sobre a folha de alface",
        "Enrole como um wrap e sirva"
      ],
      difficulty: "Fácil",
      time: "15 minutos"
    }
  ],
  "queijo": [
    {
      title: "Macarrão com Queijo",
      ingredients: ["200g de macarrão", "100g de queijo ralado", "1 xícara (240ml) de leite", "2 colheres (sopa) de manteiga", "1 pitada de sal"],
      instructions: [
        "Cozinhe o macarrão conforme instruções da embalagem",
        "Em uma panela, derreta a manteiga e adicione o leite",
        "Adicione o queijo ralado e mexa até derreter",
        "Misture o macarrão cozido com o molho de queijo",
        "Tempere com sal a gosto"
      ],
      difficulty: "Fácil",
      time: "20 minutos"
    }
  ],
  "ovo": [
    {
      title: "Ovos Mexidos",
      ingredients: ["3 ovos", "2 colheres (sopa) de leite", "1 pitada de sal", "1 pitada de pimenta", "1 colher (chá) de manteiga"],
      instructions: [
        "Bata os ovos em uma tigela junto com o leite",
        "Tempere com sal e pimenta",
        "Aqueça a manteiga em uma frigideira em fogo médio-baixo",
        "Despeje os ovos batidos e mexa constantemente até ficarem cremosos",
        "Sirva imediatamente"
      ],
      difficulty: "Fácil",
      time: "5 minutos"
    }
  ]
};

// Get recipes based on products
const getRecipeSuggestions = (products: Product[]): RecipeSuggestion[] => {
  const suggestions: RecipeSuggestion[] = [];
  const addedTitles = new Set<string>();
  
  // Mapeamento para termos alternativos (sinonimos ou termos relacionados)
  const alternativeTerms: Record<string, string[]> = {
    "leite": ["leite", "integral", "desnatado", "lácteo"],
    "pão": ["pão", "francês", "integral", "fatiado", "torrada"],
    "presunto": ["presunto", "frios", "fatiado", "defumado"],
    "alface": ["alface", "folha", "verdes", "salada", "verdura"],
    "queijo": ["queijo", "fatiado", "mussarela", "parmesão"],
    "ovo": ["ovo", "ovos"],
    "frango": ["frango", "filé", "peito"]
  };
  
  // Adicionar todas as receitas disponíveis ao array de fallback caso não encontre correspondências
  const allRecipes: RecipeSuggestion[] = [];
  for (const categoryRecipes of Object.values(recipeDatabase)) {
    allRecipes.push(...categoryRecipes);
  }
  
  // Função para tentar encontrar correspondências com termos alternativos
  const findMatchingRecipes = (productName: string) => {
    const normalizedName = productName.toLowerCase();
    let found = false;
    
    // Verificar correspondências diretas primeiro
    for (const [key, terms] of Object.entries(alternativeTerms)) {
      if (terms.some(term => normalizedName.includes(term))) {
        const categoryRecipes = recipeDatabase[key] || [];
        for (const recipe of categoryRecipes) {
          if (!addedTitles.has(recipe.title)) {
            suggestions.push(recipe);
            addedTitles.add(recipe.title);
            found = true;
          }
        }
      }
    }
    
    return found;
  };
  
  // Tentar encontrar receitas para cada produto
  let matchFound = false;
  for (const product of products) {
    const found = findMatchingRecipes(product.name);
    if (found) matchFound = true;
  }
  
  // Se não encontrou nenhuma correspondência, incluir algumas receitas populares
  if (!matchFound && suggestions.length === 0) {
    // Incluir até 3 receitas populares por padrão
    const popularRecipes = allRecipes.slice(0, 3);
    for (const recipe of popularRecipes) {
      if (!addedTitles.has(recipe.title)) {
        suggestions.push(recipe);
        addedTitles.add(recipe.title);
      }
    }
  }
  
  return suggestions;
};

interface RecipeCardProps {
  recipe: RecipeSuggestion;
  usedIngredients: string[];
  onMarkIngredient: (recipeTitle: string, ingredient: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  usedIngredients,
  onMarkIngredient
}) => {
  return (
    <div className="mb-6 border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex flex-col mb-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-primary">{recipe.title}</h3>
            <div className="flex space-x-2">
              <Badge className={
                recipe.difficulty === "Fácil" 
                  ? "bg-green-500 hover:bg-green-500/80" 
                  : recipe.difficulty === "Médio" 
                  ? "bg-yellow-500 hover:bg-yellow-500/80" 
                  : "bg-destructive hover:bg-destructive/80"
              }>
                {recipe.difficulty}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <Clock3 className="h-3.5 w-3.5 mr-1" />
            <span>{recipe.time}</span>
          </div>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary">
              <div className="flex items-center">
                <ShoppingBasket className="h-4 w-4 mr-2" />
                <span>Ingredientes</span>
                {usedIngredients.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">
                    {usedIngredients.length}/{recipe.ingredients.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-none pl-0 space-y-1">
                {recipe.ingredients.map((ingredient, idx) => {
                  const isUsed = usedIngredients.includes(ingredient);
                  return (
                    <li 
                      key={idx} 
                      className={`text-sm flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer ${
                        isUsed ? 'line-through text-muted-foreground' : ''
                      }`}
                      onClick={() => onMarkIngredient(recipe.title, ingredient)}
                    >
                      <Checkbox 
                        checked={isUsed}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        onCheckedChange={() => onMarkIngredient(recipe.title, ingredient)}
                      />
                      <span className="ml-1">{ingredient}</span>
                      {isUsed && (
                        <Check className="h-3.5 w-3.5 text-green-500 ml-auto" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="instructions" className="border-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary">
              <div className="flex items-center">
                <Utensils className="h-4 w-4 mr-2" />
                <span>Modo de Preparo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside pl-2 space-y-2">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="text-sm">{step}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export const RecipeSuggestionsModal: React.FC<RecipeSuggestionsModalProps> = ({
  products,
  onClose,
}) => {
  const { toast } = useToast();
  const allSuggestions = getRecipeSuggestions(products);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredSuggestions, setFilteredSuggestions] = useState(allSuggestions);
  const [usedIngredients, setUsedIngredients] = useState<Record<string, string[]>>({});
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [isLoadingAiRecipes, setIsLoadingAiRecipes] = useState(false);
  const [aiGeneratedRecipes, setAiGeneratedRecipes] = useState<RecipeSuggestion[]>([]);

  // Filtros populares predefinidos
  const popularFilters = [
    { label: "Café da manhã", value: "cafe" },
    { label: "Lanches", value: "lanches" },
    { label: "Sem carne", value: "vegetariano" },
    { label: "Rápido", value: "rapido" }
  ];

  // Filtrar receitas baseadas na pesquisa e categoria
  useEffect(() => {
    let results = [...allSuggestions];
    
    // Aplicar filtro de busca
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      results = results.filter(recipe => 
        recipe.title.toLowerCase().includes(term) || 
        recipe.ingredients.some(ing => ing.toLowerCase().includes(term))
      );
    }
    
    // Aplicar filtros de categoria
    if (selectedCategory === 'easy') {
      results = results.filter(recipe => 
        recipe.difficulty === "Fácil" && (recipe.time.includes("5") || recipe.time.includes("10"))
      );
    } else if (selectedCategory === 'medium') {
      results = results.filter(recipe => 
        recipe.difficulty === "Médio" || (recipe.difficulty === "Fácil" && !recipe.time.includes("5") && !recipe.time.includes("10"))
      );
    } else if (selectedCategory === 'vegetariano') {
      results = results.filter(recipe => 
        !recipe.ingredients.some(ing => 
          ing.toLowerCase().includes("carne") || 
          ing.toLowerCase().includes("frango") || 
          ing.toLowerCase().includes("peixe") ||
          ing.toLowerCase().includes("presunto")
        )
      );
    } else if (selectedCategory === 'cafe') {
      results = results.filter(recipe => 
        recipe.ingredients.some(ing => 
          ing.toLowerCase().includes("pão") || 
          ing.toLowerCase().includes("leite") ||
          ing.toLowerCase().includes("café")
        )
      );
    } else if (selectedCategory === 'lanches') {
      results = results.filter(recipe => 
        recipe.time.includes("5") || 
        recipe.time.includes("10") ||
        recipe.title.toLowerCase().includes("sanduíche") ||
        recipe.title.toLowerCase().includes("misto") ||
        recipe.title.toLowerCase().includes("wrap")
      );
    } else if (selectedCategory === 'rapido') {
      results = results.filter(recipe => 
        recipe.time.includes("5") || 
        recipe.time.includes("10") ||
        recipe.time.includes("15")
      );
    }
    
    setFilteredSuggestions(results);
  }, [searchTerm, selectedCategory, allSuggestions]);

  // Função para lidar com produtos e ingredientes identificados pela IA
  const handleAiRecipeGeneration = async (matchedProducts: Product[], additionalIngredients: string[]) => {
    try {
      setIsLoadingAiRecipes(true);
      
      // Criar array de IDs dos produtos que combinaram
      const productIds = matchedProducts.map(product => product.id);
      
      // Chamar a API para gerar receitas
      const response = await apiRequest("POST", "/api/ai/generate-recipe", { 
        productIds, 
        additionalIngredients,
        preferences: "Receitas fáceis e rápidas, reduzindo o desperdício"
      });
      
      const data = await response.json();
      
      if (data) {
        // Converter o resultado da API para o formato de RecipeSuggestion
        const aiRecipe: RecipeSuggestion = {
          title: data.title || "Receita Personalizada",
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          difficulty: (data.difficulty === "Fácil" || data.difficulty === "Médio" || data.difficulty === "Difícil") 
            ? data.difficulty 
            : "Médio",
          time: data.time || "20 minutos"
        };
        
        setAiGeneratedRecipes([aiRecipe]);
        
        // Adicionar à lista de receitas sugeridas
        const updatedSuggestions = [aiRecipe, ...allSuggestions];
        setFilteredSuggestions(updatedSuggestions);
        
        toast({
          title: "Receita gerada com sucesso!",
          description: `Nova receita: ${aiRecipe.title}`,
          variant: "default"
        });
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (error) {
      console.error("Erro ao gerar receita com IA:", error);
      toast({
        title: "Erro ao gerar receita",
        description: "Não foi possível gerar uma receita personalizada. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAiRecipes(false);
      setShowAiScanner(false);
    }
  };

  // Marcar ingrediente como usado
  const handleMarkIngredientUsed = (recipeTitle: string, ingredient: string) => {
    // Atualizar estado local dos ingredientes usados
    setUsedIngredients(prev => {
      const recipeIngredients = prev[recipeTitle] || [];
      if (recipeIngredients.includes(ingredient)) {
        // Remover se já estiver marcado
        return {
          ...prev,
          [recipeTitle]: recipeIngredients.filter(ing => ing !== ingredient)
        };
      } else {
        // Adicionar se não estiver marcado
        return {
          ...prev,
          [recipeTitle]: [...recipeIngredients, ingredient]
        };
      }
    });

    // Simular atualização na despensa
    toast({
      title: ingredient + " marcado como usado",
      description: "Produto atualizado na sua despensa",
      variant: "default"
    });
  };

  return (
    <div>
      <AiFoodScanner 
        isOpen={showAiScanner}
        onClose={() => setShowAiScanner(false)}
        onRecipesGenerated={handleAiRecipeGeneration}
      />
      
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="text-left relative pb-4 border-b px-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <DialogTitle className="text-xl font-semibold">
                  Receitas com seus produtos
                </DialogTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => setShowAiScanner(true)}
                disabled={isLoadingAiRecipes}
              >
                <Camera className="h-4 w-4" />
                <Sparkles className="h-4 w-4" />
                Scan AI
              </Button>
            </div>
            <DialogDescription className="mt-2 mb-4">
              Sugestões para aproveitar produtos que estão prestes a vencer.
              {isLoadingAiRecipes ? (
                <div className="flex items-center gap-2 mt-1 text-primary animate-pulse">
                  <span>Gerando receita personalizada</span>
                  <span className="loading loading-dots"></span>
                </div>
              ) : (
                <>Encontramos {filteredSuggestions.length} receitas para você experimentar!</>
              )}
            </DialogDescription>

            {/* Campo de busca */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por ingrediente ou tipo de receita..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtros rápidos */}
            <div className="flex gap-2 flex-wrap">
              {popularFilters.map(filter => (
                <Badge 
                  key={filter.value}
                  variant={selectedCategory === filter.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === filter.value ? 'all' : filter.value)}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>
          </DialogHeader>
          
          {filteredSuggestions.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
              <div className="mb-4">
                <div className="bg-muted/50 p-3 rounded-lg text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <span className="material-icons text-sm">info</span>
                    <span className="font-medium">Dica:</span>
                  </div>
                  <p>Marque os ingredientes que você usou para atualizar automaticamente na despensa. <b className="text-primary">Clique nos ingredientes para marcá-los como usados</b>.</p>
                </div>
              </div>
              
              <Tabs defaultValue="all" className="w-full" onValueChange={setSelectedCategory}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="all">Todas Receitas</TabsTrigger>
                  <TabsTrigger value="easy">Rápidas e Fáceis</TabsTrigger>
                  <TabsTrigger value="medium">Médias</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  {filteredSuggestions.map((recipe, idx) => (
                    <RecipeCard 
                      key={idx} 
                      recipe={recipe} 
                      usedIngredients={usedIngredients[recipe.title] || []}
                      onMarkIngredient={handleMarkIngredientUsed}
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="easy" className="mt-0">
                  {filteredSuggestions
                    .filter(recipe => recipe.difficulty === "Fácil" && (recipe.time.includes("5") || recipe.time.includes("10")))
                    .map((recipe, idx) => (
                      <RecipeCard 
                        key={idx} 
                        recipe={recipe} 
                        usedIngredients={usedIngredients[recipe.title] || []}
                        onMarkIngredient={handleMarkIngredientUsed}
                      />
                    ))}
                </TabsContent>
                
                <TabsContent value="medium" className="mt-0">
                  {filteredSuggestions
                    .filter(recipe => recipe.difficulty === "Médio" || (recipe.difficulty === "Fácil" && !recipe.time.includes("5") && !recipe.time.includes("10")))
                    .map((recipe, idx) => (
                      <RecipeCard 
                        key={idx} 
                        recipe={recipe} 
                        usedIngredients={usedIngredients[recipe.title] || []}
                        onMarkIngredient={handleMarkIngredientUsed}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-6">
              <span className="text-4xl mb-4">😢</span>
              <h3 className="text-lg font-medium">Nenhuma receita encontrada</h3>
              <p className="text-muted-foreground mt-2">
                Não encontramos receitas com os filtros selecionados. Tente outros termos ou remova os filtros.
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipeSuggestionsModal;