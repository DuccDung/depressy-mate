# Depressy Mate - System Summary

## 1. Tổng quan hệ thống

**Depressy Mate** là ứng dụng mobile chuyên về hỗ trợ sức khỏe tâm thần và quản lý trầm cảm, được phát triển với mô hình client-server:

- **Frontend**: React Native (Expo) - TypeScript
- **Backend**: ASP.NET Core Web API - C#
- **Database**: SQL Server
- **Real-time**: SignalR (WebSocket)
- **Push Notification**: Firebase Cloud Messaging (FCM)
- **Authentication**: JWT + OAuth (Google, Facebook)

Ứng dụng cung cấp đầy đủ các tính năng theo dõi và cải thiện sức khỏe tâm thần, từ đánh giá chuyên sâu đến nhật ký, chat với chuyên gia, và cộng đồng hỗ trợ.

---

## 2. Kiến trúc tổng thể

### 2.1 Frontend Architecture

**Framework**: Expo SDK 54, React Native 0.81.5, TypeScript 5.9.2

**Navigation**: React Navigation 7.x
- Native Stack cho các màn hình chi tiết
- Bottom Tabs cho navigation chính (6 tabs)
- Authentication flow với AuthStack

**State Management**: React Context API
- `AuthContext`: Quản lý authentication, user session, push token registration
- Custom hooks: `useColorScheme`, `useThemeColor`

**Network Layer**:
- Axios với interceptors tự động gắn JWT token
- Base URL: `http://192.168.1.103:5210/api` (development)
- Socket.io client cho realtime chat

**UI/UX**:
- Theme: "Radiant Sanctuary" với màu xanh lá/teal chủ đạo
- Typography: Manrope font family
- Custom components: AssessmentFlow, BreathingCircle, SleepPlayer, PostCard, etc.

### 2.2 Backend Architecture

**Framework**: ASP.NET Core (phiên bản không rõ, dùng .NET 6+)

**Pattern**: MVC + Web API + SignalR Hub

**Authentication**:
- JWT Bearer tokens cho API
- Cookie-based OAuth flows cho Google/Facebook redirect
- Role-based: USER, DOCTOR, ADMIN
- Token qua query string cho SignalR hub (`/hubs/chat?access_token=...`)

**Database Access**: Entity Framework Core (Code First)

**Real-time**: SignalR Hub (`ChatHub`) với methods:
- `JoinConversation`
- `SendMessage`
- `MarkConversationRead`
- `SetTyping`

**Services**:
- `JwtTokenService`: Tạo và validate JWT
- `EmailSender`: Gửi OTP email (SMTP)
- `ChatService`: Business logic cho chat
- `PushNotificationService`: Gửi FCM notifications

**Middleware Pipeline**:
```
ForwardedHeaders → StaticFiles → CORS → Authentication → Authorization → Controllers → SignalR
```

---

## 3. Database Schema

### 3.1 Core Tables

**Users & Profiles**:
- `users` (id, email, password_hash, role, avatar_url, auth_provider, facebook_id, is_email_verified)
- `profiles` (user_id, full_name, avatar_url, bio) - 1:1 với users
- `user_push_tokens` (user_id, provider, push_token, platform, device_name, is_active)

**Health Tracking**:
- `mood_checkins` (user_id, mood, note, image_url) - 5 trạng thái: excellent/good/okay/sad/terrible
- `journals` (user_id, title, content, audio_url)
- `assessment_results` (user_id, assessment_code, raw_scores, final_scores, classifications, overall_severity, is_red_alert)
- `breathing_sessions` (user_id, duration_seconds, cycles_completed, total_cycles, completed)
- `sleep_sessions` (user_id, track_id, track_title, duration_ms, listened_ms, completed)

