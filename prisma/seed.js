const { Prisma, PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const chefs = [
  { name: 'Gordon Ramsay', specialty: 'Món Âu, bít tết và nước sốt' },
  { name: 'Nguyễn Văn A', specialty: 'Ẩm thực Việt truyền thống' },
  { name: 'Trần Thị Mai', specialty: 'Phở, bún và các món nước' },
  { name: 'Lê Quốc Bảo', specialty: 'Món nướng và món chính' },
  { name: 'Phạm Thu Hà', specialty: 'Món cuốn, món chay và tráng miệng' }
];
const specialtyOptions = [
  'Món Việt truyền thống',
  'Món nướng và món chính',
  'Món nước và bún phở',
  'Món chay và rau củ',
  'Hải sản và món khai vị',
  'Tráng miệng và bánh',
  'Món Á hiện đại',
  'Món Âu và nước sốt'
];
for (let index = chefs.length + 1; index <= 100; index += 1) {
  chefs.push({
    name: `Đầu bếp Bếp Nhà ${String(index).padStart(3, '0')}`,
    specialty: specialtyOptions[(index - 6) % specialtyOptions.length]
  });
}

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
  { name: 'Chuối', unit: 'nải' },
  { name: 'Thịt gà', unit: 'kg' },
  { name: 'Xương bò', unit: 'kg' },
  { name: 'Xương heo', unit: 'kg' },
  { name: 'Tôm khô', unit: 'kg' },
  { name: 'Cua biển', unit: 'kg' },
  { name: 'Sò điệp', unit: 'kg' },
  { name: 'Bạch tuộc', unit: 'kg' },
  { name: 'Cá basa', unit: 'kg' },
  { name: 'Cá thu', unit: 'kg' },
  { name: 'Thịt vịt', unit: 'kg' },
  { name: 'Thịt cừu', unit: 'kg' },
  { name: 'Đậu xanh', unit: 'kg' },
  { name: 'Đậu đỏ', unit: 'kg' },
  { name: 'Đậu đen', unit: 'kg' },
  { name: 'Hạt sen', unit: 'kg' },
  { name: 'Hạt điều', unit: 'kg' },
  { name: 'Mè trắng', unit: 'kg' },
  { name: 'Mè đen', unit: 'kg' },
  { name: 'Bắp ngọt', unit: 'kg' },
  { name: 'Bí đỏ', unit: 'kg' },
  { name: 'Bí xanh', unit: 'kg' },
  { name: 'Bông cải xanh', unit: 'kg' },
  { name: 'Bông cải trắng', unit: 'kg' },
  { name: 'Cải thìa', unit: 'kg' },
  { name: 'Cải bó xôi', unit: 'kg' },
  { name: 'Cải xanh', unit: 'kg' },
  { name: 'Rau cần', unit: 'bó' },
  { name: 'Húng quế', unit: 'bó' },
  { name: 'Ngò rí', unit: 'bó' },
  { name: 'Ngò gai', unit: 'bó' },
  { name: 'Lá chanh', unit: 'bó' },
  { name: 'Lá dứa', unit: 'bó' },
  { name: 'Nấm kim châm', unit: 'gói' },
  { name: 'Nấm đùi gà', unit: 'kg' },
  { name: 'Nấm mỡ', unit: 'kg' },
  { name: 'Nấm mèo', unit: 'kg' },
  { name: 'Đậu que', unit: 'kg' },
  { name: 'Đậu bắp', unit: 'kg' },
  { name: 'Củ sen', unit: 'kg' },
  { name: 'Củ sắn', unit: 'kg' },
  { name: 'Khoai tây', unit: 'kg' },
  { name: 'Khoai môn cao', unit: 'kg' },
  { name: 'Ớt chuông', unit: 'kg' },
  { name: 'Ớt khô', unit: 'kg' },
  { name: 'Tiêu đen', unit: 'kg' },
  { name: 'Quế', unit: 'kg' },
  { name: 'Hoa hồi', unit: 'kg' },
  { name: 'Thảo quả', unit: 'kg' },
  { name: 'Bột cà ri', unit: 'kg' },
  { name: 'Bột bắp', unit: 'kg' },
  { name: 'Bột gạo', unit: 'kg' },
  { name: 'Bột chiên xù', unit: 'kg' },
  { name: 'Nước tương', unit: 'lít' },
  { name: 'Dầu hào', unit: 'lít' },
  { name: 'Dầu mè', unit: 'lít' },
  { name: 'Dầu ăn', unit: 'lít' },
  { name: 'Giấm gạo', unit: 'lít' },
  { name: 'Rượu nấu ăn', unit: 'lít' },
  { name: 'Sữa đặc', unit: 'lon' },
  { name: 'Kem tươi', unit: 'lít' },
  { name: 'Phô mai', unit: 'kg' },
  { name: 'Bơ lạt', unit: 'kg' },
  { name: 'Bánh mì', unit: 'ổ' },
  { name: 'Mì trứng', unit: 'kg' },
  { name: 'Miến dong', unit: 'kg' },
  { name: 'Bánh canh', unit: 'kg' },
  { name: 'Bánh đa', unit: 'kg' },
  { name: 'Đường phèn', unit: 'kg' },
  { name: 'Mắm tôm', unit: 'hũ' },
  { name: 'Chao', unit: 'hũ' },
  { name: 'Tương ớt', unit: 'chai' },
  { name: 'Tương cà', unit: 'chai' },
  { name: 'Rong biển', unit: 'gói' },
  { name: 'Đậu phụ non', unit: 'hộp' },
  { name: 'Thịt nguội', unit: 'kg' },
  { name: 'Xúc xích', unit: 'kg' },
  { name: 'Trứng vịt', unit: 'quả' },
  { name: 'Trứng cút', unit: 'quả' },
  { name: 'Bơ sáp', unit: 'quả' },
  { name: 'Xoài xanh', unit: 'kg' },
  { name: 'Táo', unit: 'kg' },
  { name: 'Cam', unit: 'kg' },
  { name: 'Dứa', unit: 'quả' },
  { name: 'Dâu tây', unit: 'kg' },
  { name: 'Thanh long', unit: 'quả' },
  { name: 'Sữa chua', unit: 'hộp' },
  { name: 'Bột cacao', unit: 'kg' },
  { name: 'Bột matcha', unit: 'kg' },
  { name: 'Vanilla', unit: 'lọ' },
  { name: 'Bột nở', unit: 'gói' },
  { name: 'Men nở', unit: 'gói' },
  { name: 'Gelatin', unit: 'gói' },
  { name: 'Bột rau câu', unit: 'gói' },
  { name: 'Nước dừa', unit: 'lít' },
  { name: 'Rau cải mầm', unit: 'hộp' },
  { name: 'Măng tươi', unit: 'kg' },
  { name: 'Măng khô', unit: 'kg' },
  { name: 'Bạc hà', unit: 'bó' },
  { name: 'Giấm táo', unit: 'lít' },
  { name: 'Sốt mayonnaise', unit: 'chai' },
  { name: 'Sốt tiêu đen', unit: 'chai' },
  { name: 'Sốt cà ri', unit: 'hũ' }
];

