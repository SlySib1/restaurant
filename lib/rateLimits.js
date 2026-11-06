const { rateLimit } = require('express-rate-limit');

function limiter({ windowMs, limit, message, backHref, backLabel }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).render('auth/message', {
        title: 'Tạm thời bị giới hạn',
        heading: 'Bạn thao tác quá nhanh',
        message,
        tone: 'error',
        links: [{ href: backHref, label: backLabel }]
      });
    }
  });
}

const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Quá nhiều yêu cầu đăng ký từ địa chỉ này. Vui lòng thử lại sau 1 giờ.',
  backHref: '/auth/register',
  backLabel: 'Quay lại trang đăng ký'
});

const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  backHref: '/auth/login',
  backLabel: 'Quay lại trang đăng nhập'
});

const otpLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Bạn đã thử mã xác minh quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  backHref: '/auth/verify-otp',
  backLabel: 'Quay lại nhập mã'
});

const resendOtpLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  message: 'Bạn đã yêu cầu gửi lại mã quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
  backHref: '/auth/verify-otp',
  backLabel: 'Quay lại nhập mã'
});

const forgotPasswordLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
  backHref: '/auth/forgot-password',
  backLabel: 'Quay lại'
});

const resetPasswordLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Bạn đã thử đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  backHref: '/auth/forgot-password',
  backLabel: 'Yêu cầu liên kết mới'
});

module.exports = {
  registerLimiter,
  loginLimiter,
  otpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter
};
