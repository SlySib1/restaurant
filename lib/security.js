const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72; // bcrypt chỉ dùng tối đa 72 byte
const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validateName(value) {
  const name = String(value || '').trim();
  if (name.length < 2) return 'Họ tên cần ít nhất 2 ký tự.';
  if (name.length > 60) return 'Họ tên không được dài quá 60 ký tự.';
  return null;
}

// Chính sách mật khẩu: tối thiểu 8 ký tự, có chữ và số, tối đa 72 byte.
function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) return 'Vui lòng nhập mật khẩu.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu không được dài quá ${PASSWORD_MAX_LENGTH} ký tự.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Mật khẩu cần có cả chữ và số.';
  }
  return null;
}

// Luôn băm mật khẩu bằng bcrypt, không bao giờ lưu mật khẩu gốc.
function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash) return Promise.resolve(false);
  return bcrypt.compare(password, passwordHash);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken() {
  // base64url: an toàn để đặt trong URL, 32 byte = 256 bit entropy.
  return crypto.randomBytes(32).toString('base64url');
}

function randomOtp() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---- CSRF ----
function ensureCsrfToken(req) {
  if (!req.session) return '';
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('base64url');
  }
  return req.session.csrfToken;
}

function requestCsrfToken(req) {
  return (
    (req.body && (req.body._csrf || req.body.csrfToken)) ||
    req.get('x-csrf-token') ||
    req.get('x-xsrf-token') ||
    ''
  );
}

function verifyCsrfToken(req) {
  const expected = req.session ? req.session.csrfToken : '';
  const received = requestCsrfToken(req);
  if (!expected || !received) return false;
  return safeEqual(received, expected);
}

// ---- CAPTCHA (sinh và kiểm tra hoàn toàn ở server) ----
function randomCaptchaCode(length = 5) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += CAPTCHA_ALPHABET[crypto.randomInt(0, CAPTCHA_ALPHABET.length)];
  }
  return code;
}

function storeCaptcha(req, code) {
  req.session.captcha = { hash: sha256(code), expiresAt: Date.now() + CAPTCHA_TTL_MS };
}

function verifyCaptcha(req, answer) {
  const record = req.session ? req.session.captcha : null;
  // CAPTCHA chỉ dùng một lần: xoá ngay sau khi kiểm tra.
  if (req.session) delete req.session.captcha;
  if (!record || typeof record.hash !== 'string') return false;
  if (Number(record.expiresAt) < Date.now()) return false;
  const normalized = String(answer || '').replace(/\s+/g, '').toUpperCase();
  if (!normalized) return false;
  return safeEqual(sha256(normalized), record.hash);
}

module.exports = {
  BCRYPT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  OTP_LENGTH,
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  CAPTCHA_TTL_MS,
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
  ensureCsrfToken,
  requestCsrfToken,
  verifyCsrfToken,
  randomCaptchaCode,
  storeCaptcha,
  verifyCaptcha
};
