# Tong ket cong viec Codex da thuc hien

Ngay thuc hien: 2026-05-10

## 1. Kiem tra kien truc backend/frontend

- Doc lai cau truc repo thuc te va xac nhan backend hien tai la ASP.NET Core/C# + Entity Framework + SQL Server, khong phai Node/Express nhu tai lieu cu.
- Kiem tra cac model san co lien quan den chat va social:
  - `Conversation`, `ConversationParticipant`, `Message`
  - `Post`, `PostLike`, `Comment`
  - `User`, `Profile`
- Danh gia ban dau:
  - Chat da co bang nen tang nhung thieu API, realtime, auth JWT cho API, group metadata va read state theo user.
  - Social/Explore da co mot so component frontend goi `/posts`, `/comments`, `/upload`, nhung server chua co API tuong ung day du.

## 2. Trien khai chat 1v1, group va realtime

### Server

- Them JWT Bearer authentication cho API va SignalR.
- Them SignalR Hub tai endpoint:
  - `/hubs/chat`
- Them service nghiep vu chat:
  - Tao hoac lay conversation 1v1.
  - Tao group chat.
  - Lay danh sach conversation.
  - Lay messages co phan trang.
  - Gui message.
  - Mark conversation read.
  - Typing indicator.
  - Doi ten group.
  - Them thanh vien group.
  - Xoa thanh vien group.
  - Roi group.
- Them API:
  - `GET /api/users/search`
  - `GET /api/users/{id}`
  - `GET /api/conversations`
  - `GET /api/conversations/{id}`
  - `POST /api/conversations`
  - `POST /api/conversations/direct`
  - `POST /api/conversations/group`
  - `GET /api/conversations/{id}/messages`
  - `POST /api/conversations/{id}/messages`
  - `POST /api/conversations/{id}/read`
  - `PATCH /api/conversations/{id}`
  - `POST /api/conversations/{id}/members`
  - `DELETE /api/conversations/{id}/members/{memberId}`
  - `POST /api/conversations/{id}/leave`
- Nang schema/model chat:
  - `conversations`: `name`, `avatar_url`, `created_by`, `updated_at`, `last_message_at`
  - `conversation_participants`: `role`, `last_read_at`, `left_at`
  - `messages`: `message_type`, `media_url`, `edited_at`, `deleted_at`
- Tao file SQL nang cap DB:
  - `server/chat_schema_update.sql`

### App React Native

- Thay `socket.io-client` bang SignalR client `@microsoft/signalr`.
- Tao realtime service moi trong `frontend/src/services/socket.ts`.
- Nang `chatService.ts` de goi API chat moi.
- Them navigation stack rieng:
  - `MainStackNavigator`
  - `ChatDetail`
  - `CreateGroup`
  - `ConversationInfo`
- Nang man `MessengerScreen`:
  - Tim user de nhan tin nhanh.
  - Tao chat 1v1.
  - Tao group nhanh.
  - Danh sach conversation co unread count va last message.
- Them man `ChatDetailScreen`:
  - Gui/nhan tin realtime.
  - Bubble trai/phai theo `sender_id`.
  - Load tin cu.
  - Mark read.
  - Typing indicator.
- Them man `CreateGroupScreen`:
  - Tim thanh vien.
  - Chon nhieu user.
  - Tao group.
- Them man `ConversationInfoScreen`:
  - Xem thanh vien.
  - Doi ten group.
  - Them/xoa thanh vien.
  - Roi group.

## 3. Sua loi doi tai khoan A/B bi lech nguoi gui

Van de phat hien:

- Khi test cung mot may/app voi user A va B, sau khi logout A va login B, SignalR connection cu van authenticated la A.
- B gui tin qua realtime nhung server ghi `sender_id = A`.
- UI cua B thay tin minh vua gui thanh tin cua doi phuong, nen bubble/list bi nguoc.

Da sua:

- `socketService` luu `activeToken`.
- Neu token thay doi thi tu dong disconnect connection cu va tao connection moi.
- `AuthContext.logout()` se disconnect realtime truoc khi xoa `userToken/userData`.
- Login voi token moi se disconnect session realtime cu.
- API interceptor khi gap 401 xoa ca `userToken` va `userData`.

