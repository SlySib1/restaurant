# Bếp Nhà — Restaurant SPA and REST API

Ứng dụng quản lý thực đơn nhà hàng gồm REST API xây dựng bằng Express/Prisma và SPA chạy trực tiếp trong browser. Khách có thể xem/tìm kiếm món ăn; quản trị viên có thể quản lý món ăn, đầu bếp, nguyên liệu và ảnh.

## Tính năng

- REST CRUD API cho món ăn, đầu bếp và nguyên liệu.
- SPA dùng History API; điều hướng và gửi biểu mẫu không tải lại tài liệu.
- Tìm món ăn theo tên, xem chi tiết món và trạng thái phục vụ.
- Tìm kiếm basic/advanced/full-text/fuzzy, lọc và sắp xếp danh sách món ở backend.
- Phân trang server-side: món ăn dùng số trang, đầu bếp dùng Load more, nguyên liệu dùng infinite scroll.
- URL khôi phục từ khóa, bộ lọc, thứ tự sắp xếp, chế độ phân trang và vị trí đã xem.
- Tải ảnh JPEG, PNG, WebP hoặc GIF (tối đa 5 MB), xem trước ảnh trước khi lưu.
- Quan hệ nhiều-nhiều giữa món ăn với đầu bếp và nguyên liệu.
- Xóa nguyên liệu sẽ xóa các món đang sử dụng nguyên liệu đó.
- Xóa đầu bếp chỉ xóa các món không còn đầu bếp thay thế; món còn đầu bếp khác vẫn được giữ.
- Danh sách xác nhận xóa hiển thị trước các món sẽ bị ảnh hưởng.

## Công nghệ

- Node.js, Express 5, Prisma ORM, PostgreSQL (hỗ trợ Supabase)
- Multer để tiếp nhận và xác thực ảnh
- HTML, CSS và JavaScript thuần cho SPA

## Cài đặt và chạy

### 1. Yêu cầu

- Node.js 18 trở lên (khuyến nghị bản LTS) và npm
- PostgreSQL hoặc dự án Supabase

### 2. Cài dependencies và cấu hình

```powershell
npm install
Copy-Item .env.example .env.local
```

Điền URL cơ sở dữ liệu vào `.env.local`:

```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<POOLER-HOST>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<USER>:<PASSWORD>@<POOLER-HOST>:5432/postgres"
PORT=3000
SPA_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

- `DATABASE_URL`: kết nối ứng dụng tới PostgreSQL, thường dùng transaction pooler.
- `DIRECT_URL`: kết nối dùng cho thao tác schema và migration.
- `SPA_ORIGINS`: danh sách origin chính xác, phân tách bằng dấu phẩy, được phép gọi API khác origin. Origin gồm giao thức, hostname và cổng; ví dụ `http://localhost:5173` khác `http://localhost:3000` và `http://127.0.0.1:5173`. Không dùng `*`. Khi SPA được Express phục vụ cùng origin, có thể bỏ trống.
- Nếu mật khẩu có ký tự đặc biệt, hãy URL-encode chúng.
- **Không commit `.env`, `.env.local`, mật khẩu hoặc chuỗi kết nối thật lên GitHub.**

### 3. Đồng bộ schema và tạo Prisma Client

```powershell
npm run prisma -- db push
npm run prisma -- generate
```

`db push` đồng bộ schema với database hiện tại. Không reset database đang có dữ liệu cần giữ.

### 4. Dữ liệu mẫu (tuỳ chọn)

```powershell
npm run seed
npm run catalog:images
```

`npm run seed` nạp/cập nhật 1.000 món ăn mẫu, 100 đầu bếp, 155 nguyên liệu cùng các liên kết hợp lệ. Script có tính lặp an toàn, cập nhật các bản ghi mẫu cùng tên và không xóa dữ liệu người dùng khác; do đó các bản ghi tạo thêm qua CRUD vẫn được giữ nguyên. Có thể chạy lại để tái tạo/đồng bộ bộ dữ liệu mẫu. Script ảnh tải ảnh mẫu còn thiếu vào `public/uploads`.

### 5. Cấu hình tìm kiếm PostgreSQL

Trước khi dùng chế độ fuzzy/full-text lần đầu, cài extension và các index cần thiết:

```powershell
npm run db:search-setup
```

Lệnh chạy [prisma/search.sql](prisma/search.sql) trên database được cấu hình trong schema. SQL bật `pg_trgm`, tạo GIN index cho full-text với cấu hình `simple`, GIN trigram index cho tên món và các index phục vụ lọc/sắp xếp. Có thể chạy nội dung file này trong Supabase SQL Editor nếu tài khoản ứng dụng không được phép cài extension. Chỉ cần áp dụng một lần cho mỗi database; các lệnh dùng `IF NOT EXISTS`.

### 6. Khởi động server

```powershell
npm run dev
# hoặc
npm start
```

