import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from './redis';
import { env } from './env';

export const sessionMiddleware = session({
  store: new RedisStore({ client: redis }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
});
