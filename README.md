# Ứng dụng quản lý nhà hàng

Website quản lý thực đơn nhà hàng, được xây dựng bằng Node.js, Express, EJS, Prisma ORM và PostgreSQL. Ứng dụng có giao diện cho khách xem món ăn và khu vực quản trị món ăn, đầu bếp, nguyên liệu.

## Chức năng

- Xem và tìm kiếm món ăn theo tên.
- Xem chi tiết món ăn, giá, ảnh, đầu bếp có thể chế biến và nguyên liệu.
- Thêm, sửa và xoá món ăn, đầu bếp, nguyên liệu.
- Quản lý quan hệ nhiều-nhiều giữa món ăn với đầu bếp và nguyên liệu.
- Cảnh báo trước khi xoá nguyên liệu hoặc đầu bếp những món ăn sẽ bị ảnh hưởng.
- Tải ảnh lên, xem trước ảnh; hỗ trợ JPEG, PNG, WebP và GIF, tối đa 5 MB.
- Giao diện responsive với hiệu ứng chuyển động nhẹ.

### Quy tắc xoá

- Xoá nguyên liệu sẽ xoá các món đang sử dụng nguyên liệu đó. Trang xác nhận liệt kê các món bị ảnh hưởng.
- Xoá đầu bếp sẽ xoá các món không còn đầu bếp nào khác có thể chế biến. Các món còn đầu bếp thay thế được giữ lại.

## Công nghệ

- Node.js, Express 5 và EJS
- Prisma ORM và PostgreSQL (có thể kết nối Supabase)
- Multer để tiếp nhận và xác thực tệp ảnh
- HTML, CSS và JavaScript

## Yêu cầu

- Node.js 18 trở lên (khuyến nghị dùng bản LTS)
- npm
- Một cơ sở dữ liệu PostgreSQL. Ví dụ: dự án Supabase và các chuỗi kết nối PostgreSQL tương ứng.

## Cài đặt và chạy

### 1. Cài dependencies

```powershell
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local` từ file mẫu:

```powershell
Copy-Item .env.example .env.local
```

Mở `.env.local` và thay các giá trị placeholder bằng thông tin PostgreSQL của bạn:

```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<POOLER-HOST>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<USER>:<PASSWORD>@<POOLER-HOST>:5432/postgres"
PORT=3000
```

- `DATABASE_URL`: URL kết nối của ứng dụng.
- `DIRECT_URL`: URL kết nối trực tiếp/session dùng cho thao tác schema.
- Thay `<USER>`, `<PASSWORD>` và `<POOLER-HOST>` bằng thông tin của dự án.
- Nếu mật khẩu có ký tự đặc biệt, hãy URL-encode các ký tự đó.
- **Không commit `.env`, `.env.local`, mật khẩu hoặc chuỗi kết nối thật lên GitHub.**

### 3. Đồng bộ schema và tạo Prisma Client

```powershell
npm run prisma -- db push
npm run prisma -- generate
```

`db push` đồng bộ schema trong `prisma/schema.prisma` với database hiện tại. Không dùng lệnh reset database cho môi trường có dữ liệu cần giữ.

### 4. Nạp dữ liệu mẫu (tuỳ chọn)

```powershell
npm run seed
npm run catalog:images
```

- `npm run seed` bổ sung/cập nhật bộ dữ liệu mẫu gồm 20 món ăn, 53 nguyên liệu và 5 đầu bếp cùng các quan hệ. Script không xoá toàn bộ dữ liệu database; các bản ghi trùng tên trong bộ mẫu sẽ được cập nhật.
- `npm run catalog:images` tải ảnh mẫu còn thiếu vào `public/uploads` và gán đường dẫn cho các bản ghi chưa có ảnh.

### 5. Khởi động

Chế độ phát triển:

```powershell
npm run dev
```

Hoặc chế độ thường:

```powershell
npm start
```

Mở <http://localhost:3000>.

## URL chính

| Trang | URL |
|---|---|
| Thực đơn và tìm kiếm món ăn | `/dishes` |
| Chi tiết món ăn | `/dishes/:id` |
| Quản trị món ăn | `/admin/dishes` |
| Quản trị đầu bếp | `/admin/chefs` |
| Quản trị nguyên liệu | `/admin/ingredients` |

