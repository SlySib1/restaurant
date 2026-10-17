function parseIds(value) {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  const ids = values.map((item) => {
    if (!/^[1-9]\d*$/.test(item)) return null;
    const id = Number(item);
    return Number.isSafeInteger(id) ? id : null;
  });

  if (ids.some((id) => id === null)) return null;
  return [...new Set(ids)];
}

async function loadDishOptions(prisma) {
  const [chefs, ingredients] = await Promise.all([
    prisma.chef.findMany({ orderBy: { name: 'asc' } }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } })
  ]);
  return { chefs, ingredients };
}

function relationsAreValid(chefIds, ingredientIds, chefs, ingredients) {
  return chefIds && chefIds.length > 0 &&
    ingredientIds && ingredientIds.length > 0 &&
    chefIds.every((id) => chefs.some((chef) => chef.id === id)) &&
    ingredientIds.every((id) => ingredients.some((ingredient) => ingredient.id === id));
}

module.exports = { parseIds, loadDishOptions, relationsAreValid };
