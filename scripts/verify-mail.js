require('dotenv').config({ path: ['.env.local', '.env'] });

const { verifyMailTransport } = require('../lib/mailer');

verifyMailTransport()
  .then(() => {
    console.log('SMTP kết nối và xác thực thành công.');
  })
  .catch((error) => {
    console.error('Không thể kết nối SMTP:', error.message);
    process.exitCode = 1;
  });