**Social**:
- `posts` (user_id, content, media_url, media_type, like_count, comment_count, deleted_at)
- `post_likes` (post_id, user_id)
- `post_saves` (post_id, user_id)
- `comments` (post_id, user_id, parent_comment_id, content, like_count, reply_count)
- `comment_likes` (comment_id, user_id)

**Chat**:
- `conversations` (id, type, name, avatar_url, created_by, last_message_at)
- `conversation_participants` (conversation_id, user_id, role, joined_at, last_read_at, left_at)
- `messages` (conversation_id, sender_id, content, message_type, media_url, is_read)

**Directory**:
- `doctors` (id, name, specialty, degree, workplace, experience, treatment_focus, price_reference, url_avatar)
- `clinics` (id, name, address, department, working_hours, services, price_reference, url_avatar)

### 3.2 Constraints & Indexes

- UUIDs cho tất cả primary keys
- JSON validation cho các trường JSON (raw_scores, final_scores, classifications, treatment_focus, services)
- Check constraints cho mood, role, message_type, media_type
- Composite unique indexes cho like/save tables
- Performance indexes: created_at DESC cho các bảng theo dõi, index cho unread messages

---

## 4. API Endpoints chi tiết

### 4.1 Authentication (`/api/auth`)

- `POST /register/request-otp`: Đăng ký, gửi OTP 6 số qua email, lưu trong memory cache (10 phút)
- `POST /register/verify-otp`: Verify OTP, tạo user, profile, trả JWT
- `POST /login`: Đăng nhập email/password
- `POST /google`: Nhận Google ID token, verify với Google, tạo/update user, trả JWT
- `POST /facebook`: Nhận Facebook access token, verify, tạo/update user, trả JWT
- `GET /google` & `/google/callback`: OAuth redirect flow (web)
- `GET /facebook` & `/facebook/callback`: OAuth redirect flow (web)
- `POST /email-verification/request-otp`: OTP cho email verification (cho Facebook users)
- `POST /email-verification/verify-otp`: Verify email OTP

### 4.2 Users (`/api/users`)

- `GET /me`: Lấy profile user hiện tại
- `PUT /me`: Cập nhật full_name, avatar_url, bio
- `GET /search?q=...&limit=...`: Tìm user theo tên/email (cho chat)
- `GET /{id}`: Lấy thông tin user cụ thể

### 4.3 Assessments (`/api/assessments`)

- `POST /calculate`: Submit assessment answers, tính điểm, lưu kết quả
  - Support: DASS-21, PHQ-9, GAD-7, SAS, RADS, generic
  - Return: raw_scores, final_scores, classifications, overall_severity (0-4), is_red_alert
- `GET /history`: Lịch sử kết quả assessments của user

### 4.4 Check-ins (`/api/checkins`)

- `GET`: Lịch sử mood check-ins
- `POST`: Tạo check-in mới (mood, note, image_url)
- `POST /upload-image`: Upload ảnh check-in (max 8MB)

### 4.5 Journals (`/api/journals`)

- `GET`: Danh sách journals (pagination)
- `POST`: Tạo journal mới (title optional, cần content hoặc audio_url)

### 4.6 Chat & Conversations (`/api/conversations`)

- `GET`: Danh sách conversations của user (với thông tin tin nhắn cuối, unread count)
- `GET /{id}`: Chi tiết conversation (participants, tin nhắn mới nhất)
- `POST /direct`: Tạo/get direct conversation với user (nếu đã tồn tại trả existing=true)
- `POST /group`: Tạo group chat (cần tên, ít nhất 2 participant)
- `GET /{id}/messages`: Lấy tin nhắn phân trang cursor-based (limit, before timestamp)
- `POST /{id}/messages`: Gửi tin nhắn text (MessageType=TEXT)
- `POST /{id}/read`: Đánh dấu conversation đã đọc (cập nhật LastReadAt của participant)
- `PATCH /{id}`: Cập nhật tên/avatar group (chỉ OWNER/ADMIN)
- `POST /{id}/members`: Thêm thành viên (chỉ OWNER/ADMIN)
- `DELETE /{id}/members/{memberId}`: Xóa thành viên (chỉ OWNER/ADMIN, không xóa OWNER)
- `POST /{id}/leave`: Rời nhóm (nếu OWNER rời, chuyển ownership)

