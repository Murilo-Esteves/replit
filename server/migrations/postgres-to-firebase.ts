import { db } from "@db";
import * as schema from "@shared/schema";
import firebaseService from "../services/firebase-service";

/**
 * Migração de dados do PostgreSQL para o Firebase Realtime Database
 * Esta ferramenta permite a transferência de todos os dados do banco de dados
 * PostgreSQL para o Firebase, facilitando a transição entre os sistemas.
 */
export async function migratePostgresToFirebase() {
  console.log("Iniciando migração de PostgreSQL para Firebase...");
  
  try {
    // 1. Migrar usuários
    console.log("Migrando usuários...");
    const users = await db.query.users.findMany();
    
    for (const user of users) {
      console.log(`Migrando usuário: ${user.username}`);
      try {
        await firebaseService.createUser({
          username: user.username,
          password: user.password,
          settings: user.settings || {}
        });
      } catch (error) {
        console.error(`Erro ao migrar usuário ${user.username}:`, error);
      }
    }
    
    // 2. Migrar categorias
    console.log("Migrando categorias...");
    const categories = await db.query.categories.findMany();
    
    // Mapeamento de IDs de categorias do Postgres para Firebase
    const categoryIdMap = new Map();
    
    for (const category of categories) {
      console.log(`Migrando categoria: ${category.name}`);
      try {
        const newCategory = await firebaseService.createCategory({
          name: category.name,
          icon: category.icon,
          color: category.color,
          userId: category.userId.toString(),
          description: category.description || ""
        });
        
        // Armazenar mapeamento de ID antigo para novo
        categoryIdMap.set(category.id, newCategory.id);
      } catch (error) {
        console.error(`Erro ao migrar categoria ${category.name}:`, error);
      }
    }
    
    // 3. Migrar produtos
    console.log("Migrando produtos...");
    const products = await db.query.products.findMany();
    
    // Mapeamento de IDs de produtos do Postgres para Firebase
    const productIdMap = new Map();
    
    for (const product of products) {
      console.log(`Migrando produto: ${product.name}`);
      try {
        // Usar o novo ID da categoria se existir no mapeamento
        const categoryId = categoryIdMap.get(product.categoryId) || product.categoryId.toString();
        
        const newProduct = await firebaseService.createProduct({
          name: product.name,
          image: product.image,
          expirationDate: product.expirationDate,
          userId: product.userId.toString(),
          categoryId,
          autoReplenish: product.autoReplenish
        });
        
        // Se o produto foi consumido ou descartado, atualizar esse estado
        if (product.consumed) {
          await firebaseService.markProductConsumed(newProduct.id);
        }
        
        if (product.discarded) {
          await firebaseService.markProductDiscarded(newProduct.id);
        }
        
        if (product.notified) {
          await firebaseService.markProductNotified(newProduct.id);
        }
        
        // Armazenar mapeamento de ID antigo para novo
        productIdMap.set(product.id, newProduct.id);
      } catch (error) {
        console.error(`Erro ao migrar produto ${product.name}:`, error);
      }
    }
    
    // 4. Migrar lista de compras
    console.log("Migrando itens da lista de compras...");
    const shoppingItems = await db.query.shoppingItems.findMany();
    
    for (const item of shoppingItems) {
      console.log(`Migrando item da lista de compras: ${item.name}`);
      try {
        // Usar o novo ID da categoria se existir no mapeamento
        const categoryId = item.categoryId ? 
          (categoryIdMap.get(item.categoryId) || item.categoryId.toString()) : 
          undefined;
        
        // Usar o novo ID do produto se existir no mapeamento
        const productId = item.productId ? 
          (productIdMap.get(item.productId) || item.productId.toString()) : 
          undefined;
        
        const newShoppingItem = await firebaseService.createShoppingItem({
          name: item.name,
          userId: item.userId.toString(),
          categoryId,
          productId
        });
        
        // Se o item foi marcado como comprado, atualizar esse estado
        if (item.purchased) {
          await firebaseService.markShoppingItemPurchased(newShoppingItem.id, true);
        }
      } catch (error) {
        console.error(`Erro ao migrar item da lista de compras ${item.name}:`, error);
      }
    }
    
    console.log("Migração para Firebase concluída com sucesso!");
    return { success: true, message: "Migração para Firebase concluída com sucesso!" };
  } catch (error) {
    console.error("Erro durante a migração para Firebase:", error);
    return { success: false, message: "Erro durante a migração", error };
  }
}

// Exportar função para uso via CLI ou API
export default migratePostgresToFirebase;