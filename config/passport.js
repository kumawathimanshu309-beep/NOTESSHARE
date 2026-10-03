require('dotenv').config();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// 1. Passport Local Strategy (Email or Username + Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'identifier',
      passwordField: 'password',
    },
    async (identifier, password, done) => {
      try {
        const query = identifier.trim().toLowerCase();
        // Search by email OR username and explicitly include password field
        const user = await User.findOne({
          $or: [{ email: query }, { username: query }],
        }).select('+password');

        if (!user) {
          return done(null, false, { message: 'Invalid username/email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid username/email or password.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const googleCallbackUrl = (process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback').trim();

// 2. Passport Google OAuth2.0 Strategy (Gated safely by environment configuration)
if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const emailObj = profile.emails && profile.emails[0];
          const email = emailObj ? emailObj.value.toLowerCase() : null;
          const isVerified = emailObj ? emailObj.verified === true || profile._json?.email_verified === true : false;

          if (!email) {
            return done(null, false, { message: 'No email address provided by Google account.' });
          }

          const adminEmail = (process.env.ADMIN_EMAIL || 'kumawathimanshu309@gmail.com').toLowerCase().trim();

          // 1. Try finding user by googleId first
          let user = await User.findOne({ googleId });
          if (user) {
            if (user.email === adminEmail) {
              let saveNeeded = false;
              if (user.role !== 'admin') {
                user.role = 'admin';
                saveNeeded = true;
              }
              if (!user.isTeacherCapability) {
                user.isTeacherCapability = true;
                saveNeeded = true;
              }
              if (user.verificationStatus !== 'verified') {
                user.verificationStatus = 'verified';
                saveNeeded = true;
              }
              if (saveNeeded) await user.save();
            }
            return done(null, user);
          }

          // 2. Try finding user by verified email
          user = await User.findOne({ email });
          if (user) {
            if (!isVerified) {
              return done(null, false, { message: 'Unverified Google email cannot be linked to existing account.' });
            }
            // Link googleId to existing local account without overwriting authProvider or role unless primary admin
            user.googleId = googleId;
            if (email === adminEmail) {
              if (user.role !== 'admin') user.role = 'admin';
              if (!user.isTeacherCapability) user.isTeacherCapability = true;
              if (user.verificationStatus !== 'verified') user.verificationStatus = 'verified';
            }
            await user.save();
            return done(null, user);
          }

          // 3. New Google User Creation (Requires Verified Email)
          if (!isVerified) {
            return done(null, false, { message: 'Unverified Google email address is not permitted for account creation.' });
          }

          let baseUsername = (profile.displayName || email.split('@')[0])
            .toLowerCase()
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 25);

          if (baseUsername.length < 3) {
            baseUsername = `user_${baseUsername}`.slice(0, 25);
          }

          let finalUsername = baseUsername;
          let counter = 1;
          while (await User.findOne({ username: finalUsername })) {
            finalUsername = `${baseUsername.slice(0, 20)}_${counter}`;
            counter++;
          }

          const assignedRole = email === adminEmail ? 'admin' : 'student';
          const isTeacherCap = email === adminEmail;
          const verStatus = email === adminEmail ? 'verified' : 'pending';

          user = await User.create({
            name: profile.displayName || 'Google User',
            username: finalUsername,
            email,
            googleId,
            authProvider: 'google',
            role: assignedRole,
            isTeacherCapability: isTeacherCap,
            verificationStatus: verStatus,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '/images/logo.png',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (user) {
      const adminEmail = (process.env.ADMIN_EMAIL || 'kumawathimanshu309@gmail.com').toLowerCase().trim();
      if (user.email === adminEmail) {
        let needsSave = false;
        if (user.role !== 'admin') {
          user.role = 'admin';
          needsSave = true;
        }
        if (!user.isTeacherCapability) {
          user.isTeacherCapability = true;
          needsSave = true;
        }
        if (user.verificationStatus !== 'verified') {
          user.verificationStatus = 'verified';
          needsSave = true;
        }
        if (needsSave) {
          await user.save();
        }
      }
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
