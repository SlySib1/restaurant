require('dotenv').config({ path: ['.env.local', '.env'] });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads');
const unsplashUrl = (photoId, width) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=78`;

const dishPhotoIds = [
  '1569718212165-3a8278d5f624',
  '1555939594-58d7cb561ad1',
  '1540189549336-e6e99c3679fe',
  '1582878826629-29b7ad1cdc43',
  '1504674900247-0877df9cc836',
  '1565299624946-b28f40a0ae38',
  '1529692236671-f1f6cf9683ba',
  '1473093295043-cdd812d0e601',
  '1565299507177-b0ac66763828',
  '1547592180-85f173990554',
  '1544025162-d76694265947',
  '1559847844-5315695dadae',
  '1534939561126-855b8675edd7',
  '1476224203421-9ac39bcb3327',
  '1546069901-ba9599a7e63c',
  '1551782450-a2132b4ba21d',
  '1490645935967-10de6ba17061',
  '1529042410759-befb1204b468',
  '1546549032-9571cd6b27df',
  '1498837167922-ddd27525d352'
];

const chefPhotoIds = [
  '1500648767791-00dcc994a43e',
  '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d',
  '1544005313-94ddf0286df2',
  '1507003211169-0a1dd7228f2d'
];

const ingredientPhotoIds = {
  beef: '1607623814075-e51df1bdc82f',
  pork: '1555939594-58d7cb561ad1',
  poultry: '1604503468506-a8da13d82791',
  salmon: '1519708227418-c8fd9a32b7a2',
  seafood: '1540189549336-e6e99c3679fe',
  greens: '1540420773420-3366772f4999',
  roots: '1518977676601-b53f82aba655',
  vegetables: '1542838132-92c53300491e',
  tomatoes: '1547592180-85f173990554',
  aromatics: '1566385101042-1a0aa0c1268c',
  noodles: '1569718212165-3a8278d5f624',
  grains: '1473093295043-cdd812d0e601',
  coconut: '1546549032-9571cd6b27df',
  nuts: '1546069901-ba9599a7e63c',
  spices: '1604908176997-125f25cc6f3d',
  pantry: '1490645935967-10de6ba17061'
};

const ingredientsByPhoto = {
  beef: ['Thịt bò'],
  pork: ['Thịt heo'],
  poultry: ['Ức gà'],
  salmon: ['Cá hồi'],
  seafood: ['Tôm sú', 'Cá lóc', 'Mực ống', 'Nghêu'],
  greens: ['Rau thơm', 'Hành lá', 'Rau muống', 'Bắp chuối bào', 'Xà lách', 'Giá đỗ'],
  roots: ['Khoai lang', 'Khoai môn', 'Cà rốt', 'Củ cải trắng'],
  vegetables: ['Cà chua', 'Dưa leo', 'Thơm'],
  tomatoes: ['Ớt tươi', 'Chanh'],
  aromatics: ['Hành tây', 'Hành tím', 'Tỏi', 'Gừng', 'Sả'],
  noodles: ['Bánh phở', 'Bún tươi', 'Bún gạo'],
  grains: ['Gạo tẻ', 'Gạo nếp'],
  coconut: ['Dừa tươi', 'Nước cốt dừa', 'Sữa tươi'],
  nuts: ['Đậu phộng', 'Đậu hũ', 'Nấm hương', 'Nấm rơm'],
  spices: ['Nghệ', 'Mắm ruốc', 'Me', 'Mật ong', 'Nước mắm'],
  pantry: ['Bánh tráng', 'Đường thốt nốt', 'Bột năng', 'Bột mì', 'Trứng gà', 'Đường', 'Muối', 'Chuối']
};

function imageUrl(fileName) {
  return `/uploads/${fileName}`;
}

async function downloadImage(url, filePath) {
  if (fs.existsSync(filePath)) return false;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Không thể tải ảnh ${url}: HTTP ${response.status}`);
  }

  const image = Buffer.from(await response.arrayBuffer());
  const isJpeg = image.length > 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (!isJpeg) throw new Error(`Tệp tải về không phải ảnh JPEG: ${url}`);

  await fs.promises.writeFile(filePath, image, { flag: 'wx' });
  return true;
}

