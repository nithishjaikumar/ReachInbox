import { Router } from 'express';
import passport from 'passport';
import { requireAuth } from '../auth/middleware';
import { env } from '../config/env';

export const authRouter = Router();

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
});

authRouter.post('/logout', requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
