import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';
import { healthLimiter } from '../middleware/rateLimiter';

const router: Router = Router();
const controller = new HealthController();

router.get('/', healthLimiter, (req, res) => controller.check(req, res));

export default router;