Mở <http://localhost:3000>. Các đường dẫn SPA truy cập trực tiếp được hỗ trợ, ví dụ `/dishes`, `/dishes/1`, `/admin/dishes`, `/admin/chefs` và `/admin/ingredients`.

## REST API

Mọi endpoint API bắt đầu bằng `/api`. Thành công trả về HTTP 200 và JSON `{ "ok": true, "data": ... }`. Lỗi trả về `{ "ok": false, "error": { "code": "...", "message": "...", "fields": {} } }`; `fields` chỉ có khi lỗi xác thực dữ liệu.

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/dishes` | Danh sách món có server pagination, search, filters và sorting |
| GET | `/api/dishes/:id` | Chi tiết món |
| POST | `/api/dishes` | Tạo món |
| PATCH | `/api/dishes/:id` | Cập nhật món |
| DELETE | `/api/dishes/:id` | Xóa món |
| GET | `/api/chefs` | Danh sách đầu bếp |
| GET | `/api/chefs/:id` | Chi tiết đầu bếp và món bị ảnh hưởng nếu xóa |
| POST | `/api/chefs` | Tạo đầu bếp |
| PATCH | `/api/chefs/:id` | Cập nhật đầu bếp |
| DELETE | `/api/chefs/:id` | Xóa đầu bếp và món không còn đầu bếp thay thế |
| GET | `/api/ingredients` | Danh sách nguyên liệu |
| GET | `/api/ingredients/:id` | Chi tiết nguyên liệu và món đang sử dụng |
| POST | `/api/ingredients` | Tạo nguyên liệu |
| PATCH | `/api/ingredients/:id` | Cập nhật nguyên liệu |
| DELETE | `/api/ingredients/:id` | Xóa nguyên liệu và các món liên quan |

Endpoint danh sách nhận `page`, `pageSize` (mặc định 24, tối đa 1008), `q`, `sort`; endpoint món còn nhận `mode`, `category`, `minPrice`, `maxPrice`, `available`. Kết quả danh sách có dạng `data: { items, total, page, pageSize, totalPages, hasNextPage }`; danh sách món bổ sung `categories`.

### Chế độ tìm kiếm, filter và sort

- Từ khóa được chuẩn hóa không dấu ở API và PostgreSQL: ví dụ `pho bo` khớp `Phở Bò`, `dac san` khớp `Đặc sản`.
- `basic`: tìm chuỗi con trong tên, không phân biệt hoa/thường hoặc dấu.
- `advanced`: tìm tên không dấu và AND với các điều kiện được chọn.
- `fulltext`: PostgreSQL full-text tìm trên tên + mô tả đã chuẩn hóa dấu, cùng cấu hình `simple` cho document và query; trong nhóm ảnh tương ứng, xếp `ts_rank` giảm dần rồi `id` tăng dần.
- `fuzzy`: tìm tên không dấu với `pg_trgm`, ngưỡng similarity `0.3`; trong nhóm ảnh tương ứng, xếp similarity giảm dần rồi `id` tăng dần.
- Món ăn: lọc `category`, `minPrice`, `maxPrice`, `available`; có thể kết hợp với từ khóa.
- Sort món: tên A–Z/Z–A, giá tăng/giảm; đầu bếp và nguyên liệu hỗ trợ sort theo tên.
- Bản ghi có ảnh được ưu tiên lên trước trong kết quả phù hợp; thứ tự liên quan/sort được giữ trong từng nhóm có ảnh và không ảnh.
- Tìm kiếm, lọc và sắp xếp được áp dụng phía server trên toàn bộ tập dữ liệu phù hợp **trước** khi phân trang. Giao diện khách chỉ áp dụng search/filter cho catalog món; ba trang quản trị áp dụng lên toàn bộ resource tương ứng.
- Ví dụ link có thể chia sẻ: `/dishes?mode=advanced&q=ga&category=M%C3%B3n+ch%C3%ADnh&minPrice=30000&available=true&sort=price_asc&page=2`.

### Phân trang và URL

Ba danh sách dùng server pagination riêng, mỗi danh sách có một cách hiển thị: **món ăn dùng số trang**, **đầu bếp dùng nút Tải thêm**, **nguyên liệu dùng cuộn vô hạn**. Browser tải tối đa 24 bản ghi mỗi request. Số trang lưu trang đang xem trong `page`; Tải thêm/cuộn vô hạn lưu số phần đã tải trong `page`. Sao chép hoặc reload URL sẽ tải lại đúng trang/phần đã xem từ đầu; đây là khôi phục bằng cách gọi API lại, không giữ state trong bộ nhớ. Đổi từ khóa, filter hoặc sort sẽ bắt đầu từ phần đầu. Back/Forward khôi phục URL tương ứng.

Tạo/cập nhật món yêu cầu `name`, `price`, `chefIds` và `ingredientIds`; `description`, `category` và `available` có mặc định khi tạo. Đầu bếp cần `name`, `specialty`; nguyên liệu cần `name`, `unit`. Các thao tác có ảnh gửi dưới dạng `multipart/form-data`, trường tệp là `image`; có thể gửi `removeImage=true` khi cập nhật để bỏ ảnh hiện tại. Không gửi ảnh thì ảnh đang lưu được giữ nguyên.

Lỗi dữ liệu có HTTP 400 và mã `VALIDATION_FAILED`; bản ghi không tồn tại có HTTP 404 và mã `NOT_FOUND`. Endpoint API không tồn tại trả HTTP 404. Những request từ browser khác origin chỉ được phép nếu origin khớp chính xác một phần tử trong `SPA_ORIGINS`.

### Cross-origin và chạy SPA trên origin riêng

**Origin** là bộ ba giao thức, hostname và cổng. Vì vậy `http://localhost:5173` (frontend) và `http://localhost:3000` (backend) là hai origin khác nhau. CORS là quy tắc do browser thực thi: backend phải trả header cho phép thì JavaScript mới được đọc response khác origin. CORS không phải cơ chế đăng nhập hoặc phân quyền.

