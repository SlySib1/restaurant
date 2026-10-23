# Bếp Nhà — Restaurant SPA and REST API

Ứng dụng quản lý thực đơn nhà hàng gồm REST API xây dựng bằng Express/Prisma và SPA chạy trực tiếp trong browser. Khách có thể xem/tìm kiếm món ăn; quản trị viên có thể quản lý món ăn, đầu bếp, nguyên liệu và ảnh.

## Tính năng

- REST CRUD API cho món ăn, đầu bếp và nguyên liệu.
- SPA dùng History API; điều hướng và gửi biểu mẫu không tải lại tài liệu.
- Tìm món ăn theo tên, xem chi tiết món và trạng thái phục vụ.
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

Seed bổ sung/cập nhật 20 món ăn, 53 nguyên liệu, 5 đầu bếp cùng các quan hệ mà không xóa toàn bộ dữ liệu database. Script ảnh tải ảnh mẫu còn thiếu vào `public/uploads`.

### 5. Khởi động server

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
| GET | `/api/dishes?q=<từ khóa>` | Danh sách món, tùy chọn tìm kiếm theo tên |
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
| `npm run catalog:images` | Tải và gán ảnh mẫu còn thiếu |

## Bảo mật và giới hạn

- Các route quản trị hiện chưa có đăng nhập hoặc phân quyền. Không đưa ứng dụng lên môi trường công khai trước khi bổ sung xác thực và bảo vệ thao tác quản trị.
- Ảnh tải lên được lưu trên ổ đĩa cục bộ; cần thay bằng object storage khi triển khai theo kiểu nhiều server hoặc ổ đĩa ephemeral.
- Chưa có giỏ hàng, đơn hàng, thanh toán, tồn kho thực tế hoặc lịch sử phân công đầu bếp theo từng lần chế biến.
