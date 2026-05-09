# Depressy Mate - Project Documentation

## Project Overview
Depressy Mate is a mobile application designed to support mental health and depression management. The app provides assessment tools, journaling, chat functionality, and clinical resources to help users track and manage their mental well-being.

## Tech Stack

### Backend
- **Runtime**: Node.js with Express.js (v5.2.1)
- **Database**: PostgreSQL (via `pg`) with Supabase as the backend service
- **Authentication**: JWT (jsonwebtoken) with bcryptjs for password hashing
- **Real-time**: Socket.io (v4.8.3) for chat functionality
- **File Uploads**: Multer (v2.1.1)
- **Security**: Helmet (v8.1.0), CORS (v2.8.6)
- **Environment**: dotenv (v17.3.1)
- **Dev Tools**: Nodemon, @flydotio/dockerfile for deployment

### Frontend
- **Framework**: Expo (v54.0.33) with React Native (v0.81.5)
- **Language**: TypeScript (v5.9.2)
- **Navigation**: React Navigation (v7.x) - native-stack, bottom-tabs
- **Network**: Axios (v1.13.6) for API calls, socket.io-client for real-time
- **Storage**: @react-native-async-storage/async-storage
- **Media**: expo-av (audio/video), expo-image-picker, expo-image
- **Auth**: expo-auth-session, expo-crypto
- **UI**: react-native-gesture-handler, react-native-reanimated (v4.1.1), react-native-svg
- **Platform Support**: iOS, Android, Web

## Project Structure

```
depressy-mate/
├── backend/
│   ├── config/              # Database and service configurations
│   │   ├── db.js           # PostgreSQL connection
│   │   ├── socket.js       # Socket.io configuration
│   │   └── supabase.js     # Supabase client
│   ├── controllers/         # Request handlers (11 controllers)
│   │   ├── assessmentController.js
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── checkinController.js
│   │   ├── clinicController.js
│   │   ├── doctorController.js
│   │   ├── interactionController.js
│   │   ├── journalController.js
│   │   ├── postController.js
│   │   ├── uploadController.js
│   │   └── (one more controller)
│   ├── middlewares/         # Express middlewares
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── routes/              # API route definitions (11 route files)
│   │   ├── assessmentRoutes.js
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── checkinRoutes.js
│   │   ├── clinicRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── interactionRoutes.js
│   │   ├── journalRoutes.js
│   │   ├── postRoutes.js
│   │   ├── uploadRoutes.js
│   │   └── (one more route file)
│   ├── sockets/             # WebSocket handlers
│   │   └── chatSocket.js
│   ├── index.js            # Main server entry point
│   ├── caculator.js        # Assessment calculator utilities
│   ├── clinical_scales_seed.json  # Clinical assessment scales data
│   ├── seed_medical.js     # Medical data seeding script
│   └── test_assessment.js  # Assessment testing
├── frontend/
│   ├── assets/             # Static assets (images, audios)
│   │   └── audios/
│   │       └── music_sleep.json
│   ├── constants/          # App constants
│   │   └── theme.ts        # Theme configuration
│   ├── hooks/              # Custom React hooks
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   └── use-theme-color.ts
│   ├── app.json           # Expo configuration
│   ├── eas.json           # EAS Build configuration
│   ├── assessment_recommendations.json  # Assessment result recommendations
│   ├── clinical_scales_seed.json        # Clinical scales data
│   └── (additional React Native/Expo files)
└── .github/
    └── workflows/
        └── deploy-backend.yml  # CI/CD for backend deployment

```

## Key Features

1. **User Authentication** - JWT-based auth with role-based access (users, doctors, clinics)
2. **Mental Health Assessments** - Clinical scale assessments with scoring and recommendations
3. **Journal System** - Private journaling for users to track their mental state
4. **Real-time Chat** - Socket.io-powered chat between users and healthcare providers
5. **Doctor/Clinic Management** - Find and interact with mental health professionals
6. **Check-ins** - Regular mental health check-ins
7. **Posts/Interactions** - Community or informational posts
8. **File Uploads** - Support for media uploads (profile pictures, journal attachments)

## API Structure

Base URL: Configured via environment variables

### Main API Endpoints
- `/api/auth` - Authentication (login, register, token refresh)
- `/api/assessments` - Mental health assessments
- `/api/journal` - Journal entries
- `/api/chat` - Chat functionality
- `/api/checkin` - Daily/weekly check-ins
- `/api/doctors` - Doctor profiles and management
- `/api/clinics` - Clinic information
- `/api/posts` - Posts and interactions
- `/api/upload` - File upload endpoints

## Environment Setup

### Backend (.env file required)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
JWT_SECRET=...
PORT=3000
```

### Frontend
- Configure `expo-constants` for API base URL
- Set up environment-specific configs in `app.json` or `eas.json`

## Development Commands

### Backend
```bash
cd depressy-mate/backend
npm install          # Install dependencies
npm run dev          # Start with nodemon (development)
npm start            # Start production server
```

### Frontend
```bash
cd depressy-mate/frontend
npm install          # Install dependencies
npx expo start       # Start Expo dev server
npx expo start --android  # Run on Android
npx expo start --ios      # Run on iOS
npx expo start --web      # Run on Web
```

## Deployment

- **Backend**: Configured with GitHub Actions (`.github/workflows/deploy-backend.yml`)
- **Frontend**: EAS Build for native apps, Expo for web deployment

## Database

- **Provider**: Supabase (PostgreSQL)
- **Seed Data**: `seed_medical.js` for initial medical data
- **Clinical Scales**: Defined in `clinical_scales_seed.json`

## Important Notes

1. Backend uses Express v5 (different from v4 - check migration guide if updating)
2. Frontend uses React Native 0.81.5 with New Architecture considerations
3. Socket.io is used for real-time chat - ensure proper CORS and transport configuration
4. Assessment calculator logic is in `caculator.js` - handle with care when modifying
5. Role-based middleware (`roleMiddleware.js`) controls access to doctor/clinic endpoints

## Common Tasks

### Adding a New API Endpoint
1. Create controller in `backend/controllers/`
2. Define routes in `backend/routes/`
3. Apply authentication/role middleware as needed
4. Update frontend API calls with axios

### Modifying Assessment Scales
1. Update `clinical_scales_seed.json`
2. Modify `caculator.js` if scoring logic changes
3. Update `assessment_recommendations.json` for new recommendations
4. Re-seed database if needed

### Working with Real-time Chat
1. Backend socket logic: `backend/sockets/chatSocket.js`
2. Frontend socket client: uses `socket.io-client`
3. Ensure proper room/join logic for user-doctor conversations
