# Depressy Mate

Depressy Mate la ung dung ho tro suc khoe tinh than gom:

- Backend ASP.NET Core .NET 9, SQL Server, EF Core, JWT, SignalR.
- Admin web quan ly nguoi dung, bai viet, bac si, phong kham, thong bao day.
- React Native app bang Expo SDK 54.
- Tich hop Firebase Messaging, Google Sign-In, Facebook Login, SMTP OTP va DeepSeek AI.

## Cau Truc Du An

```text
depressy-mate/
  server/server/server/        Backend ASP.NET Core
  frontend/                    App React Native Expo
```

## Yeu Cau Moi Truong

Can cai tren may dev:

- .NET SDK 9
- Node.js LTS, khuyen nghi Node 20+
- npm
- Git
- SQL Server Developer hoac SQL Server Express
- SQL Server Management Studio, hoac Azure Data Studio
- Android Studio, Android SDK, Android Emulator
- JDK tuong thich Android build

Kiem tra:

```powershell
dotnet --version
node --version
npm --version
git --version
```

## Clone Project

```powershell
git clone <repo-url>
cd depressy-mate
```

Neu copy project bang file zip, can giu nguyen cac thu muc quan trong:

- `frontend/assets`
- `frontend/google-services.json`
- `server/server/server/wwwroot`

## Setup SQL Server

Du an dung SQL Server voi EF Core.

### Cach 1: Restore database tu may cu

Day la cach on dinh nhat neu da co data.

1. Tren may cu, backup database thanh file `.bak`.
2. Tren may moi, mo SSMS.
3. Chon `Databases` -> `Restore Database`.
4. Chon file `.bak`.
5. Dat ten database, vi du `DepressyMate`.

### Cach 2: Tao database moi tu EF model

Repo hien tai khong co san thu muc `Migrations`, nen may moi co the tao migration dau tien:

```powershell
cd server\server\server
dotnet restore
dotnet tool update --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Setup Bien Moi Truong Backend

Tao file:

```text
server/server/server/.env
```

Mau cau hinh:

```env
ConnectionStrings__DepressyMate=Server=localhost\SQLEXPRESS;Database=DepressyMate;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True

Jwt__Secret=thay_bang_chuoi_bi_mat_that_dai_it_nhat_32_ky_tu

DeepSeek__ApiKey=your_deepseek_api_key
DeepSeek__BaseUrl=https://api.deepseek.com/v1
DeepSeek__Model=deepseek-chat

Email__FromName=Depressy Mate
Email__FromAddress=your_email@gmail.com
Support__InboxAddress=your_email@gmail.com

Smtp__Host=smtp.gmail.com
Smtp__Port=587
Smtp__UseStartTls=true
Smtp__User=your_email@gmail.com
Smtp__Pass=your_gmail_app_password
Smtp__TimeoutSeconds=30

Authentication__Google__client_id=your_google_client_id
Authentication__Google__client_secret=your_google_client_secret

Authentication__Facebook__AppId=your_facebook_app_id
Authentication__Facebook__AppSecret=your_facebook_app_secret
Authentication__Facebook__CallbackPath=/facebook/redirect

Firebase__ServiceAccountPath=firebase-service-account.json
```

Ghi chu:

- `Jwt__Secret` bat buoc.
- `ConnectionStrings__DepressyMate` bat buoc.
- SMTP bat buoc neu dung dang ky/xac thuc bang OTP email.
- DeepSeek chi can neu dung chatbot AI.
- Firebase service account chi can neu server gui push notification.
- Google/Facebook chi can neu dung dang nhap social.

Neu dung SQL Server local default instance:

```env
ConnectionStrings__DepressyMate=Server=localhost;Database=DepressyMate;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True
```

Neu dung SQL Server user/password:

```env
ConnectionStrings__DepressyMate=Server=localhost,1433;Database=DepressyMate;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=True
```

Khong commit file `.env` hoac file service account Firebase len Git.

## Chay Backend

```powershell
cd server\server\server
dotnet restore
dotnet build
dotnet run --urls "http://0.0.0.0:5210"
```

Kiem tra tren trinh duyet:

```text
http://localhost:5210
http://localhost:5210/admin
```

Neu app chay tren dien thoai that, lay IP may dang chay backend:

```powershell
ipconfig
```

Vi du IP la `192.168.1.50`, backend se duoc app goi qua:

```text
http://192.168.1.50:5210
```

Neu dien thoai khong ket noi duoc, mo firewall Windows cho port `5210`.

## Tao Tai Khoan Admin

1. Chay backend.
2. Mo:

```text
http://localhost:5210/Auth/Register
```

3. Dang ky mot tai khoan.
4. Mo SQL Server va cap quyen admin:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'email-ban-vua-dang-ky@example.com';
```

