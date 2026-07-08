import { Router } from 'express';
const router = Router();

// Pure decoupled state tracking checkpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' }
  });
});

export default router;
