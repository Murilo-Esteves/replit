import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("Starting database seed...");

    // Create a demo user
    let demoUser = await db.query.users.findFirst({
      where: eq(schema.users.username, "demo_user")
    });

    if (!demoUser) {
      console.log("Creating demo user...");
      const [newUser] = await db.insert(schema.users)
        .values({
          username: "demo_user",
          password: "demo_password" // In a real app, this would be hashed
        })
        .returning();
      demoUser = newUser;
    }
    
    const userId = demoUser.id;

    // Create default categories if they don't exist
    const existingCategories = await db.query.categories.findMany({
      where: eq(schema.categories.userId, userId)
    });

    if (existingCategories.length === 0) {
      console.log("Creating default categories...");
      const defaultCategories = [
        { name: "Laticínios", icon: "egg", color: "#4285F4", userId },
        { name: "Carnes", icon: "lunch_dining", color: "#FBBC05", userId },
        { name: "Vegetais", icon: "nutrition", color: "#34A853", userId },
        { name: "Padaria", icon: "bakery_dining", color: "#EA4335", userId },
        { name: "Frios", icon: "kitchen", color: "#673AB7", userId },
        { name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId }
      ];

      await db.insert(schema.categories).values(defaultCategories);
    }

    // Get updated categories
    const categories = await db.query.categories.findMany({
      where: eq(schema.categories.userId, userId)
    });

    // Map category names to IDs
    const categoryMap = categories.reduce((acc, category) => {
      acc[category.name] = category.id;
      return acc;
    }, {} as Record<string, number>);

    // Check if we already have seeded products
    const existingProducts = await db.query.products.findMany({
      where: eq(schema.products.userId, userId)
    });

    if (existingProducts.length === 0) {
      console.log("Creating sample products...");
      
      // Date helpers
      const today = new Date();
      const daysFromNow = (days: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() + days);
        return date;
      };

      const sampleProducts = [
        {
          name: "Leite Integral",
          image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=160&h=160",
          expirationDate: daysFromNow(0), // Today
          categoryId: categoryMap["Laticínios"],
          userId
        },
        {
          name: "Presunto Fatiado",
          image: "https://pixabay.com/get/g24c1473e45102ca4426984c53ba13b0aa3de292de96b82728e187cb195b9b1b748a832ee10aa78958954dbb17f0a5ed890a5fe4b5a3548d6f9f3ec3138ac4525_1280.jpg",
          expirationDate: daysFromNow(2), // 2 days from now
          categoryId: categoryMap["Frios"],
          userId
        },
        {
          name: "Iogurte Natural",
          image: "https://pixabay.com/get/gae8fdc27111baee94aae9f76e5006dbc9d96115a6ef2706adb920d9f3cdb39f506d567f1e1ee5eef9499e071228b5fa668c177cb86d4d4265eaad53b4d11899a_1280.jpg",
          expirationDate: daysFromNow(3), // 3 days from now
          categoryId: categoryMap["Laticínios"],
          userId
        },
        {
          name: "Queijo Minas",
          image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?ixlib=rb-1.2.1&auto=format&fit=crop&w=160&h=160",
          expirationDate: daysFromNow(5),
          categoryId: categoryMap["Laticínios"],
          userId
        },
        {
          name: "Pão Francês",
          image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=160&h=160",
          expirationDate: daysFromNow(1),
          categoryId: categoryMap["Padaria"],
          userId
        },
        {
          name: "Frango",
          image: "https://images.unsplash.com/photo-1501200291289-c5a76c232e5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=160&h=160",
          expirationDate: daysFromNow(4),
          categoryId: categoryMap["Carnes"],
          userId
        },
        {
          name: "Alface",
          image: "https://images.unsplash.com/photo-1622205313162-be1d5712a43b?ixlib=rb-1.2.1&auto=format&fit=crop&w=160&h=160",
          expirationDate: daysFromNow(2),
          categoryId: categoryMap["Vegetais"],
          userId
        }
      ];

      await db.insert(schema.products).values(sampleProducts);

      // Add some items to the shopping list
      const shoppingItems = [
        {
          name: "Leite",
          userId,
          categoryId: categoryMap["Laticínios"]
        },
        {
          name: "Pão de Forma",
          userId,
          categoryId: categoryMap["Padaria"]
        },
        {
          name: "Tomate",
          userId,
          categoryId: categoryMap["Vegetais"]
        }
      ];

      await db.insert(schema.shoppingItems).values(shoppingItems);
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
