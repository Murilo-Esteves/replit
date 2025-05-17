import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export function configureAuth(app: express.Express) {
  // Configuração da sessão
  app.use(
    session({
      secret: "prazo-certo-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      },
    })
  );

  // Middleware para criar um usuário demo se necessário
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Verificar se já existe o usuário demo
      const demoUser = await storage.getUserByUsername("demo_user");
      
      if (!demoUser) {
        console.log("Criando usuário demo...");
        await storage.createUser({
          username: "demo_user",
          password: "demo123"
        });
        console.log("Usuário demo criado com sucesso!");
        
        // Buscar o usuário demo recém-criado
        const newDemoUser = await storage.getUserByUsername("demo_user");
        
        if (newDemoUser) {
          console.log("Criando categorias padrão para o usuário demo...");
          // Criar categorias padrão para o usuário demo
          const defaultCategories = [
            { name: "Frutas", icon: "nutrition", color: "#4CAF50", userId: newDemoUser.id },
            { name: "Laticínios", icon: "egg", color: "#FFC107", userId: newDemoUser.id },
            { name: "Carnes", icon: "restaurant", color: "#F44336", userId: newDemoUser.id },
            { name: "Cereais", icon: "grass", color: "#9C27B0", userId: newDemoUser.id },
            { name: "Vegetais", icon: "eco", color: "#8BC34A", userId: newDemoUser.id },
            { name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId: newDemoUser.id }
          ];
          
          for (const category of defaultCategories) {
            await storage.createCategory(category);
          }
          console.log("Categorias padrão criadas com sucesso!");
        }
      }
      
      next();
    } catch (error) {
      console.error("Erro ao verificar/criar usuário demo:", error);
      next();
    }
  });
  
  // Rotas de autenticação
  const authRouter = express.Router();
  
  // Rota de registro
  authRouter.post("/register", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log(`Tentando registrar novo usuário: ${username}`);
      console.log(`Usando provedor de armazenamento: ${process.env.STORAGE_PROVIDER || 'firebase'}`);
      
      // Verificar se o username já existe
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`Usuário já existe: ${username}`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Criar novo usuário
      console.log("Dados para novo usuário:", { username, password });
      const newUser = await storage.createUser({ username, password });
      console.log("Resposta do armazenamento após criar usuário:", newUser);
      console.log(`Novo usuário criado: ID ${newUser.id}, username: ${newUser.username}`);
      
      // Definir usuário na sessão
      req.session.userId = newUser.id;
      await req.session.save();
      console.log(`Usuário ${newUser.id} definido na sessão`);
      
      // Criar categorias padrão para o novo usuário
      const defaultCategories = [
        { name: "Frutas", icon: "nutrition", color: "#4CAF50", userId: newUser.id },
        { name: "Laticínios", icon: "egg", color: "#FFC107", userId: newUser.id },
        { name: "Carnes", icon: "restaurant", color: "#F44336", userId: newUser.id },
        { name: "Cereais", icon: "grass", color: "#9C27B0", userId: newUser.id },
        { name: "Vegetais", icon: "eco", color: "#8BC34A", userId: newUser.id },
        { name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId: newUser.id }
      ];
      
      console.log(`Criando categorias padrão para o usuário ${newUser.id}`);
      try {
        for (const category of defaultCategories) {
          const newCategory = await storage.createCategory(category);
          console.log(`Categoria criada: ${newCategory.name}`);
        }
      } catch (categoryError) {
        console.error("Erro ao criar categorias:", categoryError);
        // Continue mesmo se houver erro nas categorias
      }
      
      console.log(`Registro concluído com sucesso para o usuário ${newUser.id}`);
      return res.status(201).json({ id: newUser.id, username: newUser.username });
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Error details:", error.message, error.stack);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota de login
  authRouter.post("/login", async (req: Request, res: Response) => {
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
      
      // Definir usuário na sessão
      req.session.userId = user.id;
      await req.session.save();
      console.log(`Usuário ${user.id} autenticado com sucesso`);
      
      return res.status(200).json({ id: user.id, username: user.username, settings: user.settings });
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para login como visitante (demo)
  authRouter.post("/guest", async (req: Request, res: Response) => {
    try {
      console.log("Tentando login como visitante (demo_user)");
      
      // Verificar se o usuário demo já existe
      let demoUser = await storage.getUserByUsername("demo_user");
      
      // Se não existir, criar o usuário demo
      if (!demoUser) {
        console.log("Criando usuário demo...");
        demoUser = await storage.createUser({
          username: "demo_user",
          password: "demo123"
        });
        
        // Criar categorias padrão para o usuário demo
        if (demoUser) {
          console.log("Criando categorias padrão para o usuário demo...");
          const defaultCategories = [
            { name: "Frutas", icon: "nutrition", color: "#4CAF50", userId: demoUser.id },
            { name: "Laticínios", icon: "egg", color: "#FFC107", userId: demoUser.id },
            { name: "Carnes", icon: "restaurant", color: "#F44336", userId: demoUser.id },
            { name: "Cereais", icon: "grass", color: "#9C27B0", userId: demoUser.id },
            { name: "Vegetais", icon: "eco", color: "#8BC34A", userId: demoUser.id },
            { name: "Bebidas", icon: "local_bar", color: "#03A9F4", userId: demoUser.id }
          ];
          
          try {
            for (const category of defaultCategories) {
              await storage.createCategory(category);
            }
            console.log("Categorias padrão criadas com sucesso!");
          } catch (categoryError) {
            console.error("Erro ao criar categorias:", categoryError);
            // Continuar mesmo se houver erro nas categorias
          }
        }
      }
      
      if (!demoUser) {
        return res.status(500).json({ message: "Failed to access guest account" });
      }
      
      // Definir usuário demo na sessão
      req.session.userId = demoUser.id;
      await req.session.save();
      console.log(`Usuário demo ${demoUser.id} autenticado com sucesso`);
      
      return res.status(200).json({ 
        id: demoUser.id, 
        username: demoUser.username, 
        settings: demoUser.settings,
        isGuest: true
      });
    } catch (error) {
      console.error("Guest login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota de logout
  authRouter.post("/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Erro ao fazer logout:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Rota para obter o usuário atual
  authRouter.get("/current", async (req: Request, res: Response) => {
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
  
  // Montar o router
  app.use("/api/auth", authRouter);
}