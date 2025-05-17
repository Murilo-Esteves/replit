import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  settings: json("settings").$type<{
    notificationDays: number[];
    defaultCategory?: number;
  }>().default({
    notificationDays: [1, 3, 7]
  }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image"),
  expirationDate: timestamp("expiration_date").notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  consumed: boolean("consumed").default(false).notNull(),
  discarded: boolean("discarded").default(false).notNull(),
  notified: boolean("notified").default(false),
  autoReplenish: boolean("auto_replenish").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Shopping list items
export const shoppingItems = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  purchased: boolean("purchased").default(false).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  productId: integer("product_id").references(() => products.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  categories: many(categories),
  shoppingItems: many(shoppingItems)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  user: one(users, { fields: [products.userId], references: [users.id] }),
  shoppingItem: many(shoppingItems)
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  user: one(users, { fields: [shoppingItems.userId], references: [users.id] }),
  category: one(categories, { fields: [shoppingItems.categoryId], references: [categories.id] }),
  product: one(products, { fields: [shoppingItems.productId], references: [products.id] })
}));

// Create schemas for validation
// User schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  settings: true
});

export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Category schemas
export const insertCategorySchema = createInsertSchema(categories, {
  // Allow userId to be a string or number to support both PostgreSQL and Firebase
  userId: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  )
}).omit({ 
  id: true, 
  createdAt: true 
});
export const selectCategorySchema = createSelectSchema(categories);
export type Category = z.infer<typeof selectCategorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Product schemas
export const insertProductSchema = createInsertSchema(products, {
  // Modificar o formato para permitir string na data
  expirationDate: z.string().or(z.date())
}).omit({ 
  id: true, 
  createdAt: true,
  consumed: true,
  discarded: true,
  notified: true
});
export const selectProductSchema = createSelectSchema(products);
export type Product = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Shopping item schemas
export const insertShoppingItemSchema = createInsertSchema(shoppingItems).omit({ 
  id: true, 
  createdAt: true,
  purchased: true
});
export const selectShoppingItemSchema = createSelectSchema(shoppingItems);
export type ShoppingItem = z.infer<typeof selectShoppingItemSchema>;
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
