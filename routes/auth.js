const express = require('express');
const { prisma } = require('../lib/prisma');
const {
  normalizeEmail,
  isValidEmail,
  validateName,
  validatePassword,
  hashPassword,
  verifyPassword,
  sha256,
  randomToken,
  randomOtp,
  safeEqual,
  randomCaptchaCode,
  storeCaptcha,
  verifyCaptcha,
  OTP_LENGTH,
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS
} = require('../lib/security');
const { captchaSvg } = require('../lib/captcha');
const { sendVerificationOtp, sendPasswordReset } = require('../lib/mailer');
const { roleForEmail, isAdminEmail } = require('../lib/roles');
const { flash } = require('../lib/authMiddleware');
const {
  registerLimiter,
  loginLimiter,
  otpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter
} = require('../lib/rateLimits');

const router = express.Router();

const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;
const RESET_TTL_MINUTES = Math.round(RESET_TOKEN_TTL_MS / 60000);
const OTP_TTL_MINUTES = Math.round(OTP_TTL_MS / 60000);
const GENERIC_REGISTER_MESSAGE =
  'Nếu email hợp lệ và chưa được sử dụng, chúng tôi đã gửi mã xác minh. Hãy kiểm tra hộp thư (cả mục Spam).';
const GENERIC_FORGOT_MESSAGE =
  'Nếu email này có tài khoản, chúng tôi đã gửi một liên kết đặt lại mật khẩu. Liên kết chỉ dùng được một lần và sẽ hết hạn sau ít phút.';
// Hash giả để thời gian phản hồi của trang đăng nhập không tiết lộ email có tồn tại hay không.
const TIMING_EQUALIZER_HASH = '$2b$12$9ojQ82EEuwbhSSliUY7MHucNuajLBiFqpzdhdwwKWRx.LnGoqpizy';

function emailDeliveryFailure(res, links) {
  return res.status(503).render('auth/message', {
    title: 'Không gửi được email',
    heading: 'Chưa thể gửi email xác minh',
    message: 'Tài khoản chưa được xác minh vì email chưa gửi được. Vui lòng thử lại sau hoặc liên hệ quản trị viên để kiểm tra cấu hình SMTP.',
    tone: 'error',
    links
  });
}

function safeNextPath(value) {
  const target = typeof value === 'string' ? value : '';
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return null;
  if (target.startsWith('/auth/')) return null;
  return target;
}

