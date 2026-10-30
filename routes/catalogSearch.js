const { Prisma } = require('@prisma/client');

const pageSizeDefault = 24;
const pageSizeMaximum = 1008;
const searchModes = new Set(['basic', 'advanced', 'fulltext', 'fuzzy']);
const dishSorts = new Set(['id_desc', 'name_asc', 'name_desc', 'price_asc', 'price_desc']);
const accentGroups = [
  ['a', 'àáạảãâầấậẩẫăằắặẳẵ'],
  ['e', 'èéẹẻẽêềếệểễ'],
  ['i', 'ìíịỉĩ'],
  ['o', 'òóọỏõôồốộổỗơờớợởỡ'],
  ['u', 'ùúụủũưừứựửữ'],
  ['y', 'ỳýỵỷỹ']
];
const accentFrom = `${accentGroups.map(([, letters]) => letters).join('')}đ`;
const accentTo = `${accentGroups.map(([base, letters]) => base.repeat([...letters].length)).join('')}d`;

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

function foldedColumn(column) {
  return Prisma.raw(`translate(lower(coalesce(${column}, '')), '${accentFrom}', '${accentTo}')`);
}

function parseInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

function readDishFilters(query) {
  const mode = typeof query.mode === 'string' ? query.mode : 'basic';
  const sort = typeof query.sort === 'string' ? query.sort : 'id_desc';
  const page = parseInteger(query.page, 1, 100000);
  const pageSize = parseInteger(query.pageSize, pageSizeDefault, pageSizeMaximum);
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const category = typeof query.category === 'string' ? query.category.trim() : '';
  const minPrice = query.minPrice === undefined || query.minPrice === '' ? null : Number(query.minPrice);
  const maxPrice = query.maxPrice === undefined || query.maxPrice === '' ? null : Number(query.maxPrice);
  let available = null;
  if (query.available === 'true') available = true;
  else if (query.available === 'false') available = false;

  if (!searchModes.has(mode)) return { error: 'Kiểu tìm kiếm không hợp lệ.' };
  if (!dishSorts.has(sort)) return { error: 'Kiểu sắp xếp không hợp lệ.' };
  if (!page || !pageSize) return { error: 'Trang hoặc kích thước trang không hợp lệ.' };
  if (mode === 'fulltext' || mode === 'fuzzy') {
    if (!q) return { error: 'Nhập từ khóa để dùng tìm kiếm fulltext hoặc fuzzy.' };
    if (q.length > 200) return { error: 'Từ khóa không được vượt quá 200 ký tự.' };
  }
  if ((query.minPrice !== undefined && query.minPrice !== '' &&
       (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (query.maxPrice !== undefined && query.maxPrice !== '' &&
       (!Number.isFinite(maxPrice) || maxPrice < 0))) {
    return { error: 'Khoảng giá phải là số không âm.' };
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: 'Giá tối thiểu không thể lớn hơn giá tối đa.' };
  }
  if (query.available !== undefined && query.available !== '' && available === null) {
    return { error: 'Trạng thái phục vụ không hợp lệ.' };
  }

  return {
    value: { mode, sort, page, pageSize, q, category, minPrice, maxPrice, available }
  };
}

function readBasicFilters(query) {
  const sort = typeof query.sort === 'string' ? query.sort : 'id_desc';
  const page = parseInteger(query.page, 1, 100000);
  const pageSize = parseInteger(query.pageSize, pageSizeDefault, pageSizeMaximum);
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (!['id_desc', 'name_asc', 'name_desc'].includes(sort)) {
    return { error: 'Kiểu sắp xếp không hợp lệ.' };
  }
  if (!page || !pageSize) return { error: 'Trang hoặc kích thước trang không hợp lệ.' };
  if (q.length > 200) return { error: 'Từ khóa không được vượt quá 200 ký tự.' };
  return { value: { sort, page, pageSize, q } };
}

function dishWhere(filters) {
  const conditions = [];
  const query = normalizeSearchText(filters.q);
  const foldedName = foldedColumn('d."name"');
  if (filters.q && (filters.mode === 'basic' || filters.mode === 'advanced')) {
    conditions.push(Prisma.sql`strpos(${foldedName}, ${query}) > 0`);
  }
  if (filters.mode === 'fulltext') {
    conditions.push(Prisma.sql`
      to_tsvector(
        'simple'::regconfig,
        ${foldedName} || ' ' || ${foldedColumn('d."description"')}
      ) @@ plainto_tsquery('simple'::regconfig, ${query})
    `);
  }
  if (filters.mode === 'fuzzy') {
    conditions.push(Prisma.sql`
      ${foldedName} % ${query}
      AND similarity(${foldedName}, ${query}) >= 0.3
    `);
  }
  if (filters.category) conditions.push(Prisma.sql`d."category" = ${filters.category}`);
  if (filters.minPrice !== null) conditions.push(Prisma.sql`d."price" >= ${filters.minPrice}`);
  if (filters.maxPrice !== null) conditions.push(Prisma.sql`d."price" <= ${filters.maxPrice}`);
  if (filters.available !== null) conditions.push(Prisma.sql`d."available" = ${filters.available}`);
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}

function dishOrder(filters) {
  const imageFirst = Prisma.sql`(d."imageUrl" IS NOT NULL AND d."imageUrl" <> '') DESC,`;
  const query = normalizeSearchText(filters.q);
  const foldedName = foldedColumn('d."name"');
  if (filters.mode === 'fulltext') {
    return Prisma.sql`ORDER BY ${imageFirst} ts_rank(
      to_tsvector(
        'simple'::regconfig,
        ${foldedName} || ' ' || ${foldedColumn('d."description"')}
      ),
      plainto_tsquery('simple'::regconfig, ${query})
    ) DESC, d."id" ASC`;
  }
  if (filters.mode === 'fuzzy') {
    return Prisma.sql`ORDER BY ${imageFirst} similarity(${foldedName}, ${query}) DESC, d."id" ASC`;
  }
  if (filters.sort === 'name_asc') return Prisma.sql`ORDER BY ${imageFirst} ${foldedName} ASC, d."id" ASC`;
  if (filters.sort === 'name_desc') return Prisma.sql`ORDER BY ${imageFirst} ${foldedName} DESC, d."id" ASC`;
  if (filters.sort === 'price_asc') return Prisma.sql`ORDER BY ${imageFirst} d."price" ASC, d."id" ASC`;
  if (filters.sort === 'price_desc') return Prisma.sql`ORDER BY ${imageFirst} d."price" DESC, d."id" ASC`;
  return Prisma.sql`ORDER BY ${imageFirst} d."id" DESC`;
}

async function listDishes(prisma, filters) {
  const where = dishWhere(filters);
  const runQueries = async (tx) => {
    const [countRows, categoryRows] = await Promise.all([
      tx.$queryRaw(Prisma.sql`SELECT count(*)::int AS total FROM public."Dish" AS d ${where}`),
      tx.dish.findMany({
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' }
      })
    ]);

    const total = countRows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
    const page = Math.min(filters.page, totalPages);
    const pageRows = await tx.$queryRaw(Prisma.sql`
      SELECT d."id"
      FROM public."Dish" AS d
      ${where}
      ${dishOrder(filters)}
      LIMIT ${filters.pageSize} OFFSET ${(page - 1) * filters.pageSize}
    `);
    const ids = pageRows.map((row) => row.id);
    const fetched = ids.length
      ? await tx.dish.findMany({
          where: { id: { in: ids } },
          include: { chefs: true, ingredients: true }
        })
      : [];
    const byId = new Map(fetched.map((dish) => [dish.id, dish]));

    return {
      items: ids.map((id) => byId.get(id)).filter(Boolean),
      total,
      page,
      pageSize: filters.pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      categories: categoryRows.map((row) => row.category)
    };
  };

  if (filters.mode === 'fuzzy') {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL search_path TO "$user", public, extensions`;
      await tx.$executeRaw`SET LOCAL pg_trgm.similarity_threshold TO '0.3'`;
      return runQueries(tx);
    }, { maxWait: 10000, timeout: 20000 });
  }
  return runQueries(prisma);
}

async function listRelated(prisma, resource, filters) {
  const table = resource === 'chef' ? '"Chef"' : '"Ingredient"';
  const model = prisma[resource];
  const where = filters.q
    ? Prisma.sql`WHERE strpos(${foldedColumn('record."name"')}, ${normalizeSearchText(filters.q)}) > 0`
    : Prisma.empty;
  const order = filters.sort === 'name_asc'
    ? Prisma.sql`${foldedColumn('record."name"')} ASC, record."id" ASC`
    : filters.sort === 'name_desc'
      ? Prisma.sql`${foldedColumn('record."name"')} DESC, record."id" ASC`
      : Prisma.sql`record."id" DESC`;
  const [countRow] = await prisma.$queryRaw(Prisma.sql`
    SELECT count(*)::int AS total
    FROM public.${Prisma.raw(table)} AS record
    ${where}
  `);
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const idRows = await prisma.$queryRaw(Prisma.sql`
    SELECT record."id"
    FROM public.${Prisma.raw(table)} AS record
    ${where}
    ORDER BY (record."imageUrl" IS NOT NULL AND record."imageUrl" <> '') DESC, ${order}
    LIMIT ${filters.pageSize}
    OFFSET ${(page - 1) * filters.pageSize}
  `);
  const ids = idRows.map((row) => row.id);
  const fetched = ids.length ? await model.findMany({
    where: { id: { in: ids } },
    include: { dishes: { select: { id: true, name: true } } },
  }) : [];
  const itemsById = new Map(fetched.map((item) => [item.id, item]));
  return {
    items: ids.map((id) => itemsById.get(id)).filter(Boolean),
    total,
    page,
    pageSize: filters.pageSize,
    totalPages,
    hasNextPage: page < totalPages
  };
}

module.exports = {
  pageSizeDefault,
  readDishFilters,
  readBasicFilters,
  normalizeSearchText,
  listDishes,
  listRelated
};
