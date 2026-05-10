# Discover Page Documentation
 Tài liệu này mô tả lại luồng trang **Khám phá** của Depressy Mate từ app mobile đến server, dựa trên code hiện tại trong repository. Phần này không thêm logic mới, chỉ ghi nhận cách màn hình đang hoạt động, các API liên quan và dữ liệu đi qua từng lớp.

## 1. Vị trí trong app

Trang Khám phá nằm trong bottom tab chính của ứng dụng.

- App khởi động từ `frontend/App.tsx`.
- Nếu đã có token đăng nhập, app mở `MainStackNavigator`.
- `MainStackNavigator` render `MainTabNavigator`.
- Trong `MainTabNavigator`, tab `Explore` trỏ tới `ExploreScreen`.

File chính:

- `frontend/src/navigation/MainTabNavigator.tsx`
- `frontend/src/screens/ExploreScreen.tsx`

Tab hiển thị với icon dạng la bàn và label "Khám phá". Đây là một màn hình chỉ dành cho user đã đăng nhập, vì toàn bộ `MainTabNavigator` chỉ xuất hiện sau khi app có token.

## 2. Cấu trúc màn hình Explore

`ExploreScreen` có ba tab nội bộ:

| Tab | State value | Vai trò |
| --- | --- | --- |
| Khám phá | `learn` | Nội dung học tập/tĩnh trong app |
| Cộng đồng | `community` | Feed bài viết cộng đồng từ server |
| Đã lưu | `saved` | Danh sách bài viết user đã lưu từ server |

Màn hình dùng các state chính:

| State | Ý nghĩa |
| --- | --- |
| `activeTab` | Tab nội bộ đang được chọn |
| `posts` | Danh sách bài viết đang hiển thị |
| `cursor` | Mốc phân trang lấy từ server |
| `hasMore` | Server còn dữ liệu để tải thêm hay không |
| `loading` | Đang gọi API tải bài viết |
| `refreshing` | Đang kéo để refresh |
| `showCreatePost` | Đang mở modal tạo bài viết |
| `commentPostId` | ID bài viết đang mở modal bình luận |

## 3. Tab Khám phá - nội dung tĩnh trong app

Khi `activeTab === 'learn'`, màn hình không gọi server. Nội dung được khai báo trực tiếp trong `ExploreScreen.tsx` gồm:

- `workshopCards`: danh sách workshop/class như Dance Therapy, Yoga Flow, Art Journaling.
- `healingMedia`: danh sách media thư giãn như Relaxing Movies, Mindful Music.
- `skillCards`: các thẻ kỹ năng như quản lý cảm xúc, hít thở, journaling prompts.

Các ảnh trong phần này đang dùng URL từ Unsplash. Các card chỉ đang hiển thị UI; chưa có navigation chi tiết hoặc API lấy nội dung động.

Nút "See all" và CTA "Community Stories" đổi `activeTab` sang `community`.

## 4. Tab Cộng đồng - feed bài viết

Khi user chuyển sang tab `community`, `ExploreScreen` gọi `fetchPosts(null, true, 'community')`.

Luồng app:

1. Reset `posts`, `cursor`, `hasMore`.
2. Gọi `socialService.getPosts(10, cursor)`.
3. Service gọi `GET /api/posts?limit=10`.
4. Server trả về `PagedPostsDto`.
5. App cập nhật `posts`, `next_cursor`, `has_more`.
6. `FlatList` render từng item bằng `PostCard`.

Khi kéo xuống cuối danh sách, `FlatList` gọi `fetchPosts(cursor)` để lấy trang tiếp theo.

Khi pull-to-refresh, app gọi lại `fetchPosts(null, true)`, thay thế danh sách cũ bằng danh sách mới.

## 5. Tab Đã lưu

Khi user chuyển sang tab `saved`, `ExploreScreen` gọi `socialService.getSavedPosts(10, cursor)`.

Luồng app:

1. Reset feed giống tab cộng đồng.
2. Gọi `GET /api/posts/saved?limit=10`.
3. Server dùng lại logic `GetPosts`, nhưng bật `savedOnly = true`.
4. Query chỉ lấy bài viết có bản ghi trong `post_saves` của user hiện tại.
5. Khi user bỏ lưu một bài trong tab này, app xóa bài đó khỏi danh sách đang hiển thị.

## 6. Service phía frontend

File chính: `frontend/src/services/socialService.ts`

Các hàm được Explore dùng trực tiếp hoặc gián tiếp:

| Hàm | API | Vai trò |
| --- | --- | --- |
| `getPosts` | `GET /posts` | Lấy feed bài viết |
| `getSavedPosts` | `GET /posts/saved` | Lấy bài viết đã lưu |
| `createPost` | `POST /posts` | Tạo bài viết |
| `uploadMedia` | `POST /upload/media` | Upload ảnh/video cho bài viết |
| `getComments` | `GET /posts/{postId}/comments` | Lấy bình luận |
| `createComment` | `POST /posts/{postId}/comments` | Tạo bình luận hoặc reply |
| `toggleLike` | `POST /posts/{postId}/like` | Thích/bỏ thích bài viết |
| `toggleSave` | `POST /posts/{postId}/save` | Lưu/bỏ lưu bài viết |
| `toggleCommentLike` | `POST /posts/{postId}/comments/{commentId}/like` | Thích/bỏ thích bình luận |
| `getUserProfile` | `GET /users/{userId}` | Lấy thông tin user, có cache trong app |

`socialService` dùng axios instance từ `frontend/src/services/api.ts`.

`api.ts` cấu hình:

- `API_ORIGIN = http://192.168.1.103:5210`
- `API_BASE_URL = API_ORIGIN + /api`
- Request interceptor tự đọc `userToken` từ AsyncStorage và gắn `Authorization: Bearer <token>`.
- Response interceptor xóa `userToken` và `userData` nếu server trả `401`.

## 7. Hiển thị bài viết trên app

File chính: `frontend/src/components/socials/PostCard.tsx`

`PostCard` nhận một object `Post` từ server và hiển thị:

- Avatar tác giả qua `UserAvatar`.
- Tên tác giả.
- Thời gian đăng.
- Nội dung text.
- Ảnh hoặc video nếu có `media_url`.
- Số lượt thích.
- Số bình luận.
- Nút thích.
- Nút bình luận.
- Nút lưu.

Nếu `media_url` là URL tương đối, app nối thêm `API_ORIGIN`. Nếu là URL đầy đủ bắt đầu bằng `http`, app dùng trực tiếp.

Lưu ý hiện tại: với bài viết video, component vẫn dùng `Image` để hiển thị media kèm nút play overlay. Chưa thấy player video thực sự trong `PostCard`.

## 8. Tạo bài viết

File chính: `frontend/src/screens/socials/CreatePostScreen.tsx`

Modal tạo bài được mở bằng nút nổi dấu cộng trong hai tab `community` và `saved`.

Luồng tạo bài:

1. User nhập nội dung hoặc chọn ảnh/video.
2. Nếu chọn media, app xin quyền thư viện bằng `expo-image-picker`.
3. App upload media trước qua `socialService.uploadMedia`.
4. Server trả `publicUrl`, `path`, `mediaType`.
5. App gọi `socialService.createPost(content, finalMediaUrl, finalMediaType)`.
6. Tạo thành công thì đóng modal, chuyển sang tab `community` và refresh feed.

Ràng buộc phía app:

- Không cho đăng nếu không có cả nội dung lẫn media.
- Text input giới hạn 3000 ký tự.
- Media chọn từ thư viện gồm ảnh hoặc video.

Ràng buộc phía server:

- Bài viết phải có nội dung hoặc media.
- Nội dung tối đa 3000 ký tự.
- `media_type` được chuẩn hóa thành `IMAGE` hoặc `VIDEO`.

## 9. Bình luận và reply

File chính: `frontend/src/components/socials/CommentModal.tsx`

Khi bấm bình luận trên một `PostCard`, app set `commentPostId`, từ đó mở `CommentModal`.

Luồng tải bình luận:

1. Modal mở và có `postId`.
2. App gọi `GET /api/posts/{postId}/comments?limit=15`.
3. Server trả danh sách bình luận gốc, mỗi bình luận có mảng `replies`.
4. App render theo dạng thread.

Luồng tạo bình luận:

1. User nhập text.
2. Nếu đang reply, app gửi thêm `parent_comment_id`.
3. Service gọi `POST /api/posts/{postId}/comments`.
4. Server tạo comment, tăng `post.comment_count`.
5. Nếu là reply, server tăng `parent.reply_count`.
6. App cập nhật danh sách local và tăng số bình luận trên bài viết.

Luồng thích bình luận:

1. User bấm thích trên comment/reply.
2. App gọi `POST /api/posts/{postId}/comments/{commentId}/like`.
3. Server toggle bản ghi trong `comment_likes`.
4. App cập nhật `is_liked` và `like_count` trong cây comment.

Ràng buộc phía server:

- Bình luận không được rỗng.
- Bình luận tối đa 1000 ký tự.
- Reply chỉ được reply vào bình luận gốc, không reply sâu nhiều tầng.

## 10. API server liên quan

Server hiện tại là ASP.NET Core, không phải Node/Express. Các API chính của trang Khám phá nằm trong:

