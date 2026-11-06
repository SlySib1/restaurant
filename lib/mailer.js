/**
 * Gửi email giao dịch (OTP xác minh, link đặt lại mật khẩu).
 *
 * - MAIL_DRIVER=console (mặc định khi chưa cấu hình SMTP): in nội dung email ra
 *   terminal để phát triển và kiểm thử cục bộ.
 * - MAIL_DRIVER=smtp: gửi thật qua SMTP (nodemailer), cấu hình bằng SMTP_HOST,
 *   SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE và MAIL_FROM.
 *
 * Module này chỉ chạy ở server. Mã OTP/token không bao giờ được trả về cho
 * trình duyệt, không ghi vào localStorage/sessionStorage và không nằm trong URL
 * của trang đăng ký.
 */
const nodemailer = require('nodemailer');

const APP_NAME = 'Bếp Nhà';

function mailDriver() {
  const configured = String(process.env.MAIL_DRIVER || '').trim().toLowerCase();
  if (configured) return configured;
  return process.env.SMTP_HOST ? 'smtp' : 'console';
}

function fromAddress() {
  return process.env.MAIL_FROM || `${APP_NAME} <no-reply@bepnha.local>`;
}

let transport;
function smtpTransport() {
  if (transport) return transport;
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  if (!host) throw new Error('SMTP_HOST chưa được cấu hình.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT không hợp lệ.');
  }
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Cần cấu hình đồng thời SMTP_USER và SMTP_PASS.');
  }
  transport = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: user
      ? { user, pass }
      : undefined
  });
  return transport;
}

function logToConsole({ to, subject, text }) {
  const line = '─'.repeat(64);
  console.log(`\n${line}\n📧 EMAIL (chế độ phát triển, không gửi thật)\nTới: ${to}\nTiêu đề: ${subject}\n${line}\n${text}\n${line}\n`);
}

async function sendMail({ to, subject, text, html }) {
  const driver = mailDriver();
  if (driver === 'smtp') {
    await smtpTransport().sendMail({ from: fromAddress(), to, subject, text, html });
    console.log(`📧 Đã gửi email "${subject}" tới ${to}`);
    return;
  }
  if (driver === 'console') {
    logToConsole({ to, subject, text });
    return;
  }
  throw new Error(`MAIL_DRIVER không được hỗ trợ: ${driver}`);
}

async function sendVerificationOtp({ to, name, otp, expiresInMinutes }) {
  const subject = `Mã xác minh đăng ký ${APP_NAME}: ${otp}`;
  const text = [
    `Xin chào ${name},`,
    '',
    `Mã xác minh tài khoản ${APP_NAME} của bạn là: ${otp}`,
    `Mã có hiệu lực trong ${expiresInMinutes} phút và chỉ dùng được một lần.`,
    '',
    'Nếu bạn không tạo tài khoản này, hãy bỏ qua email này.',
    '',
    APP_NAME
  ].join('\n');
  await sendMail({ to, subject, text });
}

async function sendPasswordReset({ to, name, resetUrl, expiresInMinutes }) {
  const subject = `Đặt lại mật khẩu ${APP_NAME}`;
  const text = [
    `Xin chào ${name},`,
    '',
    'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.',
    'Mở liên kết dưới đây để tạo mật khẩu mới:',
    '',
    resetUrl,
    '',
    `Liên kết có hiệu lực trong ${expiresInMinutes} phút và chỉ dùng được một lần.`,
    'Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.',
    '',
    APP_NAME
  ].join('\n');
  await sendMail({ to, subject, text });
}

module.exports = { sendMail, sendVerificationOtp, sendPasswordReset, mailDriver };
