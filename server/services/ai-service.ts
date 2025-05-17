import OpenAI from "openai";
import { Product } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Inicialização da OpenAI
console.log("OpenAI API Key está disponível:", !!process.env.OPENAI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analisa uma imagem e identifica possíveis ingredientes
 * @param imageBase64 Imagem em formato base64
 * @returns Lista de ingredientes identificados
 */
export async function analyzeImage(imageBase64: string): Promise<string[]> {
  try {
    // Remove o prefixo data:image se existir
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em identificar ingredientes e alimentos em imagens. Identifique apenas os ingredientes visíveis na imagem. Retorne apenas os nomes dos ingredientes no formato de array JSON, sem explicações adicionais."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identifique os alimentos nesta imagem e retorne um array JSON com os nomes dos ingredientes. Por exemplo: [\"tomate\", \"alface\", \"queijo\"]"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    if (!response.choices[0].message.content) {
      return [];
    }

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return result.ingredients || [];
    } catch (e) {
      console.error("Erro ao analisar resposta JSON:", e);
      return [];
    }
  } catch (error) {
    console.error("Erro ao analisar imagem:", error);
    return [];
  }
}

/**
 * Gera uma receita personalizada com base nos ingredientes disponíveis
 * @param products Lista de produtos/ingredientes disponíveis
 * @param additionalIngredients Lista opcional de ingredientes adicionais identificados
 * @param preferences Preferências do usuário (opcional)
 * @returns Receita gerada
 */
export async function generateCustomRecipe(
  products: Partial<Product>[],
  additionalIngredients: string[] = [],
  preferences: string = ""
) {
  try {
    // Extrair nomes dos produtos
    const productNames = products.map(p => p.name);
    
    // Combinar com ingredientes adicionais
    const allIngredients = [...productNames, ...additionalIngredients];
    
    // Se não houver ingredientes, retornar erro
    if (allIngredients.length === 0) {
      throw new Error("Nenhum ingrediente fornecido para gerar a receita");
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "Você é um chef especializado em criar receitas com ingredientes disponíveis. " +
            "Crie receitas detalhadas, práticas e factíveis utilizando os ingredientes fornecidos. " +
            "Sempre inclua um título, lista de ingredientes (com quantidades), modo de preparo detalhado, " +
            "nível de dificuldade (Fácil, Médio ou Difícil), tempo de preparo, e dicas opcionais. " +
            "Produza o resultado no formato JSON."
        },
        {
          role: "user",
          content: 
            `Crie uma receita utilizando preferencialmente os seguintes ingredientes: ${allIngredients.join(", ")}. ` +
            (preferences ? `Considere as seguintes preferências: ${preferences}. ` : "") +
            "Retorne no formato JSON com as propriedades: title, ingredients (array com strings incluindo quantidades), " +
            "instructions (array com strings para cada passo), difficulty, time e tips (opcional)."
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    if (!response.choices[0].message.content) {
      throw new Error("Não foi possível gerar uma receita");
    }

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Erro ao gerar receita:", error);
    throw new Error("Não foi possível gerar a receita. Por favor, tente novamente.");
  }
}

/**
 * Encontra substitutos para ingredientes que estão faltando
 * @param missingIngredient Ingrediente que está faltando
 * @param availableIngredients Ingredientes disponíveis
 * @returns Lista de possíveis substitutos
 */
export async function findIngredientSubstitutes(
  missingIngredient: string,
  availableIngredients: string[] = []
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Você é um especialista culinário especializado em substituições de ingredientes. Forneça alternativas práticas e viáveis."
        },
        {
          role: "user",
          content: `Preciso substituir "${missingIngredient}" em uma receita. ${
            availableIngredients.length > 0 
              ? `Tenho disponível: ${availableIngredients.join(", ")}. ` 
              : ""
          }Quais são as 3 melhores alternativas? Responda apenas com um array JSON de strings.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    if (!response.choices[0].message.content) {
      return [];
    }

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return result.substitutes || [];
    } catch (e) {
      console.error("Erro ao analisar resposta JSON:", e);
      return [];
    }
  } catch (error) {
    console.error("Erro ao buscar substitutos:", error);
    return [];
  }
}

/**
 * Reconhece a data de validade em uma imagem utilizando visão computacional
 * @param imageBase64 Imagem em formato base64
 * @returns Data de validade reconhecida (formato ISO) ou null se não for encontrada
 */
export async function recognizeExpirationDate(imageBase64: string): Promise<string | null> {
  try {
    console.log("Iniciando reconhecimento de data de validade via AI Vision...");
    
    // Remove o prefixo data:image se existir
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "Você é um especialista em reconhecimento de datas de validade em imagens de produtos alimentícios. " +
            "Sua tarefa é identificar e extrair a data de validade no formato YYYY-MM-DD (ISO). " +
            "INSTRUÇÕES IMPORTANTES: " +
            "1. Procure por textos como: 'Validade', 'Val:', 'Venc:', 'Vencimento', 'Data de validade', 'Consumir até', 'Best before', " +
            "'Expiry date', ou qualquer variação/abreviação relacionada a datas de validade. " +
            "2. Considere formatos comuns como DD/MM/YYYY, MM/YYYY, DD/MM/YY, YYYY-MM-DD. " +
            "3. Em embalagens de alimentos, a data de validade geralmente é acompanhada por texto específico ou impressa em formato especial. " +
            "4. Formatos como 'VAL: 02 JUN 2025' ou '02/06/2025' são comuns. " +
            "5. Preste atenção especial a datas próximas a códigos de lote ou impressas na costura da embalagem. " +
            "6. Se encontrar uma data no formato DD/MM/YYYY, converta para YYYY-MM-DD. " +
            "7. Se encontrar uma data no formato MM/YYYY, converta para YYYY-MM-DD usando o primeiro dia do mês (YYYY-MM-01). " +
            "8. Ignore datas de fabricação como 'FAB:' ou 'Produzido em:'. " +
            "9. Se houver múltiplas datas, priorize a que está claramente marcada como validade. " +
            "10. ATENÇÃO: Considere apenas datas futuras (após 2024) como possíveis datas de validade. " +
            "Responda APENAS com a data no formato JSON solicitado, sem incluir texto adicional."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identifique a data de validade nesta imagem. Retorne apenas um objeto JSON com o formato {\"expirationDate\": \"YYYY-MM-DD\"} ou {\"expirationDate\": null} se não encontrar."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
    });

    if (!response.choices[0].message.content) {
      console.log("Sem conteúdo na resposta da AI");
      return null;
    }

    try {
      const result = JSON.parse(response.choices[0].message.content);
      const date = result.expirationDate;
      
      if (date) {
        console.log(`Data de validade identificada: ${date}`);
        return date;
      } else {
        console.log("Nenhuma data de validade identificada");
        return null;
      }
    } catch (e) {
      console.error("Erro ao analisar resposta JSON da AI:", e);
      return null;
    }
  } catch (error) {
    console.error("Erro no reconhecimento de data via AI Vision:", error);
    return null;
  }
}