### 4.7 Posts & Social (`/api/posts`)

- `GET`: Feed posts phân trang cursor-based, filter:
  - `savedOnly=true`: Bài đã lưu
  - `userId={id}`: Bài của user cụ thể
  - `mediaType=VIDEO`: Bài có video
- `GET /saved`: Alias cho savedOnly
- `GET /{postId}`: Chi tiết post với likes, comments
- `POST`: Tạo post mới (cần content HOẶC media_url, media_type)
- `POST /{postId}/like`: Toggle like/unlike
- `POST /{postId}/save`: Toggle save/unsave
- `GET /{postId}/comments`: Lấy comment gốc + replies (phân cấp)
- `POST /{postId}/comments`: Tạo comment (parent_comment_id optional cho reply)
- `POST /{postId}/comments/{commentId}/like`: Toggle like comment

### 4.8 Doctors & Clinics

- `GET /api/doctors`: Danh sách bác sĩ
- `GET /api/doctors/{id}`: Chi tiết bác sĩ
- `GET /api/clinics`: Danh sách phòng khám
- `GET /api/clinics/{id}`: Chi tiết phòng khám

### 4.9 Upload (`/api/upload`)

- `POST /media`: Upload file ảnh/video
  - Validate: size <= 25MB, extensions: .jpg/.jpeg/.png/.webp/.gif/.mp4/.mov/.m4v
  - Lưu vào `wwwroot/uploads/posts/{guid_filename}`
  - Return: publicUrl, path, mediaType (IMAGE/VIDEO)
- `GET /media/{fileName}/stream`: Stream file với range support (video player tua)

### 4.10 Health Tracking (`/api/health`)

- `POST /breathing-sessions`: Lưu phiên hít thở (duration_seconds, cycles_completed, total_cycles, completed)
- `POST /sleep-sessions`: Lưu phiên ngủ (track_id, track_title, duration_ms, listened_ms, completed)
- `GET /summary?days=30`: Dashboard tổng hợp health data theo ngày, bao gồm:
  - totals: tổng số assessments, checkins, journals, breathing/sleep minutes
  - latest: latest assessment severity, latest mood score
  - daily series: dữ liệu từng ngày (assessment_severity, mood_score, breathing/sleep minutes)
  - insight: text insight (backend chưa rõ logic)
  - latest_assessments: danh sách assessments gần nhất

### 4.11 Push Tokens (`/api/push-tokens`)

- `POST`: Register device token (token, provider='firebase', platform, device_name)
  - Unique on (provider, push_token)
  - Nếu token đã tồn tại, gán lại cho user hiện tại và active
- `POST /deactivate`: Deactivate current device token

---

## 5. Realtime Chat (SignalR)

### 5.1 Connection

- Hub URL: `/hubs/chat`
- JWT token truyền qua query string: `?access_token={token}`
- Frontend dùng socket.io-client với `auth: { bearerToken: token }` hoặc `query: { access_token: token }`

### 5.2 Hub Methods (Client → Server)

- `JoinConversation(conversationId)`: Tham gia group SignalR của conversation
- `SendMessage(conversationId, content)`: Gửi tin nhắn (server lưu DB, broadcast)
- `MarkConversationRead(conversationId)`: Cập nhật LastReadAt, broadcast event
- `SetTyping(conversationId, isTyping)`: Gửi typing indicator

### 5.3 Hub Events (Server → Client)

- `message:new`: Tin nhắn mới (Message object đã join với sender info)
- `conversation:updated`: Conversation có update (last_message, last_message_at, participants)
- `conversation:new`: User được thêm vào conversation mới
- `conversation:read`: Participant khác đã đọc
- `typing:update`: Có user đang typing (userId, isTyping)
- `conversation:removed`: Bị xóa khỏi conversation/group

