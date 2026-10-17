const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const chefs = [
  { name: 'Gordon Ramsay', specialty: 'Món Âu, bít tết và nước sốt' },
  { name: 'Nguyễn Văn A', specialty: 'Ẩm thực Việt truyền thống' },
  { name: 'Trần Thị Mai', specialty: 'Phở, bún và các món nước' },
  { name: 'Lê Quốc Bảo', specialty: 'Món nướng và món chính' },
  { name: 'Phạm Thu Hà', specialty: 'Món cuốn, món chay và tráng miệng' }
];

const ingredients = [
  { name: 'Thịt bò', unit: 'kg' },
  { name: 'Bánh phở', unit: 'kg' },
  { name: 'Rau thơm', unit: 'bó' },
  { name: 'Thịt heo', unit: 'kg' },
  { name: 'Bún tươi', unit: 'kg' },
  { name: 'Tôm sú', unit: 'kg' },
  { name: 'Bánh tráng', unit: 'xấp' },
  { name: 'Bún gạo', unit: 'kg' },
  { name: 'Ức gà', unit: 'kg' },
  { name: 'Gạo tẻ', unit: 'kg' },
  { name: 'Gạo nếp', unit: 'kg' },
  { name: 'Cá lóc', unit: 'con' },
  { name: 'Cá hồi', unit: 'kg' },
  { name: 'Mực ống', unit: 'kg' },
  { name: 'Nghêu', unit: 'kg' },
  { name: 'Đậu hũ', unit: 'miếng' },
  { name: 'Trứng gà', unit: 'quả' },
  { name: 'Nấm hương', unit: 'kg' },
  { name: 'Nấm rơm', unit: 'kg' },
  { name: 'Cà chua', unit: 'kg' },
  { name: 'Khoai lang', unit: 'kg' },
  { name: 'Khoai môn', unit: 'kg' },
  { name: 'Cà rốt', unit: 'kg' },
  { name: 'Củ cải trắng', unit: 'kg' },
  { name: 'Hành tây', unit: 'kg' },
  { name: 'Hành tím', unit: 'kg' },
  { name: 'Hành lá', unit: 'bó' },
  { name: 'Tỏi', unit: 'kg' },
  { name: 'Gừng', unit: 'kg' },
  { name: 'Sả', unit: 'bó' },
  { name: 'Ớt tươi', unit: 'kg' },
  { name: 'Chanh', unit: 'quả' },
  { name: 'Dừa tươi', unit: 'quả' },
  { name: 'Nước cốt dừa', unit: 'lít' },
  { name: 'Đậu phộng', unit: 'kg' },
  { name: 'Rau muống', unit: 'bó' },
  { name: 'Bắp chuối bào', unit: 'kg' },
  { name: 'Xà lách', unit: 'bó' },
  { name: 'Dưa leo', unit: 'kg' },
  { name: 'Giá đỗ', unit: 'kg' },
  { name: 'Thơm', unit: 'quả' },
  { name: 'Mắm ruốc', unit: 'hũ' },
  { name: 'Nước mắm', unit: 'lít' },
  { name: 'Đường thốt nốt', unit: 'kg' },
  { name: 'Bột năng', unit: 'kg' },
  { name: 'Bột mì', unit: 'kg' },
  { name: 'Sữa tươi', unit: 'lít' },
  { name: 'Đường', unit: 'kg' },
  { name: 'Muối', unit: 'kg' },
  { name: 'Nghệ', unit: 'kg' },
  { name: 'Me', unit: 'kg' },
  { name: 'Mật ong', unit: 'lít' },
  { name: 'Chuối', unit: 'nải' }
];