async function downloadCatalogAssets() {
  await fs.promises.mkdir(uploadDirectory, { recursive: true });
  const createdFiles = [];
  try {
    const dishImageUrls = [];
    for (let index = 0; index < dishPhotoIds.length; index += 1) {
      const name = `dish-${String(index + 1).padStart(2, '0')}.jpg`;
      if (await downloadImage(unsplashUrl(dishPhotoIds[index], 1000), path.join(uploadDirectory, name))) {
        createdFiles.push(name);
      }
      dishImageUrls.push(imageUrl(name));
    }

    const chefImageUrls = [];
    for (let index = 0; index < chefPhotoIds.length; index += 1) {
      const name = `chef-${String(index + 1).padStart(2, '0')}.jpg`;
      if (await downloadImage(unsplashUrl(chefPhotoIds[index], 720), path.join(uploadDirectory, name))) {
        createdFiles.push(name);
      }
      chefImageUrls.push(imageUrl(name));
    }

    const ingredientImageUrls = new Map();
    for (const [group, photoId] of Object.entries(ingredientPhotoIds)) {
      const name = `ingredient-${group}.jpg`;
      if (await downloadImage(unsplashUrl(photoId, 720), path.join(uploadDirectory, name))) {
        createdFiles.push(name);
      }
      ingredientImageUrls.set(group, imageUrl(name));
    }

    return { dishImageUrls, chefImageUrls, ingredientImageUrls, createdFiles };
  } catch (error) {
    await Promise.all(createdFiles.map((name) =>
      fs.promises.unlink(path.join(uploadDirectory, name)).catch((cleanupError) => {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      })
    ));
    throw error;
  }
}

async function assignImages(assets) {
  const [dishes, chefs, ingredients] = await Promise.all([
    prisma.dish.findMany({ orderBy: { id: 'asc' } }),
    prisma.chef.findMany({ orderBy: { id: 'asc' } }),
    prisma.ingredient.findMany({ orderBy: { id: 'asc' } })
  ]);

  if (dishes.length > assets.dishImageUrls.length) {
    throw new Error(`Có ${dishes.length} món, nhưng chỉ có ${assets.dishImageUrls.length} ảnh món mẫu.`);
  }
  if (chefs.length > assets.chefImageUrls.length) {
    throw new Error(`Có ${chefs.length} đầu bếp, nhưng chỉ có ${assets.chefImageUrls.length} ảnh chân dung mẫu.`);
  }

  const ingredientGroupByName = new Map(
    Object.entries(ingredientsByPhoto).flatMap(([group, names]) =>
      names.map((name) => [name, group])
    )
  );
  const missingGroups = ingredients
    .filter((ingredient) => !ingredient.imageUrl && !ingredientGroupByName.has(ingredient.name))
    .map((ingredient) => ingredient.name);
  if (missingGroups.length > 0) {
    throw new Error(`Chưa ánh xạ ảnh cho nguyên liệu: ${missingGroups.join(', ')}`);
  }

  const updates = [
    ...dishes.flatMap((dish, index) => dish.imageUrl ? [] : [
      prisma.dish.updateMany({
        where: { id: dish.id, imageUrl: null },
        data: { imageUrl: assets.dishImageUrls[index] }
      })
    ]),
    ...chefs.flatMap((chef, index) => chef.imageUrl ? [] : [
      prisma.chef.updateMany({
        where: { id: chef.id, imageUrl: null },
        data: { imageUrl: assets.chefImageUrls[index] }
      })
    ]),
    ...ingredients.flatMap((ingredient) => {
      if (ingredient.imageUrl) return [];
      const group = ingredientGroupByName.get(ingredient.name);
      return [
        prisma.ingredient.updateMany({
          where: { id: ingredient.id, imageUrl: null },
          data: { imageUrl: assets.ingredientImageUrls.get(group) }
        })
      ];
    })
  ];

  for (let index = 0; index < updates.length; index += 15) {
    await prisma.$transaction(updates.slice(index, index + 15));
  }

  return {
    dishes: dishes.filter((dish) => !dish.imageUrl).length,
    chefs: chefs.filter((chef) => !chef.imageUrl).length,
    ingredients: ingredients.filter((ingredient) => !ingredient.imageUrl).length
  };
}

async function main() {
  const assets = await downloadCatalogAssets();
  const assigned = await assignImages(assets);

  const attribution = {
    provider: 'Unsplash',
    note: 'Locally cached sample images sourced from Unsplash. Replace any image using the existing admin upload form.',
    pages: [...new Set([
      ...dishPhotoIds,
      ...chefPhotoIds,
      ...Object.values(ingredientPhotoIds)
    ])].map((photoId) => `https://images.unsplash.com/photo-${photoId}`)
  };
  await fs.promises.writeFile(
    path.join(uploadDirectory, 'attribution.json'),
    `${JSON.stringify(attribution, null, 2)}\n`
  );

  console.log(
    `Đã thêm ảnh cho ${assigned.dishes} món, ${assigned.chefs} đầu bếp và ` +
    `${assigned.ingredients} nguyên liệu. Ảnh được lưu tại public/uploads.`
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Không thể thêm ảnh mẫu:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };
