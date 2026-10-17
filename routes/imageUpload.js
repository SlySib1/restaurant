const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionsByMimeType = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${extensionsByMimeType.get(file.mimetype)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!extensionsByMimeType.has(file.mimetype)) {
      return callback(new Error('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.'));
    }
    return callback(null, true);
  }
});

function imageUrlForUpload(file) {
  return file ? `/uploads/${file.filename}` : null;
}

async function matchesImageType(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);

    if (file.mimetype === 'image/jpeg') {
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (file.mimetype === 'image/webp') {
      return header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
    }
    if (file.mimetype === 'image/gif') {
      const signature = header.toString('ascii', 0, 6);
      return signature === 'GIF87a' || signature === 'GIF89a';
    }
    return false;
  } finally {
    await handle.close();
  }
}

async function validateUploadedImage(req, res, next) {
  if (!req.file) return next();

  let validImage;
  try {
    validImage = await matchesImageType(req.file);
  } catch (error) {
    await deleteImage(imageUrlForUpload(req.file));
    return next(error);
  }

  if (!validImage) {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(400).send('Nội dung tệp không đúng định dạng ảnh đã chọn.');
  }
  return next();
}

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      const isTooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
      const message = isTooLarge
        ? 'Ảnh vượt quá dung lượng tối đa 5 MB.'
        : error instanceof multer.MulterError
          ? 'Không thể tải ảnh lên. Vui lòng chỉ chọn một ảnh.'
          : error.message;
      return res.status(isTooLarge ? 413 : 400).send(message);
    }
    return validateUploadedImage(req, res, next).catch(next);
  });
}

async function deleteImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;

  const filename = path.basename(imageUrl);
  if (!filename) return;

  try {
    await fs.promises.unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = { uploadImage: handleUpload, imageUrlForUpload, deleteImage };