const featuredRecipes = [
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

const recipes = [
  ...featuredRecipes,
  ...Array.from({ length: 980 }, (_, index) => {
    const source = featuredRecipes[index % featuredRecipes.length];
    const firstChef = (index * 7) % chefs.length;
    const secondChef = (firstChef + 1 + (index % (chefs.length - 1))) % chefs.length;
    const extraIngredient = ingredients[(index * 11) % ingredients.length].name;
    return {
      name: `Món mẫu ${String(index + featuredRecipes.length + 1).padStart(4, '0')} · ${source.name}`,
      description: `${source.description} Công thức mẫu số ${index + 21}, kết hợp ${extraIngredient.toLowerCase()}.`,
      price: source.price + (index % 17) * 1000,
      category: source.category,
      available: index % 13 !== 0,
      chefs: [chefs[firstChef].name, chefs[secondChef].name],
      ingredients: [...new Set([...source.ingredients, extraIngredient])]
    };
  })
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
  if (recipes.length !== 1000 || chefs.length !== 100 || ingredients.length < 100) {
    throw new Error('Danh mục mẫu cần đúng 1000 món, 100 đầu bếp và ít nhất 100 nguyên liệu.');
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

  const chefRows = chefs.map((chef) => {
    const existing = chefRecords.get(chef.name);
    if (!existing) throw new Error(`Không tìm thấy đầu bếp "${chef.name}" trong dữ liệu mẫu.`);
    return { id: existing.id, specialty: chef.specialty };
  });
  const chefValues = chefRows.map((chef) => Prisma.sql`(${chef.id}, ${chef.specialty})`);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Chef" AS chef
    SET "specialty" = seed."specialty"
    FROM (VALUES ${Prisma.join(chefValues)}) AS seed("id", "specialty")
    WHERE chef."id" = seed."id"
  `);

  const dishRows = recipes.map((recipe) => {
    const dish = dishRecords.get(recipe.name);
    if (!dish) throw new Error(`Không tìm thấy món "${recipe.name}" trong dữ liệu mẫu.`);
    return {
      id: dish.id,
      description: recipe.description,
      price: recipe.price,
      category: recipe.category,
      available: recipe.available ?? true,
      chefIds: recipe.chefs.map((name) => {
        const chef = chefRecords.get(name);
        if (!chef) throw new Error(`Không tìm thấy đầu bếp "${name}" trong dữ liệu mẫu.`);
        return chef.id;
      }),
      ingredientIds: recipe.ingredients.map((name) => {
        const ingredient = ingredientRecords.get(name);
        if (!ingredient) throw new Error(`Không tìm thấy nguyên liệu "${name}" trong dữ liệu mẫu.`);
        return ingredient.id;
      })
    };
  });

  for (let offset = 0; offset < dishRows.length; offset += 100) {
    const batch = dishRows.slice(offset, offset + 100);
    const rows = batch.map((dish) => Prisma.sql`(
      ${dish.id}, ${dish.description}, ${dish.price}, ${dish.category}, ${dish.available}
    )`);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Dish" AS dish
      SET "description" = seed."description",
          "price" = seed."price",
          "category" = seed."category",
          "available" = seed."available"
      FROM (VALUES ${Prisma.join(rows)}) AS seed("id", "description", "price", "category", "available")
      WHERE dish."id" = seed."id"
    `);
  }

  const dishIds = dishRows.map((dish) => dish.id);
  const chefLinks = dishRows.flatMap((dish) => dish.chefIds.map((chefId) => [chefId, dish.id]));
  const ingredientLinks = dishRows.flatMap((dish) =>
    dish.ingredientIds.map((ingredientId) => [dish.id, ingredientId])
  );
  await prisma.$transaction(async (transaction) => {
    for (let offset = 0; offset < dishIds.length; offset += 500) {
      const batch = dishIds.slice(offset, offset + 500);
      await transaction.$executeRaw(Prisma.sql`
        DELETE FROM "_DishChefs" WHERE "B" IN (${Prisma.join(batch)})
      `);
      await transaction.$executeRaw(Prisma.sql`
        DELETE FROM "_DishIngredients" WHERE "A" IN (${Prisma.join(batch)})
      `);
    }

    for (const [table, links] of [
      ['_DishChefs', chefLinks],
      ['_DishIngredients', ingredientLinks]
    ]) {
      for (let offset = 0; offset < links.length; offset += 500) {
        const rows = links.slice(offset, offset + 500)
          .map(([firstId, secondId]) => Prisma.sql`(${firstId}, ${secondId})`);
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO ${Prisma.raw(`"${table}"`)} ("A", "B")
          VALUES ${Prisma.join(rows)}
        `);
      }
    }
  }, { maxWait: 10000, timeout: 120000 });

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
