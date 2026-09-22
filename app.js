require('dotenv').config();

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStoreModule = require('connect-mongo');
const flash = require('connect-flash');

const passport = require('./config/passport');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const notesRoutes = require('./routes/notes');
const profileRoutes = require('./routes/profile');
const commentsRoutes = require('./routes/comments');
const doubtsRoutes = require('./routes/doubts');
const answersRoutes = require('./routes/answers');
const teacherRoutes = require('./routes/teacher');
const notificationRoutes = require('./routes/notifications');
const notificationService = require('./services/notificationService');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const compressionMiddleware = require('./middleware/compression');

const app = express();
const MongoStore = MongoStoreModule.create ? MongoStoreModule : MongoStoreModule.default;

// 1. Security Middleware & CSP Configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        frameSrc: ["'self'"],
      },
    },
  })
);

// Intentional CORS setup (avoiding blind '*' wildcard)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    credentials: true,
  })
);

// Native Response Compression Middleware
app.use(compressionMiddleware);

// 2. HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 3. Static Files Middleware with HTTP Caching
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (
        filePath.endsWith('.css') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.png') ||
        filePath.endsWith('.webp') ||
        filePath.endsWith('.svg') ||
        filePath.endsWith('.woff2')
      ) {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
    },
  })
);

// 4. EJS Template Engine Setup
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. Body & Request Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

const csrfProtection = require('./middleware/csrf');
app.use(csrfProtection);

// 6. Session Management with MongoStore
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyshare';
const sessionSecret = process.env.SESSION_SECRET || 'dev_session_secret_key_change_in_production';

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      touchAfter: 24 * 3600, // Lazy update session once per 24 hours unless modified
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days session lifetime
    },
  })
);

// 7. Flash Messages Middleware
app.use(flash());

// 8. Passport Authentication Middleware
app.use(passport.initialize());
app.use(passport.session());

// 9. Global Response Locals Middleware (Auth state, Flash messages & Unread Notification count)
app.use(async (req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.reqUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;

  if (req.isAuthenticated() && req.user) {
    try {
      res.locals.unreadNotificationCount = await notificationService.getUnreadCount(req.user._id);
    } catch (err) {
      res.locals.unreadNotificationCount = 0;
    }
  } else {
    res.locals.unreadNotificationCount = 0;
  }
  next();
});

const teacherRequestRoutes = require('./routes/teacherRequests');

// 10. Application Routers
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/notes', notesRoutes);
app.use('/profile', profileRoutes);
app.use('/comments', commentsRoutes);
app.use('/doubts', doubtsRoutes);
app.use('/answers', answersRoutes);
app.use('/teacher', teacherRoutes);
app.use('/teachers', teacherRoutes);
app.use('/teacher-requests', teacherRequestRoutes);
app.use('/notifications', notificationRoutes);

// 11. 404 & Centralized Error Middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
