import express from 'express';
import migratePostgresToFirebase from '../migrations/postgres-to-firebase';
import { STORAGE_PROVIDER } from '../config/storage-config';

const router = express.Router();

/**
 * Rota para iniciar a migração de dados do PostgreSQL para o Firebase
 * POST /api/migration/postgres-to-firebase
 */
router.post('/postgres-to-firebase', async (req, res) => {
  try {
    // Verificar se o usuário tem permissão administrativa
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    // Verificar se o Firebase já está ativo
    if (STORAGE_PROVIDER === 'firebase') {
      return res.status(400).json({ 
        message: 'Firebase já está ativo. A migração deve ser feita a partir do PostgreSQL.' 
      });
    }
    
    // Iniciar a migração
    const result = await migratePostgresToFirebase();
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(500).json({ message: result.message, error: result.error });
    }
  } catch (error) {
    console.error('Erro ao iniciar migração:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error });
  }
});

/**
 * Rota para verificar o status da migração
 * GET /api/migration/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    currentProvider: STORAGE_PROVIDER,
    firebaseEnabled: STORAGE_PROVIDER === 'firebase',
    postgresEnabled: STORAGE_PROVIDER === 'postgres',
  });
});

export default router;