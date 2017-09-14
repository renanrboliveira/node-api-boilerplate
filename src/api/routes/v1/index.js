import express from 'express';
import userRoutes from './user.route';
import authRoutes from './auth.route';

const router = express.Router();

/**
 * GET v1/
 */
router.get('/', (req, res) => res.send('It\'s Work!'));

/**
 * GET v1/status
 */
router.get('/status', (req, res) => res.send('OK'));

/**
 * GET v1/docs
 */
router.use('/docs', express.static('docs'));

/**
 * GET v1/users
 */
router.use('/users', userRoutes);

/**
 * GET v1/auth
 */
router.use('/auth', authRoutes);

export default router;
