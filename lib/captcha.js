const crypto = require('crypto');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Vẽ CAPTCHA thành SVG ngay trên server.
 * Mã CAPTCHA không bao giờ được gửi xuống client dưới dạng chữ đọc được,
 * trình duyệt chỉ nhận hình ảnh.
 */
function captchaSvg(code) {
  const width = 190;
  const height = 64;
  const characters = code.split('');

  const glyphs = characters
    .map((character, index) => {
      const x = 22 + index * 32 + crypto.randomInt(-3, 4);
      const y = 44 + crypto.randomInt(-5, 6);
      const rotate = crypto.randomInt(-18, 19);
      const fontSize = 30 + crypto.randomInt(-3, 4);
      const color = ['#315d42', '#244a34', '#a8562f', '#3f5b7a'][crypto.randomInt(0, 4)];
      return `<text x="${x}" y="${y}" fill="${color}" font-family="'DM Sans', Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="2" transform="rotate(${rotate} ${x} ${y})">${escapeXml(character)}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 5 })
    .map(() => {
      const x1 = crypto.randomInt(0, width);
      const y1 = crypto.randomInt(0, height);
      const x2 = crypto.randomInt(0, width);
      const y2 = crypto.randomInt(0, height);
      return `<path d="M${x1} ${y1} Q ${crypto.randomInt(0, width)} ${crypto.randomInt(0, height)} ${x2} ${y2}" fill="none" stroke="#a8b6a1" stroke-width="1.2" opacity="0.8" />`;
    })
    .join('');

  const dots = Array.from({ length: 28 })
    .map(() => {
      const cx = crypto.randomInt(0, width);
      const cy = crypto.randomInt(0, height);
      return `<circle cx="${cx}" cy="${cy}" r="${crypto.randomInt(1, 3)}" fill="#7f9478" opacity="0.45" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mã xác nhận">
  <rect width="${width}" height="${height}" rx="14" fill="#f4f7ef" />
  ${dots}
  ${lines}
  ${glyphs}
</svg>`;
}

module.exports = { captchaSvg };
