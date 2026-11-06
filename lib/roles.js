/**
 * Danh sách email quản trị lấy từ biến môi trường ADMIN_EMAILS.
 * Ví dụ: ADMIN_EMAILS="chuquan@bepnha.vn,letan@bepnha.vn"
 *
 * Quyền admin chỉ được cấp ở server dựa trên biến môi trường này hoặc bằng lệnh
 * `npm run make:admin -- email@example.com`; người dùng không thể tự đổi role
 * qua biểu mẫu đăng ký.
 */
function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return adminEmails().includes(normalized);
}

function roleForEmail(email) {
  return isAdminEmail(email) ? 'admin' : 'customer';
}

module.exports = { adminEmails, isAdminEmail, roleForEmail };
