# Explore & Learn Feature

## Tổng quan

Phần **Khám phá / Explore & Learn** là khu nội dung học tập trong app, dùng để hiển thị các nhóm như:

- **Workshops & Classes**: các lớp/workshop dạng card ảnh ngang.
- **Healing Media**: các nội dung video, thường trỏ tới YouTube.
- **Skill Building**: các bài viết/kỹ năng dạng card có icon.

Người dùng mobile chỉ xem nội dung đã xuất bản. Admin là người tạo, sửa, ẩn/hiện và xóa nội dung trong trang quản trị.

## Database Tables

### `explore_categories`

Lưu nhóm hiển thị trên app.

Các nhóm mặc định:

- `workshops-classes`
- `healing-media`
- `skill-building`

Các cột chính:

- `id`: khóa chính.
- `name`: tên nhóm hiển thị.
- `slug`: định danh URL/code.
- `category_type`: loại nhóm, ví dụ `WORKSHOP`, `MEDIA`, `SKILL`.
- `description`: mô tả tùy chọn.
- `display_order`: thứ tự hiển thị.
- `is_active`: nhóm còn được hiển thị hay không.
- `created_at`, `updated_at`: thời gian tạo/cập nhật.

### `explore_contents`

Lưu nội dung chính trong page Khám phá.

Các cột chính:

- `id`: khóa chính.
- `category_id`: liên kết tới `explore_categories`.
- `title`: tiêu đề.
- `slug`: định danh duy nhất.
- `subtitle`: mô tả ngắn.
- `summary`: mô tả dài hơn dùng cho preview/card.
- `content_type`: loại nội dung, gồm `ARTICLE`, `VIDEO`, `WORKSHOP`, `SKILL`.
- `thumbnail_url`: ảnh thumbnail.
- `youtube_url`: link YouTube.
- `youtube_video_id`: video id tách từ link YouTube.
- `badge_text`, `badge_color`: badge trên workshop card.
- `icon_name`, `icon_color`, `icon_background_color`: icon cho skill card.
- `content`: nội dung chi tiết nếu cần mở bài viết.
- `created_by`, `updated_by`: admin tạo/sửa.
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `published_at`: thời điểm xuất bản.
- `display_order`: thứ tự trong nhóm.
- `is_featured`: đánh dấu nổi bật.
- `is_active`: ẩn/hiện trên app.
- `created_at`, `updated_at`: thời gian tạo/cập nhật.

### `explore_content_sections`

Lưu các section nhỏ bên trong một bài viết nếu sau này cần chia bài viết thành nhiều block.

Các cột chính:

- `id`
- `content_id`
- `section_type`: ví dụ `TEXT`, `IMAGE`, `QUOTE`, `LIST`, `VIDEO_EMBED`.
- `heading`
- `body`
- `media_url`
- `display_order`
- `is_active`
- `created_at`, `updated_at`

Hiện tại app chưa dùng sâu bảng này, nhưng backend đã có model/mapping để mở rộng sau.

### `explore_content_views`

Lưu lượt xem/click nội dung Khám phá.

Các cột chính:

- `id`
- `content_id`
- `user_id`: có thể null nếu không truyền user.
- `viewed_at`

App gọi tracking khi người dùng bấm vào một nội dung.

## Backend Models

Các model được thêm trong:

- `server/server/server/Models/ExploreCategory.cs`
- `server/server/server/Models/ExploreContent.cs`
- `server/server/server/Models/ExploreContentSection.cs`
- `server/server/server/Models/ExploreContentView.cs`
- `server/server/server/Models/ExploreDtos.cs`

Context mapping nằm trong:

- `server/server/server/Models/DepressyMateContext.cs`

Các `DbSet` đã thêm:

```csharp
public virtual DbSet<ExploreCategory> ExploreCategories { get; set; }
public virtual DbSet<ExploreContent> ExploreContents { get; set; }
public virtual DbSet<ExploreContentSection> ExploreContentSections { get; set; }
public virtual DbSet<ExploreContentView> ExploreContentViews { get; set; }
```

## Admin CRUD

Admin quản lý tại:

```text
/admin/explore
```

Controller:

```text
server/server/server/Controllers/Admin/AdminExploreController.cs
```

Views:

```text
server/server/server/Views/Admin/Explore/Index.cshtml
server/server/server/Views/Admin/Explore/Form.cshtml
```

View models:

```text
server/server/server/Models/Admin/AdminExploreViewModels.cs
```

Admin có thể:

- Xem danh sách nội dung Khám phá.
- Lọc theo trạng thái: published, draft, inactive, all.
- Lọc theo category.
- Tìm kiếm theo title, slug, subtitle, summary.
- Tạo nội dung mới.
- Sửa nội dung.
- Upload thumbnail vào:

```text
/uploads/explore
```

