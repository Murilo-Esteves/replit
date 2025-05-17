import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, lt, gte, desc, asc, isNull } from "drizzle-orm";
import { STORAGE_PROVIDER } from "./config/storage-config";

// Determine which storage provider to use
export const postgresStorage = {
  // User operations
  async createUser(user: schema.InsertUser) {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  },

  async getUserById(id: number) {
    return await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  },

  async getUserByUsername(username: string) {
    return await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
  },

  async updateUserSettings(userId: number, settings: any) {
    const [updatedUser] = await db.update(schema.users)
      .set({ settings })
      .where(eq(schema.users.id, userId))
      .returning();
    return updatedUser;
  },

  // Category operations
  async createCategory(category: schema.InsertCategory) {
    const [newCategory] = await db.insert(schema.categories).values(category).returning();
    return newCategory;
  },

  async getCategoriesByUserId(userId: number) {
    return await db.query.categories.findMany({
      where: eq(schema.categories.userId, userId),
      orderBy: asc(schema.categories.name),
      with: {
        products: true
      }
    });
  },

  async getCategoryById(id: number) {
    return await db.query.categories.findFirst({
      where: eq(schema.categories.id, id),
      with: {
        products: true
      }
    });
  },

  async updateCategory(id: number, category: Partial<schema.InsertCategory>) {
    const [updatedCategory] = await db.update(schema.categories)
      .set(category)
      .where(eq(schema.categories.id, id))
      .returning();
    return updatedCategory;
  },

  async deleteCategory(id: number) {
    // First update any products using this category to a default category
    // This would need to be implemented based on application logic
    const [deletedCategory] = await db.delete(schema.categories)
      .where(eq(schema.categories.id, id))
      .returning();
    return deletedCategory;
  },

  // Product operations
  async createProduct(product: schema.InsertProduct) {
    const [newProduct] = await db.insert(schema.products).values(product).returning();
    return newProduct;
  },

  async getProductsByUserId(userId: number, options?: {
    expiringOnly?: boolean,
    categoryId?: number,
    limit?: number,
    offset?: number
  }) {
    let query = db.query.products.findMany({
      where: eq(schema.products.userId, userId),
      orderBy: asc(schema.products.expirationDate),
      with: {
        category: true
      }
    });

    if (options?.expiringOnly) {
      query = db.query.products.findMany({
        where: and(
          eq(schema.products.userId, userId),
          eq(schema.products.consumed, false),
          eq(schema.products.discarded, false),
          gte(schema.products.expirationDate, new Date()) // Not expired yet
        ),
        orderBy: asc(schema.products.expirationDate),
        with: {
          category: true
        }
      });
    }

    if (options?.categoryId) {
      query = db.query.products.findMany({
        where: and(
          eq(schema.products.userId, userId),
          eq(schema.products.categoryId, options.categoryId),
          eq(schema.products.consumed, false),
          eq(schema.products.discarded, false)
        ),
        orderBy: asc(schema.products.expirationDate),
        with: {
          category: true
        }
      });
    }

    if (options?.limit) {
      // Manual slicing for pagination since the query builder doesn't support it well
      const products = await query;
      const start = options.offset || 0;
      const end = start + options.limit;
      return products.slice(start, end);
    }

    return await query;
  },
  
  async getExpiringProducts(userId: number, daysThreshold = 7) {
    const today = new Date();
    const threshold = new Date(today);
    threshold.setDate(today.getDate() + daysThreshold);
    
    return await db.query.products.findMany({
      where: and(
        eq(schema.products.userId, userId),
        eq(schema.products.consumed, false),
        eq(schema.products.discarded, false),
        gte(schema.products.expirationDate, today),
        lt(schema.products.expirationDate, threshold)
      ),
      orderBy: asc(schema.products.expirationDate),
      with: {
        category: true
      }
    });
  },

  async getProductById(id: number) {
    return await db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        category: true
      }
    });
  },

  async updateProduct(id: number, product: Partial<schema.Product>) {
    const [updatedProduct] = await db.update(schema.products)
      .set(product)
      .where(eq(schema.products.id, id))
      .returning();
    return updatedProduct;
  },

  async markProductConsumed(id: number) {
    const [updatedProduct] = await db.update(schema.products)
      .set({ consumed: true })
      .where(eq(schema.products.id, id))
      .returning();
    return updatedProduct;
  },

  async markProductDiscarded(id: number) {
    const [updatedProduct] = await db.update(schema.products)
      .set({ discarded: true })
      .where(eq(schema.products.id, id))
      .returning();
    return updatedProduct;
  },

  async markProductNotified(id: number) {
    const [updatedProduct] = await db.update(schema.products)
      .set({ notified: true })
      .where(eq(schema.products.id, id))
      .returning();
    return updatedProduct;
  },

  async deleteProduct(id: number) {
    const [deletedProduct] = await db.delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning();
    return deletedProduct;
  },
  
  async deleteExpiredProducts(userId: number) {
    const today = new Date();
    
    // Find all expired products that are not consumed or discarded
    const result = await db.delete(schema.products)
      .where(and(
        eq(schema.products.userId, userId),
        eq(schema.products.consumed, false),
        eq(schema.products.discarded, false),
        lt(schema.products.expirationDate, today)
      ))
      .returning();
      
    return { count: result.length };
  },
  
  async deleteAllProducts(userId: number) {
    const result = await db.delete(schema.products)
      .where(eq(schema.products.userId, userId))
      .returning();
      
    return { count: result.length };
  },

  // Shopping list operations
  async createShoppingItem(item: schema.InsertShoppingItem) {
    const [newItem] = await db.insert(schema.shoppingItems).values(item).returning();
    return newItem;
  },

  async getShoppingItemsByUserId(userId: number) {
    return await db.query.shoppingItems.findMany({
      where: eq(schema.shoppingItems.userId, userId),
      with: {
        category: true
      },
      orderBy: [
        asc(schema.shoppingItems.purchased),
        asc(schema.shoppingItems.createdAt)
      ]
    });
  },

  async markShoppingItemPurchased(id: number, purchased: boolean = true) {
    const [updatedItem] = await db.update(schema.shoppingItems)
      .set({ purchased })
      .where(eq(schema.shoppingItems.id, id))
      .returning();
    return updatedItem;
  },

  async deleteShoppingItem(id: number) {
    const [deletedItem] = await db.delete(schema.shoppingItems)
      .where(eq(schema.shoppingItems.id, id))
      .returning();
    return deletedItem;
  },

  async addProductToShoppingList(productId: number, userId: number) {
    // Get product details
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Create shopping list item from product
    const shoppingItem = {
      name: product.name,
      userId,
      categoryId: product.categoryId,
      productId: product.id
    };

    return await this.createShoppingItem(shoppingItem);
  },

  // Expiration alerts and summary
  async getExpirationSummary(userId: number) {
    const today = new Date();
    
    // Expiring today
    const expiringToday = await db.query.products.findMany({
      where: and(
        eq(schema.products.userId, userId),
        eq(schema.products.consumed, false),
        eq(schema.products.discarded, false),
        lt(schema.products.expirationDate, new Date(today.setHours(23, 59, 59, 999)))
      )
    });
    
    // Reset today to midnight
    today.setHours(0, 0, 0, 0);
    
    // Expiring in 3 days
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    const expiringInThreeDays = await db.query.products.findMany({
      where: and(
        eq(schema.products.userId, userId),
        eq(schema.products.consumed, false),
        eq(schema.products.discarded, false),
        gte(schema.products.expirationDate, today),
        lt(schema.products.expirationDate, threeDaysLater)
      )
    });
    
    // Products that are OK (not expiring soon)
    const nonExpiring = await db.query.products.findMany({
      where: and(
        eq(schema.products.userId, userId),
        eq(schema.products.consumed, false),
        eq(schema.products.discarded, false),
        gte(schema.products.expirationDate, threeDaysLater)
      )
    });
    
    return {
      expiringToday: expiringToday.length,
      expiringInThreeDays: expiringInThreeDays.length,
      nonExpiring: nonExpiring.length
    };
  },

  // Automatic shopping list management
  async processConsumedDiscardedItems(userId: number) {
    // Get all consumed or discarded items that are set to auto-replenish
    const itemsToReplenish = await db.query.products.findMany({
      where: and(
        eq(schema.products.userId, userId),
        eq(schema.products.autoReplenish, true),
        or(
          eq(schema.products.consumed, true),
          eq(schema.products.discarded, true)
        ),
        isNull(schema.products.notified)
      )
    });
    
    // Add each item to the shopping list
    for (const item of itemsToReplenish) {
      await this.addProductToShoppingList(item.id, userId);
      
      // Mark as notified so we don't process it again
      await this.updateProduct(item.id, { notified: true });
    }
    
    return itemsToReplenish.length;
  }
};

