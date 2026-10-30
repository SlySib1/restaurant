const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { uploadImageApi, imageUrlForUpload, deleteImage } = require('./imageUpload');
const { parseIds, loadDishOptions, relationsAreValid } = require('./dishRelations');
const {
  readDishFilters,
  readBasicFilters,
  listDishes,
  listRelated
} = require('./catalogSearch');

const prisma = new PrismaClient();
const router = express.Router();
const dishIncludes = { chefs: true, ingredients: true };

class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendData(res, data) {
  return res.status(200).json({ ok: true, data });
}

function readId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function readIds(value, field) {
  if (value === undefined) return undefined;
  const ids = parseIds(value);
  if (!ids) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Một hoặc nhiều ID không hợp lệ.', {
      [field]: 'Chỉ chọn các mục hợp lệ.'
    });
  }
  return ids;
}

function readAvailable(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true' || value === 'on') return true;
  if (value === false || value === 'false' || value === 'off') return false;
  throw new ApiError(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', {
    available: 'Trạng thái phục vụ không hợp lệ.'
  });
}

function validateDishFields(input, current = {}) {
  const values = {
    name: input.name === undefined ? current.name : input.name,
    description: input.description === undefined ? current.description : input.description,
    price: input.price === undefined ? current.price : input.price,
    category: input.category === undefined ? current.category : input.category,
    available: readAvailable(input.available, current.available ?? true)
  };
  const fields = {};
  const name = typeof values.name === 'string' ? values.name.trim() : '';
  const price = typeof values.price === 'number' ? values.price : Number(values.price);

  if (!name) fields.name = 'Vui lòng nhập tên món ăn.';
  if (!Number.isFinite(price) || price <= 0) fields.price = 'Giá phải là số lớn hơn 0.';
  if (typeof values.description !== 'string') fields.description = 'Mô tả không hợp lệ.';
  if (typeof values.category !== 'string' || !values.category.trim()) {
    fields.category = 'Vui lòng nhập danh mục món ăn.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Vui lòng kiểm tra lại thông tin món ăn.', fields);
  }

  return {
    name,
    description: values.description.trim(),
    price,
    category: values.category.trim(),
    available: values.available
  };
}

function validateChefFields(input, current = {}) {
  const name = input.name === undefined ? current.name : input.name;
  const specialty = input.specialty === undefined ? current.specialty : input.specialty;
  const fields = {};
  if (typeof name !== 'string' || !name.trim()) fields.name = 'Vui lòng nhập tên đầu bếp.';
  if (typeof specialty !== 'string' || !specialty.trim()) {
    fields.specialty = 'Vui lòng nhập chuyên môn.';
  }
  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Vui lòng kiểm tra lại thông tin đầu bếp.', fields);
  }
  return { name: name.trim(), specialty: specialty.trim() };
}

function validateIngredientFields(input, current = {}) {
  const name = input.name === undefined ? current.name : input.name;
  const unit = input.unit === undefined ? current.unit : input.unit;
  const fields = {};
  if (typeof name !== 'string' || !name.trim()) fields.name = 'Vui lòng nhập tên nguyên liệu.';
  if (typeof unit !== 'string' || !unit.trim()) fields.unit = 'Vui lòng nhập đơn vị tính.';
  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Vui lòng kiểm tra lại thông tin nguyên liệu.', fields);
  }
  return { name: name.trim(), unit: unit.trim() };
}

function notFound(message) {
  return new ApiError(404, 'NOT_FOUND', message);
}

async function deleteUploadedFile(file) {
  if (file) await deleteImage(imageUrlForUpload(file));
}

function validateDishRelations(chefIds, ingredientIds, options) {
  if (!relationsAreValid(chefIds, ingredientIds, options.chefs, options.ingredients)) {
    const fields = {};
    if (!chefIds || chefIds.length === 0 ||
        !chefIds.every((id) => options.chefs.some((chef) => chef.id === id))) {
      fields.chefIds = 'Chọn ít nhất một đầu bếp hợp lệ.';
    }
    if (!ingredientIds || ingredientIds.length === 0 ||
        !ingredientIds.every((id) => options.ingredients.some((ingredient) => ingredient.id === id))) {
      fields.ingredientIds = 'Chọn ít nhất một nguyên liệu hợp lệ.';
    }
    throw new ApiError(400, 'VALIDATION_FAILED', 'Vui lòng kiểm tra các liên kết của món ăn.', fields);
  }
}

