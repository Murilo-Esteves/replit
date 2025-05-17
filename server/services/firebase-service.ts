import { database, firebaseApp } from "../config/firebase";
import * as schema from "@shared/schema";
import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo, 
  onValue, 
  off,
  DataSnapshot 
} from "firebase/database";

/**
 * Service to handle Firebase Realtime Database operations
 */
class FirebaseService {
  // User operations
  async createUser(user: schema.InsertUser): Promise<schema.User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByUsername(user.username);
      if (existingUser) {
        throw new Error(`User ${user.username} already exists`);
      }

      // Create a new reference
      const newUserRef = push(ref(database, 'users'));
      const userId = newUserRef.key || Date.now().toString();
      
      // For Firebase, use a string representation of the numeric ID
      // Generate a numeric ID based on the timestamp
      const numericId = Date.now();
      
      // Prepare user data with defaults
      const userData = {
        id: numericId, // Use numeric ID for Firebase
        username: user.username,
        password: user.password,
        settings: {
          notificationDays: [1, 3, 7]
        },
        createdAt: new Date().toISOString()
      };
      
      // Store in Firebase
      await set(newUserRef, userData);
      
      // Return with the proper type conversion
      return {
        ...userData,
        createdAt: new Date(userData.createdAt)
      };
    } catch (error) {
      console.error("Error creating user in Firebase:", error);
      throw error;
    }
  }
  
  async getUserById(userId: string): Promise<schema.User | null> {
    try {
      // First, try to fetch directly by ID if it's numeric
      const numericId = parseInt(userId, 10);
      if (!isNaN(numericId)) {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const users = snapshot.val();
          for (const key in users) {
            if (users[key].id === numericId) {
              const userData = users[key];
              return {
                ...userData,
                createdAt: new Date(userData.createdAt)
              };
            }
          }
        }
      }
      
      // If not found or ID is not numeric, try using the key
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        return {
          ...userData,
          createdAt: new Date(userData.createdAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user by ID from Firebase:", error);
      return null;
    }
  }
  
  async getUserByUsername(username: string): Promise<schema.User | null> {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const key in users) {
          if (users[key].username === username) {
            const userData = users[key];
            return {
              ...userData,
              createdAt: new Date(userData.createdAt)
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user by username from Firebase:", error);
      return null;
    }
  }
  
  async updateUserSettings(userId: string, settings: any): Promise<void> {
    try {
      // Get all users to find the one with the matching ID
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const key in users) {
          if (users[key].id === parseInt(userId, 10) || key === userId) {
            // Update this user's settings
            await update(ref(database, `users/${key}`), { settings });
            return;
          }
        }
      }
      
      throw new Error(`User with ID ${userId} not found`);
    } catch (error) {
      console.error("Error updating user settings in Firebase:", error);
      throw error;
    }
  }
  
  // Category operations
  async createCategory(category: { 
    name: string; 
    icon: string; 
    color: string; 
    userId: string | number;
  }): Promise<schema.Category> {
    try {
      const newCategoryRef = push(ref(database, 'categories'));
      const categoryId = newCategoryRef.key || Date.now().toString();
      
      const categoryData = {
        id: parseInt(categoryId, 10),
        name: category.name,
        icon: category.icon || 'category',
        color: category.color || '#4CAF50',
        userId: typeof category.userId === 'string' 
          ? parseInt(category.userId, 10) 
          : category.userId,
        createdAt: new Date().toISOString()
      };
      
      await set(newCategoryRef, categoryData);
      
      return {
        ...categoryData,
        createdAt: new Date(categoryData.createdAt)
      };
    } catch (error) {
      console.error("Error creating category in Firebase:", error);
      throw error;
    }
  }
  
  async getCategoriesByUserId(userId: string | number): Promise<schema.Category[]> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const categoriesRef = ref(database, 'categories');
      const snapshot = await get(categoriesRef);
      
      if (snapshot.exists()) {
        const categories = snapshot.val();
        const userCategories: schema.Category[] = [];
        
        for (const key in categories) {
          const category = categories[key];
          if (category.userId === userIdNum) {
            userCategories.push({
              ...category,
              createdAt: new Date(category.createdAt)
            });
          }
        }
        
        return userCategories;
      }
      
      return [];
    } catch (error) {
      console.error("Error getting categories by user ID from Firebase:", error);
      return [];
    }
  }
  
  async getCategoryById(categoryId: string): Promise<schema.Category | null> {
    try {
      // First, try to fetch directly by ID if it's numeric
      const numericId = parseInt(categoryId, 10);
      if (!isNaN(numericId)) {
        const categoriesRef = ref(database, 'categories');
        const snapshot = await get(categoriesRef);
        
        if (snapshot.exists()) {
          const categories = snapshot.val();
          for (const key in categories) {
            if (categories[key].id === numericId) {
              const categoryData = categories[key];
              return {
                ...categoryData,
                createdAt: new Date(categoryData.createdAt)
              };
            }
          }
        }
      }
      
      // If not found or ID is not numeric, try using the key
      const categoryRef = ref(database, `categories/${categoryId}`);
      const snapshot = await get(categoryRef);
      
      if (snapshot.exists()) {
        const categoryData = snapshot.val();
        return {
          ...categoryData,
          createdAt: new Date(categoryData.createdAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting category by ID from Firebase:", error);
      return null;
    }
  }
  
  async updateCategory(
    categoryId: string, 
    category: Partial<schema.InsertCategory>
  ): Promise<void> {
    try {
      // Find the category by ID
      const numericId = parseInt(categoryId, 10);
      const categoriesRef = ref(database, 'categories');
      const snapshot = await get(categoriesRef);
      
      if (snapshot.exists()) {
        const categories = snapshot.val();
        for (const key in categories) {
          if (categories[key].id === numericId || key === categoryId) {
            // Convert userId to number if it exists
            const updateData: any = { ...category };
            if (updateData.userId) {
              updateData.userId = parseInt(updateData.userId.toString(), 10);
            }
            
            // Update this category
            await update(ref(database, `categories/${key}`), updateData);
            return;
          }
        }
      }
      
      throw new Error(`Category with ID ${categoryId} not found`);
    } catch (error) {
      console.error("Error updating category in Firebase:", error);
      throw error;
    }
  }
  
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      // Find the category by ID
      const numericId = parseInt(categoryId, 10);
      const categoriesRef = ref(database, 'categories');
      const snapshot = await get(categoriesRef);
      
      if (snapshot.exists()) {
        const categories = snapshot.val();
        for (const key in categories) {
          if (categories[key].id === numericId || key === categoryId) {
            // Delete this category
            await remove(ref(database, `categories/${key}`));
            return;
          }
        }
      }
      
      throw new Error(`Category with ID ${categoryId} not found`);
    } catch (error) {
      console.error("Error deleting category in Firebase:", error);
      throw error;
    }
  }
  
  // Product operations
  async createProduct(product: any): Promise<schema.Product> {
    try {
      const newProductRef = push(ref(database, 'products'));
      const productId = newProductRef.key || Date.now().toString();
      
      const productData = {
        id: parseInt(productId, 10),
        name: product.name,
        image: product.image || null,
        expirationDate: product.expirationDate,
        userId: parseInt(product.userId.toString(), 10),
        categoryId: parseInt(product.categoryId.toString(), 10),
        consumed: false,
        discarded: false,
        notified: false,
        autoReplenish: product.autoReplenish || false,
        createdAt: new Date().toISOString()
      };
      
      await set(newProductRef, productData);
      
      return {
        ...productData,
        expirationDate: new Date(productData.expirationDate),
        createdAt: new Date(productData.createdAt)
      };
    } catch (error) {
      console.error("Error creating product in Firebase:", error);
      throw error;
    }
  }
  
  async getProductsByUserId(
    userId: string | number, 
    options: {
      includeConsumed?: boolean;
      includeDiscarded?: boolean;
      categoryId?: string | number;
    } = {}
  ): Promise<schema.Product[]> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const products = snapshot.val();
        let userProducts: any[] = [];
        
        for (const key in products) {
          const product = products[key];
          if (product.userId === userIdNum) {
            // Filter based on options
            if ((!options.includeConsumed && product.consumed) || 
                (!options.includeDiscarded && product.discarded)) {
              continue;
            }
            
            if (options.categoryId && 
                parseInt(product.categoryId.toString(), 10) !== 
                parseInt(options.categoryId.toString(), 10)) {
              continue;
            }
            
            userProducts.push({
              ...product,
              expirationDate: new Date(product.expirationDate),
              createdAt: new Date(product.createdAt)
            });
          }
        }
        
        return userProducts;
      }
      
      return [];
    } catch (error) {
      console.error("Error getting products by user ID from Firebase:", error);
      return [];
    }
  }
  
  async getExpiringProducts(
    userId: string | number, 
    daysThreshold = 7
  ): Promise<schema.Product[]> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const products = snapshot.val();
        const expiringProducts: any[] = [];
        
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() + daysThreshold);
        
        for (const key in products) {
          const product = products[key];
          if (product.userId === userIdNum && 
              !product.consumed && 
              !product.discarded) {
            
            const expirationDate = new Date(product.expirationDate);
            if (expirationDate >= now && expirationDate <= thresholdDate) {
              expiringProducts.push({
                ...product,
                expirationDate: new Date(product.expirationDate),
                createdAt: new Date(product.createdAt)
              });
            }
          }
        }
        
        return expiringProducts;
      }
      
      return [];
    } catch (error) {
      console.error("Error getting expiring products from Firebase:", error);
      return [];
    }
  }
  
  async getProductById(productId: string): Promise<schema.Product | null> {
    try {
      // First, try to fetch directly by ID if it's numeric
      const numericId = parseInt(productId, 10);
      if (!isNaN(numericId)) {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
          const products = snapshot.val();
          for (const key in products) {
            if (products[key].id === numericId) {
              const productData = products[key];
              return {
                ...productData,
                expirationDate: new Date(productData.expirationDate),
                createdAt: new Date(productData.createdAt)
              };
            }
          }
        }
      }
      
      // If not found or ID is not numeric, try using the key
      const productRef = ref(database, `products/${productId}`);
      const snapshot = await get(productRef);
      
      if (snapshot.exists()) {
        const productData = snapshot.val();
        return {
          ...productData,
          expirationDate: new Date(productData.expirationDate),
          createdAt: new Date(productData.createdAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting product by ID from Firebase:", error);
      return null;
    }
  }
  
  async updateProduct(
    productId: string, 
    product: any
  ): Promise<void> {
    try {
      // Find the product by ID
      const numericId = parseInt(productId, 10);
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const products = snapshot.val();
        for (const key in products) {
          if (products[key].id === numericId || key === productId) {
            // Convert IDs to numbers if they exist
            const updateData: any = { ...product };
            if (updateData.userId) {
              updateData.userId = parseInt(updateData.userId.toString(), 10);
            }
            if (updateData.categoryId) {
              updateData.categoryId = parseInt(updateData.categoryId.toString(), 10);
            }
            
            // Update this product
            await update(ref(database, `products/${key}`), updateData);
            return;
          }
        }
      }
      
      throw new Error(`Product with ID ${productId} not found`);
    } catch (error) {
      console.error("Error updating product in Firebase:", error);
      throw error;
    }
  }
  
  async markProductConsumed(productId: string): Promise<void> {
    try {
      await this.updateProduct(productId, { 
        consumed: true,
        consumedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking product as consumed in Firebase:", error);
      throw error;
    }
  }
  
  async markProductDiscarded(productId: string): Promise<void> {
    try {
      await this.updateProduct(productId, { 
        discarded: true,
        discardedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking product as discarded in Firebase:", error);
      throw error;
    }
  }
  
  async markProductNotified(productId: string): Promise<void> {
    try {
      await this.updateProduct(productId, { notified: true });
    } catch (error) {
      console.error("Error marking product as notified in Firebase:", error);
      throw error;
    }
  }
  
  async deleteProduct(productId: string): Promise<void> {
    try {
      // Find the product by ID
      const numericId = parseInt(productId, 10);
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const products = snapshot.val();
        for (const key in products) {
          if (products[key].id === numericId || key === productId) {
            // Delete this product
            await remove(ref(database, `products/${key}`));
            return;
          }
        }
      }
      
      throw new Error(`Product with ID ${productId} not found`);
    } catch (error) {
      console.error("Error deleting product in Firebase:", error);
      throw error;
    }
  }
  
  async deleteExpiredProducts(userId: string | number): Promise<void> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const products = await this.getProductsByUserId(userIdNum, {
        includeConsumed: true,
        includeDiscarded: true
      });
      
      const now = new Date();
      
      for (const product of products) {
        if (product.expirationDate < now) {
          await this.deleteProduct(product.id.toString());
        }
      }
    } catch (error) {
      console.error("Error deleting expired products in Firebase:", error);
      throw error;
    }
  }
  
  async deleteAllProducts(userId: string | number): Promise<void> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const products = await this.getProductsByUserId(userIdNum, {
        includeConsumed: true,
        includeDiscarded: true
      });
      
      for (const product of products) {
        await this.deleteProduct(product.id.toString());
      }
    } catch (error) {
      console.error("Error deleting all products in Firebase:", error);
      throw error;
    }
  }
  
  // Shopping list operations
  async createShoppingItem(item: any): Promise<schema.ShoppingItem> {
    try {
      const newItemRef = push(ref(database, 'shopping_items'));
      const itemId = newItemRef.key || Date.now().toString();
      
      const itemData = {
        id: parseInt(itemId, 10),
        name: item.name,
        userId: parseInt(item.userId.toString(), 10),
        categoryId: item.categoryId ? parseInt(item.categoryId.toString(), 10) : null,
        productId: item.productId ? parseInt(item.productId.toString(), 10) : null,
        purchased: false,
        createdAt: new Date().toISOString()
      };
      
      await set(newItemRef, itemData);
      
      return {
        ...itemData,
        createdAt: new Date(itemData.createdAt)
      };
    } catch (error) {
      console.error("Error creating shopping item in Firebase:", error);
      throw error;
    }
  }
  
  async getShoppingItemsByUserId(userId: string | number): Promise<schema.ShoppingItem[]> {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const itemsRef = ref(database, 'shopping_items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const items = snapshot.val();
        const userItems: any[] = [];
        
        for (const key in items) {
          const item = items[key];
          if (item.userId === userIdNum) {
            userItems.push({
              ...item,
              createdAt: new Date(item.createdAt)
            });
          }
        }
        
        return userItems;
      }
      
      return [];
    } catch (error) {
      console.error("Error getting shopping items by user ID from Firebase:", error);
      return [];
    }
  }
  
  async markShoppingItemPurchased(
    itemId: string, 
    purchased: boolean = true
  ): Promise<void> {
    try {
      // Find the item by ID
      const numericId = parseInt(itemId, 10);
      const itemsRef = ref(database, 'shopping_items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const items = snapshot.val();
        for (const key in items) {
          if (items[key].id === numericId || key === itemId) {
            // Update this item
            await update(ref(database, `shopping_items/${key}`), { 
              purchased,
              purchasedAt: purchased ? new Date().toISOString() : null
            });
            return;
          }
        }
      }
      
      throw new Error(`Shopping item with ID ${itemId} not found`);
    } catch (error) {
      console.error("Error marking shopping item as purchased in Firebase:", error);
      throw error;
    }
  }
  
  async deleteShoppingItem(itemId: string): Promise<void> {
    try {
      // Find the item by ID
      const numericId = parseInt(itemId, 10);
      const itemsRef = ref(database, 'shopping_items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const items = snapshot.val();
        for (const key in items) {
          if (items[key].id === numericId || key === itemId) {
            // Delete this item
            await remove(ref(database, `shopping_items/${key}`));
            return;
          }
        }
      }
      
      throw new Error(`Shopping item with ID ${itemId} not found`);
    } catch (error) {
      console.error("Error deleting shopping item in Firebase:", error);
      throw error;
    }
  }
  
  async addProductToShoppingList(
    productId: string, 
    userId: string | number
  ): Promise<schema.ShoppingItem> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      // Check if product already exists in shopping list
      const shoppingItems = await this.getShoppingItemsByUserId(userId);
      const existingItem = shoppingItems.find(
        item => item.productId === product.id && !item.purchased
      );
      
      if (existingItem) {
        // Item already exists, just return it
        return existingItem;
      }
      
      // Create a new shopping item
      return await this.createShoppingItem({
        name: product.name,
        userId: userId,
        productId: product.id,
        categoryId: product.categoryId
      });
    } catch (error) {
      console.error("Error adding product to shopping list in Firebase:", error);
      throw error;
    }
  }
  
  // Summary operations
  async getExpirationSummary(userId: string | number) {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const products = await this.getProductsByUserId(userIdNum, {
        includeConsumed: false,
        includeDiscarded: false
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);
      
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);
      
      // Count products by expiration time
      const expiringToday = products.filter(product => {
        const expDate = new Date(product.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate.getTime() === today.getTime();
      }).length;
      
      const expiringInThreeDays = products.filter(product => {
        const expDate = new Date(product.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate > today && expDate <= threeDaysLater;
      }).length;
      
      const expiringInSevenDays = products.filter(product => {
        const expDate = new Date(product.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate > threeDaysLater && expDate <= sevenDaysLater;
      }).length;
      
      const notExpiringSoon = products.filter(product => {
        const expDate = new Date(product.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate > sevenDaysLater;
      }).length;
      
      const expired = products.filter(product => {
        const expDate = new Date(product.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate < today;
      }).length;
      
      return {
        expiringToday,
        expiringInThreeDays,
        expiringInSevenDays,
        notExpiringSoon,
        expired,
        totalProducts: products.length
      };
    } catch (error) {
      console.error("Error getting expiration summary from Firebase:", error);
      return {
        expiringToday: 0,
        expiringInThreeDays: 0,
        expiringInSevenDays: 0,
        notExpiringSoon: 0,
        expired: 0,
        totalProducts: 0
      };
    }
  }
  
  // Analytics operations
  async processConsumedDiscardedItems(userId: string | number) {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const allProducts = await this.getProductsByUserId(userIdNum, {
        includeConsumed: true,
        includeDiscarded: true
      });
      
      const consumed = allProducts.filter(product => product.consumed).length;
      const discarded = allProducts.filter(product => product.discarded).length;
      const total = allProducts.length;
      
      const wastePercentage = total > 0 ? (discarded / total) * 100 : 0;
      const consumptionPercentage = total > 0 ? (consumed / total) * 100 : 0;
      
      return {
        consumed,
        discarded,
        total,
        wastePercentage,
        consumptionPercentage
      };
    } catch (error) {
      console.error("Error processing consumed/discarded items in Firebase:", error);
      throw error;
    }
  }
  
  // Real-time listeners
  listenToProducts(userId: string | number, callback: (products: schema.Product[]) => void) {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const productsRef = ref(database, 'products');
      
      const listener = onValue(productsRef, (snapshot) => {
        if (snapshot.exists()) {
          const products = snapshot.val();
          const userProducts: any[] = [];
          
          for (const key in products) {
            const product = products[key];
            if (product.userId === userIdNum) {
              userProducts.push({
                ...product,
                expirationDate: new Date(product.expirationDate),
                createdAt: new Date(product.createdAt)
              });
            }
          }
          
          callback(userProducts);
        } else {
          callback([]);
        }
      });
      
      // Return a function to unsubscribe
      return () => off(productsRef, 'value', listener);
    } catch (error) {
      console.error("Error setting up products listener in Firebase:", error);
      return () => {}; // Return a no-op function
    }
  }
  
  listenToShoppingItems(userId: string | number, callback: (items: schema.ShoppingItem[]) => void) {
    try {
      const userIdNum = parseInt(userId.toString(), 10);
      const itemsRef = ref(database, 'shopping_items');
      
      const listener = onValue(itemsRef, (snapshot) => {
        if (snapshot.exists()) {
          const items = snapshot.val();
          const userItems: any[] = [];
          
          for (const key in items) {
            const item = items[key];
            if (item.userId === userIdNum) {
              userItems.push({
                ...item,
                createdAt: new Date(item.createdAt)
              });
            }
          }
          
          callback(userItems);
        } else {
          callback([]);
        }
      });
      
      // Return a function to unsubscribe
      return () => off(itemsRef, 'value', listener);
    } catch (error) {
      console.error("Error setting up shopping items listener in Firebase:", error);
      return () => {}; // Return a no-op function
    }
  }
}

// Create and export a singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;