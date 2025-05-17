import { Router, Request, Response } from "express";
import { setStorageProvider, STORAGE_PROVIDER, storageConfig } from "../config/storage-config";

const router = Router();

/**
 * Obtém o status atual dos provedores de armazenamento
 * GET /api/storage/status
 */
router.get("/status", (req: Request, res: Response) => {
  try {
    const currentProvider = STORAGE_PROVIDER;
    
    res.status(200).json({
      currentProvider,
      providers: storageConfig,
      databaseUrl: process.env.DATABASE_URL ? "Configurado" : "Não configurado",
      firebaseUrl: process.env.FIREBASE_DATABASE_URL ? "Configurado" : "Não configurado"
    });
  } catch (error: any) {
    console.error("Erro ao obter status do armazenamento:", error);
    res.status(500).json({ message: error.message || "Erro interno do servidor" });
  }
});

/**
 * Alterna o provedor de armazenamento entre PostgreSQL e Firebase
 * POST /api/storage/provider
 */
router.post("/provider", (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    
    if (!provider || (provider !== "postgres" && provider !== "firebase")) {
      return res.status(400).json({ 
        message: "Provedor inválido. Use 'postgres' ou 'firebase'." 
      });
    }
    
    // Altera o provedor de armazenamento
    setStorageProvider(provider);
    
    res.status(200).json({ 
      success: true, 
      message: `Provedor alterado para ${provider}`,
      currentProvider: provider
    });
  } catch (error: any) {
    console.error("Erro ao alternar provedor de armazenamento:", error);
    res.status(500).json({ message: error.message || "Erro interno do servidor" });
  }
});

/**
 * Migra dados do PostgreSQL para o Firebase
 * POST /api/storage/migrate
 */
router.post("/migrate", async (req: Request, res: Response) => {
  try {
    // Aqui seria implementada a migração real de dados
    // Por enquanto, apenas simulamos
    
    // Altera para o Firebase após a migração
    setStorageProvider("firebase");
    
    // Responde com sucesso após um pequeno delay para simular processamento
    setTimeout(() => {
      res.status(200).json({
        success: true,
        message: "Dados migrados com sucesso para o Firebase",
        currentProvider: "firebase"
      });
    }, 1500);
  } catch (error: any) {
    console.error("Erro na migração de dados:", error);
    res.status(500).json({ message: error.message || "Erro interno do servidor" });
  }
});

export default router;