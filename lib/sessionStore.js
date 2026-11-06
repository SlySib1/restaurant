const session = require('express-session');
const { prisma } = require('./prisma');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function expiresAtFor(sess) {
  const cookie = sess && sess.cookie ? sess.cookie : {};
  if (cookie.expires) return new Date(cookie.expires);
  if (typeof cookie.maxAge === 'number') return new Date(Date.now() + cookie.maxAge);
  return new Date(Date.now() + 7 * ONE_DAY_MS);
}

/**
 * Store phiên đăng nhập dựa trên Prisma/Postgres.
 *
 * Cookie chỉ chứa session id (đã ký, httpOnly). Toàn bộ dữ liệu phiên nằm trong
 * bảng Session, nên không có token nào bị đọc/ghi bởi JavaScript phía client.
 */
class PrismaSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.cleanupIntervalMs = options.cleanupIntervalMs || 60 * 60 * 1000;
    this.startCleanup();
  }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.pruneExpired().catch(() => {});
    }, this.cleanupIntervalMs);
    if (typeof this.cleanupTimer.unref === 'function') this.cleanupTimer.unref();
  }

  async pruneExpired() {
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  get(sid, callback) {
    prisma.session
      .findUnique({ where: { id: sid } })
      .then(async (row) => {
        if (!row) return callback(null, null);
        if (row.expiresAt.getTime() <= Date.now()) {
          await prisma.session.deleteMany({ where: { id: sid } });
          return callback(null, null);
        }
        let parsed = {};
        try {
          parsed = JSON.parse(row.data);
        } catch (error) {
          parsed = {};
        }
        return callback(null, parsed);
      })
      .catch((error) => callback(error));
  }

  set(sid, sess, callback = () => {}) {
    const userId = sess && typeof sess.userId === 'string' ? sess.userId : null;
    const payload = {
      data: JSON.stringify(sess),
      userId,
      expiresAt: expiresAtFor(sess)
    };

    prisma.session
      .upsert({
        where: { id: sid },
        create: { id: sid, ...payload },
        update: payload
      })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sid, sess, callback = () => {}) {
    prisma.session
      .update({
        where: { id: sid },
        data: { expiresAt: expiresAtFor(sess) }
      })
      .then(() => callback(null))
      .catch(() => callback(null)); // Phiên đã bị xoá thì không phải lỗi.
  }

  destroy(sid, callback = () => {}) {
    prisma.session
      .deleteMany({ where: { id: sid } })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  // Thu hồi toàn bộ phiên của một người dùng (dùng khi đổi/đặt lại mật khẩu).
  async destroyAllForUser(userId) {
    if (!userId) return 0;
    const { count } = await prisma.session.deleteMany({ where: { userId } });
    return count;
  }
}

module.exports = { PrismaSessionStore };
