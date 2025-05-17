/**
 * Local storage utilities for the Prazo Certo application
 * This module provides functions for storing and retrieving data from the browser's IndexedDB.
 */

import { openDB, IDBPDatabase } from 'idb';
import type { Product, Category, ShoppingItem } from '@shared/schema';

const DB_NAME = 'prazo-certo-db';
const DB_VERSION = 1;

// IndexedDB database structure
interface AppDatabase {
  products: {
    key: number;
    value: Product;
    indexes: { 'by-category': number; 'by-expiration': Date };
  };
  categories: {
    key: number;
    value: Category;
  };
  shoppingItems: {
    key: number;
    value: ShoppingItem;
    indexes: { 'by-category': number; 'by-purchased': boolean };
  };
  settings: {
    key: string;
    value: any;
  };
}

// Initialize the database
const initDB = async (): Promise<IDBPDatabase<AppDatabase>> => {
  return openDB<AppDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores and indexes if they don't exist
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'categoryId');
        productStore.createIndex('by-expiration', 'expirationDate');
      }
      
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('shoppingItems')) {
        const shoppingStore = db.createObjectStore('shoppingItems', { keyPath: 'id' });
        shoppingStore.createIndex('by-category', 'categoryId');
        shoppingStore.createIndex('by-purchased', 'purchased');
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
};

// Get database instance (creating a new one if necessary)
let dbPromise: Promise<IDBPDatabase<AppDatabase>> | null = null;

const getDB = (): Promise<IDBPDatabase<AppDatabase>> => {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
};

// ==================== Products ====================

/**
 * Get all products stored locally
 */
export const getProducts = async (): Promise<Product[]> => {
  const db = await getDB();
  return db.getAll('products');
};

/**
 * Get products by category ID
 */
export const getProductsByCategory = async (categoryId: number): Promise<Product[]> => {
  const db = await getDB();
  return db.getAllFromIndex('products', 'by-category', categoryId);
};

/**
 * Get products expiring soon
 */
export const getExpiringProducts = async (days: number = 7): Promise<Product[]> => {
  const db = await getDB();
  const allProducts = await db.getAll('products');
  
  const today = new Date();
  const threshold = new Date(today);
  threshold.setDate(today.getDate() + days);
  
  return allProducts.filter(product => {
    const expirationDate = new Date(product.expirationDate);
    return expirationDate >= today && expirationDate <= threshold;
  });
};

/**
 * Save a product to local storage
 */
export const saveProduct = async (product: Product): Promise<Product> => {
  const db = await getDB();
  await db.put('products', product);
  return product;
};

/**
 * Delete a product from local storage
 */
export const deleteProduct = async (id: number): Promise<void> => {
  const db = await getDB();
  await db.delete('products', id);
};

/**
 * Update a product in local storage
 */
export const updateProduct = async (id: number, updates: Partial<Product>): Promise<Product | null> => {
  const db = await getDB();
  const product = await db.get('products', id);
  
  if (!product) return null;
  
  const updatedProduct = { ...product, ...updates };
  await db.put('products', updatedProduct);
  return updatedProduct;
};

// ==================== Categories ====================

/**
 * Get all categories stored locally
 */
export const getCategories = async (): Promise<Category[]> => {
  const db = await getDB();
  return db.getAll('categories');
};

/**
 * Save a category to local storage
 */
export const saveCategory = async (category: Category): Promise<Category> => {
  const db = await getDB();
  await db.put('categories', category);
  return category;
};

/**
 * Delete a category from local storage
 */
export const deleteCategory = async (id: number): Promise<void> => {
  const db = await getDB();
  await db.delete('categories', id);
};

// ==================== Shopping List ====================

/**
 * Get all shopping list items
 */
export const getShoppingItems = async (): Promise<ShoppingItem[]> => {
  const db = await getDB();
  return db.getAll('shoppingItems');
};

/**
 * Save a shopping item to local storage
 */
export const saveShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
  const db = await getDB();
  await db.put('shoppingItems', item);
  return item;
};

/**
 * Delete a shopping item from local storage
 */
export const deleteShoppingItem = async (id: number): Promise<void> => {
  const db = await getDB();
  await db.delete('shoppingItems', id);
};

/**
 * Mark a shopping item as purchased
 */
export const markShoppingItemPurchased = async (id: number, purchased: boolean = true): Promise<ShoppingItem | null> => {
  const db = await getDB();
  const item = await db.get('shoppingItems', id);
  
  if (!item) return null;
  
  const updatedItem = { ...item, purchased };
  await db.put('shoppingItems', updatedItem);
  return updatedItem;
};

// ==================== Settings ====================

/**
 * Get a specific setting
 */
export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  const db = await getDB();
  try {
    const setting = await db.get('settings', key);
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error('Error retrieving setting:', error);
    return defaultValue;
  }
};

/**
 * Save a setting to local storage
 */
export const saveSetting = async <T>(key: string, value: T): Promise<void> => {
  const db = await getDB();
  await db.put('settings', { key, value });
};

// ==================== Sync Data ====================

/**
 * Sync all local data with the server
 * This function is called when the app comes online after being offline
 */
export const syncWithServer = async (): Promise<void> => {
  try {
    // TODO: Implement syncing logic here once we have offline support
    console.log('Syncing with server...');
  } catch (error) {
    console.error('Error syncing with server:', error);
  }
};

// ==================== Utils ====================

/**
 * Clear all local storage (for testing/development)
 */
export const clearLocalStorage = async (): Promise<void> => {
  const db = await getDB();
  await db.clear('products');
  await db.clear('categories');
  await db.clear('shoppingItems');
  await db.clear('settings');
};

/**
 * Check if the device is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};
