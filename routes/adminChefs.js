const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { uploadImage, imageUrlForUpload, deleteImage } = require('./imageUpload');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const chefs = await prisma.chef.findMany({
    include: { dishes: true },
    orderBy: { id: 'desc' }
  });
  res.render('admin/chefs/index', { chefs, errors: [], formData: {} });
});

router.post('/', uploadImage, async (req, res) => {
  const { name, specialty } = req.body;
  const imageUrl = imageUrlForUpload(req.file);

  if (!name || name.trim() === '' || !specialty || specialty.trim() === '') {
    await deleteImage(imageUrl);
    const chefs = await prisma.chef.findMany({
      include: { dishes: true },
      orderBy: { id: 'desc' }
    });
    return res.status(400).render('admin/chefs/index', {
      chefs,
      errors: ['Tên đầu bếp và Chuyên môn không được để trống!'],
      formData: req.body
    });
  }

  try {
    await prisma.chef.create({
      data: { name: name.trim(), specialty: specialty.trim(), imageUrl }
    });
  } catch (error) {
    await deleteImage(imageUrl);
    throw error;
  }
  return res.redirect(303, '/admin/chefs');
});

router.get('/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const chef = await prisma.chef.findUnique({ where: { id } });
  if (!chef) return res.status(404).send('404 - Đầu bếp không tồn tại');

  res.render('admin/chefs/edit', { chef, errors: [] });
});

router.patch('/:id', uploadImage, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(404).send('404 - ID không hợp lệ');
  }

  const existing = await prisma.chef.findUnique({ where: { id } });
  if (!existing) {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(404).send('404 - Đầu bếp không tồn tại');
  }

  const { name, specialty } = req.body;
  if (!name || name.trim() === '' || !specialty || specialty.trim() === '') {
    await deleteImage(imageUrlForUpload(req.file));
    return res.status(400).render('admin/chefs/edit', {
      chef: { ...existing, name, specialty },
      errors: ['Tên đầu bếp và Chuyên môn không được để trống!']
    });
  }

  const imageUrl = req.file
    ? imageUrlForUpload(req.file)
    : req.body.removeImage === 'on'
      ? null
      : existing.imageUrl;

  try {
    await prisma.chef.update({
      where: { id },
      data: { name: name.trim(), specialty: specialty.trim(), imageUrl }
    });
  } catch (error) {
    await deleteImage(imageUrlForUpload(req.file));
    throw error;
  }

  if (imageUrl !== existing.imageUrl) await deleteImage(existing.imageUrl);
  return res.redirect(303, '/admin/chefs');
});

router.get('/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const chef = await prisma.chef.findUnique({
    where: { id },
    include: { dishes: { include: { chefs: true } } }
  });
  if (!chef) return res.status(404).send('404 - Đầu bếp không tồn tại');

  res.render('admin/chefs/delete-confirm', {
    chef,
    orphanDishes: chef.dishes.filter((dish) => dish.chefs.length === 1),
    retainedDishes: chef.dishes.filter((dish) => dish.chefs.length > 1)
  });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).send('404 - ID không hợp lệ');

  const deletion = await prisma.$transaction(async (tx) => {
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
  }, { isolationLevel: 'Serializable' });
  if (!deletion) return res.status(404).send('404 - Đầu bếp không tồn tại');

  await Promise.all([
    deleteImage(deletion.chefImageUrl),
    ...deletion.dishImageUrls.map(deleteImage)
  ]);
  return res.redirect(303, '/admin/chefs');
});

module.exports = router;