function maskEmail(email) {
  const value = String(email || '');
  const [localPart, domain] = value.split('@');
  if (!domain) return value;
  const visible = localPart.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 1, 2))}@${domain}`;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function baseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

async function issueVerificationOtp(user) {
  const otp = randomOtp();
  const [, token] = await prisma.$transaction([
    // Mã cũ chưa dùng hết hiệu lực ngay khi phát hành mã mới.
    prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() }
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        codeHash: sha256(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MS)
      }
    })
  ]);

  try {
    await sendVerificationOtp({
      to: user.email,
      name: user.name,
      otp,
      expiresInMinutes: OTP_TTL_MINUTES
    });
  } catch (error) {
    console.error('Không gửi được email xác minh:', error.message);
    try {
      await prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() }
      });
    } catch (cleanupError) {
      console.error('Không thể vô hiệu hóa mã xác minh chưa gửi:', cleanupError.message);
    }
    const deliveryError = new Error('Không gửi được email xác minh.');
    deliveryError.name = 'EmailDeliveryError';
    throw deliveryError;
  }
  return otp;
}

// Ảnh CAPTCHA: mã chỉ nằm trong phiên ở server, trình duyệt chỉ nhận SVG.
router.get('/captcha.svg', (req, res) => {
  const code = randomCaptchaCode(5);
  storeCaptcha(req, code);
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.send(captchaSvg(code));
});

// ---- Đăng ký ----
router.get('/register', (req, res) => {
  if (req.user) return res.redirect(303, '/dishes');
  res.render('auth/register', { errors: [], formData: {} });
});

router.post('/register', registerLimiter, async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const errors = [];

  const nameError = validateName(name);
  if (nameError) errors.push(nameError);
  if (!isValidEmail(email)) errors.push('Email không hợp lệ.');
  const passwordError = validatePassword(password);
  if (passwordError) errors.push(passwordError);
  if (password !== confirmPassword) errors.push('Mật khẩu nhập lại không khớp.');
  if (!verifyCaptcha(req, req.body.captcha)) {
    errors.push('Mã xác nhận không đúng hoặc đã hết hạn. Vui lòng thử lại.');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/register', { errors, formData: { name, email } });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    const passwordHash = await hashPassword(password);

    let user = existing;
    if (existing) {
      // Không tiết lộ email đã tồn tại: tài khoản đã xác minh thì im lặng dừng lại,
      // tài khoản chưa xác minh thì cho phép đăng ký lại và cấp mã mới.
      if (existing.emailVerifiedAt) {
        return res.render('auth/message', {
          title: 'Kiểm tra hộp thư',
          heading: 'Kiểm tra hộp thư của bạn',
          message: GENERIC_REGISTER_MESSAGE,
          tone: 'info',
          links: [
            { href: '/auth/login', label: 'Đi tới đăng nhập' },
            { href: '/auth/forgot-password', label: 'Quên mật khẩu' }
          ]
        });
      }
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: roleForEmail(email) }
      });
    } else {
      // Role do server quyết định từ ADMIN_EMAILS, không nhận từ biểu mẫu.
      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: roleForEmail(email)
        }
      });
    }

    try {
      await issueVerificationOtp(user);
    } catch (error) {
      if (error.name === 'EmailDeliveryError') {
        return emailDeliveryFailure(res, [
          { href: '/auth/register', label: 'Thử đăng ký lại' },
          { href: '/auth/login', label: 'Đi tới đăng nhập', variant: 'secondary' }
        ]);
      }
      throw error;
    }

    await regenerateSession(req);
    req.session.pendingUserId = user.id;
    flash(req, 'success', `Mã xác minh ${OTP_LENGTH} chữ số đã được gửi tới email của bạn.`);
    await saveSession(req);

    return res.redirect(303, '/auth/verify-otp');
  } catch (error) {
    return next(error);
  }
});

// ---- Xác minh email bằng OTP ----
router.get('/verify-otp', async (req, res) => {
  if (req.user) return res.redirect(303, '/dishes');
  if (!req.session.pendingUserId) {
    flash(req, 'error', 'Vui lòng đăng ký trước khi xác minh email.');
    return res.redirect(303, '/auth/register');
  }

  const pending = await prisma.user.findUnique({
    where: { id: req.session.pendingUserId },
    select: { email: true, emailVerifiedAt: true }
  });
  if (!pending) {
    delete req.session.pendingUserId;
    return res.redirect(303, '/auth/register');
  }
  if (pending.emailVerifiedAt && !req.user) {
    // Đã xác minh nhưng chưa đăng nhập: chuyển sang đăng nhập.
    delete req.session.pendingUserId;
    flash(req, 'success', 'Email đã được xác minh. Vui lòng đăng nhập.');
    return res.redirect(303, '/auth/login');
  }

  return res.render('auth/verify-otp', {
    errors: [],
    maskedEmail: maskEmail(pending.email),
    otpLength: OTP_LENGTH,
    expiresInMinutes: OTP_TTL_MINUTES
  });
});

router.post('/verify-otp', otpLimiter, async (req, res, next) => {
  const code = String(req.body.code || '').replace(/\D/g, '');
  const errors = [];

  try {
    const pendingUserId = req.session.pendingUserId;
    const user = pendingUserId
      ? await prisma.user.findUnique({ where: { id: pendingUserId } })
      : null;

    if (!user) {
      return res.status(400).render('auth/message', {
        title: 'Không thể xác minh',
        heading: 'Phiên xác minh đã hết hạn',
        message: 'Vui lòng đăng ký lại hoặc đăng nhập để nhận mã xác minh mới.',
        tone: 'error',
        links: [{ href: '/auth/register', label: 'Đăng ký lại' }]
      });
    }

    if (!/^\d+$/.test(code) || code.length !== OTP_LENGTH) {
      errors.push(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác minh.`);
    }

    const token = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!token) {
      errors.push('Không tìm thấy mã hiệu lực. Vui lòng yêu cầu gửi lại mã.');
    } else if (token.expiresAt.getTime() < Date.now()) {
      errors.push('Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại mã.');
    } else if (token.attempts >= OTP_MAX_ATTEMPTS) {
      errors.push('Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu gửi lại mã mới.');
    } else if (errors.length === 0 && !safeEqual(sha256(code), token.codeHash)) {
      await prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } }
      });
      const remaining = Math.max(OTP_MAX_ATTEMPTS - (token.attempts + 1), 0);
      errors.push(
        remaining > 0
          ? `Mã xác minh không đúng. Bạn còn ${remaining} lần thử.`
          : 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu gửi lại mã mới.'
      );
    }

    if (errors.length > 0) {
      return res.status(400).render('auth/verify-otp', {
        errors,
        maskedEmail: maskEmail(user.email),
        otpLength: OTP_LENGTH,
        expiresInMinutes: OTP_TTL_MINUTES
      });
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: user.emailVerifiedAt || new Date() }
      })
    ]);

    // Chống session fixation: luôn tạo session id mới khi đăng nhập thành công.
    await regenerateSession(req);
    req.session.userId = user.id;
    flash(req, 'success', `Xin chào ${user.name}, tài khoản của bạn đã được xác minh.`);
    await saveSession(req);

    return res.redirect(303, '/dishes');
  } catch (error) {
    return next(error);
  }
});

