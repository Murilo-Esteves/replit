import { Router, Request, Response } from "express";
import { analyzeImage, generateCustomRecipe, findIngredientSubstitutes, recognizeExpirationDate } from "../services/ai-service";
import { storage } from "../storage";

const router = Router();

/**
 * Analisa uma imagem e retorna os ingredientes identificados
 * POST /api/ai/analyze-image
 */
router.post("/analyze-image", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "Imagem não fornecida" });
    }
    
    const ingredients = await analyzeImage(image);
    return res.json({ ingredients });
  } catch (error) {
    console.error("Erro ao analisar imagem:", error);
    return res.status(500).json({ error: "Erro ao analisar imagem" });
  }
});

/**
 * Gera uma receita personalizada com base nos ingredientes
 * POST /api/ai/generate-recipe
 */
router.post("/generate-recipe", async (req: Request, res: Response) => {
  try {
    const { productIds, additionalIngredients, preferences } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Lista de produtos não fornecida ou inválida" });
    }
    
    // Buscar produtos no banco de dados
    const productsPromises = productIds.map(async (id) => {
      return await storage.getProductById(Number(id));
    });
    
    const products = await Promise.all(productsPromises);
    
    // Filtrar produtos válidos
    const validProducts = products.filter((product): product is NonNullable<typeof product> => 
      product !== null && product !== undefined
    );
    
    if (validProducts.length === 0 && (!additionalIngredients || additionalIngredients.length === 0)) {
      return res.status(400).json({ error: "Nenhum ingrediente válido fornecido" });
    }
    
    // Gerar receita
    const recipe = await generateCustomRecipe(validProducts, additionalIngredients, preferences);
    return res.json(recipe);
  } catch (error) {
    console.error("Erro ao gerar receita:", error);
    return res.status(500).json({ 
      error: "Erro ao gerar receita", 
      message: error instanceof Error ? error.message : "Erro desconhecido" 
    });
  }
});

/**
 * Encontra substitutos para um ingrediente
 * POST /api/ai/find-substitutes
 */
router.post("/find-substitutes", async (req: Request, res: Response) => {
  try {
    const { ingredient, availableIngredients } = req.body;
    
    if (!ingredient) {
      return res.status(400).json({ error: "Ingrediente não fornecido" });
    }
    
    const substitutes = await findIngredientSubstitutes(ingredient, availableIngredients);
    return res.json({ substitutes });
  } catch (error) {
    console.error("Erro ao buscar substitutos:", error);
    return res.status(500).json({ error: "Erro ao buscar substitutos" });
  }
});

/**
 * Reconhece a data de validade em uma imagem
 * POST /api/ai/recognize-date
 */
router.post("/recognize-date", async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Imagem não fornecida" });
    }
    
    const expirationDate = await recognizeExpirationDate(imageBase64);
    return res.json({ expirationDate });
  } catch (error) {
    console.error("Erro ao reconhecer data de validade:", error);
    return res.status(500).json({ error: "Erro ao reconhecer data de validade" });
  }
});

export default router;