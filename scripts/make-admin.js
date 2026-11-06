require('dotenv').config({ path: ['.env.local', '.env'] });

const { PrismaClient } = require('@prisma/client');

const email = String(process.argv[2] || '').trim().toLowerCase();

async function main() {
  if (!email) {
    console.error('Cách dùng: npm run make:admin -- email@example.com');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`Không tìm thấy tài khoản "${email}". Hãy đăng ký tài khoản này trước.`);
      process.exitCode = 1;
      return;
    }

    if (user.role === 'admin') {
      console.log(`Tài khoản ${email} đã có quyền quản trị.`);
      return;
    }

    await prisma.user.update({ where: { email }, data: { role: 'admin' } });
    console.log(`Đã cấp quyền quản trị cho ${email}. Hãy tải lại trang để thấy khu vực quản trị.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Không thể cấp quyền quản trị:', error.message);
  process.exitCode = 1;
});