router.post('/resend-otp', resendOtpLimiter, async (req, res, next) => {
  try {
    const pendingUserId = req.session.pendingUserId;
    const user = pendingUserId
      ? await prisma.user.findUnique({ where: { id: pendingUserId } })
      : null;

    if (!user) {
      return res.status(400).render('auth/message', {
        title: 'Không thể gửi lại mã',
        heading: 'Phiên xác minh đã hết hạn',
        message: 'Vui lòng đăng ký lại để nhận mã xác minh mới.',
        tone: 'error',
        links: [{ href: '/auth/register', label: 'Đăng ký lại' }]
      });
    }

    const latest = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    const createdInLastHour = await prisma.emailVerificationToken.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
    });

    if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
      return res.status(429).render('auth/message', {
        title: 'Vui lòng chờ',
        heading: 'Mã vừa được gửi',
        message: `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu mã mới.`,
        tone: 'error',
        links: [{ href: '/auth/verify-otp', label: 'Quay lại nhập mã' }]
      });
    }

    if (createdInLastHour >= OTP_MAX_PER_HOUR) {
      return res.status(429).render('auth/message', {
        title: 'Tạm thời bị giới hạn',
        heading: 'Đã gửi quá nhiều mã',
        message: 'Bạn đã yêu cầu gửi lại mã quá nhiều lần trong 1 giờ. Vui lòng thử lại sau.',
        tone: 'error',
        links: [{ href: '/auth/verify-otp', label: 'Quay lại nhập mã' }]
      });
    }

    try {
      await issueVerificationOtp(user);
    } catch (error) {
      if (error.name === 'EmailDeliveryError') {
        return emailDeliveryFailure(res, [
          { href: '/auth/verify-otp', label: 'Quay lại nhập mã' },
          { href: '/auth/login', label: 'Đăng nhập', variant: 'secondary' }
        ]);
      }
      throw error;
    }
    flash(req, 'success', 'Mã xác minh mới đã được gửi tới email của bạn.');
    return res.redirect(303, '/auth/verify-otp');
  } catch (error) {
    return next(error);
  }
});

// ---- Đăng nhập ----
router.get('/login', (req, res) => {
  if (req.user) return res.redirect(303, '/dishes');
  res.render('auth/login', { errors: [], formData: {}, next: safeNextPath(req.query.next) || '' });
});

router.post('/login', loginLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const nextPath = safeNextPath(req.body.next);
  const rememberMe = req.body.rememberMe === 'on' || req.body.rememberMe === 'true';

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(password, user ? user.passwordHash : TIMING_EQUALIZER_HASH);

    if (!user || !passwordMatches) {
      return res.status(401).render('auth/login', {
        errors: ['Email hoặc mật khẩu không đúng.'],
        formData: { email },
        next: nextPath || ''
      });
    }

    if (!user.emailVerifiedAt) {
      try {
        await issueVerificationOtp(user);
      } catch (error) {
        if (error.name === 'EmailDeliveryError') {
          return emailDeliveryFailure(res, [
            { href: '/auth/login', label: 'Thử đăng nhập lại' },
            { href: '/auth/register', label: 'Đăng ký', variant: 'secondary' }
          ]);
        }
        throw error;
      }
      await regenerateSession(req);
      req.session.pendingUserId = user.id;
      flash(req, 'success', 'Tài khoản chưa được xác minh. Chúng tôi đã gửi mã xác minh mới.');
      await saveSession(req);
      return res.redirect(303, '/auth/verify-otp');
    }

    // Nếu email được thêm vào ADMIN_EMAILS sau khi đã đăng ký thì tự nâng quyền.
    if (user.role !== 'admin' && isAdminEmail(user.email)) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    flash(req, 'success', `Xin chào ${user.name}, bạn đã đăng nhập thành công.`);
    await saveSession(req);

    return res.redirect(303, nextPath || '/dishes');
  } catch (error) {
    return next(error);
  }
});