- Gắn link YouTube.
- Tự tách `youtube_video_id` từ link YouTube.
- Ẩn/hiện nội dung bằng `is_active`.
- Xóa nội dung.

Khi bảng category chưa có dữ liệu, admin controller tự tạo 3 category mặc định:

- `Workshops & Classes`
- `Healing Media`
- `Skill Building`

## Public API Cho App

Controller:

```text
server/server/server/Controllers/Api/ExploreApiController.cs
```

### Lấy dữ liệu Explore

```http
GET /api/explore
```

Chỉ trả về:

- category đang active.
- content `is_active = true`.
- content `status = PUBLISHED`.
- content có `published_at <= now` hoặc `published_at` null.

Response dạng:

```json
{
  "data": [
    {
      "id": "...",
      "name": "Healing Media",
      "slug": "healing-media",
      "category_type": "MEDIA",
      "display_order": 2,
      "contents": [
        {
          "id": "...",
          "title": "Mindful Music",
          "slug": "mindful-music",
          "content_type": "VIDEO",
          "thumbnail_url": "/uploads/explore/example.webp",
          "youtube_url": "https://www.youtube.com/watch?v=...",
          "youtube_video_id": "...",
          "display_order": 1
        }
      ]
    }
  ]
}
```

### Lấy chi tiết theo slug

```http
GET /api/explore/{slug}
```

Ví dụ:

```http
GET /api/explore/mindful-music
```

### Ghi nhận lượt xem/click

```http
POST /api/explore/{id}/view
```

Body:

```json
{
  "user_id": "..."
}
```

`user_id` có thể bỏ trống.

## Frontend App

Service gọi API:

```text
frontend/src/services/exploreService.ts
```

Màn hình chính:

```text
frontend/src/screens/LearningExploreScreen.tsx
```

Navigation:

```text
frontend/src/navigation/MainTabNavigator.tsx
```

Hiện tại:

- Tab **Khám phá** dùng `LearningExploreScreen`.
- Tab **Cộng đồng** dùng màn social feed cũ `ExploreScreen`.
- Home community section điều hướng sang tab `Community`.

## Cách App Render Dữ Liệu

App đọc `GET /api/explore`, sau đó chia dữ liệu theo category:

- Category type `WORKSHOP` hoặc slug `workshops-classes` render vào **Workshops & Classes**.
- Category type `MEDIA` hoặc slug `healing-media` render vào **Healing Media**.
- Category type `SKILL` hoặc slug `skill-building` render vào **Skill Building**.

Ảnh thumbnail:

- Nếu `thumbnail_url` là URL đầy đủ `http/https`, app dùng trực tiếp.
- Nếu là path tương đối như `/uploads/explore/a.webp`, app tự nối với `API_ORIGIN`.

Video:

- Nếu item có `youtube_url`, khi bấm app sẽ mở link bằng `Linking.openURL`.
- Đồng thời app gọi `POST /api/explore/{id}/view` để ghi nhận lượt xem.

Icon skill:

- `icon_name` dùng tên icon của `Ionicons`, ví dụ:
  - `sparkles-outline`
  - `leaf-outline`
  - `create-outline`

Nếu icon không hợp lệ, app fallback về:

```text
sparkles-outline
```

## Quy Ước Khi Thêm Nội Dung

### Workshop card

Nên dùng:

- `category`: `Workshops & Classes`
- `content_type`: `WORKSHOP`
- `title`: tên workshop.
- `thumbnail_url` hoặc upload thumbnail.
- `badge_text`: ví dụ `Therapeutic`, `Mindful`.
- `display_order`: thứ tự card.
- `status`: `PUBLISHED`
- `is_active`: true

### Healing media / YouTube

Nên dùng:

- `category`: `Healing Media`
- `content_type`: `VIDEO`
- `title`: tên video.
- `subtitle`: mô tả ngắn.
- `thumbnail_url` hoặc upload thumbnail.
- `youtube_url`: link YouTube.
- `status`: `PUBLISHED`
- `is_active`: true

### Skill building

Nên dùng:

- `category`: `Skill Building`
- `content_type`: `SKILL` hoặc `ARTICLE`
- `title`: tên kỹ năng.
- `subtitle` hoặc `summary`: mô tả hiển thị trên card.
- `icon_name`, `icon_color`, `icon_background_color`.
- `content`: nội dung chi tiết nếu cần.
- `status`: `PUBLISHED`
- `is_active`: true

## Kiểm Tra Sau Khi Sửa

Backend:

```powershell
cd server/server/server
dotnet build -p:UseAppHost=false -o .\bin\codex-check
```

Frontend:

```powershell
cd frontend
npx.cmd tsc --noEmit
npx.cmd expo lint
```

Nếu build backend thường bị khóa file do server đang chạy trong Visual Studio, dùng output tạm như trên để kiểm tra compile.