const recipes = [
  {
    name: 'Phở Bò Tradition', description: 'Phở bò truyền thống với nước dùng ninh xương, bánh phở mềm và rau thơm.', price: 65000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Trần Thị Mai'], ingredients: ['Thịt bò', 'Bánh phở', 'Rau thơm', 'Hành lá', 'Gừng', 'Hành tây', 'Củ cải trắng']
  },
  {
    name: 'Bún Chả Hà Nội', description: 'Thịt heo nướng than hoa ăn cùng bún tươi, rau sống và nước chấm chua ngọt.', price: 55000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Lê Quốc Bảo'], ingredients: ['Thịt heo', 'Bún tươi', 'Rau thơm', 'Xà lách', 'Cà rốt', 'Nước mắm', 'Đường']
  },
  {
    name: 'Gỏi Cuốn Tôm Thịt', description: 'Tôm thịt cuốn bánh tráng với bún và rau xanh, dùng kèm nước chấm đậu phộng.', price: 35000, category: 'Khai vị',
    chefs: ['Nguyễn Văn A', 'Phạm Thu Hà'], ingredients: ['Tôm sú', 'Thịt heo', 'Bánh tráng', 'Bún tươi', 'Rau thơm', 'Xà lách', 'Dưa leo', 'Đậu phộng']
  },
  {
    name: 'Bún Bò Huế', description: 'Nước dùng sả thơm đậm đà với bò mềm, bún sợi lớn và chút cay nồng.', price: 60000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Trần Thị Mai'], ingredients: ['Thịt bò', 'Thịt heo', 'Bún tươi', 'Sả', 'Mắm ruốc', 'Ớt tươi', 'Rau thơm', 'Bắp chuối bào']
  },
  {
    name: 'Cơm Tấm Sườn Nướng', description: 'Cơm tấm dẻo thơm ăn cùng sườn nướng, trứng ốp la và nước mắm pha.', price: 59000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Lê Quốc Bảo'], ingredients: ['Gạo tẻ', 'Thịt heo', 'Trứng gà', 'Hành lá', 'Tỏi', 'Nước mắm', 'Đường']
  },
  {
    name: 'Bánh Xèo Tôm Thịt', description: 'Bánh xèo vàng giòn nhân tôm thịt, cuốn rau sống chấm nước mắm.', price: 52000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Phạm Thu Hà'], ingredients: ['Tôm sú', 'Thịt heo', 'Bột mì', 'Nước cốt dừa', 'Giá đỗ', 'Xà lách', 'Rau thơm', 'Nước mắm']
  },
  {
    name: 'Cá Kho Tộ', description: 'Cá kho tộ đậm vị cùng nước màu, tiêu và hành, dùng với cơm nóng.', price: 68000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Lê Quốc Bảo'], ingredients: ['Cá lóc', 'Hành tím', 'Tỏi', 'Ớt tươi', 'Nước mắm', 'Đường', 'Hành lá']
  },
  {
    name: 'Mì Quảng Gà', description: 'Mì Quảng gà với nước dùng nghệ, bánh tráng nướng và đậu phộng rang.', price: 58000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Trần Thị Mai'], ingredients: ['Ức gà', 'Bún gạo', 'Nghệ', 'Đậu phộng', 'Bánh tráng', 'Rau thơm', 'Hành tím']
  },
  {
    name: 'Chả Giò Hải Sản', description: 'Chả giò chiên vàng nhân tôm mực, ăn kèm rau sống và nước chấm.', price: 45000, category: 'Khai vị',
    chefs: ['Phạm Thu Hà', 'Lê Quốc Bảo'], ingredients: ['Tôm sú', 'Mực ống', 'Bánh tráng', 'Cà rốt', 'Khoai môn', 'Nấm hương', 'Nước mắm']
  },
  {
    name: 'Canh Chua Cá', description: 'Canh chua cá thanh nhẹ với thơm, cà chua và rau thơm.', price: 62000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Trần Thị Mai'], ingredients: ['Cá lóc', 'Thơm', 'Cà chua', 'Giá đỗ', 'Rau thơm', 'Me', 'Nước mắm']
  },
  {
    name: 'Bò Lúc Lắc', description: 'Thịt bò áp chảo mềm thơm, dùng cùng khoai tây và rau củ.', price: 89000, category: 'Món chính',
    chefs: ['Gordon Ramsay', 'Lê Quốc Bảo'], ingredients: ['Thịt bò', 'Khoai lang', 'Hành tây', 'Cà chua', 'Tỏi', 'Muối']
  },
  {
    name: 'Cá Hồi Áp Chảo', description: 'Cá hồi áp chảo vàng mặt, ăn kèm rau củ và chanh tươi.', price: 125000, category: 'Món chính',
    chefs: ['Gordon Ramsay', 'Lê Quốc Bảo'], ingredients: ['Cá hồi', 'Cà rốt', 'Khoai lang', 'Chanh', 'Tỏi', 'Muối']
  },
  {
    name: 'Mực Xào Sả Ớt', description: 'Mực tươi xào nhanh với sả, ớt và hành tây thơm nồng.', price: 78000, category: 'Món chính',
    chefs: ['Nguyễn Văn A', 'Lê Quốc Bảo'], ingredients: ['Mực ống', 'Sả', 'Ớt tươi', 'Hành tây', 'Tỏi', 'Nước mắm']
  },
  {
    name: 'Nghêu Hấp Sả', description: 'Nghêu hấp vừa chín với sả và gừng, giữ vị ngọt tự nhiên.', price: 65000, category: 'Khai vị',
    chefs: ['Trần Thị Mai', 'Lê Quốc Bảo'], ingredients: ['Nghêu', 'Sả', 'Gừng', 'Ớt tươi', 'Chanh']
  },
  {
    name: 'Đậu Hũ Sốt Cà Chua', description: 'Đậu hũ mềm sốt cà chua tươi, món ăn thanh đạm cho bữa cơm nhà.', price: 38000, category: 'Món chay',
    chefs: ['Nguyễn Văn A', 'Phạm Thu Hà'], ingredients: ['Đậu hũ', 'Cà chua', 'Hành lá', 'Hành tím', 'Đường', 'Muối']
  },
  {
    name: 'Gà Nướng Mật Ong', description: 'Gà nướng vàng thơm với lớp sốt mật ong và tỏi.', price: 95000, category: 'Món chính',
    chefs: ['Gordon Ramsay', 'Lê Quốc Bảo'], ingredients: ['Ức gà', 'Tỏi', 'Hành tây', 'Mật ong', 'Muối']
  },
  {
    name: 'Chè Khoai Môn Nước Cốt Dừa', description: 'Chè khoai môn dẻo bùi, nước cốt dừa béo nhẹ và thơm.', price: 28000, category: 'Tráng miệng',
    chefs: ['Phạm Thu Hà'], ingredients: ['Khoai môn', 'Gạo nếp', 'Nước cốt dừa', 'Đường', 'Muối']
  },
  {
    name: 'Chè Chuối Nướng', description: 'Chuối nếp nướng thơm lừng dùng cùng nước cốt dừa và đậu phộng.', price: 32000, category: 'Tráng miệng',
    chefs: ['Phạm Thu Hà', 'Gordon Ramsay'], ingredients: ['Chuối', 'Gạo nếp', 'Nước cốt dừa', 'Đậu phộng', 'Đường']
  },
  {
    name: 'Khoai Lang Chiên', description: 'Khoai lang chiên giòn bên ngoài, bùi ngọt bên trong.', price: 30000, category: 'Khai vị',
    chefs: ['Phạm Thu Hà', 'Gordon Ramsay'], ingredients: ['Khoai lang', 'Bột mì', 'Muối']
  },
  {
    name: 'Gỏi Gà Xé Phay', description: 'Gà xé trộn hành tây, rau thơm và nước mắm chua ngọt.', price: 52000, category: 'Khai vị',
    chefs: ['Nguyễn Văn A', 'Phạm Thu Hà'], ingredients: ['Ức gà', 'Hành tây', 'Rau thơm', 'Chanh', 'Đậu phộng', 'Nước mắm', 'Đường']
  }
];