// Import the Firebase Storage implementation
import firebaseStorage from "./storage-firebase";

// Variável para controlar qual provedor está realmente em uso
let currentProvider = STORAGE_PROVIDER;
let postgresAvailable = true;

// Função para testar a conexão com o PostgreSQL
async function checkPostgresConnection(): Promise<boolean> {
  try {
    // Tenta fazer uma consulta simples no banco de dados
    await db.query.users.findFirst();
    console.log("Conexão com PostgreSQL disponível");
    return true;
  } catch (error) {
    console.error("Erro na conexão com PostgreSQL:", error.message);
    return false;
  }
}

// Verifica a conexão inicialmente
checkPostgresConnection().then(available => {
  postgresAvailable = available;
  if (!available && currentProvider === 'postgres') {
    console.log("PostgreSQL indisponível, alternando para Firebase");
    currentProvider = 'firebase';
  }
});

// Proxy que intercepta as chamadas ao storage para lidar com fallbacks
export const storage = new Proxy({} as typeof postgresStorage, {
  get(target, prop) {
    // Se o PostgreSQL estiver indisponível e estivermos tentando usá-lo, use o Firebase
    const effectiveProvider = 
      (currentProvider === 'postgres' && !postgresAvailable) ? 'firebase' : currentProvider;
    
    // Seleciona o provider apropriado
    const provider = effectiveProvider === 'firebase' ? firebaseStorage : postgresStorage;
    
    // Obtém a propriedade/método solicitado
    const originalMethod = provider[prop as keyof typeof provider];
    
    // Se for um método (função), envolve-o em um handler para detectar e lidar com erros
    if (typeof originalMethod === 'function') {
      return async function(...args: any[]) {
        try {
          // Tenta executar o método original
          return await (originalMethod as Function).apply(provider, args);
        } catch (error) {
          console.error(`Erro ao executar ${String(prop)}:`, error.message);
          
          // Se o erro for no PostgreSQL, tenta alternar para o Firebase automaticamente
          if (currentProvider === 'postgres') {
            console.log(`Tentando alternativa com Firebase para ${String(prop)}`);
            currentProvider = 'firebase';
            postgresAvailable = false;
            
            // Tenta novamente com o Firebase
            const firebaseMethod = firebaseStorage[prop as keyof typeof firebaseStorage];
            if (typeof firebaseMethod === 'function') {
              return await (firebaseMethod as Function).apply(firebaseStorage, args);
            }
          }
          
          // Se chegou aqui, não conseguiu resolver o problema
          throw error;
        }
      };
    }
    
    // Se não for um método, apenas retorna o valor
    return originalMethod;
  }
});
