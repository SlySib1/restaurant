const main = document.querySelector('#app-main');
const toast = document.querySelector('#app-toast');
const apiRoot = `${(window.APP_CONFIG?.apiBaseUrl || window.location.origin).replace(/\/+$/, '')}/api`;
let routeVersion = 0;
let toastTimer;
let listObserver;
let activeList;
const listPageSize = 24;
const listRestoreMaximum = 1008;

class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || 'Không thể hoàn thành yêu cầu.');
    this.status = status;
    this.code = payload?.error?.code || 'REQUEST_FAILED';
    this.fields = payload?.error?.fields || {};
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatPrice(value) {
  return `${Number(value).toLocaleString('vi-VN')} ₫`;
}

function assetUrl(url) {
  return new URL(url, window.APP_CONFIG?.apiBaseUrl || window.location.origin).href;
}

async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  const init = { method: options.method || 'GET', headers };

  if (options.body instanceof FormData) {
    init.body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${apiRoot}${endpoint}`, init);
  } catch {
    throw new ApiError(0, {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Không kết nối được API. Hãy kiểm tra server và cấu hình origin.'
      }
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, {
      error: { code: 'INVALID_RESPONSE', message: 'API trả về dữ liệu không hợp lệ.' }
    });
  }

  if (!response.ok || payload.ok !== true) throw new ApiError(response.status, payload);
  return payload.data;
}

function imageMarkup(imageUrl, alt, className = 'image-preview') {
  if (!imageUrl) {
    return `<div class="${className} image-placeholder" role="img" aria-label="Chưa có ảnh">Bếp Nhà</div>`;
  }
  return `<img class="${className}" src="${escapeHtml(assetUrl(imageUrl))}" alt="${escapeHtml(alt)}">`;
}

function showToast(message, isError = false) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.className = `toast${isError ? ' toast-error' : ''}`;
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3600);
}

function setLoading(title = 'Đang tải dữ liệu') {
  main.innerHTML = `
    <section class="panel loading-panel" role="status" aria-live="polite">
      <div><div class="spinner" aria-hidden="true"></div>${escapeHtml(title)}...</div>
    </section>`;
}

function setError(error, retryPath = window.location.pathname + window.location.search) {
  main.innerHTML = `
    <section class="panel not-found" role="alert">
      <p class="eyebrow">${error.status === 404 ? 'Không tìm thấy' : 'Có lỗi xảy ra'}</p>
      <strong>${escapeHtml(error.message)}</strong>
      <p class="hint">${escapeHtml(error.code)}</p>
      <button type="button" data-retry="${escapeHtml(retryPath)}">Thử lại</button>
      <a class="button button-secondary" href="/dishes" data-link>Về thực đơn</a>
    </section>`;
}

function renderNotFound() {
  main.innerHTML = `
    <section class="panel not-found" role="status">
      <p class="eyebrow">404</p>
      <strong>Trang này không tồn tại.</strong>
      <p class="hint">Kiểm tra lại đường dẫn hoặc quay về thực đơn.</p>
      <a class="button" href="/dishes" data-link>Về thực đơn</a>
    </section>`;
}

function routeFromLocation() {
  const pathname = decodeURIComponent(window.location.pathname);
  const query = new URLSearchParams(window.location.search);
  if (pathname === '/' || pathname === '/dishes') return { name: 'dish-list', query };
  let match = pathname.match(/^\/dishes\/([^/]+)$/);
  if (match) return { name: 'dish-detail', id: match[1] };

  match = pathname.match(/^\/admin\/(dishes|chefs|ingredients)$/);
  if (match) return { name: 'admin-list', resource: match[1] };
  match = pathname.match(/^\/admin\/(dishes|chefs|ingredients)\/new$/);
  if (match) return { name: 'admin-form', resource: match[1], mode: 'create' };
  match = pathname.match(/^\/admin\/(dishes|chefs|ingredients)\/([^/]+)\/(edit|delete)$/);
  if (match) {
    return {
      name: match[3] === 'edit' ? 'admin-form' : 'admin-delete',
      resource: match[1],
      id: match[2],
      mode: match[3] === 'edit' ? 'edit' : 'delete'
    };
  }
  return { name: 'not-found' };
}

function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderRoute();
}

function currentListState(query, resource) {
  const parsedPage = Number(query.get('page') || 1);
  return {
    q: query.get('q') || '',
    mode: resource === 'dishes' ? (query.get('mode') || 'basic') : 'basic',
    category: query.get('category') || '',
    minPrice: query.get('minPrice') || '',
    maxPrice: query.get('maxPrice') || '',
    available: query.get('available') || '',
    sort: query.get('sort') || 'id_desc',
    pageSize: listPageSize,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  };
}

function paginationFor(resource) {
  if (resource === 'chefs') return 'more';
  if (resource === 'ingredients') return 'infinite';
  return 'pages';
}

function paginationLabel(resource) {
  return ({
    dishes: 'Số trang',
    chefs: 'Tải thêm',
    ingredients: 'Cuộn vô hạn'
  })[resource];
}

function listUrl(pathname, state, page = 1) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.mode !== 'basic') params.set('mode', state.mode);
  if (state.category) params.set('category', state.category);
  if (state.minPrice) params.set('minPrice', state.minPrice);
  if (state.maxPrice) params.set('maxPrice', state.maxPrice);
  if (state.available) params.set('available', state.available);
  if (state.sort !== 'id_desc') params.set('sort', state.sort);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function listApiUrl(resource, state, page, pageSize) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (state.q) params.set('q', state.q);
  if (resource === 'dishes') {
    params.set('mode', state.mode);
    if (state.category) params.set('category', state.category);
    if (state.minPrice) params.set('minPrice', state.minPrice);
    if (state.maxPrice) params.set('maxPrice', state.maxPrice);
    if (state.available) params.set('available', state.available);
  }
  if (state.sort !== 'id_desc') params.set('sort', state.sort);
  return `/${resource}?${params.toString()}`;
}

function catalogForm(resource, state, categories = []) {
  const dishList = resource === 'dishes';
  const rankedSearch = dishList && ['fulltext', 'fuzzy'].includes(state.mode);
  const searchDescription = state.mode === 'advanced'
    ? 'Tìm một phần tên và kết hợp từ khóa, danh mục, khoảng giá, trạng thái bằng điều kiện AND.'
    : state.mode === 'fulltext'
      ? 'PostgreSQL tìm trong tên và mô tả bằng cấu hình simple; hỗ trợ từ khóa có hoặc không dấu.'
      : state.mode === 'fuzzy'
        ? 'Tìm tên gần giống với pg_trgm, ngưỡng similarity 0.3; hỗ trợ từ khóa có hoặc không dấu.'
        : 'Tìm chuỗi con trong tên không phân biệt hoa/thường, có hoặc không dấu.';
  return `
    <form class="catalog-filters panel" data-catalog-form data-resource="${resource}">
      <div class="filter-grid">
        <label class="field">
          <span class="field-label">Từ khóa</span>
          <input type="search" name="q" value="${escapeHtml(state.q)}" placeholder="Tên ${escapeHtml(resourceLabel(resource))}..." maxlength="200" ${rankedSearch ? 'required' : ''}>
        </label>
        ${dishList ? `
          <label class="field">
            <span class="field-label">Kiểu tìm kiếm</span>
            <select name="mode">
              <option value="basic" ${state.mode === 'basic' ? 'selected' : ''}>Basic · một phần tên</option>
              <option value="advanced" ${state.mode === 'advanced' ? 'selected' : ''}>Advanced · AND bộ lọc</option>
              <option value="fulltext" ${state.mode === 'fulltext' ? 'selected' : ''}>Full-text · tên và mô tả</option>
              <option value="fuzzy" ${state.mode === 'fuzzy' ? 'selected' : ''}>Fuzzy · gần giống (0.3)</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Danh mục</span>
            <select name="category">
              <option value="">Tất cả danh mục</option>
              ${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.category === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Giá từ</span>
            <input type="number" name="minPrice" min="0" step="1000" value="${escapeHtml(state.minPrice)}">
          </label>
          <label class="field">
            <span class="field-label">Giá đến</span>
            <input type="number" name="maxPrice" min="0" step="1000" value="${escapeHtml(state.maxPrice)}">
          </label>
          <label class="field">
            <span class="field-label">Trạng thái</span>
            <select name="available">
              <option value="">Tất cả</option>
              <option value="true" ${state.available === 'true' ? 'selected' : ''}>Còn bán</option>
              <option value="false" ${state.available === 'false' ? 'selected' : ''}>Tạm hết</option>
            </select>
          </label>` : ''}
        ${rankedSearch
          ? '<p class="hint relevance-note">Thứ tự kết quả được xếp theo điểm liên quan giảm dần, ID tăng dần.</p>'
          : `<label class="field">
          <span class="field-label">Sắp xếp</span>
          <select name="sort">
            <option value="id_desc" ${state.sort === 'id_desc' ? 'selected' : ''}>Mới cập nhật</option>
            <option value="name_asc" ${state.sort === 'name_asc' ? 'selected' : ''}>Tên A → Z</option>
            <option value="name_desc" ${state.sort === 'name_desc' ? 'selected' : ''}>Tên Z → A</option>
            ${dishList ? `
              <option value="price_asc" ${state.sort === 'price_asc' ? 'selected' : ''}>Giá tăng dần</option>
              <option value="price_desc" ${state.sort === 'price_desc' ? 'selected' : ''}>Giá giảm dần</option>` : ''}
        </select>
        </label>`}
      </div>
      <p class="hint">${dishList
        ? `${searchDescription} Tìm kiếm và lọc trên toàn bộ danh sách món ở server trước khi phân trang.`
        : `Tìm kiếm và sắp xếp trên toàn bộ danh sách ${escapeHtml(resourceLabel(resource))} ở server trước khi phân trang.`}
        Có thể nhập từ khóa tiếng Việt không dấu. Kết quả có ảnh thật được ưu tiên lên đầu. Danh sách này dùng phân trang kiểu <strong>${paginationLabel(resource)}</strong>.</p>
      <div class="button-row">
        <button type="submit">Áp dụng</button>
        <a class="button button-secondary" href="${escapeHtml(listUrl(window.location.pathname, { ...state, q: '', mode: 'basic', category: '', minPrice: '', maxPrice: '', available: '', sort: 'id_desc' }))}" data-link>Xóa điều kiện</a>
      </div>
    </form>`;
}

function listPaginationMarkup(resource, state, page, totalPages, total, loadedCount) {
  const pagination = paginationFor(resource);
  if (pagination !== 'pages') {
    const hasMore = loadedCount < total;
    if (!hasMore) return '<p class="hint">Đã hiển thị toàn bộ kết quả.</p>';
    return `
      <div class="load-more-area">
        ${pagination === 'more'
          ? `<button type="button" data-load-more ${activeList?.loading ? 'disabled' : ''}>Tải thêm</button>`
          : ''}
        <span class="hint">${loadedCount} / ${total} kết quả</span>
        ${pagination === 'infinite'
          ? '<div class="infinite-sentinel" data-infinite-sentinel aria-hidden="true"></div>'
          : ''}
      </div>`;
  }
  if (totalPages <= 1) return '';

  const first = Math.max(1, page - 2);
  const last = Math.min(totalPages, page + 2);
  const pages = [];
  if (first > 1) pages.push(1, ...(first > 2 ? ['ellipsis'] : []));
  for (let number = first; number <= last; number += 1) pages.push(number);
  if (last < totalPages) pages.push(...(last < totalPages - 1 ? ['ellipsis'] : []), totalPages);

  return `
    <nav class="pagination" aria-label="Phân trang">
      <a class="button button-secondary" href="${escapeHtml(listUrl(window.location.pathname, state, Math.max(1, page - 1)))}" data-link ${page <= 1 ? 'aria-disabled="true" tabindex="-1"' : ''}>Trước</a>
      ${pages.map((number) => number === 'ellipsis'
        ? '<span aria-hidden="true">…</span>'
        : `<a class="page-number${number === page ? ' current-page' : ''}" href="${escapeHtml(listUrl(window.location.pathname, state, number))}" data-link ${number === page ? 'aria-current="page"' : ''}>${number}</a>`).join('')}
      <a class="button button-secondary" href="${escapeHtml(listUrl(window.location.pathname, state, Math.min(totalPages, page + 1)))}" data-link ${page >= totalPages ? 'aria-disabled="true" tabindex="-1"' : ''}>Sau</a>
    </nav>`;
}

function startInfiniteScroll(version) {
  listObserver?.disconnect();
  if (!activeList || paginationFor(activeList.resource) !== 'infinite') return;
  const sentinel = main.querySelector('[data-infinite-sentinel]');
  if (!sentinel || !('IntersectionObserver' in window)) return;
  listObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadNextListPage(version);
  }, { rootMargin: '240px' });
  listObserver.observe(sentinel);
}

async function loadNextListPage(version) {
  const listing = activeList;
  if (!listing || listing.version !== version || routeVersion !== version ||
      listing.loading || listing.items.length >= listing.total) return;
  listing.loading = true;
  const nextPage = Math.ceil(listing.items.length / listPageSize) + 1;
  const button = main.querySelector('[data-load-more]');
  if (button) button.disabled = true;
  try {
    const result = await request(listApiUrl(listing.resource, listing.state, nextPage, listPageSize));
    if (activeList !== listing || routeVersion !== version) return;
    listing.items.push(...result.items);
    listing.total = result.total;
    listing.page = Math.max(1, Math.ceil(listing.items.length / listPageSize));
    window.history.pushState({}, '', listUrl(window.location.pathname, listing.state, listing.page));
    renderActiveListItems(listing);
    startInfiniteScroll(version);
  } catch (error) {
    if (activeList === listing && routeVersion === version) showToast(error.message, true);
  } finally {
    listing.loading = false;
    const currentButton = main.querySelector('[data-load-more]');
    if (currentButton) currentButton.disabled = false;
  }
}

function renderActiveListItems(listing) {
  if (listing.resource === 'dishes') {
    const grid = main.querySelector('[data-list-items]');
    grid.innerHTML = listing.items.length
      ? listing.items.map(renderDishCard).join('')
      : '<div class="panel empty-state">Không tìm thấy món ăn phù hợp.</div>';
  } else {
    const body = main.querySelector('[data-list-items]');
    const firstItemIndex = paginationFor(listing.resource) === 'pages'
      ? (listing.page - 1) * listPageSize
      : 0;
    body.innerHTML = listing.items.length
      ? listing.items.map((record, index) =>
        renderAdminRow(listing.resource, record, firstItemIndex + index)).join('')
      : `<tr><td colspan="6" class="empty-state">Chưa có ${escapeHtml(resourceLabel(listing.resource))} nào phù hợp.</td></tr>`;
  }
  const controls = main.querySelector('[data-list-pagination]');
  if (controls) {
    controls.innerHTML = listPaginationMarkup(
      listing.resource, listing.state, listing.page, listing.totalPages,
      listing.total, listing.items.length
    );
  }
}

function resourceLabel(resource) {
  return ({ dishes: 'món ăn', chefs: 'đầu bếp', ingredients: 'nguyên liệu' })[resource];
}

function resourceTitle(resource) {
  return ({ dishes: 'Món ăn', chefs: 'Đầu bếp', ingredients: 'Nguyên liệu' })[resource];
}

function renderDishCard(dish) {
  return `
    <article class="dish-card">
      <a href="/dishes/${dish.id}" data-link aria-label="Xem món ${escapeHtml(dish.name)}">
        ${imageMarkup(dish.imageUrl, dish.name)}
      </a>
      <div class="dish-card-body">
        <p class="eyebrow">${escapeHtml(dish.category)}</p>
        <h2><a href="/dishes/${dish.id}" data-link>${escapeHtml(dish.name)}</a></h2>
        <p class="price">${formatPrice(dish.price)}</p>
        <p><span class="badge ${dish.available ? '' : 'badge-unavailable'}">${dish.available ? 'Đang phục vụ' : 'Tạm hết'}</span></p>
        <p>Đầu bếp: ${escapeHtml((dish.chefs || []).map((chef) => chef.name).join(', ') || 'Chưa phân công')}</p>
      </div>
    </article>`;
}

async function renderDishList(version, query) {
  setLoading('Đang tải thực đơn');
  try {
    const state = currentListState(query, 'dishes');
    const result = await request(listApiUrl('dishes', state, state.page, listPageSize));
    if (version !== routeVersion) return;
    const page = result.page;
    if (page !== state.page) {
      state.page = page;
      window.history.replaceState({}, '', listUrl('/dishes', state, page));
    }
    activeList = {
      resource: 'dishes',
      state,
      pagination: paginationFor('dishes'),
      page,
      totalPages: result.totalPages,
      total: result.total,
      items: result.items,
      loading: false,
      version
    };
    main.innerHTML = `
      <div class="spa-page">
        <section class="hero">
          <div>
            <p class="eyebrow">Món ngon mỗi ngày</p>
            <h1>Hương vị nhà, nâng niu từng bữa ăn.</h1>
            <p>Khám phá thực đơn được chuẩn bị từ nguyên liệu tươi ngon và sự chăm chút của căn bếp.</p>
          </div>
          <div class="hero-art" aria-hidden="true"></div>
        </section>
        <div class="spa-heading">
          <div><p class="eyebrow">Từ căn bếp của chúng tôi</p><h2>Thực đơn hôm nay</h2></div>
          <p>${result.total.toLocaleString('vi-VN')} món ăn</p>
        </div>
        ${catalogForm('dishes', state, result.categories)}
        <p class="hint">Đang xem trang ${page} / ${result.totalPages}; mở lại URL sẽ khôi phục đúng trang này.</p>
        <div class="dish-grid" data-list-items></div>
        <div data-list-pagination></div>
      </div>`;
    renderActiveListItems(activeList);
    startInfiniteScroll(version);
  } catch (error) {
    if (version === routeVersion) setError(error);
  }
}

async function renderDishDetail(version, id) {
  setLoading('Đang tải chi tiết món ăn');
  try {
    const dish = await request(`/dishes/${encodeURIComponent(id)}`);
    if (version !== routeVersion) return;
    main.innerHTML = `
      <div class="spa-page">
        <p class="eyebrow"><a href="/dishes" data-link>← Trở lại thực đơn</a></p>
        <section class="panel detail-panel">
          <div>
            <p class="eyebrow">${escapeHtml(dish.category)}</p>
            <h1>${escapeHtml(dish.name)}</h1>
            <p>${escapeHtml(dish.description || 'Một món ngon được chuẩn bị tận tâm từ căn bếp của chúng tôi.')}</p>
            <p class="price">${formatPrice(dish.price)}</p>
            <p><span class="badge ${dish.available ? '' : 'badge-unavailable'}">${dish.available ? 'Đang phục vụ' : 'Tạm hết'}</span></p>
            <h2>Đầu bếp có thể chế biến</h2>
            ${dish.chefs.length
              ? `<ul>${dish.chefs.map((chef) => `<li>${escapeHtml(chef.name)} · ${escapeHtml(chef.specialty)}</li>`).join('')}</ul>`
              : '<p class="hint">Chưa có đầu bếp được phân công.</p>'}
            <h2>Nguyên liệu</h2>
            ${dish.ingredients.length
              ? `<ul>${dish.ingredients.map((ingredient) => `<li>${escapeHtml(ingredient.name)} · ${escapeHtml(ingredient.unit)}</li>`).join('')}</ul>`
              : '<p class="hint">Chưa có nguyên liệu.</p>'}
          </div>
          <div>${imageMarkup(dish.imageUrl, dish.name)}</div>
        </section>
      </div>`;
  } catch (error) {
    if (version === routeVersion) setError(error);
  }
}

function listHeaders(resource) {
  if (resource === 'dishes') {
    return '<tr><th>STT</th><th>Ảnh</th><th>Tên món</th><th>Đầu bếp</th><th>Nguyên liệu</th><th>Giá</th><th>Hành động</th></tr>';
  }
  if (resource === 'chefs') {
    return '<tr><th>STT</th><th>Ảnh</th><th>Tên đầu bếp</th><th>Chuyên môn</th><th>Món có thể chế biến</th><th>Hành động</th></tr>';
  }
  return '<tr><th>STT</th><th>Ảnh</th><th>Tên nguyên liệu</th><th>Đơn vị</th><th>Món sử dụng</th><th>Hành động</th></tr>';
}

function renderAdminRow(resource, record, index) {
  const common = `
    <td class="row-number">${index + 1}</td>
    <td>${imageMarkup(record.imageUrl, record.name, 'table-thumb')}</td>`;
  let details;
  if (resource === 'dishes') {
    details = `
      <td><strong>${escapeHtml(record.name)}</strong><br><span class="badge ${record.available ? '' : 'badge-unavailable'}">${record.available ? 'Đang phục vụ' : 'Tạm hết'}</span></td>
      <td>${escapeHtml((record.chefs || []).map((chef) => chef.name).join(', ') || 'Chưa phân công')}</td>
      <td>${escapeHtml((record.ingredients || []).map((ingredient) => ingredient.name).join(', ') || 'Chưa khai báo')}</td>
      <td>${formatPrice(record.price)}</td>`;
  } else if (resource === 'chefs') {
    details = `
      <td><strong>${escapeHtml(record.name)}</strong></td>
      <td>${escapeHtml(record.specialty)}</td>
      <td>${escapeHtml((record.dishes || []).map((dish) => dish.name).join(', ') || 'Chưa phân công')}</td>`;
  } else {
    details = `
      <td><strong>${escapeHtml(record.name)}</strong></td>
      <td>${escapeHtml(record.unit)}</td>
      <td>${escapeHtml((record.dishes || []).map((dish) => dish.name).join(', ') || 'Chưa sử dụng')}</td>`;
  }
  return `<tr>${common}${details}
    <td class="actions">
      <a href="/admin/${resource}/${record.id}/edit" data-link>Sửa</a>
      <a href="/admin/${resource}/${record.id}/delete" data-link>Xóa</a>
    </td>
  </tr>`;
}

async function renderAdminList(version, resource) {
  setLoading(`Đang tải danh sách ${resourceLabel(resource)}`);
  try {
    const state = currentListState(new URLSearchParams(window.location.search), resource);
    const pagination = paginationFor(resource);
    const restoreMore = pagination !== 'pages' && state.page > 1;
    const pageSize = restoreMore
      ? Math.min(state.page * listPageSize, listRestoreMaximum)
      : listPageSize;
    const result = await request(listApiUrl(
      resource, state, restoreMore ? 1 : state.page, pageSize
    ));
    if (version !== routeVersion) return;
    const page = pagination === 'pages'
      ? result.page
      : Math.max(1, Math.ceil(result.items.length / listPageSize));
    if (page !== state.page) {
      state.page = page;
      window.history.replaceState({}, '', listUrl(window.location.pathname, state, page));
    }
    activeList = {
      resource,
      state,
      pagination,
      page,
      totalPages: result.totalPages,
      total: result.total,
      items: result.items,
      loading: false,
      version
    };
    const title = resourceTitle(resource);
    main.innerHTML = `
      <div class="spa-page">
        <p class="eyebrow">Khu vực quản trị</p>
        <div class="spa-heading">
          <div><h1>Quản lý ${escapeHtml(title.toLowerCase())}</h1><p>${result.total.toLocaleString('vi-VN')} bản ghi</p></div>
          <a class="button" href="/admin/${resource}/new" data-link>Thêm ${escapeHtml(resourceLabel(resource))}</a>
        </div>
        ${catalogForm(resource, state, result.categories || [])}
        <p class="hint">Danh sách được tìm kiếm/sắp xếp ở server trước phân trang. Cách phân trang của danh sách này: <strong>${paginationLabel(resource)}</strong>. Mở lại URL sẽ khôi phục ${pagination === 'pages' ? `trang ${page}` : 'phần đã tải'}.</p>
        <section class="panel">
          <div class="table-wrap"><table><thead>${listHeaders(resource)}</thead><tbody data-list-items></tbody></table></div>
        </section>
        <div data-list-pagination></div>
      </div>`;
    renderActiveListItems(activeList);
    startInfiniteScroll(version);
  } catch (error) {
    if (version === routeVersion) setError(error);
  }
}

function fieldErrorSlot(name) {
  return `<span class="field-error" data-error-for="${name}" aria-live="polite"></span>`;
}

function imageFields(record) {
  return `
    <div class="field">
      <label for="image">Ảnh</label>
      <input id="image" type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" data-image-input>
      <span class="hint">JPEG, PNG, WebP hoặc GIF · tối đa 5 MB</span>
      <img class="image-preview" data-image-preview src="${escapeHtml(record?.imageUrl ? assetUrl(record.imageUrl) : '')}" alt="Xem trước ảnh" ${record?.imageUrl ? '' : 'hidden'}>
      ${record?.imageUrl
        ? `<label class="check-row"><input type="checkbox" name="removeImage" value="true"> Xóa ảnh hiện tại</label>`
        : ''}
      ${fieldErrorSlot('image')}
    </div>`;
}

function dishRelationFields(chefs, ingredients, selectedChefIds = [], selectedIngredientIds = []) {
  return `
    <fieldset class="relation-picker">
      <legend>Đầu bếp có thể chế biến <span class="hint">(chọn ít nhất một)</span></legend>
      ${chefs.length
        ? chefs.map((chef) => `
          <label class="check-row">
            <input type="checkbox" name="chefIds" value="${chef.id}" ${selectedChefIds.includes(chef.id) ? 'checked' : ''}>
            ${escapeHtml(chef.name)} · ${escapeHtml(chef.specialty)}
          </label>`).join('')
        : '<span class="hint">Hãy thêm đầu bếp trước khi tạo món.</span>'}
      ${fieldErrorSlot('chefIds')}
    </fieldset>
    <fieldset class="relation-picker">
      <legend>Nguyên liệu cần có <span class="hint">(chọn ít nhất một)</span></legend>
      ${ingredients.length
        ? ingredients.map((ingredient) => `
          <label class="check-row">
            <input type="checkbox" name="ingredientIds" value="${ingredient.id}" ${selectedIngredientIds.includes(ingredient.id) ? 'checked' : ''}>
            ${escapeHtml(ingredient.name)} · ${escapeHtml(ingredient.unit)}
          </label>`).join('')
        : '<span class="hint">Hãy thêm nguyên liệu trước khi tạo món.</span>'}
      ${fieldErrorSlot('ingredientIds')}
    </fieldset>`;
}

function dishForm(record, chefs, ingredients) {
  const selectedChefIds = (record?.chefs || []).map((chef) => chef.id);
  const selectedIngredientIds = (record?.ingredients || []).map((ingredient) => ingredient.id);
  return `
    <div class="field">
      <label for="name">Tên món</label>
      <input id="name" name="name" required value="${escapeHtml(record?.name || '')}">
      ${fieldErrorSlot('name')}
    </div>
    <div class="field">
      <label for="description">Mô tả</label>
      <textarea id="description" name="description">${escapeHtml(record?.description || '')}</textarea>
      ${fieldErrorSlot('description')}
    </div>
    <div class="field">
      <label for="price">Giá (VNĐ)</label>
      <input id="price" type="number" name="price" min="1" step="1" required value="${escapeHtml(record?.price ?? '')}">
      ${fieldErrorSlot('price')}
    </div>
    <div class="field">
      <label for="category">Danh mục</label>
      <input id="category" name="category" required value="${escapeHtml(record?.category || '')}">
      ${fieldErrorSlot('category')}
    </div>
    ${dishRelationFields(chefs, ingredients, selectedChefIds, selectedIngredientIds)}
    ${imageFields(record)}
    <label class="check-row"><input type="checkbox" name="available" ${record ? (record.available ? 'checked' : '') : 'checked'}> Đang phục vụ</label>
    <div class="button-row">
      <button type="submit">${record ? 'Lưu thay đổi' : 'Thêm món ăn'}</button>
      <a class="button button-secondary" href="/admin/dishes" data-link>Hủy</a>
    </div>`;
}

function chefForm(record) {
  return `
    <div class="field">
      <label for="name">Tên đầu bếp</label>
      <input id="name" name="name" required value="${escapeHtml(record?.name || '')}">
      ${fieldErrorSlot('name')}
    </div>
    <div class="field">
      <label for="specialty">Chuyên môn</label>
      <input id="specialty" name="specialty" required value="${escapeHtml(record?.specialty || '')}">
      ${fieldErrorSlot('specialty')}
    </div>
    ${imageFields(record)}
    <div class="button-row">
      <button type="submit">${record ? 'Lưu thay đổi' : 'Thêm đầu bếp'}</button>
      <a class="button button-secondary" href="/admin/chefs" data-link>Hủy</a>
    </div>`;
}

function ingredientForm(record) {
  return `
    <div class="field">
      <label for="name">Tên nguyên liệu</label>
      <input id="name" name="name" required value="${escapeHtml(record?.name || '')}">
      ${fieldErrorSlot('name')}
    </div>
    <div class="field">
      <label for="unit">Đơn vị tính</label>
      <input id="unit" name="unit" required value="${escapeHtml(record?.unit || '')}">
      ${fieldErrorSlot('unit')}
    </div>
    ${imageFields(record)}
    <div class="button-row">
      <button type="submit">${record ? 'Lưu thay đổi' : 'Thêm nguyên liệu'}</button>
      <a class="button button-secondary" href="/admin/ingredients" data-link>Hủy</a>
    </div>`;
}

async function renderAdminForm(version, resource, mode, id) {
  setLoading(`Đang tải biểu mẫu ${resourceLabel(resource)}`);
  try {
    const recordPromise = mode === 'edit'
      ? request(`/${resource}/${encodeURIComponent(id)}`)
      : Promise.resolve(null);
    const optionsPromise = resource === 'dishes'
      ? Promise.all([
          request('/chefs?pageSize=1000'),
          request('/ingredients?pageSize=1000')
        ])
      : Promise.resolve([[], []]);
    const [record, [chefResults, ingredientResults]] = await Promise.all([recordPromise, optionsPromise]);
    if (version !== routeVersion) return;
    const chefs = chefResults.items || chefResults;
    const ingredients = ingredientResults.items || ingredientResults;

    const editing = mode === 'edit';
    const title = `${editing ? 'Sửa' : 'Thêm'} ${resourceLabel(resource)}`;
    const formContent = resource === 'dishes'
      ? dishForm(record, chefs, ingredients)
      : resource === 'chefs'
        ? chefForm(record)
        : ingredientForm(record);
    main.innerHTML = `
      <div class="spa-page">
        <p class="eyebrow">Khu vực quản trị</p>
        <h1>${escapeHtml(title)}</h1>
        ${editing ? `<p class="page-intro">Mã bản ghi #${escapeHtml(record.id)}.</p>` : ''}
        <section class="panel">
          <form class="form-stack" data-resource="${resource}" data-mode="${mode}" ${id ? `data-id="${escapeHtml(id)}"` : ''} enctype="multipart/form-data">
            ${formContent}
          </form>
        </section>
      </div>`;
  } catch (error) {
    if (version === routeVersion) setError(error);
  }
}

function deleteWarning(resource, record) {
  const name = escapeHtml(record.name);
  if (resource === 'ingredients') {
    const affected = record.dishes || [];
    return affected.length
      ? `<div class="error-box"><strong>${affected.length} món sẽ bị xóa:</strong><ul>${affected.map((dish) => `<li>${escapeHtml(dish.name)}</li>`).join('')}</ul></div>`
      : '<p class="badge">Không có món nào sử dụng nguyên liệu này.</p>';
  }
  if (resource === 'chefs') {
    const orphan = record.orphanDishes || [];
    const retained = record.retainedDishes || [];
    return `
      ${orphan.length
        ? `<div class="error-box"><strong>${orphan.length} món sẽ bị xóa vì không còn đầu bếp nào khác:</strong><ul>${orphan.map((dish) => `<li>${escapeHtml(dish.name)}</li>`).join('')}</ul></div>`
        : '<p class="badge">Không có món nào bị xóa.</p>'}
      ${retained.length
        ? `<div class="notice-box"><strong>${retained.length} món được giữ lại nhờ đầu bếp khác:</strong><ul>${retained.map((dish) => `<li>${escapeHtml(dish.name)} · ${escapeHtml(dish.chefs.filter((chef) => chef.id !== record.id).map((chef) => chef.name).join(', '))}</li>`).join('')}</ul></div>`
        : ''}`;
  }
  return `<p>Bạn có chắc muốn xóa món <strong>${name}</strong>?</p>`;
}

async function renderAdminDelete(version, resource, id) {
  setLoading('Đang kiểm tra các dữ liệu liên quan');
  try {
    const record = await request(`/${resource}/${encodeURIComponent(id)}`);
    if (version !== routeVersion) return;
    main.innerHTML = `
      <div class="spa-page">
        <section class="panel confirm-panel">
          <p class="eyebrow">Xác nhận thao tác</p>
          <h1>Xóa ${escapeHtml(resourceLabel(resource))}?</h1>
          <p>Bạn có chắc muốn xóa <strong>${escapeHtml(record.name)}</strong>?</p>
          ${deleteWarning(resource, record)}
          <div class="button-row">
            <button class="button-danger" type="button" data-confirm-delete data-resource="${resource}" data-id="${escapeHtml(id)}">Xác nhận xóa</button>
            <a class="button button-secondary" href="/admin/${resource}" data-link>Hủy</a>
          </div>
        </section>
      </div>`;
  } catch (error) {
    if (version === routeVersion) setError(error);
  }
}

async function renderRoute() {
  listObserver?.disconnect();
  activeList = null;
  const version = ++routeVersion;
  const route = routeFromLocation();
  if (route.name === 'not-found') return renderNotFound();
  if (route.name === 'dish-list') return renderDishList(version, route.query);
  if (route.name === 'dish-detail') return renderDishDetail(version, route.id);
  if (route.name === 'admin-list') return renderAdminList(version, route.resource);
  if (route.name === 'admin-form') return renderAdminForm(version, route.resource, route.mode, route.id);
  if (route.name === 'admin-delete') return renderAdminDelete(version, route.resource, route.id);
  return renderNotFound();
}

function setFieldErrors(form, error) {
  form.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));

  const entries = Object.entries(error.fields || {});
  if (entries.length === 0) {
    const message = document.createElement('div');
    message.className = 'error-box';
    message.setAttribute('role', 'alert');
    message.textContent = error.message;
    form.prepend(message);
    return;
  }

  for (const [field, message] of entries) {
    const slot = form.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
    if (slot) slot.textContent = message;
    form.querySelectorAll(`[name="${CSS.escape(field)}"]`).forEach((input) => {
      input.setAttribute('aria-invalid', 'true');
    });
  }
}

function formDataFor(form) {
  const data = new FormData(form);
  data.set('available', String(Boolean(form.elements.available?.checked)));
  const file = form.elements.image?.files?.[0];
  if (!file) data.delete('image');
  if (form.elements.removeImage?.checked) data.set('removeImage', 'true');
  return data;
}

document.addEventListener('click', async (event) => {
  const link = event.target.closest('a[data-link]');
  if (link && event.button === 0 && !event.metaKey && !event.ctrlKey &&
      !event.shiftKey && !event.altKey && link.target !== '_blank') {
    event.preventDefault();
    navigate(link.pathname + link.search + link.hash);
    return;
  }

  const retry = event.target.closest('[data-retry]');
  if (retry) {
    navigate(retry.dataset.retry, { replace: true });
    return;
  }

  const loadMore = event.target.closest('[data-load-more]');
  if (loadMore) {
    loadNextListPage(routeVersion);
    return;
  }

  const pageLink = event.target.closest('.pagination a[aria-disabled="true"]');
  if (pageLink) {
    event.preventDefault();
    return;
  }

  const confirmDelete = event.target.closest('[data-confirm-delete]');
  if (!confirmDelete) return;
  confirmDelete.disabled = true;
  try {
    await request(`/${confirmDelete.dataset.resource}/${encodeURIComponent(confirmDelete.dataset.id)}`, {
      method: 'DELETE'
    });
    const resource = confirmDelete.dataset.resource;
    navigate(`/admin/${resource}`);
    showToast(`Đã xóa ${resourceLabel(resource)}.`);
  } catch (error) {
    confirmDelete.disabled = false;
    showToast(error.message, true);
  }
});

document.addEventListener('submit', async (event) => {
  const filtersForm = event.target.closest('form[data-catalog-form]');
  if (filtersForm) {
    event.preventDefault();
    const data = new FormData(filtersForm);
    const resource = filtersForm.dataset.resource;
    const state = {
      q: String(data.get('q') || '').trim(),
      mode: String(data.get('mode') || 'basic'),
      category: String(data.get('category') || ''),
      minPrice: String(data.get('minPrice') || ''),
      maxPrice: String(data.get('maxPrice') || ''),
      available: String(data.get('available') || ''),
      sort: String(data.get('sort') || 'id_desc')
    };
    const pathname = resource === 'dishes' ? '/dishes' : `/admin/${resource}`;
    navigate(listUrl(pathname, state));
    return;
  }

  const form = event.target.closest('form[data-resource]');
  if (!form) return;
  event.preventDefault();
  form.querySelectorAll('.error-box').forEach((element) => element.remove());
  form.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  const resource = form.dataset.resource;
  const isEdit = form.dataset.mode === 'edit';

  try {
    await request(
      `/${resource}${isEdit ? `/${encodeURIComponent(form.dataset.id)}` : ''}`,
      { method: isEdit ? 'PATCH' : 'POST', body: formDataFor(form) }
    );
    navigate(`/admin/${resource}`);
    showToast(`${isEdit ? 'Đã cập nhật' : 'Đã thêm'} ${resourceLabel(resource)}.`);
  } catch (error) {
    setFieldErrors(form, error);
    submit.disabled = false;
    form.querySelector('[aria-invalid="true"]')?.focus();
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('form[data-catalog-form] select[name="mode"]')) {
    const queryInput = event.target.form.elements.q;
    queryInput.required = ['fulltext', 'fuzzy'].includes(event.target.value);
  }

  if (event.target.matches('[data-image-input]')) {
    const preview = event.target.closest('form').querySelector('[data-image-preview]');
    const file = event.target.files?.[0];
    if (!preview || !file) return;
    if (preview.dataset.previewUrl) URL.revokeObjectURL(preview.dataset.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    preview.dataset.previewUrl = previewUrl;
    preview.src = previewUrl;
    preview.hidden = false;
  }
});

window.addEventListener('popstate', renderRoute);
renderRoute();