Các thao tác sửa và xoá sử dụng form HTML cùng `method-override` (`PATCH`/`DELETE`). Khi thành công, ứng dụng chuyển hướng về danh sách; dữ liệu không hợp lệ được hiển thị lại với lỗi kiểm tra.

## Mô hình dữ liệu

### `Dish` — món ăn

`id`, `name`, `description`, `price`, `category`, `available`, `imageUrl`, `createdAt`

### `Chef` — đầu bếp

`id`, `name`, `specialty`, `imageUrl`, `createdAt`

### `Ingredient` — nguyên liệu

`id`, `name`, `unit`, `imageUrl`, `createdAt`

Quan hệ trong `prisma/schema.prisma`:

- Món ăn ↔ đầu bếp: nhiều-nhiều. Danh sách đầu bếp biểu thị những người có thể chế biến món, không phải lịch sử đầu bếp đã nấu một đơn hàng.
- Món ăn ↔ nguyên liệu: nhiều-nhiều.

## Ảnh

- Ảnh mẫu và ảnh tải qua trang quản trị được lưu trong `public/uploads`.
- Database lưu URL tương đối, ví dụ `/uploads/dish-01.jpg`.
- Ảnh mẫu của các món, đầu bếp và nguyên liệu được đưa vào repository để các trang vẫn có ảnh sau khi clone project. Nguồn ảnh được ghi tại `public/uploads/attribution.json`.
- Ảnh đầu bếp và ảnh nguyên liệu mẫu có thể là ảnh minh hoạ/đại diện nhóm. Có thể thay bằng ảnh phù hợp qua chức năng sửa trong trang quản trị.
- Ảnh tải lên qua quản trị không được commit mặc định để tránh đưa ảnh riêng tư hoặc tệp lớn lên GitHub.
- Nếu deploy trên môi trường có ổ đĩa tạm thời hoặc nhiều server, hãy chuyển upload sang dịch vụ lưu trữ ảnh bền vững.

## Scripts

| Lệnh | Công dụng |
|---|---|
| `npm run dev` | Chạy server phát triển bằng Nodemon |
| `npm start` | Chạy ứng dụng |
| `npm run prisma -- <lệnh>` | Chạy Prisma CLI sau khi nạp `.env.local` hoặc `.env` |
| `npm run seed` | Nạp dữ liệu mẫu |
| `npm run catalog:images` | Tải và gán ảnh mẫu còn thiếu |

Ví dụ kiểm tra schema:

```powershell
npm run prisma -- validate
```

## Cấu trúc thư mục

```text
app.js                      Khởi tạo Express và đăng ký middleware/routes
routes/                     Route người dùng, quản trị, liên kết món và upload ảnh
views/                      Các trang EJS cho người dùng và quản trị
views/partials/             Header/footer dùng chung
prisma/schema.prisma        Schema Prisma và các quan hệ
prisma/seed.js              Dữ liệu mẫu và liên kết
scripts/prisma.js           Chạy Prisma CLI với biến môi trường của project
scripts/add-catalog-images.js
                            Tải và gán ảnh mẫu
public/css/style.css        Giao diện và hiệu ứng
public/js/image-preview.js  Xem trước ảnh trong form
public/uploads/             Ảnh mẫu và nơi lưu ảnh upload
```

## Bảo mật và giới hạn hiện tại

- Khu vực `/admin` hiện **chưa có đăng nhập hoặc phân quyền**. Không đưa ứng dụng lên môi trường công khai trước khi bổ sung xác thực và bảo vệ các route quản trị.
- `.env` và `.env.local` không được đưa lên GitHub. Hãy chia sẻ cấu hình qua `.env.example` với placeholder, không dùng bí mật thật.
- Project chưa có giỏ hàng, đơn hàng, thanh toán, quản lý tồn kho thực tế hoặc lịch sử phân công đầu bếp cho từng lần chế biến.
- Project hiện kiểm tra bằng các bước validate, smoke test và kiểm tra thủ công; chưa có bộ test tự động chuyên biệt.
