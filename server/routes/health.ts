import { Router } from 'express';

const router = Router();

// Sonde de vie minimale — n'expose plus la taille de la base ni les compteurs
// internes (fuite d'information repérée dans l'audit P0).
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RecovAI Backend API',
    timestamp: new Date().toISOString(),
  });
});

export default router;
