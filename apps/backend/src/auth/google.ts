import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env';
import prisma from '../config/database';

passport.use(new GoogleStrategy({
  clientID: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  callbackURL: env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0].value;
    if (!email) {
      return done(new Error('No email found'));
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
        googleId: profile.id,
      },
      create: {
        email,
        name: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
        googleId: profile.id,
      },
    });

    done(null, user);
  } catch (error) {
    done(error as Error);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
