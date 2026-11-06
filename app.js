require('dotenv').config({ path: ['.env.local', '.env'] });
const crypto = require('crypto');
const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');

const { PrismaSessionStore } = require('./lib/sessionStore');
const { ensureCsrf, csrfProtect, exposeFlash, attachCurrentUser, requireAdmin } = require('./lib/authMiddleware');
const { mailDriver } = require('./lib/mailer');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Cho phép gửi PATCH và DELETE thông qua query parameter _method

function resolveSessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim();
  if (secret.length >= 32) return secret;
  if (isProduction) {
    throw new Error('Thiếu SESSION_SECRET (tối thiểu 32 ký tự) trong môi trường production.');
  }
  console.warn('[cảnh báo] Chưa có SESSION_SECRET trong .env — dùng khóa tạm cho môi trường phát triển.');
  return crypto.randomBytes(32).toString('hex');
}

// Phiên đăng nhập lưu trong Postgres; cookie chỉ chứa session id đã ký.
const sessionStore = new PrismaSessionStore();
app.locals.sessionStore = sessionStore;

app.use(
  session({
    name: 'bepnha.sid',
    secret: resolveSessionSecret(),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction && process.env.SESSION_COOKIE_SECURE !== 'false',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    }
  })
);

app.use(ensureCsrf);
app.use(csrfProtect);
app.use(exposeFlash);
app.use(attachCurrentUser);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import Routers
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const catalogRouter = require('./routes/catalog');
const adminDishRouter = require('./routes/adminDishes');
const adminChefRouter = require('./routes/adminChefs');
const adminIngredientRouter = require('./routes/adminIngredients');

// Routes
app.use('/auth', authRouter);
app.use('/dishes', userRouter);
app.use('/', catalogRouter);
// Toàn bộ khu vực quản trị yêu cầu đăng nhập với quyền admin (xem, thêm, sửa, xoá).
app.use('/admin/dishes', requireAdmin, adminDishRouter);
app.use('/admin/chefs', requireAdmin, adminChefRouter);
app.use('/admin/ingredients', requireAdmin, adminIngredientRouter);

app.get('/', (req, res) => {
  res.redirect('/dishes');
});

// Handler 404 chung
app.use((req, res) => {
  res.status(404).send('404 - Không tìm thấy trang');
});

// Handler lỗi chung: không trả stack trace ra ngoài.
app.use((error, req, res, next) => {
  console.error('Lỗi máy chủ:', error);
  if (res.headersSent) return next(error);

  try {
    return res.status(500).render('auth/message', {
      title: 'Có lỗi xảy ra',
      heading: 'Máy chủ đang gặp sự cố',
      message: 'Chúng tôi không thể xử lý yêu cầu này. Vui lòng thử lại sau ít phút.',
      tone: 'error',
      links: [{ href: '/dishes', label: 'Về trang thực đơn' }]
    });
  } catch (renderError) {
    return res.status(500).send('500 - Lỗi máy chủ');
  }
});

const server = app.listen(PORT, () => {
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : PORT;
  console.log(`Server đang chạy tại http://localhost:${port}`);
  console.log(`Email giao dịch: chế độ "${mailDriver()}"`);
});