- `server/server/server/Controllers/Api/PostsApiController.cs`
- `server/server/server/Controllers/Api/UploadApiController.cs`
- `server/server/server/Controllers/Api/UsersApiController.cs`

Tất cả các controller trên đều yêu cầu JWT qua:

- `[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]`

Server lấy user hiện tại bằng `ChatService.GetUserId(User)`.

### PostsApiController

Base route: `/api/posts`

| Method | Route | Chức năng |
| --- | --- | --- |
| GET | `/api/posts` | Lấy feed bài viết |
| GET | `/api/posts/saved` | Lấy bài viết đã lưu |
| POST | `/api/posts` | Tạo bài viết |
| POST | `/api/posts/{postId}/like` | Toggle thích bài viết |
| POST | `/api/posts/{postId}/save` | Toggle lưu bài viết |
| GET | `/api/posts/{postId}/comments` | Lấy bình luận |
| POST | `/api/posts/{postId}/comments` | Tạo bình luận/reply |
| POST | `/api/posts/{postId}/comments/{commentId}/like` | Toggle thích bình luận |

### UploadApiController

Base route: `/api/upload`

| Method | Route | Chức năng |
| --- | --- | --- |
| POST | `/api/upload/media` | Upload ảnh/video cho bài viết |

Upload hiện lưu file vào:

- `wwwroot/uploads/posts`

Server trả URL public dạng:

- `http(s)://host/uploads/posts/{fileName}`

File upload được giới hạn:

- Tối đa 25MB.
- Extension cho phép: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.mp4`, `.mov`, `.m4v`.

### UsersApiController

Base route: `/api/users`

Explore không gọi trực tiếp nhiều, nhưng `UserAvatar` và `socialService.getUserProfile` có thể lấy profile bằng:

| Method | Route | Chức năng |
| --- | --- | --- |
| GET | `/api/users/{id}` | Lấy thông tin user/profile |

## 11. Phân trang feed

Server dùng cursor dựa trên `created_at`.

Với `GET /api/posts`:

- Query sort theo `CreatedAt` giảm dần.
- Nếu có `cursor`, chỉ lấy bài có `CreatedAt < cursor`.
- `limit` được clamp trong khoảng 5 đến 30.
- Server lấy `limit + 1` bản ghi để biết còn trang tiếp theo không.
- Nếu còn, trả `has_more = true` và `next_cursor = CreatedAt` của item cuối.

Response dạng:

| Field | Ý nghĩa |
| --- | --- |
| `data` | Danh sách bài viết |
| `next_cursor` | Cursor cho lần tải tiếp |
| `has_more` | Còn dữ liệu hay không |

Với comments, server cũng dùng cursor theo thời gian, nhưng có điểm khác:

- Lấy comment gốc mới nhất trước.
- Sau đó `Reverse()` để render comment theo thứ tự cũ hơn đến mới hơn trong batch.
- Lấy toàn bộ replies của các comment gốc trong batch.
- Reply sort tăng dần theo `CreatedAt`.

## 12. DTO trả về cho app

### PostDto

| Field | Ý nghĩa |
| --- | --- |
| `id` | ID bài viết |
| `user_id` | ID tác giả |
| `content` | Nội dung text |
| `media_url` | URL media nếu có |
| `media_type` | `IMAGE`, `VIDEO` hoặc null |
| `like_count` | Số lượt thích |
| `comment_count` | Số bình luận |
| `created_at` | Thời điểm tạo |
| `updated_at` | Thời điểm cập nhật |
| `author_name` | Tên hiển thị tác giả |
| `author_avatar` | Avatar tác giả |
| `is_liked` | User hiện tại đã thích chưa |
| `is_saved` | User hiện tại đã lưu chưa |

`author_name` được map theo thứ tự ưu tiên:

1. `user.Profile.FullName`
2. `user.FullName`
3. `user.Email`

`author_avatar` được map theo thứ tự ưu tiên:

1. `user.Profile.AvatarUrl`
2. `user.AvatarUrl`

### CommentDto

| Field | Ý nghĩa |
| --- | --- |
| `id` | ID bình luận |
| `post_id` | ID bài viết |
| `user_id` | ID người bình luận |
| `parent_comment_id` | ID bình luận gốc nếu là reply |
| `content` | Nội dung bình luận |
| `like_count` | Số lượt thích |
| `reply_count` | Số phản hồi |
| `created_at` | Thời điểm tạo |
| `author_name` | Tên người bình luận |
| `author_avatar` | Avatar người bình luận |
| `is_liked` | User hiện tại đã thích chưa |
| `replies` | Danh sách reply trực tiếp |

## 13. Database/schema liên quan

Các entity chính:

- `Post`
- `PostLike`
- `PostSave`
- `Comment`
- `CommentLike`
- `User`
- `Profile`

Các bảng chính:

| Table | Vai trò |
| --- | --- |
| `posts` | Lưu bài viết |
| `post_likes` | Lưu lượt thích bài viết |
| `post_saves` | Lưu bài viết đã bookmark |
| `comments` | Lưu bình luận và reply |
| `comment_likes` | Lưu lượt thích bình luận |
| `users` | Thông tin user |
| `profiles` | Thông tin hồ sơ mở rộng |

Các cột quan trọng của `posts`:

- `id`
- `user_id`
- `content`
- `media_url`
- `media_type`
- `like_count`
- `comment_count`
- `created_at`
- `updated_at`
- `deleted_at`

Các cột quan trọng của `comments`:

- `id`
- `post_id`
- `user_id`
- `parent_comment_id`
- `content`
- `like_count`
- `reply_count`
- `created_at`
- `updated_at`
- `deleted_at`

File `server/social_schema_update.sql` là script nâng cấp schema cho social/explore, thêm:

- Reply comment qua `parent_comment_id`.
- Like count và reply count cho comment.
- Bảng `comment_likes`.
- Bảng `post_saves`.
- Index phục vụ lấy comment/feed đã lưu.
- Script đồng bộ lại `like_count`, `comment_count`, `reply_count`.

## 14. Các luồng tương tác chính

### Xem feed cộng đồng

User mở tab Khám phá -> chọn Cộng đồng -> `ExploreScreen` gọi `socialService.getPosts` -> axios gắn JWT -> server `PostsApiController.GetPosts` query bảng `posts` -> map DTO kèm trạng thái liked/saved của user hiện tại -> app render bằng `PostCard`.

### Xem bài đã lưu

User chọn tab Đã lưu -> `socialService.getSavedPosts` -> server gọi lại `GetPosts` với `savedOnly = true` -> query bài có record trong `post_saves` -> app render bằng `PostCard`.

### Thích bài viết

User bấm Thích -> app gọi `toggleLike` -> server kiểm tra post còn tồn tại -> nếu chưa like thì thêm `post_likes` và tăng `like_count`, nếu đã like thì xóa record và giảm `like_count` -> app cập nhật ngay card tương ứng.

### Lưu bài viết

User bấm Lưu -> app gọi `toggleSave` -> server thêm/xóa record trong `post_saves` -> app cập nhật `is_saved`. Nếu đang ở tab Đã lưu và hành động là bỏ lưu, app loại bài khỏi danh sách.

### Tạo bài viết có media

User bấm nút cộng -> nhập text/chọn ảnh video -> nếu có media thì upload `/api/upload/media` -> nhận URL -> gọi `/api/posts` -> server tạo record trong `posts` -> app đóng modal và refresh feed cộng đồng.

### Bình luận

User bấm Bình luận -> mở `CommentModal` -> tải comments từ server -> user gửi comment -> server tạo record trong `comments`, tăng `comment_count` -> app thêm comment vào danh sách và tăng count trên bài.

## 15. Một số ghi chú hiện trạng

- Một số chuỗi tiếng Việt trong frontend/server đang bị lỗi encoding hiển thị dạng mojibake, ví dụ `KhÃ¡m phÃ¡`, `BÃ¬nh luáº­n`.
- Tab `learn` hiện là nội dung tĩnh trong app, chưa có API quản trị nội dung khám phá.
- `PostCard` hiện chưa phát video thật; video đang được render bằng `Image` với overlay nút play.
- Feed chưa có chức năng xóa/sửa bài viết ở màn Explore.
- Server có soft delete qua `deleted_at`, nhưng API trong controller hiện chỉ lọc bài/comment chưa xóa, chưa thấy endpoint delete trong phần Explore.
- `like_count`, `comment_count`, `reply_count` được lưu dạng counter trong DB. Điều này giúp đọc nhanh, nhưng cần giữ đồng bộ khi thêm/xóa dữ liệu.
- `GET /api/posts/saved` dùng cursor theo `posts.created_at`, không phải thời điểm user lưu bài.

## 16. Tóm tắt nhanh

Trang Khám phá hiện gồm một phần học tập tĩnh và một phần cộng đồng động. Phần cộng đồng dùng chung hệ social của app: bài viết, media, like, save, comment, reply và like comment. Frontend tập trung ở `ExploreScreen`, `socialService`, `PostCard`, `CreatePostScreen`, `CommentModal`. Backend tập trung ở `PostsApiController`, `UploadApiController`, `UsersApiController`, các DTO trong `SocialDtos.cs`, các entity social và schema SQL Server.
