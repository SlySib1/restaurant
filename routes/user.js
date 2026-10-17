const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /dishes
router.get('/', async (req, res) => {
  const { q } = req.query;
  try {
    const dishes = await prisma.dish.findMany({
      include: { chefs: true, ingredients: true },
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {}
    });
    res.render('user/dishes', { dishes, q: q || '' });
  } catch (error) {
    res.status(500).send('Lỗi máy chủ');
  }
});

// GET /dishes/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(404).send('404 - ID không hợp lệ');
  }

  try {
    const dish = await prisma.dish.findUnique({
      where: { id },
      include: { chefs: true, ingredients: true }
    });
    if (!dish) {
      return res.status(404).send('404 - Món ăn không tồn tại');
    }
    res.render('user/dish-detail', { dish });
  } catch (error) {
    res.status(500).send('Lỗi máy chủ');
  }
});

module.exports = router;