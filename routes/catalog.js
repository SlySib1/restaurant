const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

router.get('/chefs', async (req, res) => {
  const chefs = await prisma.chef.findMany({
    include: { dishes: true },
    orderBy: { id: 'desc' }
  });
  res.render('user/chefs', { chefs });
});

router.get('/ingredients', async (req, res) => {
  const ingredients = await prisma.ingredient.findMany({
    include: { dishes: true },
    orderBy: { id: 'desc' }
  });
  res.render('user/ingredients', { ingredients });
});

module.exports = router;