// Chỉ cho phép đăng xuất bằng POST, kèm token CSRF.
router.get('/logout', (req, res) => {
  return res.status(405).render('auth/message', {
    title: 'Không hỗ trợ',
    heading: 'Phương thức không được hỗ trợ',
    message: 'Để đăng xuất, hãy dùng nút Đăng xuất trên thanh điều hướng.',
    tone: 'error',
    links: [{ href: '/dishes', label: 'Về trang thực đơn' }]
  });
});

router.post('/logout', (req, res, next) => {
  return req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('bepnha.sid', { path: '/' });
    return res.redirect(303, '/dishes');
  });
});

// ---- Quên mật khẩu ----
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { errors: [], formData: {} });
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return res.status(400).render('auth/forgot-password', {
      errors: ['Email không hợp lệ.'],
      formData: { email }
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Luôn trả về cùng một thông báo, dù email có tồn tại hay không.
    if (user) {
      const token = randomToken();
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() }
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: sha256(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
          }
        })
      ]);

      const resetUrl = `${baseUrl(req)}/auth/reset-password/${token}`;
      try {
        await sendPasswordReset({
          to: user.email,
          name: user.name,
          resetUrl,
          expiresInMinutes: RESET_TTL_MINUTES
        });
      } catch (error) {
        console.error('Không gửi được email đặt lại mật khẩu:', error.message);
      }
    }

    return res.render('auth/message', {
      title: 'Kiểm tra hộp thư',
      heading: 'Kiểm tra hộp thư của bạn',
      message: GENERIC_FORGOT_MESSAGE,
      tone: 'info',
      links: [
        { href: '/auth/login', label: 'Về trang đăng nhập' },
        { href: '/auth/forgot-password', label: 'Gửi lại yêu cầu' }
      ]
    });
  } catch (error) {
    return next(error);
  }
});

async function loadResetToken(token) {
  if (!token || token.length < 20) return null;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;
  return record;
}

function invalidResetLink(res) {
  return res.status(400).render('auth/message', {
    title: 'Liên kết không hợp lệ',
    heading: 'Liên kết không hợp lệ hoặc đã hết hạn',
    message: 'Liên kết đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau ít phút. Vui lòng yêu cầu liên kết mới.',
    tone: 'error',
    links: [{ href: '/auth/forgot-password', label: 'Yêu cầu liên kết mới' }]
  });
}

router.get('/reset-password/:token', async (req, res, next) => {
  try {
    const record = await loadResetToken(req.params.token);
    if (!record) return invalidResetLink(res);

    return res.render('auth/reset-password', {
      errors: [],
      token: req.params.token,
      email: maskEmail(record.user.email)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password/:token', resetPasswordLimiter, async (req, res, next) => {
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const errors = [];

  const passwordError = validatePassword(password);
  if (passwordError) errors.push(passwordError);
  if (password !== confirmPassword) errors.push('Mật khẩu nhập lại không khớp.');

  try {
    const record = await loadResetToken(req.params.token);
    if (!record) return invalidResetLink(res);

    if (errors.length > 0) {
      return res.status(400).render('auth/reset-password', {
        errors,
        token: req.params.token,
        email: maskEmail(record.user.email)
      });
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          emailVerifiedAt: new Date()
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
    ]);

    // Thu hồi mọi phiên cũ: mật khẩu mới phải được dùng để đăng nhập lại.
    await prisma.session.deleteMany({ where: { userId: record.userId } });

    await regenerateSession(req);
    flash(req, 'success', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
    await saveSession(req);

    return res.redirect(303, '/auth/login');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
