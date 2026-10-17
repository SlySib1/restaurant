const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { uploadImage, imageUrlForUpload, deleteImage } = require('./imageUpload');
const { parseIds, loadDishOptions, relationsAreValid } = require('./dishRelations');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const [dishes, options] = await Promise.all([
    prisma.dish.findMany({
      include: { chefs: true, ingredients: true },
      orderBy: { id: 'desc' }
    }),
    loadDishOptions(prisma)
  ]);
  res.render('admin/dishes/index', {
    dishes, ...options, errors: [], formData: {}, selectedChefIds: [], selectedIngredientIds: []
  });
});

router.post('/', uploadImage, async (req, res) => {
  const { name, description, price, category, available } = req.body;
  const imageUrl = imageUrlForUpload(req.file);
  const chefIds = parseIds(req.body.chefIds);
  const ingredientIds = parseIds(req.body.ingredientIds);
  const options = await loadDishOptions(prisma);
  const priceValue = Number.parseFloat(price);

  if (!name?.trim() || !Number.isFinite(priceValue) || priceValue <= 0 ||
      !relationsAreValid(chefIds, ingredientIds, options.chefs, options.ingredients)) {
    await deleteImage(imageUrl);
    return res.status(400).render('admin/dishes/index', {
      dishes: await prisma.dish.findMany({
        include: { chefs: true, ingredients: true },
        orderBy: { id: 'desc' }
      }),
      ...options,
      errors: ['Vui lòng nhập tên, giá hợp lệ, chọn ít nhất một đầu bếp và một nguyên liệu có sẵn.'],
      formData: req.body,
      selectedChefIds: chefIds || [],
      selectedIngredientIds: ingredientIds || []
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.dish.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          price: priceValue,
          category: category?.trim() || 'Chưa phân loại',
          imageUrl,
          available: available === 'on',
          chefs: { connect: chefIds.map((id) => ({ id })) },
          ingredients: { connect: ingredientIds.map((id) => ({ id })) }
        }
      });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    await deleteImage(imageUrl);
    throw error;
  }

  return res.redirect(303, '/admin/dishes');
});

router.get('/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const [dish, options] = await Promise.all([
    prisma.dish.findUnique({
      where: { id },
      include: { chefs: true, ingredients: true }
    }),
    loadDishOptions(prisma)
  ]);
  if (!dish) return res.status(404).send('404 - Món ăn không tồn tại');

  res.render('admin/dishes/edit', {
    dish,
    ...options,
    errors: [],
    selectedChefIds: dish.chefs.map((chef) => chef.id),
    selectedIngredientIds: dish.ingredients.map((ingredient) => ingredient.id)
  });
});

router.patch('/:id', uploadImage, async (req, res) => {
  const id = parseInt(req.params.id);
  const uploadedImageUrl = imageUrlForUpload(req.file);
  if (isNaN(id)) {
    await deleteImage(uploadedImageUrl);
    return res.status(404).send('404 - ID không hợp lệ');
  }

  const [existing, options] = await Promise.all([
    prisma.dish.findUnique({ where: { id }, include: { chefs: true, ingredients: true } }),
    loadDishOptions(prisma)
  ]);
  if (!existing) {
    await deleteImage(uploadedImageUrl);
    return res.status(404).send('404 - Món ăn không tồn tại');
  }

  const { name, description, price, category, available } = req.body;
  const chefIds = parseIds(req.body.chefIds);
  const ingredientIds = parseIds(req.body.ingredientIds);
  const priceValue = Number.parseFloat(price);
  if (!name?.trim() || !Number.isFinite(priceValue) || priceValue <= 0 ||
      !relationsAreValid(chefIds, ingredientIds, options.chefs, options.ingredients)) {
    await deleteImage(uploadedImageUrl);
    return res.status(400).render('admin/dishes/edit', {
      dish: { ...existing, name, description, price, category, available: available === 'on' },
      ...options,
      errors: ['Vui lòng nhập tên, giá hợp lệ, chọn ít nhất một đầu bếp và một nguyên liệu có sẵn.'],
      selectedChefIds: chefIds || existing.chefs.map((chef) => chef.id),
      selectedIngredientIds: ingredientIds || existing.ingredients.map((ingredient) => ingredient.id)
    });
  }

  const imageUrl = req.file
    ? uploadedImageUrl
    : req.body.removeImage === 'on'
      ? null
      : existing.imageUrl;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.dish.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          price: priceValue,
          category: category?.trim() || 'Chưa phân loại',
          imageUrl,
          available: available === 'on',
          chefs: { set: chefIds.map((chefId) => ({ id: chefId })) },
          ingredients: { set: ingredientIds.map((ingredientId) => ({ id: ingredientId })) }
        }
      });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    await deleteImage(uploadedImageUrl);
    throw error;
  }

  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return res.redirect(303, '/admin/dishes');
});

router.get('/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const dish = await prisma.dish.findUnique({ where: { id } });
  if (!dish) return res.status(404).send('404 - Món ăn không tồn tại');

  res.render('admin/dishes/delete-confirm', { dish });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const existing = await prisma.dish.findUnique({ where: { id } });
  if (!existing) return res.status(404).send('404 - Món ăn không tồn tại');

  await prisma.dish.delete({ where: { id } });
  await deleteImage(existing.imageUrl);
  return res.redirect(303, '/admin/dishes');
});

module.exports = router;
