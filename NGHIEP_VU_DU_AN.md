# Tài liệu nghiệp vụ Depressy Mate

## Mục lục

- [1. Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
- [2. Xác thực tài khoản thường và OTP email](#2-xác-thực-tài-khoản-thường-và-otp-email)
- [3. Đăng nhập bằng Google](#3-đăng-nhập-bằng-google)
- [4. Đăng nhập bằng Facebook](#4-đăng-nhập-bằng-facebook)
- [5. Quản lý hồ sơ người dùng](#5-quản-lý-hồ-sơ-người-dùng)
- [6. Thông báo đẩy](#6-thông-báo-đẩy)
- [7. Chat realtime](#7-chat-realtime)
- [8. Cộng đồng, bài viết, bình luận và lưu bài](#8-cộng-đồng-bài-viết-bình-luận-và-lưu-bài)
- [9. Upload và xử lý video/ảnh](#9-upload-và-xử-lý-videoảnh)
- [10. Check-in cảm xúc](#10-check-in-cảm-xúc)
- [11. Nhật ký cá nhân](#11-nhật-ký-cá-nhân)
- [12. Bài đánh giá sức khỏe tinh thần](#12-bài-đánh-giá-sức-khỏe-tinh-thần)
- [13. Theo dõi sức khỏe, hít thở và giấc ngủ](#13-theo-dõi-sức-khỏe-hít-thở-và-giấc-ngủ)
- [14. Danh bạ bác sĩ và phòng khám](#14-danh-bạ-bác-sĩ-và-phòng-khám)
- [15. Quản trị nội dung](#15-quản-trị-nội-dung)
- [16. Các bảng dữ liệu chính](#16-các-bảng-dữ-liệu-chính)
- [17. Ghi chú kỹ thuật và cấu hình](#17-ghi-chú-kỹ-thuật-và-cấu-hình)

## 1. Tổng quan hệ thống

Depressy Mate là ứng dụng mobile React Native/Expo kết nối với backend ASP.NET Core. Frontend nằm trong `frontend`, backend nằm trong `server/server/server`.

Các nhóm chức năng chính:

- Xác thực người dùng bằng email/mật khẩu, Google và Facebook.
- Lưu phiên bằng JWT trong `AsyncStorage`.
- Theo dõi sức khỏe tinh thần qua check-in, nhật ký, bài đánh giá, hít thở và giấc ngủ.
- Cộng đồng xã hội gồm bài viết, ảnh/video, like, save, comment và reply.
- Chat realtime bằng SignalR, có direct chat và group chat.
- Push notification bằng Firebase Cloud Messaging cho tin nhắn chat.
- Danh bạ bác sĩ/phòng khám và trang admin để quản lý dữ liệu.

Luồng chung phía frontend:

1. Người dùng đăng nhập/đăng ký.
2. Frontend nhận JWT và thông tin user.
3. Token được lưu vào `AsyncStorage`.
4. Các API sau đó gửi request qua service axios ở `frontend/src/services/api.ts`.
5. Các API bảo vệ dùng JWT Bearer ở backend.

Luồng chung phía backend:

1. Controller nhận request.
2. Lấy user hiện tại từ claim JWT qua `ChatService.GetUserId`.
3. Xử lý nghiệp vụ qua Entity Framework Core.
4. Trả DTO cho app mobile.

## 2. Xác thực tài khoản thường và OTP email

Nghiệp vụ này xử lý đăng ký bằng email/mật khẩu, xác minh OTP và đăng nhập truyền thống.

Code liên quan:

- Frontend: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/screens/LoginScreen.tsx`, `frontend/src/screens/RegisterScreen.tsx`
- Backend: `server/server/server/Controllers/Api/AuthApiController.cs`
- Service: `server/server/server/Services/JwtTokenService.cs`, `server/server/server/Services/EmailSender.cs`

Luồng đăng ký:

1. Người dùng nhập email, mật khẩu, họ tên.
2. Frontend gọi `POST /api/auth/register/request-otp`.
3. Backend kiểm tra email chưa tồn tại, mật khẩu tối thiểu 6 ký tự.
4. Backend tạo OTP 6 chữ số, hash OTP bằng BCrypt và lưu tạm trong `IMemoryCache`.
5. Backend gửi OTP qua email.
6. Người dùng nhập OTP.
7. Frontend gọi `POST /api/auth/register/verify-otp`.
8. Backend kiểm tra OTP, giới hạn tối đa 5 lần thử.
9. Nếu hợp lệ, backend tạo user, profile, đánh dấu `IsEmailVerified = true`.
10. Backend sinh JWT và trả về user cho app.

Luồng đăng nhập:

1. Người dùng nhập email/mật khẩu.
2. Frontend gọi `POST /api/auth/login`.
3. Backend tìm user theo email và kiểm tra password hash bằng BCrypt.
4. Nếu hợp lệ, backend trả JWT và thông tin user.
5. Frontend lưu `userToken` và `userData` vào `AsyncStorage`.

Lưu ý:

- OTP đăng ký hết hạn sau 10 phút.
- Cache OTP đang dùng memory cache, nên khi server restart OTP đang chờ sẽ mất.
- Các message lỗi trong một số file đang bị lỗi encoding tiếng Việt; nghiệp vụ vẫn đọc được qua logic code.

## 3. Đăng nhập bằng Google

Nghiệp vụ Google login cho phép người dùng đăng nhập mobile bằng Google ID token, sau đó backend xác thực lại token với Google.

Code liên quan:

- Frontend: `frontend/src/services/googleAuth.ts`, `frontend/src/screens/LoginScreen.tsx`, `frontend/src/contexts/AuthContext.tsx`
- Backend: `server/server/server/Controllers/Api/GoogleAuthApiController.cs`
- Cấu hình: `frontend/google-services.json`, `server/server/server/Program.cs`

Luồng mobile hiện tại:

1. Người dùng bấm nút Google ở màn hình đăng nhập.
2. `getGoogleIdToken()` cấu hình Google Sign-In bằng Web Client ID lấy từ `google-services.json`.
3. App gọi Google Sign-In, nhận `idToken`.
4. App đăng nhập Firebase Auth bằng `GoogleAuthProvider.credential(idToken)`.
5. Frontend gửi `idToken` lên backend qua `POST /api/auth/google`.
6. Backend gọi `https://oauth2.googleapis.com/tokeninfo` để xác thực token.
7. Backend kiểm tra:
   - `issuer` là `accounts.google.com` hoặc `https://accounts.google.com`.
   - `audience` nằm trong danh sách Google client ID được cấu hình.
   - Có `subject`, `email`.
   - Email đã được Google xác minh.
8. Backend tìm user theo email.
9. Nếu chưa có user, tạo user mới với `AuthProvider = google`, email verified và profile.
10. Nếu đã có user, cập nhật tên, avatar, trạng thái email verified.
11. Backend sinh JWT nội bộ và trả về app.

Backend cũng có luồng redirect OAuth:

- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Luồng này dùng cookie external auth và deep link mặc định `frontend://auth/google`, nhưng mobile hiện tại đang dùng luồng POST token trực tiếp.

Lưu ý cấu hình:

- Google Sign-In cần SHA-1/SHA-256, package name và Web client ID đúng trong Firebase.
- Backend cần cấu hình Google client ID ở các key như `Authentication:Google:client_id`, `Authentication:Google:WebClientId` hoặc danh sách allowed client IDs.

## 4. Đăng nhập bằng Facebook

Nghiệp vụ Facebook login cho phép app lấy Facebook access token từ SDK mobile, sau đó backend xác thực token với Facebook Graph API.

Code liên quan:

- Frontend: `frontend/src/services/facebookAuth.ts`, `frontend/src/screens/LoginScreen.tsx`, `frontend/src/contexts/AuthContext.tsx`
- Backend: `server/server/server/Controllers/Api/FacebookAuthApiController.cs`
- Cấu hình: `server/server/server/Program.cs`, `frontend/app.json`, Facebook SDK native config

Luồng mobile hiện tại:

1. Người dùng bấm nút Facebook.
2. `react-native-fbsdk-next` mở luồng đăng nhập với quyền `public_profile`.
3. App lấy `accessToken` từ Facebook SDK.
4. Frontend gửi token lên backend qua `POST /api/auth/facebook`.
5. Backend kiểm tra token bằng `/debug_token`.
6. Backend xác nhận token còn hợp lệ và thuộc đúng Facebook App ID.
7. Backend gọi `/me?fields=id,name,email,picture.type(large)` để lấy hồ sơ Facebook.
8. Nếu Facebook không trả email, backend tạo email giả dạng `facebook_{facebookId}@facebook.local`.
9. Backend tìm user theo `FacebookId`, nếu không có thì tìm theo email.
10. Nếu chưa có user, tạo user mới với `AuthProvider = facebook`.
11. Nếu đã có user, cập nhật `FacebookId`, tên, avatar và trạng thái email verified nếu Facebook có email.
12. Backend trả JWT nội bộ và user.

Nghiệp vụ xác minh email cho Facebook:

- Nếu user Facebook không có email thật, backend có API:
  - `POST /api/auth/email-verification/request-otp`
  - `POST /api/auth/email-verification/verify-otp`
- API này chỉ dành cho tài khoản có `AuthProvider = facebook` và chưa verified email.

Backend cũng có luồng redirect OAuth:

- `GET /api/auth/facebook`
- `GET /api/auth/facebook/callback`

Lưu ý:

- App mobile phải được build lại với Facebook SDK native, không chỉ chạy Expo Go.
- Backend cần `Authentication:Facebook:AppId` và `Authentication:Facebook:AppSecret`.

## 5. Quản lý hồ sơ người dùng

Nghiệp vụ này cho phép lấy và cập nhật hồ sơ cá nhân, đồng thời hỗ trợ tìm kiếm user để chat.

Code liên quan:

- Frontend: `frontend/src/services/profileService.ts`, `frontend/src/services/chatService.ts`
- Backend: `server/server/server/Controllers/Api/UsersApiController.cs`

API chính:

- `GET /api/users/me`: lấy hồ sơ user đang đăng nhập.
- `PUT /api/users/me`: cập nhật họ tên, avatar, bio.
- `GET /api/users/search?q=...&limit=...`: tìm user khác để tạo cuộc trò chuyện.
- `GET /api/users/{id}`: lấy thông tin user theo ID.

Quy tắc nghiệp vụ:

- Họ tên không được trống và tối đa 255 ký tự.
- Avatar URL tối đa 1000 ký tự.
- Bio tối đa 1000 ký tự.
- Tìm kiếm user không trả chính user hiện tại.

## 6. Thông báo đẩy

Nghiệp vụ push notification đang dùng Firebase Cloud Messaging để gửi thông báo tin nhắn chat cho người nhận khi có tin nhắn mới.

Code liên quan:

- Frontend: `frontend/src/services/firebaseMessagingService.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/index.js`
- Backend: `server/server/server/Controllers/Api/PushTokensApiController.cs`, `server/server/server/Services/PushNotificationService.cs`
- Model: `server/server/server/Models/UserPushToken.cs`
- Schema: `server/push_notifications_schema_update.sql`

Luồng đăng ký token thiết bị:

1. Sau khi user có JWT, `AuthContext` gọi `registerCurrentDevicePushToken()`.
2. App xin quyền notification:
   - Android 13+ xin quyền `POST_NOTIFICATIONS`.
   - Firebase Messaging xin permission.
3. App lấy FCM token bằng `messaging().getToken()`.
4. Frontend gọi `POST /api/push-tokens` với:
   - `token`
   - `provider = firebase`
   - `platform`
5. Backend lưu token vào bảng `UserPushTokens`.
6. Nếu token đã tồn tại, backend gán lại token đó cho user hiện tại và active lại.

Luồng refresh token:

1. Firebase phát sinh token mới qua `onTokenRefresh`.
2. Frontend gửi token mới lên `POST /api/push-tokens`.
3. Backend cập nhật hoặc tạo mới token.

Luồng hủy token khi logout:

1. Frontend lấy FCM token hiện tại.
2. Gọi `POST /api/push-tokens/deactivate`.
3. Backend set `IsActive = false`.

Luồng gửi push khi có tin nhắn:

1. User gửi tin nhắn qua REST API hoặc SignalR.
2. `ConversationsApiController` hoặc `ChatHub` gọi `PushNotificationService.SendChatMessageNotificationAsync`.
3. Service tìm các participant còn active trong conversation, loại trừ sender.
4. Service lấy các FCM token active của người nhận.
5. Service gửi FCM multicast theo batch tối đa 500 token.
6. Payload gồm:
   - Notification title/body.
   - Data: `type = chat_message`, `conversationId`, `messageId`, `senderId`.
7. Nếu Firebase báo token `Unregistered` hoặc `InvalidArgument`, backend tự deactivate token.

Lưu ý cấu hình:

- Backend cần service account Firebase qua `Firebase:ServiceAccountPath`, `Firebase__ServiceAccountPath` hoặc `GOOGLE_APPLICATION_CREDENTIALS`.
- Nếu thiếu service account, backend log warning và tắt push notification, không làm lỗi luồng chat.

## 7. Chat realtime

Nghiệp vụ chat hỗ trợ nhắn tin 1-1, nhóm, đọc tin, typing indicator, realtime event và push notification.

Code liên quan:

- Frontend: `frontend/src/services/chatService.ts`, `frontend/src/services/socket.ts`
- Screens: `frontend/src/screens/socials/MessengerScreen.tsx`, `frontend/src/screens/socials/ChatDetailScreen.tsx`, `frontend/src/screens/socials/CreateGroupScreen.tsx`, `frontend/src/screens/socials/ConversationInfoScreen.tsx`
- Backend: `server/server/server/Controllers/Api/ConversationsApiController.cs`, `server/server/server/Hubs/ChatHub.cs`, `server/server/server/Services/ChatService.cs`
- Models: `Conversation`, `ConversationParticipant`, `Message`

API REST chính:

- `GET /api/conversations`: lấy danh sách conversation của user.
- `GET /api/conversations/{id}`: lấy chi tiết conversation.
- `POST /api/conversations/direct`: tạo hoặc lấy direct conversation.
- `POST /api/conversations/group`: tạo group chat.
- `GET /api/conversations/{id}/messages`: lấy tin nhắn phân trang bằng cursor thời gian.
- `POST /api/conversations/{id}/messages`: gửi tin nhắn text.
- `POST /api/conversations/{id}/read`: đánh dấu đã đọc.
- `PATCH /api/conversations/{id}`: cập nhật tên/avatar group.
- `POST /api/conversations/{id}/members`: thêm thành viên.
- `DELETE /api/conversations/{id}/members/{memberId}`: xóa thành viên.
- `POST /api/conversations/{id}/leave`: rời nhóm.

SignalR hub:

- URL: `/hubs/chat`
- Frontend truyền JWT qua `accessTokenFactory`.
- Backend đọc token từ query `access_token` cho route `/hubs/chat`.

SignalR methods:

- `JoinConversation(conversationId)`: tham gia group realtime nếu là participant.
- `SendMessage(conversationId, content)`: gửi tin nhắn realtime.
- `MarkConversationRead(conversationId)`: đánh dấu đã đọc.
- `SetTyping(conversationId, isTyping)`: báo trạng thái đang nhập.

Realtime events:

- `message:new`: có tin nhắn mới.
- `conversation:updated`: conversation có cập nhật tin nhắn hoặc thông tin.
- `conversation:new`: user được thêm vào conversation mới.
- `conversation:read`: participant đã đọc.
- `typing:update`: trạng thái nhập tin nhắn.
- `conversation:removed`: user bị xóa khỏi nhóm hoặc rời nhóm.

Quy tắc direct chat:

- Không thể tạo conversation với chính mình.
- Nếu direct conversation giữa 2 người đã tồn tại và còn active, backend trả conversation cũ với `existing = true`.
- Direct chat có 2 participant role `MEMBER`.

Quy tắc group chat:

- Tạo nhóm cần tên nhóm và ít nhất 2 thành viên khác ngoài người tạo.
- Người tạo là `OWNER`.
- Thành viên khác là `MEMBER`.
- Chỉ `OWNER` hoặc `ADMIN` được sửa nhóm, thêm/xóa thành viên.
- Không thể xóa `OWNER`.
- Khi `OWNER` rời nhóm, backend chuyển quyền owner cho thành viên tiếp theo nếu có.

Quy tắc tin nhắn:

- Tin nhắn hiện tại là text, `MessageType = TEXT`.
- Nội dung không được trống.
- Tối đa 4000 ký tự.
- `LastReadAt` dùng để tính `unread_count`.

## 8. Cộng đồng, bài viết, bình luận và lưu bài

Nghiệp vụ cộng đồng cho phép người dùng đăng bài, xem feed, lọc bài có video, like, lưu bài và bình luận nhiều cấp.

Code liên quan:

- Frontend: `frontend/src/services/socialService.ts`
- Screens/components: `SocialFeedScreen.tsx`, `CreatePostScreen.tsx`, `PostCard.tsx`, `CommentModal.tsx`
- Backend: `server/server/server/Controllers/Api/PostsApiController.cs`
- Models: `Post`, `PostLike`, `PostSave`, `Comment`, `CommentLike`

API bài viết:

- `GET /api/posts`: lấy feed phân trang bằng cursor.
- `GET /api/posts?savedOnly=true`: lọc bài đã lưu.
- `GET /api/posts?userId={id}`: lấy bài của một user.
- `GET /api/posts?mediaType=VIDEO`: lấy bài video.
- `GET /api/posts/saved`: API tắt cho bài đã lưu.
- `GET /api/posts/{postId}`: lấy chi tiết bài.
- `POST /api/posts`: tạo bài mới.
- `POST /api/posts/{postId}/like`: like/unlike.
- `POST /api/posts/{postId}/save`: save/unsave.

API bình luận:

- `GET /api/posts/{postId}/comments`: lấy comment gốc kèm reply.
- `POST /api/posts/{postId}/comments`: tạo comment hoặc reply.
- `POST /api/posts/{postId}/comments/{commentId}/like`: like/unlike comment.

Quy tắc nghiệp vụ:

- Bài viết phải có nội dung hoặc media.
- Nội dung bài viết tối đa 3000 ký tự.
- Bình luận tối đa 1000 ký tự.
- Comment reply chỉ được reply vào comment gốc, không reply lồng nhiều cấp.
- `like_count`, `comment_count`, `reply_count` được cập nhật khi thao tác.
- Feed trả thêm `is_liked` và `is_saved` theo user hiện tại.

## 9. Upload và xử lý video/ảnh

Nghiệp vụ upload media hiện tại lưu file vào thư mục local `wwwroot/uploads/posts` và trả URL công khai để gắn vào bài viết.

Code liên quan:

- Frontend: `frontend/src/services/socialService.ts`, `frontend/src/screens/socials/CreatePostScreen.tsx`
- Backend: `server/server/server/Controllers/Api/UploadApiController.cs`
- File mẫu đang có: `server/server/server/wwwroot/uploads/posts/*.mp4`, `*.jpeg`

Luồng upload:

1. Người dùng chọn ảnh hoặc video ở màn hình tạo bài.
2. Frontend tạo `FormData` với field `file`.
3. Frontend gọi `POST /api/upload/media`.
4. Backend kiểm tra file tồn tại và kích thước không quá 25MB.
5. Backend kiểm tra đuôi file thuộc danh sách hỗ trợ.
6. Backend tạo tên file ngẫu nhiên bằng GUID.
7. File được lưu vào `wwwroot/uploads/posts`.
8. Backend trả:
   - `publicUrl`: URL đầy đủ.
   - `path`: đường dẫn tương đối.
   - `mediaType`: `VIDEO` nếu content type bắt đầu bằng `video/`, còn lại là `IMAGE`.
9. Frontend gọi `POST /api/posts` với `media_url` và `media_type`.

Định dạng hỗ trợ:

- Ảnh: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Video: `.mp4`, `.mov`, `.m4v`

Stream video:

- API: `GET /api/upload/media/{fileName}/stream`
- Cho phép anonymous.
- Backend bật `Accept-Ranges: bytes` và trả file với `enableRangeProcessing: true`.
- Điều này giúp player có thể tua, tải từng phần và phát video tốt hơn.

Lưu ý:

- Hiện tại chưa thấy xử lý transcode video, tạo thumbnail, nén video hoặc upload lên cloud storage.
- Media được lưu local trên server; khi deploy nhiều instance cần cân nhắc shared storage hoặc object storage.
- Backend phân loại video chủ yếu dựa vào `Content-Type`, còn filter feed dùng trường `MediaType` trong bảng `Posts`.

## 10. Check-in cảm xúc

Nghiệp vụ check-in giúp user ghi lại tâm trạng, ghi chú và ảnh kèm theo.

Code liên quan:

- Frontend: `frontend/src/screens/Home/CheckinScreen.tsx`, `frontend/src/components/checkin/*`
- Backend: `server/server/server/Controllers/Api/CheckinsApiController.cs`
- Model: `MoodCheckin`

API chính:

- `GET /api/checkins`: lấy lịch sử check-in của user.
- `POST /api/checkins`: tạo check-in.
- `POST /api/checkins/upload-image`: upload ảnh check-in.

Trạng thái cảm xúc hợp lệ:

- `excellent`
- `good`
- `okay`
- `sad`
- `terrible`

Quy tắc nghiệp vụ:

- Mood là bắt buộc và phải nằm trong danh sách hợp lệ.
- Ghi chú tối đa 500 ký tự.
- Image URL tối đa 1000 ký tự.
- Upload ảnh check-in tối đa 8MB.
- Ảnh check-in hỗ trợ `.jpg`, `.jpeg`, `.png`, `.webp`.

## 11. Nhật ký cá nhân

Nghiệp vụ journal cho phép user ghi nhật ký dạng text hoặc audio URL.

Code liên quan:

- Frontend: `frontend/src/screens/Home/JournalScreen.tsx`
- Backend: `server/server/server/Controllers/Api/JournalsApiController.cs`
- Model: `Journal`

API chính:

- `GET /api/journals?limit=&offset=`: lấy danh sách nhật ký.
- `POST /api/journals`: tạo nhật ký.

Quy tắc nghiệp vụ:

- Nếu không có title, backend dùng mặc định "Nhật ký không tên".
- Phải có content hoặc audio URL.
- Title tối đa 255 ký tự.
- Audio URL tối đa 1000 ký tự.
- Nhật ký chỉ trả dữ liệu của user đang đăng nhập.

## 12. Bài đánh giá sức khỏe tinh thần

Nghiệp vụ assessment tính điểm các thang đo sức khỏe tinh thần và lưu lịch sử kết quả.

Code liên quan:

- Frontend: `frontend/src/components/AssessmentFlow.tsx`, `frontend/src/components/AssessmentCard.tsx`, `frontend/clinical_scales_seed.json`, `frontend/assessment_recommendations.json`
- Backend: `server/server/server/Controllers/Api/AssessmentsApiController.cs`
- Model: `AssessmentResult`

API chính:

- `POST /api/assessments/calculate`: tính điểm và lưu kết quả.
- `GET /api/assessments/history`: lấy lịch sử kết quả.

Thang đo được backend hỗ trợ:

- `DASS-21`: tính Depression, Anxiety, Stress, nhân hệ số 2.
- `PHQ-9`: tính Depression, có red alert nếu câu 9 > 0.
- `GAD-7`: tính Anxiety.
- `SAS`: có các câu đảo điểm 5, 9, 13, 17, 19.
- `RADS`: có các câu đảo điểm 1, 5, 10, 12, 23, 25, 29.
- Mã khác: tính generic theo tổng điểm.

Dữ liệu lưu:

- `RawScores`: câu trả lời thô.
- `FinalScores`: điểm cuối theo từng nhóm.
- `Classifications`: phân loại mức độ.
- `OverallSeverity`: mức độ tổng từ 0 đến 4.
- `IsRedAlert`: cờ cảnh báo đỏ.

## 13. Theo dõi sức khỏe, hít thở và giấc ngủ

Nghiệp vụ health tracking tổng hợp dữ liệu từ assessment, check-in, journal, breathing và sleep để tạo dashboard theo thời gian.

Code liên quan:

- Frontend: `frontend/src/screens/Home/BreathingExerciseScreen.tsx`, `frontend/src/screens/Home/SleepScreen.tsx`, `frontend/src/services/healthService.ts`
- Backend: `server/server/server/Controllers/Api/HealthApiController.cs`
- Models: `BreathingSession`, `SleepSession`, `AssessmentResult`, `MoodCheckin`, `Journal`

API chính:

- `POST /api/health/breathing-sessions`: lưu phiên hít thở.
- `POST /api/health/sleep-sessions`: lưu phiên nghe nhạc/ngủ.
- `GET /api/health/summary?days=30`: lấy dashboard tổng hợp.

Quy tắc phiên hít thở:

- Lưu `duration_seconds`, `cycles_completed`, `total_cycles`, `completed`.
- Nếu duration <= 0 và cycles completed <= 0 thì không lưu.
- Duration tối đa 24 giờ.
- Total cycles tối đa 1000.

Quy tắc phiên ngủ:

- Lưu `track_id`, `track_title`, `duration_ms`, `listened_ms`, `completed`.
- Nếu nghe dưới 1000ms thì không lưu.
- Tự đánh dấu completed nếu nghe tối thiểu 90% duration.
- Duration/listened tối đa 24 giờ.

Health summary:

- Khoảng ngày được giới hạn từ 7 đến 180 ngày.
- Trả totals, latest, series dữ liệu, daily aggregation và insight.
- Mood được quy đổi điểm:
  - `excellent = 5`
  - `good = 4`
  - `okay = 3`
  - `sad = 2`
  - `terrible = 1`

## 14. Danh bạ bác sĩ và phòng khám

Nghiệp vụ này cung cấp danh sách bác sĩ và phòng khám để user tham khảo hỗ trợ chuyên môn.

Code liên quan:

- Frontend: `frontend/src/screens/ExploreScreen.tsx`, `frontend/src/screens/ContactScreen.tsx`, `frontend/src/components/DoctorCard.tsx`, `frontend/src/components/ClinicCard.tsx`
- Backend API: `server/server/server/Controllers/Api/DoctorsApiController.cs`, `server/server/server/Controllers/Api/ClinicsApiController.cs`
- Backend MVC: `server/server/server/Controllers/MedicalDirectoryController.cs`
- Models: `Doctor`, `Clinic`

API bác sĩ:

- `GET /api/doctors`: lấy danh sách bác sĩ.
- `GET /api/doctors/{id}`: lấy chi tiết bác sĩ.

API phòng khám:

- `GET /api/clinics`: lấy danh sách phòng khám.
- `GET /api/clinics/{id}`: lấy chi tiết phòng khám.

Dữ liệu bác sĩ gồm:

- Tên, chuyên khoa, học vị, nơi làm việc.
- Kinh nghiệm, trọng tâm điều trị, giá tham khảo.
- Avatar URL.

Dữ liệu phòng khám gồm:

- Tên, địa chỉ, khoa/phòng ban.
- Giờ làm việc, dịch vụ, giá tham khảo.
- Avatar URL.

## 15. Quản trị nội dung

Backend có khu vực admin dùng ASP.NET MVC/Razor để quản lý dữ liệu hệ thống.

Code liên quan:

- Controllers: `server/server/server/Controllers/Admin/*`
- Views: `server/server/server/Views/Admin/*`
- Layout/CSS: `server/server/server/Views/Shared/_AdminLayout.cshtml`, `server/server/server/wwwroot/css/admin.css`

Nhóm admin chính:

- `AdminController`: đăng nhập admin, dashboard, OAuth admin.
- `AdminUsersController`: quản lý user.
- `AdminDoctorsController`: quản lý bác sĩ.
- `AdminClinicsController`: quản lý phòng khám.
- `AdminContentController`: quản lý nội dung.

Luồng admin có thể đăng nhập bằng tài khoản thường hoặc OAuth Google/Facebook tùy cấu hình trong controller.

## 16. Các bảng dữ liệu chính

Nhóm user/profile:

- `Users`: email, password hash, role, avatar, full name, auth provider, Facebook ID, email verified.
- `Profiles`: thông tin hồ sơ mở rộng như họ tên, avatar, bio.

Nhóm social:

- `Posts`: nội dung bài, media URL, media type, like/comment count, soft delete.
- `PostLikes`: user like bài.
- `PostSaves`: user lưu bài.
- `Comments`: comment và reply.
- `CommentLikes`: user like comment.

Nhóm chat:

- `Conversations`: direct/group, tên nhóm, avatar nhóm, người tạo, last message time.
- `ConversationParticipants`: user trong conversation, role, joined/left, last read.
- `Messages`: nội dung tin nhắn, sender, type, media URL, trạng thái sửa/xóa.

Nhóm push:

- `UserPushTokens`: token thiết bị, provider, platform, active/inactive.

Nhóm sức khỏe:

- `MoodCheckins`: mood, note, image URL.
- `Journals`: title, content, audio URL.
- `AssessmentResults`: kết quả thang đo.
- `BreathingSessions`: phiên hít thở.
- `SleepSessions`: phiên nghe nhạc/ngủ.

Nhóm danh bạ:

- `Doctors`: thông tin bác sĩ.
- `Clinics`: thông tin phòng khám.

## 17. Ghi chú kỹ thuật và cấu hình

Cấu hình backend quan trọng:

- Connection string SQL Server: `ConnectionStrings:DepressyMate`
- JWT secret: `Jwt:Secret`
- Google OAuth: `Authentication:Google:*`
- Facebook OAuth: `Authentication:Facebook:*`
- Firebase service account: `Firebase:ServiceAccountPath` hoặc `GOOGLE_APPLICATION_CREDENTIALS`
- SMTP/email: `Email`, `Smtp`, `Support`

Cấu hình frontend quan trọng:

- Google/Firebase: `frontend/google-services.json`, `frontend/firebaseSetup.js`
- App native config: `frontend/app.json`
- Dependencies native cần build dev client: Google Sign-In, Facebook SDK, React Native Firebase Messaging.

Các endpoint realtime/static:

- SignalR chat hub: `/hubs/chat`
- Static upload: `/uploads/posts/*`, `/uploads/checkins/*`
- Stream media: `/api/upload/media/{fileName}/stream`

Các điểm cần chú ý khi triển khai production:

- Upload file đang lưu local, nên cần chiến lược backup/shared storage nếu chạy nhiều server.
- Push notification phụ thuộc service account Firebase; thiếu cấu hình thì hệ thống vẫn chạy nhưng không gửi push.
- OTP đang lưu memory cache, không phù hợp nếu có nhiều instance backend hoặc restart thường xuyên.
- Một số chuỗi tiếng Việt trong source đang lỗi encoding, nên cần chuẩn hóa UTF-8 để dễ bảo trì.