---

## 6. Push Notifications (Firebase)

### 6.1 Frontend Flow

1. App khởi động, user đăng nhập → `AuthContext` gọi `registerCurrentDevicePushToken()`
2. Request permission FCM (Android 13+ cần POST_NOTIFICATIONS)
3. Lấy FCM token qua `messaging().getToken()`
4. Gửi `POST /api/push-tokens` với token, provider='firebase', platform
5. Listen foreground messages: `onMessage` → hiển thị local notification
6. Listen token refresh: `onTokenRefresh` → gửi token mới lên server

### 6.2 Backend Flow

- `PushNotificationService` dùng Firebase Admin SDK
- Khi có tin nhắn mới (từ API hoặc SignalR), service:
  1. Tìm tất cả participant còn active (không phải sender)
  2. Lấy các push token active của họ
  3. Gửi FCM multicast (batch 500 tokens)
  4. Payload:
     ```json
     {
       "notification": { "title", "body" },
       "data": { "type": "chat_message", "conversationId", "messageId", "senderId" }
     }
     ```
  5. Nếu Firebase trả về error `Unregistered`/`InvalidArgument`, deactivate token đó

---

## 7. Assessment Logic (Backend)

### 7.1 Supported Scales

**DASS-21**:
- 3 subscales: Depression, Anxiety, Stress
- Mỗi câu 0-3 điểm
- Multiply by 2 để có DASS-42 scale

**PHQ-9**:
- Depression score (0-27)
- Red alert nếu câu 9 (suicidal thoughts) > 0

**GAD-7**:
- Anxiety score (0-21)

**SAS** (Zung Self-Rating Anxiety Scale):
- Reverse score cho câu: 5, 9, 13, 17, 19

**RADS** (Reynolds Adolescent Depression Scale):
- Reverse score cho câu: 1, 5, 10, 12, 23, 25, 29

**Generic**:
- Sum tất cả câu trả lời

### 7.2 Output

```json
{
  "raw_scores": { "Q1": 2, "Q2": 1, ... },
  "final_scores": { "Depression": 15, "Anxiety": 10 },
  "classifications": { "Depression": "Moderate", "Anxiety": "Mild" },
  "overall_severity": 2, // 0-4
  "is_red_alert": false
}
```

---

## 8. Admin Area (ASP.NET MVC)

Controllers trong `server/server/server/Controllers/Admin/`:

- `AdminController`: Login, Dashboard, OAuth admin
- `AdminUsersController`: CRUD users, xem user details
- `AdminDoctorsController`: Quản lý doctors master data
- `AdminClinicsController`: Quản lý clinics master data
- `AdminContentController`: Quản lý nội dung (posts? assessments?)
- `AdminNotificationsController`: Gửi push notifications

Views và Layout: `Views/Admin/*`, `_AdminLayout.cshtml`

---

## 9. Frontend Screens & Features

### 9.1 Auth Stack

- `LoginScreen`: Email/password + Google + Facebook buttons
- `RegisterScreen`: Email, password, full name → OTP flow
- `ForgotPasswordScreen`: Chưa rõ implementation

### 9.2 Main Tabs (Bottom Tab Navigator)

1. **Home** (`HomeScreen`):
   - Dashboard tổng hợp health data 7-30 ngày
   - Hero card với severity ring (mức độassessment)
   - 6 quick action cards: Check-in, Assessments, Breathe, Journal, Sleep, Socials
   - Charts: assessment severity, mood score, activity minutes (smooth line chart)
   - Stats grid: tổng số hoạt động
   - Community section preview
   - Modal overlay cho từng feature (navigate đến sub-screens)

2. **Contact** (`ContactScreen`):
   - Danh sách doctors và clinics
   - Search/filter? (chưa rõ)