router.get('/dishes', asyncRoute(async (req, res) => {
  const parsed = readDishFilters(req.query);
  if (parsed.error) throw new ApiError(400, 'VALIDATION_FAILED', parsed.error);
  return sendData(res, await listDishes(prisma, parsed.value));
}));

router.get('/dishes/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Món ăn không tồn tại.');
  const dish = await prisma.dish.findUnique({ where: { id }, include: dishIncludes });
  if (!dish) throw notFound('Món ăn không tồn tại.');
  return sendData(res, dish);
}));

router.post('/dishes', uploadImageApi, asyncRoute(async (req, res) => {
  const input = req.body || {};
  let chefIds;
  let ingredientIds;
  let fields;
  try {
    chefIds = readIds(input.chefIds, 'chefIds');
    ingredientIds = readIds(input.ingredientIds, 'ingredientIds');
    fields = validateDishFields(input, {
      description: '',
      category: 'Chưa phân loại',
      available: true
    });
    const options = await loadDishOptions(prisma);
    validateDishRelations(chefIds, ingredientIds, options);
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }

  let dish;
  try {
    dish = await prisma.$transaction(async (tx) => tx.dish.create({
      data: {
        ...fields,
        imageUrl: imageUrlForUpload(req.file),
        chefs: { connect: chefIds.map((id) => ({ id })) },
        ingredients: { connect: ingredientIds.map((id) => ({ id })) }
      },
      include: dishIncludes
    }), { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  return sendData(res, dish);
}));

router.patch('/dishes/:id', uploadImageApi, asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) {
    await deleteUploadedFile(req.file);
    throw notFound('Món ăn không tồn tại.');
  }
  const existing = await prisma.dish.findUnique({ where: { id }, include: dishIncludes });
  if (!existing) {
    await deleteUploadedFile(req.file);
    throw notFound('Món ăn không tồn tại.');
  }

  const input = req.body || {};
  let chefIds;
  let ingredientIds;
  let fields;
  let imageUrl;
  try {
    chefIds = readIds(input.chefIds, 'chefIds') ?? existing.chefs.map((chef) => chef.id);
    ingredientIds = readIds(input.ingredientIds, 'ingredientIds') ??
      existing.ingredients.map((ingredient) => ingredient.id);
    fields = validateDishFields(input, existing);
    validateDishRelations(chefIds, ingredientIds, await loadDishOptions(prisma));
    imageUrl = req.file
      ? imageUrlForUpload(req.file)
      : input.removeImage === true || input.removeImage === 'true'
        ? null
        : existing.imageUrl;
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }

  let dish;
  try {
    dish = await prisma.$transaction(async (tx) => tx.dish.update({
      where: { id },
      data: {
        ...fields,
        imageUrl,
        chefs: { set: chefIds.map((chefId) => ({ id: chefId })) },
        ingredients: { set: ingredientIds.map((ingredientId) => ({ id: ingredientId })) }
      },
      include: dishIncludes
    }), { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return sendData(res, dish);
}));

router.delete('/dishes/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Món ăn không tồn tại.');
  const existing = await prisma.dish.findUnique({ where: { id } });
  if (!existing) throw notFound('Món ăn không tồn tại.');
  await prisma.dish.delete({ where: { id } });
  await deleteImage(existing.imageUrl);
  return sendData(res, null);
}));

router.get('/chefs', asyncRoute(async (req, res) => {
  const parsed = readBasicFilters(req.query);
  if (parsed.error) throw new ApiError(400, 'VALIDATION_FAILED', parsed.error);
  return sendData(res, await listRelated(prisma, 'chef', parsed.value));
}));

router.get('/chefs/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Đầu bếp không tồn tại.');
  const chef = await prisma.chef.findUnique({
    where: { id },
    include: { dishes: { include: { chefs: true, ingredients: true } } }
  });
  if (!chef) throw notFound('Đầu bếp không tồn tại.');
  return sendData(res, {
    ...chef,
    orphanDishes: chef.dishes.filter((dish) => dish.chefs.length === 1),
    retainedDishes: chef.dishes.filter((dish) => dish.chefs.length > 1)
  });
}));