5. Dang nhap admin:

```text
http://localhost:5210/admin
```

## Setup Frontend

```powershell
cd frontend
npm install
```

Mo file:

```text
frontend/src/services/api.ts
```

Doi `API_ORIGIN` theo moi truong.

Android Emulator:

```ts
export const API_ORIGIN = "http://10.0.2.2:5210";
```

Dien thoai that cung Wi-Fi:

```ts
export const API_ORIGIN = "http://192.168.1.50:5210";
```

USB Android that:

```powershell
adb reverse tcp:5210 tcp:5210
```

Sau do dung:

```ts
export const API_ORIGIN = "http://127.0.0.1:5210";
```

## Chay App React Native

App dung native modules nhu Firebase Messaging, Google Sign-In va Facebook SDK, nen khong nen dung Expo Go cho day du tinh nang.

Build va chay Android:

```powershell
cd frontend
npx expo run:android
```

Sau lan build dau tien, co the chay dev client:

```powershell
npx expo start --dev-client
```

Hoac:

```powershell
npm run dev-client
```

## Firebase, Push Notification Va Google Login

File Firebase Android nam tai:

```text
frontend/google-services.json
```

Neu chay tren may moi, Google login co the loi do SHA-1/SHA-256 cua debug keystore khac may cu.

Lay SHA:

```powershell
cd frontend\android
.\gradlew.bat signingReport
```

Sau do:

1. Vao Firebase Console.
2. Chon project.
3. Chon Android app package `com.ngocanh208.frontend`.
4. Them SHA-1 va SHA-256.
5. Tai lai `google-services.json`.
6. Thay file trong `frontend/google-services.json`.
7. Build lai app:

```powershell
cd frontend
npx expo run:android
```

## Facebook Login

Thong tin Facebook app dang nam trong:

```text
frontend/app.json
```

Neu doi Facebook app, can cap nhat:

- `appID`
- `clientToken`
- `scheme`

Sau khi doi cau hinh native, rebuild:

```powershell
npx expo run:android
```

## Push Notification Server

Server gui push notification bang Firebase Admin.

Can co file service account JSON, vi du:

```text
server/server/server/firebase-service-account.json
```

Va `.env`:

```env
Firebase__ServiceAccountPath=firebase-service-account.json
```

Neu khong cau hinh file nay, app van chay nhung server se khong gui duoc push notification.

## Lenh Kiem Tra

Backend:

```powershell
cd server\server\server
dotnet build
```

Frontend:

```powershell
cd frontend
npx.cmd tsc --noEmit
```

Android native:

```powershell
cd frontend\android
.\gradlew.bat :app:processDebugResources --no-daemon --console=plain
.\gradlew.bat :app:compileDebugKotlin --no-daemon --console=plain
```

## Loi Thuong Gap

### App bao Network Error

Kiem tra:

- Backend da chay chua.
- `API_ORIGIN` trong `frontend/src/services/api.ts` da dung IP chua.
- Server co chay voi `--urls "http://0.0.0.0:5210"` khong.
- Dien thoai va may server co cung Wi-Fi khong.
- Firewall co chan port `5210` khong.

### Dang ky khong gui duoc OTP

Kiem tra SMTP trong `.env`.

Voi Gmail, can dung App Password, khong dung mat khau Gmail thuong.

### Google login khong co idToken

Kiem tra:

- Da them SHA-1/SHA-256 vao Firebase chua.
- Da tai lai `google-services.json` chua.
- Da rebuild app bang `npx expo run:android` chua.

### SQL Server loi certificate

Them vao connection string:

```text
TrustServerCertificate=True
```

### Admin khong dang nhap duoc

Kiem tra cot `role` cua user:

```sql
SELECT email, role FROM users;
```

Tai khoan admin nen co:

```text
ADMIN
```

## Ghi Chu Git

Khong commit cac file bi mat:

- `.env`
- `firebase-service-account.json`
- file key, certificate, keystore

Neu thay doi cau hinh native Android/iOS, can rebuild app sau khi pull code moi.
