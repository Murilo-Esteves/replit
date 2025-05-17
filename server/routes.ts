import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertProductSchema, insertCategorySchema, insertShoppingItemSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import aiRoutes from "./routes/ai-routes";
import migrationRoutes from "./routes/migration-routes";
import storageRoutes from "./routes/storage-routes";
import { STORAGE_PROVIDER } from "./config/storage-config";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Registrar rotas de IA
  app.use("/api/ai", aiRoutes);
  
  // Registrar rotas de migração
  app.use("/api/migration", migrationRoutes);
  
  // Registrar rotas de armazenamento
  app.use("/api/storage", storageRoutes);
  
  // Log do provedor de armazenamento em uso
  console.log(`Usando provedor de armazenamento: ${STORAGE_PROVIDER}`);
  
  // API para servir imagens de produtos
  app.get("/api/images/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const imagePath = path.join(process.cwd(), "public", "images", "products", filename);
      
      if (fs.existsSync(imagePath)) {
        const ext = path.extname(filename).toLowerCase();
        let contentType = "image/jpeg"; // Default content type
        
        if (ext === ".svg") {
          contentType = "image/svg+xml";
        } else if (ext === ".png") {
          contentType = "image/png";
        }
        
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "max-age=86400"); // Cache for 24 hours
        res.sendFile(imagePath);
      } else {
        res.status(404).json({ message: "Imagem não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao servir imagem:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ---------------- User API ----------------
  app.post("/api/users/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log(`Tentando registrar novo usuário: ${username}`);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`Usuário já existe: ${username}`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create new user
      const newUser = await storage.createUser({ username, password });
      console.log(`Novo usuário criado: ID ${newUser.id}, username: ${newUser.username}`);
      
      // Set user in session
      req.session.userId = newUser.id;
      console.log(`Usuário ${newUser.id} definido na sessão`);
      
      // Create default categories for the new user
      const defaultCategories = [
        { name: "Frutas", icon: "nutrition", color: "#4CAF50", userId: newUser.id },
        { name: "Laticínios", icon: "egg", color: "#FFC107", userId: newUser.id },
        { name: "Carnes", icon: "restaurant", color: "#F44336", userId: newUser.id },
        { name: "Cereais", icon: "grass", color: "#9C27B0", userId: newUser.id },
        { name: "Vegetais", icon: "eco", color: "#8BC34A", userId: newUser.id },
        { name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId: newUser.id }
      ];
      
      console.log(`Criando categorias padrão para o usuário ${newUser.id}`);
      for (const category of defaultCategories) {
        await storage.createCategory(category);
      }
      
      console.log(`Registro concluído com sucesso para o usuário ${newUser.id}`);
      return res.status(201).json({ id: newUser.id, username: newUser.username });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/users/authenticate", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log(`Tentando autenticar usuário: ${username}`);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`Usuário não encontrado: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.password !== password) {
        console.log(`Senha inválida para usuário: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user in session
      req.session.userId = user.id;
      console.log(`Usuário ${user.id} autenticado com sucesso`);
      
      return res.status(200).json({ id: user.id, username: user.username, settings: user.settings });
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/current", async (req, res) => {
    try {
      // Verificar se existe um userId na sessão
      const userId = req.session.userId;
      
      if (!userId) {
        // Se não houver usuário na sessão, retorna não autenticado
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Buscar o usuário pelo ID
      const user = await storage.getUserById(userId);
      
      if (!user) {
        // Se o ID da sessão não corresponder a um usuário válido
        return res.status(401).json({ message: "User not found" });
      }
      
      return res.status(200).json({ id: user.id, username: user.username, settings: user.settings });
    } catch (error) {
      console.error("Get current user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/settings", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const settings = req.body.settings;
      
      if (!settings) {
        return res.status(400).json({ message: "Settings is required" });
      }
      
      const updatedUser = await storage.updateUserSettings(userId, settings);
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- Categories API ----------------
  app.get("/api/categories", async (req, res) => {
    try {
      // Dados simulados para manter o app funcionando sem autenticação
      const mockCategories = [
        { id: 1, name: "Frutas", icon: "nutrition", color: "#4CAF50", userId: 1, createdAt: new Date() },
        { id: 2, name: "Laticínios", icon: "egg", color: "#FFC107", userId: 1, createdAt: new Date() },
        { id: 3, name: "Carnes", icon: "restaurant", color: "#F44336", userId: 1, createdAt: new Date() },
        { id: 4, name: "Cereais", icon: "grass", color: "#9C27B0", userId: 1, createdAt: new Date() },
        { id: 5, name: "Vegetais", icon: "eco", color: "#8BC34A", userId: 1, createdAt: new Date() },
        { id: 6, name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId: 1, createdAt: new Date() }
      ];
      
      return res.status(200).json(mockCategories);
    } catch (error) {
      console.error("Get categories error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryData = { ...req.body, userId };
      
      // Validate the data
      const validatedData = insertCategorySchema.parse(categoryData);
      
      const newCategory = await storage.createCategory(validatedData);
      
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error("Create category error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedCategory = await storage.updateCategory(categoryId, req.body);
      
      return res.status(200).json(updatedCategory);
    } catch (error) {
      console.error("Update category error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteCategory(categoryId);
      
      return res.status(204).send();
    } catch (error) {
      console.error("Delete category error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- Products API ----------------
  app.get("/api/products", async (req, res) => {
    try {
      // Dados simulados para produtos
      const mockProducts = [
        {
          id: 1,
          name: "Leite",
          image: "/images/leite.svg",
          expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias no futuro
          categoryId: 2,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: true,
          createdAt: new Date()
        },
        {
          id: 2,
          name: "Maçã",
          image: "/images/maca.svg",
          expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias no futuro
          categoryId: 1,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: false,
          createdAt: new Date()
        },
        {
          id: 3,
          name: "Pão Francês",
          image: "/images/pao-frances.svg",
          expirationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 dia no futuro
          categoryId: 4,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: true,
          createdAt: new Date()
        },
        {
          id: 4,
          name: "Alface",
          image: "/images/alface.svg",
          expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 dias no futuro
          categoryId: 5,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: false,
          createdAt: new Date()
        }
      ];
      
      const { expiringOnly, categoryId } = req.query;
      
      let filteredProducts = [...mockProducts];
      
      // Filtrar por categoria se especificado
      if (categoryId) {
        const catId = parseInt(categoryId as string);
        if (!isNaN(catId)) {
          filteredProducts = filteredProducts.filter(p => p.categoryId === catId);
        }
      }
      
      // Filtrar produtos perto de expirar se solicitado
      if (expiringOnly === "true") {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        filteredProducts = filteredProducts.filter(p => 
          p.expirationDate <= sevenDaysLater && p.expirationDate >= now
        );
      }
      
      return res.status(200).json(filteredProducts);
    } catch (error) {
      console.error("Get products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/products/expiring", async (req, res) => {
    try {
      // Dados simulados para produtos
      const mockProducts = [
        {
          id: 3,
          name: "Pão Francês",
          image: "/images/pao-frances.svg",
          expirationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 dia no futuro
          categoryId: 4,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: true,
          createdAt: new Date()
        },
        {
          id: 4,
          name: "Alface",
          image: "/images/alface.svg",
          expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 dias no futuro
          categoryId: 5,
          userId: 1,
          consumed: false,
          discarded: false,
          notified: false,
          autoReplenish: false,
          createdAt: new Date()
        }
      ];
      
      const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 7;
      
      // Filtrar produtos que expiram dentro do limite de dias
      const now = new Date();
      const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
      
      const expiringProducts = mockProducts.filter(p => 
        new Date(p.expirationDate) <= thresholdDate && 
        new Date(p.expirationDate) >= now
      );
      
      return res.status(200).json(expiringProducts);
    } catch (error) {
      console.error("Get expiring products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/summary", async (req, res) => {
    try {
      // Dados simulados para o resumo
      const mockSummary = {
        expiringSoon: 2, // produtos que expiram nos próximos 7 dias
        expired: 0,      // produtos já expirados
        consumed: 3,     // produtos consumidos
        discarded: 1,    // produtos descartados
        total: 6         // total de produtos
      };
      
      return res.status(200).json(mockSummary);
    } catch (error) {
      console.error("Get summary error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      // Simulação de criação de produto
      console.log("Dados recebidos para criar produto:", req.body);
      
      // Converter a data para formato Date se for string
      const expirationDate = typeof req.body.expirationDate === 'string' 
        ? new Date(req.body.expirationDate)
        : req.body.expirationDate || new Date();
      
      // Produto simulado com ID único
      const mockProduct = {
        id: Math.floor(Math.random() * 10000) + 10, // ID aleatório
        name: req.body.name || "Produto",
        image: req.body.image || "/images/products/alface.svg",
        expirationDate: expirationDate,
        categoryId: req.body.categoryId || 1,
        userId: 1,
        consumed: false,
        discarded: false,
        notified: false,
        autoReplenish: req.body.autoReplenish || false,
        createdAt: new Date()
      };
      
      console.log("Produto simulado criado:", mockProduct);
      
      return res.status(201).json(mockProduct);
    } catch (error) {
      console.error("Create product error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedProduct = await storage.updateProduct(productId, req.body);
      
      return res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/products/:id/consume", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedProduct = await storage.markProductConsumed(productId);
      
      // If product is set to auto-replenish, add it to the shopping list
      if (product.autoReplenish) {
        await storage.addProductToShoppingList(productId, user.id);
      }
      
      return res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Consume product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/products/:id/discard", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedProduct = await storage.markProductDiscarded(productId);
      
      // If product is set to auto-replenish, add it to the shopping list
      if (product.autoReplenish) {
        await storage.addProductToShoppingList(productId, user.id);
      }
      
      return res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Discard product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteProduct(productId);
      
      return res.status(204).send();
    } catch (error) {
      console.error("Delete product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete all expired products
  app.delete("/api/products/expired/all", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const result = await storage.deleteExpiredProducts(user.id);
      
      return res.status(200).json({ 
        message: "Expired products deleted successfully", 
        count: result.count 
      });
    } catch (error) {
      console.error("Delete expired products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete all products
  app.delete("/api/products/all/clear", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const result = await storage.deleteAllProducts(user.id);
      
      return res.status(200).json({ 
        message: "All products deleted successfully", 
        count: result.count 
      });
    } catch (error) {
      console.error("Delete all products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/products/:id/shopping-list", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const shoppingItem = await storage.addProductToShoppingList(productId, user.id);
      
      return res.status(201).json(shoppingItem);
    } catch (error) {
      console.error("Add to shopping list error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------------- Shopping List API ----------------
  app.get("/api/shopping-list", async (req, res) => {
    try {
      // Dados simulados para a lista de compras
      const mockShoppingList = [
        {
          id: 1,
          name: "Leite",
          quantity: 2,
          purchased: false,
          productId: 1,
          userId: 1,
          createdAt: new Date()
        },
        {
          id: 2,
          name: "Pão",
          quantity: 1,
          purchased: false,
          productId: 3,
          userId: 1,
          createdAt: new Date()
        },
        {
          id: 3,
          name: "Queijo",
          quantity: 1,
          purchased: true,
          productId: null,
          userId: 1,
          createdAt: new Date()
        }
      ];
      
      return res.status(200).json(mockShoppingList);
    } catch (error) {
      console.error("Get shopping list error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/shopping-list", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const itemData = { ...req.body, userId: user.id };
      
      // Validate the data
      const validatedData = insertShoppingItemSchema.parse(itemData);
      
      const newItem = await storage.createShoppingItem(validatedData);
      
      return res.status(201).json(newItem);
    } catch (error) {
      console.error("Create shopping item error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/shopping-list/:id/purchase", async (req, res) => {
    try {
      // For simplicity in this demo, get the demo user
      // In a real app, you would use req.session.userId
      const user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const purchased = req.body.purchased !== false; // Default to true if not specified
      
      const updatedItem = await storage.markShoppingItemPurchased(itemId, purchased);
      
      return res.status(200).json(updatedItem);
    } catch (error) {
      console.error("Purchase item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/shopping-list/:id", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      await storage.deleteShoppingItem(itemId);
      
      return res.status(204).send();
    } catch (error) {
      console.error("Delete shopping item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