3. **Messenger** (`MessengerScreen`):
   - Danh sách conversations
   - Tap mở `ChatDetailScreen`
   - Pull-to-refresh
   - Real-time update qua socket (new message, read status)

4. **Chatbot** (`ChatbotScreen`):
   - Very simple placeholder, chưa có AI integration

5. **Explore** (`ExploreScreen`):
   - Tab: Community (SocialFeedScreen) & Saved posts
   - Community: Feed với posts, like, save, comment
   - Video filter (mediaType=VIDEO)
   - Create post FAB
   - Lazy loading infinite scroll

6. **Profile** (`ProfileScreen`):
   - Edit profile (name, avatar, bio)
   - Logout button
   - Settings? (chưa rõ)

### 9.3 Sub-screens

**Home feature screens** (trong `Home/`):
- `CheckinScreen`: Chọn mood (5 options), ghi chú, upload ảnh, submit
- `JournalScreen`: Tạo journal với title, content, audio recording?
- `BreathingExerciseScreen`: Animation hít thở theo vòng tròn, theo dõi cycles
- `SleepScreen`: Chọn nhạc ngủ từ `assets/audios/music_sleep.json`, player controls, track progress

**Social**:
- `CreatePostScreen`: Tạo post với text, image/video picker
- `ChatDetailScreen`: Tin nhắn realtime, typing indicator, send message, read receipts
- `CreateGroupScreen`: Tạo group chat với participants
- `ConversationInfoScreen`: Thông tin conversation, participants list, add/remove members

### 9.4 Key Components

- `AssessmentFlow`: Multi-step questionnaire (chưa xem chi tiết)
- `AssessmentCard`: Hiển thị kết quả assessment
- `ResultGauge`: Gauge chart cho severity
- `QuestionnaireModal`: Modal cho câu hỏi
- `Pagination`: Component phân trang
- `PostCard`: Post với like/save/comment buttons
- `CommentModal`: Danh sách comments, reply, like
- `MoodSelector`: 5 mood buttons
- `ImagePickerSection`: Image picker cho check-in
- `SleepTipCard`: Tip giấc ngủ
- `SoundTrackItem`: Track trong sleep music list
- `UserAvatar`: Avatar với fallback initials

---

## 10. File Upload & Media

**Upload endpoints**:
- `POST /api/upload/media`: Lưu file vào `wwwroot/uploads/posts/` với GUID filename
- File size max: 25MB
- Supported: images (.jpg, .jpeg, .png, .webp, .gif), videos (.mp4, .mov, .m4v)
- Return `publicUrl` (full URL) và `mediaType` (IMAGE/VIDEO tự động từ Content-Type)

**Stream video**:
- `GET /api/upload/media/{fileName}/stream`
- `enableRangeProcessing: true` → hỗ trợ byte-range requests, player có thể tua

**Frontend**:
- `expo-image-picker`: Chọn ảnh/video từ gallery
- `expo-image`: Hiển thị ảnh tối ưu
- `expo-av`: Video/audio player (cho sleep music)

**Note**: Hiện tại media lưu local trên server, chưa có cloud storage (S3, Cloudinary). Nếu scale cần shared storage.

---

## 11. Authentication & Authorization

### 11.1 JWT

- `JwtTokenService`: Tạo token với claims: userId, email, role
- Secret từ config (`Jwt:Secret`)
- Token được lưu frontend trong `AsyncStorage` (key: `userToken`)
- API interceptor tự động gắn `Authorization: Bearer {token}`

### 11.2 Social OAuth

**Google**:
- Frontend: `react-native-google-signin` lấy `idToken`
- Backend: Verify `idToken` qua `oauth2.googleapis.com/tokeninfo`
- Checks: issuer, audience, email_verified
- Tạo/update user với `AuthProvider = "google"`

