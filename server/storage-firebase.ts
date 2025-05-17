import * as schema from "@shared/schema";
import { firebaseService } from "./services/firebase-service";

// Firebase storage implementation wrapping Firebase service
// This implementation handles type conversions between PostgreSQL and Firebase

const firebaseStorage = {
  // User operations
  async createUser(user: schema.InsertUser) {
    console.log("Firebase storage - createUser recebeu:", user);
    try {
      const newUser = await firebaseService.createUser(user);
      console.log("Firebase storage - createUser retornou:", newUser);
      // Ensure the ID is a number as expected by the schema
      return {
        ...newUser,
        id: typeof newUser.id === 'string' ? parseInt(newUser.id, 10) : newUser.id
      };
    } catch (error) {
      console.error("Error in Firebase storage createUser:", error);
      throw error;
    }
  },

  async getUserById(id: number) {
    try {
      const user = await firebaseService.getUserById(id.toString());
      if (!user) return null;
      
      // Ensure the ID is a number as expected by the schema
      return {
        ...user,
        id: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id
      };
    } catch (error) {
      console.error("Error in Firebase storage getUserById:", error);
      return null;
    }
  },

  async getUserByUsername(username: string) {
    try {
      const user = await firebaseService.getUserByUsername(username);
      if (!user) return null;
      
      // Ensure the ID is a number as expected by the schema
      return {
        ...user,
        id: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id
      };
    } catch (error) {
      console.error("Error in Firebase storage getUserByUsername:", error);
      return null;
    }
  },

  async updateUserSettings(userId: number, settings: any) {
    try {
      await firebaseService.updateUserSettings(userId.toString(), settings);
      return await this.getUserById(userId);
    } catch (error) {
      console.error("Error in Firebase storage updateUserSettings:", error);
      throw error;
    }
  },

  // Category operations
  async createCategory(category: schema.InsertCategory) {
    console.log("Firebase storage - createCategory recebeu:", category);
    try {
      // Pass userId as is - FirebaseService will handle the type conversion
      const newCategory = await firebaseService.createCategory({
        ...category,
        // Type assertion to help TypeScript understand this is valid
        userId: category.userId as number | string
      });
      console.log("Firebase storage - createCategory retornou:", newCategory);
      
      // Convert back to expected types for the schema
      return {
        ...newCategory,
        id: typeof newCategory.id === 'string' ? parseInt(newCategory.id, 10) : newCategory.id,
        userId: typeof newCategory.userId === 'string' ? parseInt(newCategory.userId, 10) : newCategory.userId
      };
    } catch (error) {
      console.error("Error in Firebase storage createCategory:", error);
      throw error;
    }
  },

  async getCategoriesByUserId(userId: number) {
    try {
      const categories = await firebaseService.getCategoriesByUserId(userId.toString());
      
      // Convert all IDs to numbers as expected by the schema
      return categories.map(category => ({
        ...category,
        id: typeof category.id === 'string' ? parseInt(category.id, 10) : category.id,
        userId: typeof category.userId === 'string' ? parseInt(category.userId, 10) : category.userId
      }));
    } catch (error) {
      console.error("Error in Firebase storage getCategoriesByUserId:", error);
      return [];
    }
  },

  async getCategoryById(id: number) {
    try {
      const category = await firebaseService.getCategoryById(id.toString());
      if (!category) return null;
      
      // Convert IDs to numbers as expected by the schema
      return {
        ...category,
        id: typeof category.id === 'string' ? parseInt(category.id, 10) : category.id,
        userId: typeof category.userId === 'string' ? parseInt(category.userId, 10) : category.userId
      };
    } catch (error) {
      console.error("Error in Firebase storage getCategoryById:", error);
      return null;
    }
  },

  async updateCategory(id: number, category: Partial<schema.InsertCategory>) {
    try {
      // Convert userId to string for Firebase if it exists
      const updateData: any = { ...category };
      if (updateData.userId !== undefined) {
        updateData.userId = updateData.userId.toString();
      }
      
      await firebaseService.updateCategory(id.toString(), updateData);
      return await this.getCategoryById(id);
    } catch (error) {
      console.error("Error in Firebase storage updateCategory:", error);
      throw error;
    }
  },

  async deleteCategory(id: number) {
    await firebaseService.deleteCategory(id.toString());
    return { success: true };
  },

  // Product operations
  async createProduct(product: schema.InsertProduct) {
    const formattedProduct = {
      ...product,
      userId: typeof product.userId === 'number' ? product.userId.toString() : product.userId,
      categoryId: typeof product.categoryId === 'number' ? product.categoryId.toString() : product.categoryId,
      // Make sure expirationDate is properly formatted
      expirationDate: product.expirationDate instanceof Date 
        ? product.expirationDate.toISOString() 
        : product.expirationDate
    };
    
    return await firebaseService.createProduct(formattedProduct);
  },

  async getProductsByUserId(userId: number, options?: {
    status?: string,
    categoryId?: number,
    expired?: boolean,
    searchTerm?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  }) {
    // Convert options for Firebase
    const firebaseOptions = {
      includeConsumed: options?.status === 'all' || options?.status === 'consumed',
      includeDiscarded: options?.status === 'all' || options?.status === 'discarded',
      categoryId: options?.categoryId ? options.categoryId.toString() : undefined
    };
    
    const products = await firebaseService.getProductsByUserId(userId.toString(), firebaseOptions);
    
    // Apply additional filtering if needed
    let filteredProducts = products;
    
    if (options) {
      if (options.expired) {
        const now = new Date();
        filteredProducts = filteredProducts.filter(product => {
          const expDate = new Date(product.expirationDate);
          return expDate < now;
        });
      }
      
      if (options.searchTerm) {
        const term = options.searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
          product.name.toLowerCase().includes(term)
        );
      }
      
      // Apply sorting
      if (options.sortBy) {
        filteredProducts.sort((a: any, b: any) => {
          const aValue = a[options.sortBy as keyof typeof a];
          const bValue = b[options.sortBy as keyof typeof b];
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return options.sortOrder === 'desc' 
              ? bValue.localeCompare(aValue) 
              : aValue.localeCompare(bValue);
          }
          
          if (aValue instanceof Date && bValue instanceof Date) {
            return options.sortOrder === 'desc' 
              ? bValue.getTime() - aValue.getTime() 
              : aValue.getTime() - bValue.getTime();
          }
          
          // Fallback for numerical or other types
          const aNum = Number(aValue);
          const bNum = Number(bValue);
          return options.sortOrder === 'desc' ? bNum - aNum : aNum - bNum;
        });
      }
    }
    
    return filteredProducts;
  },

  async getExpiringProducts(userId: number, daysThreshold = 7) {
    return await firebaseService.getExpiringProducts(userId.toString(), daysThreshold);
  },

  async getProductById(id: number) {
    return await firebaseService.getProductById(id.toString());
  },

  async updateProduct(id: number, product: Partial<schema.Product>) {
    // Format the product data for Firebase
    const formattedProduct: any = { ...product };
    
    if (product.userId !== undefined) {
      formattedProduct.userId = typeof product.userId === 'number' 
        ? product.userId.toString() 
        : product.userId;
    }
    
    if (product.categoryId !== undefined) {
      formattedProduct.categoryId = typeof product.categoryId === 'number'
        ? product.categoryId.toString()
        : product.categoryId;
    }
    
    if (product.expirationDate !== undefined) {
      formattedProduct.expirationDate = product.expirationDate instanceof Date
        ? product.expirationDate.toISOString()
        : product.expirationDate;
    }
    
    await firebaseService.updateProduct(id.toString(), formattedProduct);
    return await this.getProductById(id);
  },

  async markProductConsumed(id: number) {
    await firebaseService.markProductConsumed(id.toString());
    return await this.getProductById(id);
  },

  async markProductDiscarded(id: number) {
    await firebaseService.markProductDiscarded(id.toString());
    return await this.getProductById(id);
  },

  async markProductNotified(id: number) {
    await firebaseService.markProductNotified(id.toString());
    return await this.getProductById(id);
  },

  async deleteProduct(id: number) {
    await firebaseService.deleteProduct(id.toString());
    return { success: true };
  },

  async deleteExpiredProducts(userId: number) {
    await firebaseService.deleteExpiredProducts(userId.toString());
    return { success: true };
  },

  async deleteAllProducts(userId: number) {
    await firebaseService.deleteAllProducts(userId.toString());
    return { success: true };
  },

  // Shopping list operations
  async createShoppingItem(item: schema.InsertShoppingItem) {
    const formattedItem = {
      ...item,
      userId: typeof item.userId === 'number' ? item.userId.toString() : item.userId,
      categoryId: item.categoryId ? (typeof item.categoryId === 'number' ? item.categoryId.toString() : item.categoryId) : null,
      productId: item.productId ? (typeof item.productId === 'number' ? item.productId.toString() : item.productId) : null
    };
    
    return await firebaseService.createShoppingItem(formattedItem);
  },

  async getShoppingItemsByUserId(userId: number) {
    return await firebaseService.getShoppingItemsByUserId(userId.toString());
  },

  async markShoppingItemPurchased(id: number, purchased: boolean = true) {
    await firebaseService.markShoppingItemPurchased(id.toString(), purchased);
    return { success: true };
  },

  async deleteShoppingItem(id: number) {
    await firebaseService.deleteShoppingItem(id.toString());
    return { success: true };
  },

  async addProductToShoppingList(productId: number, userId: number) {
    return await firebaseService.addProductToShoppingList(productId.toString(), userId.toString());
  },

  // Summary and analytics
  async getExpirationSummary(userId: number) {
    return await firebaseService.getExpirationSummary(userId.toString());
  },

  async processConsumedDiscardedItems(userId: number) {
    return await firebaseService.processConsumedDiscardedItems(userId.toString());
  },

  // Realtime listeners
  listenToProducts(userId: number, callback: (products: schema.Product[]) => void) {
    return firebaseService.listenToProducts(userId.toString(), callback);
  },
  
  listenToShoppingItems(userId: number, callback: (items: schema.ShoppingItem[]) => void) {
    return firebaseService.listenToShoppingItems(userId.toString(), callback);
  }
};

export default firebaseStorage;