router.post('/chefs', uploadImageApi, asyncRoute(async (req, res) => {
  let fields;
  try {
    fields = validateChefFields(req.body || {});
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  let chef;
  try {
    chef = await prisma.chef.create({
      data: { ...fields, imageUrl: imageUrlForUpload(req.file) },
      include: { dishes: true }
    });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  return sendData(res, chef);
}));

router.patch('/chefs/:id', uploadImageApi, asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) {
    await deleteUploadedFile(req.file);
    throw notFound('Đầu bếp không tồn tại.');
  }
  const existing = await prisma.chef.findUnique({ where: { id } });
  if (!existing) {
    await deleteUploadedFile(req.file);
    throw notFound('Đầu bếp không tồn tại.');
  }

  let fields;
  let imageUrl;
  try {
    fields = validateChefFields(req.body || {}, existing);
    imageUrl = req.file
      ? imageUrlForUpload(req.file)
      : req.body.removeImage === true || req.body.removeImage === 'true'
        ? null
        : existing.imageUrl;
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }

  let chef;
  try {
    chef = await prisma.chef.update({
      where: { id },
      data: { ...fields, imageUrl },
      include: { dishes: true }
    });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return sendData(res, chef);
}));

router.delete('/chefs/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Đầu bếp không tồn tại.');

  const result = await prisma.$transaction(async (tx) => {
    const chef = await tx.chef.findUnique({
      where: { id },
      include: { dishes: { include: { chefs: { select: { id: true } } } } }
    });
    if (!chef) return null;

    const orphanDishes = chef.dishes.filter((dish) => dish.chefs.length === 1);
    if (orphanDishes.length > 0) {
      await tx.dish.deleteMany({
        where: { id: { in: orphanDishes.map((dish) => dish.id) } }
      });
    }
    await tx.chef.delete({ where: { id } });
    return {
      chefImageUrl: chef.imageUrl,
      dishImageUrls: orphanDishes.map((dish) => dish.imageUrl)
    };
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  if (!result) throw notFound('Đầu bếp không tồn tại.');
  await Promise.all([
    deleteImage(result.chefImageUrl),
    ...result.dishImageUrls.map(deleteImage)
  ]);
  return sendData(res, null);
}));

router.get('/ingredients', asyncRoute(async (req, res) => {
  const parsed = readBasicFilters(req.query);
  if (parsed.error) throw new ApiError(400, 'VALIDATION_FAILED', parsed.error);
  return sendData(res, await listRelated(prisma, 'ingredient', parsed.value));
}));

router.get('/ingredients/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Nguyên liệu không tồn tại.');
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: { dishes: { include: dishIncludes } }
  });
  if (!ingredient) throw notFound('Nguyên liệu không tồn tại.');
  return sendData(res, ingredient);
}));

router.post('/ingredients', uploadImageApi, asyncRoute(async (req, res) => {
  let fields;
  try {
    fields = validateIngredientFields(req.body || {});
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  let ingredient;
  try {
    ingredient = await prisma.ingredient.create({
      data: { ...fields, imageUrl: imageUrlForUpload(req.file) },
      include: { dishes: true }
    });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  return sendData(res, ingredient);
}));

router.patch('/ingredients/:id', uploadImageApi, asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) {
    await deleteUploadedFile(req.file);
    throw notFound('Nguyên liệu không tồn tại.');
  }
  const existing = await prisma.ingredient.findUnique({ where: { id } });
  if (!existing) {
    await deleteUploadedFile(req.file);
    throw notFound('Nguyên liệu không tồn tại.');
  }

  let fields;
  let imageUrl;
  try {
    fields = validateIngredientFields(req.body || {}, existing);
    imageUrl = req.file
      ? imageUrlForUpload(req.file)
      : req.body.removeImage === true || req.body.removeImage === 'true'
        ? null
        : existing.imageUrl;
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }

  let ingredient;
  try {
    ingredient = await prisma.ingredient.update({
      where: { id },
      data: { ...fields, imageUrl },
      include: { dishes: true }
    });
  } catch (error) {
    await deleteUploadedFile(req.file);
    throw error;
  }
  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return sendData(res, ingredient);
}));

router.delete('/ingredients/:id', asyncRoute(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) throw notFound('Nguyên liệu không tồn tại.');

  const result = await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUnique({
      where: { id },
      include: { dishes: { select: { id: true, imageUrl: true } } }
    });
    if (!ingredient) return null;

    if (ingredient.dishes.length > 0) {
      await tx.dish.deleteMany({
        where: { id: { in: ingredient.dishes.map((dish) => dish.id) } }
      });
    }
    await tx.ingredient.delete({ where: { id } });
    return {
      ingredientImageUrl: ingredient.imageUrl,
      dishImageUrls: ingredient.dishes.map((dish) => dish.imageUrl)
    };
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  if (!result) throw notFound('Nguyên liệu không tồn tại.');
  await Promise.all([
    deleteImage(result.ingredientImageUrl),
    ...result.dishImageUrls.map(deleteImage)
  ]);
  return sendData(res, null);
}));

module.exports = { router, ApiError };