## 4. Sua loi input chat bi ban phim de len

Da sua trong `ChatDetailScreen`:

- `KeyboardAvoidingView` hoat dong ca iOS va Android.
- iOS dung `padding`, Android dung `height`.
- Bo `bottom` edge trong `SafeAreaView`, tu cong `paddingBottom` theo safe area cho composer.
- Them config Android trong `frontend/app.json`:
  - `softwareKeyboardLayoutMode: "resize"`

Luu y: config Android native can rebuild dev-client/native app neu dang chay tren Android build.

## 5. Trien khai Explore / Community social feed

### Server

- Them API bai viet:
  - `GET /api/posts`
  - `GET /api/posts/saved`
  - `POST /api/posts`
  - `POST /api/posts/{postId}/like`
  - `POST /api/posts/{postId}/save`
  - `GET /api/posts/{postId}/comments`
  - `POST /api/posts/{postId}/comments`
  - `POST /api/posts/{postId}/comments/{commentId}/like`
- Them API upload media noi bo:
  - `POST /api/upload/media`
- Server luu media vao:
  - `wwwroot/uploads/posts`
- Them `UseStaticFiles()` de app co the render file upload tu `/uploads/posts/...`.
- Nang social schema/model:
  - `comments.parent_comment_id`
  - `comments.like_count`
  - `comments.reply_count`
  - `comments.updated_at`
  - `comments.deleted_at`
  - bang `comment_likes`
  - bang `post_saves`
- Cap nhat `sqlserver_schema.sql`.
- Tao file SQL nang cap DB hien tai:
  - `server/social_schema_update.sql`

### App React Native

- Viet lai `socialService.ts`:
  - Lay feed.
  - Lay bai da luu.
  - Dang bai.
  - Upload media.
  - Like/unlike post.
  - Save/unsave post.
  - Lay comment tree.
  - Tao comment/reply.
  - Like/unlike comment.
- Viet lai `CreatePostScreen`:
  - Dang text.
  - Chon anh/video bang `expo-image-picker`.
  - Upload media len server.
  - Tao post.
- Viet lai `PostCard`:
  - UI card gon, co author, time, content, media.
  - Nut thich.
  - Nut binh luan.
  - Nut luu/danh dau.
- Viet lai `CommentModal`:
  - Hien comment goc va reply con.
  - Tra loi comment.
  - Like comment.
  - Banner "dang tra loi".
  - Input tranh bi ban phim de.
- Viet lai `ExploreScreen` theo layout anh:
  - Header `Explore & Learn`.
  - Workshop cards dang ngang.
  - Healing media cards co nut play.
  - Skill building cards.
  - Tab `Kham pha`, `Cong dong`, `Da luu`.
  - Feed cong dong co dang bai, like, comment, save.
  - Tab da luu render cac bai user da danh dau.

## 6. Cac file SQL can chay

Neu database hien tai chua co cac cot/bang moi, can chay theo thu tu:

1. `server/chat_schema_update.sql`
2. `server/social_schema_update.sql`

Sau khi chay SQL, restart server.

## 7. Cac lenh da kiem tra

- Backend:
  - `dotnet build server\server\server\server.csproj -o .\artifacts\server-build-check`
- Frontend:
  - `npx.cmd tsc --noEmit`
  - `npm.cmd run lint`

Ket qua:

- Backend build pass.
- TypeScript pass.
- Lint pass khong co error.
- Con mot so warning cu o cac file khong thuoc module chat/social moi.

## 8. Ghi chu test

- Neu test chat bang A/B tren cung mot thiet bi, can dung ban build moi sau fix session realtime.
- Cac message cu da bi luu sai `sender_id` truoc khi fix se van hien sai trong lich su vi DB da ghi sai tu truoc.
- Sau khi fix, message moi se dung `sender_id` cua user dang login.
- Voi Android, neu input chat van bi ban phim de sau khi reload JS, can rebuild native/dev-client de `softwareKeyboardLayoutMode: resize` co hieu luc.