Theo mặc định, Express phục vụ SPA và API cùng origin nên CORS không cần cấu hình thêm. Nếu host SPA riêng:

1. Thêm chính xác origin frontend vào `SPA_ORIGINS` trong `.env.local`, ví dụ `SPA_ORIGINS="http://localhost:5173"`.
2. Đặt `apiBaseUrl` trong `public/runtime-config.js` thành origin backend, ví dụ `apiBaseUrl: 'http://localhost:3000'` (không thêm `/api`).
3. Khởi động lại backend sau khi đổi `.env.local`.

Với các request không đơn giản (ví dụ JSON `POST`, `PATCH` hoặc `DELETE`), browser tự gửi request kiểm tra trước `OPTIONS` (preflight). Middleware trong `app.js` kiểm tra origin, HTTP method được yêu cầu và các header; nếu được phép, trả `204` cùng `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` và `Access-Control-Allow-Headers`. Nếu preflight bị từ chối, browser không gửi request chính. Các request đơn giản có thể được gửi trước, nhưng browser vẫn chặn JavaScript đọc response nếu CORS không cho phép.

Khi CORS lỗi, chi tiết thường xuất hiện trong **Developer Tools → Console**; `fetch` phía ứng dụng thường chỉ nhận lỗi mạng chung và không đọc được response bị chặn. Có thể xem request `OPTIONS` và response header trong tab **Network**. Gọi bằng `curl` hoặc một công cụ server không mô phỏng chính sách CORS của browser. Không đặt URL database hay bí mật nào trong `runtime-config.js`; file này được gửi công khai tới browser.

## Mô hình dữ liệu

- `Dish`: `id`, `name`, `description`, `price`, `category`, `available`, `imageUrl`, `createdAt`
- `Chef`: `id`, `name`, `specialty`, `imageUrl`, `createdAt`
- `Ingredient`: `id`, `name`, `unit`, `imageUrl`, `createdAt`
- Món ăn ↔ đầu bếp: nhiều-nhiều; quan hệ biểu thị đầu bếp có thể chế biến món.
- Món ăn ↔ nguyên liệu: nhiều-nhiều.

## Ảnh

- Ảnh mẫu và ảnh tải lên được lưu trong `public/uploads`; database lưu URL tương đối, ví dụ `/uploads/dish-01.jpg`.
- Ảnh mẫu được commit cùng project để hoạt động sau khi clone; nguồn tham khảo nằm ở `public/uploads/attribution.json`.
- Ảnh tải lên qua quản trị không được commit mặc định. Nếu deploy trên ổ đĩa tạm hoặc nhiều server, hãy dùng dịch vụ lưu trữ ảnh bền vững.

## Scripts

| Lệnh | Công dụng |
|---|---|
| `npm run dev` | Chạy Express bằng Nodemon |
| `npm start` | Chạy Express |
| `npm run prisma -- <lệnh>` | Chạy Prisma CLI với biến môi trường project |
| `npm run seed` | Nạp/cập nhật dữ liệu mẫu |
| `npm run db:search-setup` | Cài extension và index tìm kiếm PostgreSQL |
| `npm run catalog:images` | Tải và gán ảnh mẫu còn thiếu |

## Bảo mật và giới hạn

- Các route quản trị hiện chưa có đăng nhập hoặc phân quyền. Không đưa ứng dụng lên môi trường công khai trước khi bổ sung xác thực và bảo vệ thao tác quản trị.
- Ảnh tải lên được lưu trên ổ đĩa cục bộ; cần thay bằng object storage khi triển khai theo kiểu nhiều server hoặc ổ đĩa ephemeral.
- Chưa có giỏ hàng, đơn hàng, thanh toán, tồn kho thực tế hoặc lịch sử phân công đầu bếp theo từng lần chế biến.