**Facebook**:
- Frontend: `react-native-fbsdk-next` lấy `accessToken`
- Backend: `/debug_token` để verify, `/me` để lấy profile
- Facebook có thể không trả email → tạo email fake `facebook_{id}@facebook.local`
- Tạo/update user với `AuthProvider = "facebook"`

**Email Verification for Facebook**:
- Nếu email không có/không verified, có flow OTP riêng để verify email

### 11.3 Role-Based Access

- Middleware: `RoleMiddleware` (chưa xem code)
- Roles: USER, DOCTOR, ADMIN
- Doctor-specific APIs: `/api/doctors`, `/api/clinics` có thể dùng cho tất cả?
- Admin area: `/Admin/*` yêu cầu role ADMIN

---

## 12. Cấu hình & Environment

### 12.1 Backend (.env)

```
ConnectionStrings:DepressyMate=Server=...;Database=...;User Id=...;Password=...
Jwt:Secret={jwt_secret_key}
Authentication:Google:client_id={google_client_id}
Authentication:Google:client_secret={google_client_secret}
Authentication:Facebook:AppId={fb_app_id}
Authentication:Facebook:AppSecret={fb_app_secret}
Authentication:Facebook:CallbackPath=/facebook/redirect (optional)
Email:Support=support@depressymate.com
Smtp:Host=smtp.gmail.com
Smtp:Port=587
Smtp:Username=...
Smtp:Password=...
Smtp:From=...
Firebase:ServiceAccountPath=path/to/serviceAccountKey.json
```

### 12.2 Frontend (app.json)

- Expo config: name, slug, version, SDK version
- Firebase config:google-services.json, firebaseSetup.js
- Platform-specific: Android package, iOS bundleId
- Deep linking: `frontend://auth/google`, `frontend://auth/facebook`

### 12.3 Development Setup

**Backend**:
```bash
cd server/server/server
dotnet restore
dotnet run # hoặc IIS Express trong .vs
```

**Frontend**:
```bash
cd frontend
npm install
npx expo start
# Android: adb reverse tcp:5210 tcp:5210 (nếu dùng localhost)
```

---

## 13. Deployment Notes

- **Backend**: ASP.NET Core, deploy lên Windows Server với IIS hoặc Linux với Kestrel + Nginx. Có `.github/workflows/deploy-backend.yml` (chưa xem).
- **Frontend**: Expo EAS Build cho iOS/Android, Expo web deployment.
- **Database**: SQL Server (có thể dùng Supabase PostgreSQL? Trong CLAUDE.md nói Supabase nhưng schema lại là SQL Server). Hiện tại dùng SQL Server.
- **Static files**: Uploads served từ `wwwroot/uploads/` qua `UseStaticFiles()`.
- **CORS**: AllowAnyOrigin (development only, production nên restrict).
- **SSL**: HTTPS redirection trong production.

---

## 14. Known Issues & Technical Debt

1. **OTP Cache**: Dùng `IMemoryCache` → OTP mất khi server restart. Nên dùng Redis hoặc database.
2. **File Storage**: Upload lưu local → cần cloud storage (S3, Azure Blob) cho multi-instance.
3. **Encoding**: Một số message tiếng Việt lỗi encoding trong source code (cần UTF-8 normalization).
4. **CORS**: `AllowAnyOrigin` không an toàn cho production.
5. **Video Processing**: Chưa có transcode, thumbnail generation, compression.
6. **Assessment Seed**: Dùng JSON seed từ frontend → cần seed script backend.
7. **Admin Area**: ASP.NET MVC mixed với Web API → có thể tách riêng admin API.
8. **Socket Disconnect**: AuthContext disconnect socket khi logout, nhưng reconnect logic? (có thể trong socketService).
9. **Health Summary Insight**: Logic tạo insight chưa rõ (placeholder?).
10. **Pagination**: Cursor-based dùng timestamp → có lỗi nếu 2 messages cùng timestamp (nên dùng ID).
11. **Push Notification Fallback**: Nếu Firebase config thiếu, backend chỉ log warning → OK.
12. **Facebook Email**: Nếu FB không trả email, tạo email fake → user không nhận được OTP verification? (có flow riêng).

