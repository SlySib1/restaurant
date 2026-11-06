const { prisma } = require('./prisma');
const { ensureCsrfToken, verifyCsrfToken } = require('./security');

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true; // Form POST từ trình duyệt cũ không gửi Origin nhưng vẫn có CSRF token.
  try {
    return new URL(origin).host === req.get('host');
  } catch (error) {
    return false;
  }
}

// Cung cấp token CSRF cho view dưới dạng lazy getter.
//
// Chỉ trang nào thực sự render biểu mẫu mới đọc tới token, nhờ vậy các request
// không cần phiên (ảnh tĩnh, favicon, trang 404...) không tạo phiên mới và không
// ghi đè cookie đăng nhập đang dùng.
function ensureCsrf(req, res, next) {
  Object.defineProperty(res.locals, 'csrfToken', {
    configurable: true,
    enumerable: true,
    get() {
      return ensureCsrfToken(req);
    }
  });
  next();
}

function rejectIfInvalidCsrf(req, res, next) {
  if (!isSameOrigin(req)) {
    return res.status(403).render('auth/message', {
      title: 'Yêu cầu bị từ chối',
      heading: 'Yêu cầu không hợp lệ',
      message: 'Yêu cầu gửi từ một nguồn khác không được chấp nhận. Vui lòng tải lại trang và thử lại.',
      tone: 'error',
      links: [{ href: '/dishes', label: 'Về trang thực đơn' }]
    });
  }

  if (!verifyCsrfToken(req)) {
    return res.status(403).render('auth/message', {
      title: 'Phiên đã hết hạn',
      heading: 'Phiên làm việc đã hết hạn',
      message: 'Vì lý do an toàn, vui lòng tải lại trang và gửi lại biểu mẫu.',
      tone: 'error',
      links: [{ href: '/dishes', label: 'Về trang thực đơn' }]
    });
  }

  return next();
}

// Chặn mọi request làm thay đổi dữ liệu nếu thiếu token hoặc khác origin.
function csrfProtect(req, res, next) {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  // Với multipart/form-data, body chỉ có sau khi multer xử lý nên các route đó
  // dùng csrfProtectAfterUpload ngay sau middleware upload.
  if (req.is('multipart/form-data')) return next();
  return rejectIfInvalidCsrf(req, res, next);
}

function csrfProtectAfterUpload(req, res, next) {
  return rejectIfInvalidCsrf(req, res, next);
}

// Flash message ngắn hạn, lưu trong phiên và chỉ hiển thị một lần.
function flash(req, type, text) {
  if (!req.session) return;
  req.session.flash = { type, text };
}

function exposeFlash(req, res, next) {
  const message = req.session ? req.session.flash : null;
  if (req.session) delete req.session.flash;
  res.locals.flash = message || null;
  next();
}

// Nạp người dùng hiện tại từ phiên (cookie httpOnly) để view/nav sử dụng.
async function attachCurrentUser(req, res, next) {
  res.locals.currentUser = null;
  req.user = null;
  if (!req.session || !req.session.userId) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true, avatarUrl: true }
    });

    if (!user) {
      delete req.session.userId;
      return next();
    }

    req.user = user;
    res.locals.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  flash(req, 'error', 'Vui lòng đăng nhập để tiếp tục.');
  return res.redirect(303, `/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
}

function requireGuest(req, res, next) {
  if (!req.user) return next();
  return res.redirect(303, '/dishes');
}

// Khu vực quản trị: bắt buộc đăng nhập VÀ có role admin.
// Khách chưa đăng nhập được đưa tới trang đăng nhập kèm đường dẫn quay lại.
async function requireAdmin(req, res, next) {
  if (!req.user) {
    flash(req, 'error', 'Vui lòng đăng nhập bằng tài khoản quản trị để sửa hoặc xoá dữ liệu.');
    return res.redirect(303, `/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
  }

  if (req.user.role !== 'admin') {
    // Bootstrap: nếu cơ sở dữ liệu chưa có quản trị viên nào thì tài khoản đã đăng
    // nhập đầu tiên được cấp quyền admin, tránh khoá cứng chủ nhà hàng khỏi hệ thống.
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      const promoted = await prisma.user.update({
        where: { id: req.user.id },
        data: { role: 'admin' },
        select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true, avatarUrl: true }
      });
      req.user = promoted;
      res.locals.currentUser = promoted;
      console.log(`[bootstrap] Đã cấp quyền admin cho tài khoản đầu tiên: ${promoted.email}`);
      return next();
    }

    return res.status(403).render('auth/message', {
      title: 'Không có quyền truy cập',
      heading: 'Tài khoản của bạn không có quyền quản trị',
      message:
        'Chỉ quản trị viên mới được thêm, sửa hoặc xoá món ăn, đầu bếp và nguyên liệu. ' +
        'Nếu bạn là chủ nhà hàng, hãy cấp quyền bằng lệnh: npm run make:admin -- ' +
        'email-cua-ban@example.com',
      tone: 'error',
      links: [
        { href: '/dishes', label: 'Về trang thực đơn' },
        { href: '/auth/login', label: 'Đăng nhập tài khoản khác', variant: 'secondary' }
      ]
    });
  }

  return next();
}

module.exports = {
  ensureCsrf,
  csrfProtect,
  csrfProtectAfterUpload,
  flash,
  exposeFlash,
  attachCurrentUser,
  requireAuth,
  requireGuest,
  requireAdmin,
  isSameOrigin
};