async function ensureNamedRecords(model, records) {
  const names = records.map((record) => record.name);
  const existing = await model.findMany({ where: { name: { in: names } } });
  const existingByName = new Map(existing.map((record) => [record.name, record]));
  const missing = records.filter((record) => !existingByName.has(record.name));

  if (missing.length > 0) await model.createMany({ data: missing });

  const recordsByName = new Map(
    (await model.findMany({ where: { name: { in: names } } }))
      .map((record) => [record.name, record])
  );
  return recordsByName;
}

async function main() {
  if (recipes.length !== 20 || chefs.length !== 5) {
    throw new Error('Danh mục mẫu cần đúng 20 món ăn và 5 đầu bếp.');
  }
  for (const recipe of recipes) {
    if (recipe.chefs.length === 0 || recipe.ingredients.length === 0 ||
        recipe.chefs.some((name) => !chefs.some((chef) => chef.name === name)) ||
        recipe.ingredients.some((name) => !ingredients.some((ingredient) => ingredient.name === name))) {
      throw new Error(`Dữ liệu liên kết của món "${recipe.name}" chưa đầy đủ.`);
    }
  }

  const chefRecords = await ensureNamedRecords(prisma.chef, chefs);
  const ingredientRecords = await ensureNamedRecords(prisma.ingredient, ingredients);
  const dishRecords = await ensureNamedRecords(
    prisma.dish,
    recipes.map(({ chefs: recipeChefs, ingredients: recipeIngredients, ...dish }) => dish)
  );

  await Promise.all(chefs.map((chef) => {
    const existing = chefRecords.get(chef.name);
    return prisma.chef.update({
      where: { id: existing.id },
      data: { specialty: chef.specialty }
    });
  }));

  await Promise.all(recipes.map((recipe) => {
    const chefIds = recipe.chefs.map((name) => {
      const chef = chefRecords.get(name);
      if (!chef) throw new Error(`Không tìm thấy đầu bếp "${name}" trong dữ liệu mẫu.`);
      return { id: chef.id };
    });
    const ingredientIds = recipe.ingredients.map((name) => {
      const ingredient = ingredientRecords.get(name);
      if (!ingredient) throw new Error(`Không tìm thấy nguyên liệu "${name}" trong dữ liệu mẫu.`);
      return { id: ingredient.id };
    });
    const dish = dishRecords.get(recipe.name);

    return prisma.dish.update({
      where: { id: dish.id },
      data: {
        description: recipe.description,
        price: recipe.price,
        category: recipe.category,
        available: true,
        chefs: { set: chefIds },
        ingredients: { set: ingredientIds }
      }
    });
  }));

  console.log(`Đã nạp ${recipes.length} món ăn, ${ingredients.length} nguyên liệu và ${chefs.length} đầu bếp mẫu. Dữ liệu khác không bị xóa.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Không thể nạp dữ liệu mẫu:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { chefs, ingredients, recipes, main };