---

## 15. Testing & Quality

- Backend: Không thấy unit tests, integration tests.
- Frontend: ESLint config Expo, TypeScript strict (có thể).
- Manual testing: Chưa có automated test suite.

---

## 16. Security Considerations

- **JWT Secret**: Phải strong, rotation possible.
- **SQL Injection**: EF Core → OK.
- **XSS**: React Native → không có DOM, nhưng WebView cần cẩn thận.
- **File Upload**: Validate extension, content-type, size (đã có). Nên scan malware.
- **Rate Limiting**: Chưa có → dễ brute force OTP, login.
- **OTP**: 6 số, 5 lần thử, 10 phút hết hạn → OK nhưng cache nên dùng Redis với TTL.
- **CORS**: Development allow all, production nên restrict domain frontend.
- **SignalR**: Token qua query string → nên dùng header nếu có thể, nhưng SignalR JS client limitation.
- **Push Token**: Unique index trên (provider, token) → OK.

---

## 17. Performance Optimizations

**Frontend**:
- FlatList với `removeClippedSubviews`, `windowSize`, `maxToRenderPerBatch` → tối ưu memory.
- Lazy loading infinite scroll cho feed.
- Image optimization: `expo-image` (caching, compression).
- Socket connection pool: `socketService` singleton.

**Backend**:
- Indexes trên `created_at` cho các bảng lớn (posts, messages, checkins...).
- Pagination cursor-based (timestamp) → tránh offset performance issue.
- FCM multicast batch 500 tokens.
- JSON fields → lưu được nhưng query con trỏ khó (nên tách bảng nếu cần query complex).

---

## 18. Future Enhancements

- [ ] Cloud storage (S3/Azure) cho uploads
- [ ] Redis cache cho OTP, session
- [ ] Unit tests (xUnit/NUnit) cho backend
- [ ] E2E tests (Detox/Appium) cho frontend
- [ ] Video transcoding, thumbnail generation
- [ ] Advanced health analytics (ML predictions?)
- [ ] Calendar integration cho appointments
- [ ] Telemedicine video calls (Agora, Twilio)
- [ ] Multi-language support (i18n)
- [ ] Accessibility features
- [ ] Dark mode full support
- [ ] Rate limiting, IP blocking
- [ ] Audit logs
- [ ] Admin dashboard improvements (charts, analytics)
- [ ] Push notification types: reminders, wellness tips

---

## 19. Conclusion

Depressy Mate là một ứng dụng mobile đầy đủ tính năng cho sức khỏe tâm thần, với kiến trúc tách biệt frontend/backend, sử dụng công nghệ modern (React Native, ASP.NET Core, SignalR, Firebase). Hệ thống đã implement:

✅ Authentication (email, Google, Facebook, OTP)
✅ Authorization (JWT, roles)
✅ Real-time chat (SignalR)
✅ Push notifications (FCM)
✅ Social features (posts, likes, comments, saves)
✅ Health tracking (checkins, journal, assessments, breathing, sleep)
✅ File upload (ảnh/video)
✅ Admin panel (CRUD users, doctors, clinics)
✅ Dashboard health summary với charts

Các vấn đề kỹ thuật cần khắc phục: OTP cache, file storage, encoding, rate limiting. Có tiềm năng mở rộng lớn với thêm AI chatbot, video calls, advanced analytics.

---

**Last Updated**: 2025-05-12 (System review từ codebase)
**Repository**: `D:\laptrinhweb\code_outsrc\ngoc_anh\depressy-mate`
**Documentation Reference**: `CLAUDE.md`, `NGHIEP_VU_DU_AN.md`
