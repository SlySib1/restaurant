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
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
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
  logToConsole({ to, subject, text });
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
