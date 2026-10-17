const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { uploadImage, imageUrlForUpload, deleteImage } = require('./imageUpload');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const ingredients = await prisma.ingredient.findMany({
    include: { dishes: true },
    orderBy: { id: 'desc' }
  });
  res.render('admin/ingredients/index', { ingredients, errors: [], formData: {} });
});

router.post('/', uploadImage, async (req, res) => {
  const { name, unit } = req.body;
  const imageUrl = imageUrlForUpload(req.file);

  if (!name || name.trim() === '' || !unit || unit.trim() === '') {
    await deleteImage(imageUrl);
    const ingredients = await prisma.ingredient.findMany({
      include: { dishes: true },
      orderBy: { id: 'desc' }
    });
    return res.status(400).render('admin/ingredients/index', {
      ingredients,
      errors: ['Tên nguyên liệu và Đơn vị tính không được để trống!'],
      formData: req.body
    });
  }

  try {
    await prisma.ingredient.create({
      data: { name: name.trim(), unit: unit.trim(), imageUrl }
    });
  } catch (error) {
    await deleteImage(imageUrl);
    throw error;
  }
  return res.redirect(303, '/admin/ingredients');
});

router.get('/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) return res.status(404).send('404 - Nguyên liệu không tồn tại');

  res.render('admin/ingredients/edit', { ingredient, errors: [] });
});

router.patch('/:id', uploadImage, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(404).send('404 - ID không hợp lệ');
  }

  const existing = await prisma.ingredient.findUnique({ where: { id } });
  if (!existing) {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(404).send('404 - Nguyên liệu không tồn tại');
  }

  const { name, unit } = req.body;
  if (!name || name.trim() === '' || !unit || unit.trim() === '') {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(400).render('admin/ingredients/edit', {
      ingredient: { ...existing, name, unit },
      errors: ['Tên nguyên liệu và Đơn vị tính không được để trống!']
    });
  }

  const imageUrl = req.file
    ? imageUrlForUpload(req.file)
    : req.body.removeImage === 'on'
      ? null
      : existing.imageUrl;

  try {
    await prisma.ingredient.update({
      where: { id },
      data: { name: name.trim(), unit: unit.trim(), imageUrl }
    });
  } catch (error) {
    await deleteImage(imageUrlForUpload(req.file));
    throw error;
  }

  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return res.redirect(303, '/admin/ingredients');
});

router.get('/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: { dishes: true }
  });
  if (!ingredient) return res.status(404).send('404 - Nguyên liệu không tồn tại');

  res.render('admin/ingredients/delete-confirm', {
    ingredient,
    affectedDishes: ingredient.dishes
  });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const deletion = await prisma.$transaction(async (tx) => {
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
  }, { isolationLevel: 'Serializable' });
  if (!deletion) return res.status(404).send('404 - Nguyên liệu không tồn tại');

  await Promise.all([
    deleteImage(deletion.ingredientImageUrl),
    ...deletion.dishImageUrls.map(deleteImage)
  ]);
  return res.redirect(303, '/admin/ingredients');
});

module.exports = router;
