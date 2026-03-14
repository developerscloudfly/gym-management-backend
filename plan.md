# Backend Plan — AI-Powered Gym Management Platform

## Tech Stack

| Layer             | Technology                                      |
| ----------------- | ----------------------------------------------- |
| Runtime           | Node.js (v20+)                                  |
| Language          | TypeScript (strict mode)                        |
| Framework         | Express.js                                      |
| Database          | MongoDB (Mongoose ODM)                          |
| Authentication    | JWT (access + refresh tokens)                   |
| File Storage      | Cloudinary / AWS S3 (profile pics, food scans)  |
| AI Services       | OpenAI API (workout/diet gen, chatbot, scanner) |
| Payment Gateway   | Razorpay / Stripe                               |
| Email/Notifs      | Nodemailer + Firebase Cloud Messaging (push)    |
| Validation        | Zod                                             |
| Deployment        | Vercel (serverless functions)                    |
| Version Control   | Git + GitHub                                    |
| API Documentation | Swagger (swagger-jsdoc + swagger-ui-express)    |

---

## Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app setup, middleware registration
│   ├── server.ts                 # Entry point — DB connect + start server
│   ├── config/
│   │   ├── db.ts                 # MongoDB connection
│   │   ├── env.ts                # Environment variable validation (Zod)
│   │   └── cors.ts               # CORS config
│   ├── modules/                  # Feature-based module structure
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validation.ts
│   │   │   └── auth.types.ts
│   │   ├── user/
│   │   │   ├── user.model.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.types.ts
│   │   ├── gym/
│   │   ├── member/
│   │   ├── trainer/
│   │   ├── staff/
│   │   ├── subscription/
│   │   ├── payment/
│   │   ├── workout/
│   │   ├── diet/
│   │   ├── class/
│   │   ├── attendance/
│   │   ├── analytics/
│   │   ├── notification/
│   │   └── ai/
│   │       ├── ai.controller.ts
│   │       ├── ai.service.ts
│   │       ├── ai.routes.ts
│   │       └── prompts/          # AI prompt templates
│   │           ├── workout.prompt.ts
│   │           ├── diet.prompt.ts
│   │           ├── chatbot.prompt.ts
│   │           └── foodScanner.prompt.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── role.middleware.ts     # Role-based access control
│   │   ├── validate.middleware.ts # Zod request validation
│   │   ├── error.middleware.ts    # Global error handler
│   │   └── rateLimiter.middleware.ts
│   ├── utils/
│   │   ├── apiResponse.ts        # Standardized API response
│   │   ├── apiError.ts           # Custom error class
│   │   ├── asyncHandler.ts       # Async try-catch wrapper
│   │   ├── token.ts              # JWT sign/verify helpers
│   │   └── pagination.ts         # Pagination helper
│   └── types/
│       ├── express.d.ts          # Express type extensions
│       └── global.d.ts
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
├── vercel.json
└── api/
    └── index.ts                  # Vercel serverless entry point
```

---

## Database Design (MongoDB Collections)

### 1. users
Unified collection for all roles. Multi-tenancy via `gymId`.

```
{
  _id, name, email, password (hashed), phone,
  role: "super_admin" | "gym_admin" | "trainer" | "staff" | "member",
  gymId: ObjectId (ref: gyms) | null,   // null for super_admin
  avatar: string,
  isActive: boolean,
  refreshToken: string,
  createdAt, updatedAt
}
```

### 2. gyms
```
{
  _id, name, address, city, state, phone, email, logo,
  ownerId: ObjectId (ref: users),
  isActive: boolean,
  settings: { currency, timezone, openingTime, closingTime },
  createdAt, updatedAt
}
```

### 3. subscriptionPlans
Templates created by gym admins.
```
{
  _id, gymId, name, description, durationInDays,
  price, features: [string],
  isActive: boolean,
  createdAt, updatedAt
}
```

### 4. memberSubscriptions
Tracks a member's active/past subscriptions.
```
{
  _id, memberId, gymId, planId,
  startDate, endDate,
  status: "active" | "expired" | "cancelled",
  createdAt, updatedAt
}
```

### 5. payments
```
{
  _id, memberId, gymId, subscriptionId,
  amount, currency, method, transactionId,
  status: "pending" | "completed" | "failed" | "refunded",
  invoiceUrl: string,
  paidAt, createdAt
}
```

### 6. workoutPlans
```
{
  _id, gymId, trainerId, memberId (nullable for templates),
  title, description, goal,
  weeks: [{
    weekNumber,
    days: [{
      day: "monday" | ...,
      exercises: [{
        name, sets, reps, restSeconds, notes
      }]
    }]
  }],
  isAiGenerated: boolean,
  createdAt, updatedAt
}
```

### 7. dietPlans
```
{
  _id, gymId, trainerId, memberId,
  title, goal, dietaryPreference,
  dailyCalorieTarget,
  meals: [{
    name: "breakfast" | "lunch" | "dinner" | "snack",
    items: [{ name, quantity, calories, protein, carbs, fat }]
  }],
  isAiGenerated: boolean,
  createdAt, updatedAt
}
```

### 8. classes
```
{
  _id, gymId, trainerId, name, description,
  schedule: { dayOfWeek, startTime, endTime },
  maxCapacity, currentEnrollment,
  isActive: boolean,
  createdAt, updatedAt
}
```

### 9. classBookings
```
{
  _id, classId, memberId, gymId,
  date,
  status: "booked" | "attended" | "cancelled",
  createdAt
}
```

### 10. attendance
```
{
  _id, memberId, gymId,
  checkIn: Date, checkOut: Date,
  method: "qr" | "manual",
  createdAt
}
```

### 11. memberProfiles
Extended fitness data for members.
```
{
  _id, userId, gymId,
  dateOfBirth, gender,
  height, weight,
  fitnessGoal: "weight_loss" | "muscle_gain" | "endurance" | "flexibility" | "general",
  experienceLevel: "beginner" | "intermediate" | "advanced",
  medicalConditions: [string],
  bodyMetricsHistory: [{ date, weight, bodyFat, muscleMass, bmi }],
  createdAt, updatedAt
}
```

### 12. aiChatHistory
```
{
  _id, memberId, gymId,
  messages: [{ role: "user" | "assistant", content, timestamp }],
  createdAt, updatedAt
}
```

### 13. notifications
```
{
  _id, userId, gymId,
  title, body, type,
  isRead: boolean,
  createdAt
}
```

---

## API Endpoints

### Auth
| Method | Endpoint                  | Access   | Description               |
| ------ | ------------------------- | -------- | ------------------------- |
| POST   | /api/v1/auth/register     | Public   | Register (gym admin/member)|
| POST   | /api/v1/auth/login        | Public   | Login (all roles)         |
| POST   | /api/v1/auth/refresh      | Public   | Refresh access token      |
| POST   | /api/v1/auth/logout       | Auth     | Logout + clear refresh    |
| POST   | /api/v1/auth/forgot-password | Public | Send reset link           |
| POST   | /api/v1/auth/reset-password  | Public | Reset password            |

### Gym Management
| Method | Endpoint                  | Access       | Description             |
| ------ | ------------------------- | ------------ | ----------------------- |
| POST   | /api/v1/gyms              | Super Admin  | Create gym              |
| GET    | /api/v1/gyms              | Super Admin  | List all gyms           |
| GET    | /api/v1/gyms/:id          | Gym Admin+   | Get gym details         |
| PUT    | /api/v1/gyms/:id          | Gym Admin    | Update gym              |
| DELETE | /api/v1/gyms/:id          | Super Admin  | Deactivate gym          |

### User/Member Management
| Method | Endpoint                        | Access         | Description              |
| ------ | ------------------------------- | -------------- | ------------------------ |
| POST   | /api/v1/gyms/:gymId/members     | Staff, Admin   | Register member          |
| GET    | /api/v1/gyms/:gymId/members     | Staff, Admin   | List members             |
| GET    | /api/v1/gyms/:gymId/members/:id | Staff, Admin   | Get member details       |
| PUT    | /api/v1/gyms/:gymId/members/:id | Staff, Admin   | Update member            |
| DELETE | /api/v1/gyms/:gymId/members/:id | Admin          | Deactivate member        |
| GET    | /api/v1/me                      | Auth           | Get own profile          |
| PUT    | /api/v1/me                      | Auth           | Update own profile       |

### Trainer & Staff Management
| Method | Endpoint                         | Access     | Description         |
| ------ | -------------------------------- | ---------- | ------------------- |
| POST   | /api/v1/gyms/:gymId/trainers     | Admin      | Add trainer         |
| GET    | /api/v1/gyms/:gymId/trainers     | Admin      | List trainers       |
| POST   | /api/v1/gyms/:gymId/staff        | Admin      | Add staff           |
| GET    | /api/v1/gyms/:gymId/staff        | Admin      | List staff          |
| PUT    | /api/v1/gyms/:gymId/trainers/:id | Admin      | Update trainer      |
| PUT    | /api/v1/gyms/:gymId/staff/:id    | Admin      | Update staff        |
| DELETE | /api/v1/gyms/:gymId/trainers/:id | Admin      | Deactivate trainer  |
| DELETE | /api/v1/gyms/:gymId/staff/:id    | Admin      | Deactivate staff    |

### Subscription Plans
| Method | Endpoint                                | Access  | Description          |
| ------ | --------------------------------------- | ------- | -------------------- |
| POST   | /api/v1/gyms/:gymId/plans               | Admin   | Create plan          |
| GET    | /api/v1/gyms/:gymId/plans               | Auth    | List plans           |
| PUT    | /api/v1/gyms/:gymId/plans/:id           | Admin   | Update plan          |
| DELETE | /api/v1/gyms/:gymId/plans/:id           | Admin   | Deactivate plan      |

### Payments
| Method | Endpoint                                  | Access        | Description           |
| ------ | ----------------------------------------- | ------------- | --------------------- |
| POST   | /api/v1/gyms/:gymId/payments              | Staff, Admin  | Record payment        |
| GET    | /api/v1/gyms/:gymId/payments              | Admin         | List payments         |
| GET    | /api/v1/gyms/:gymId/payments/:id          | Admin         | Payment details       |
| POST   | /api/v1/gyms/:gymId/payments/create-order | Member        | Initiate online pay   |
| POST   | /api/v1/payments/webhook                  | Public        | Payment gateway hook  |

### Workout Plans
| Method | Endpoint                                    | Access           | Description           |
| ------ | ------------------------------------------- | ---------------- | --------------------- |
| POST   | /api/v1/gyms/:gymId/workouts                | Trainer          | Create workout plan   |
| GET    | /api/v1/gyms/:gymId/workouts                | Trainer, Admin   | List workout plans    |
| GET    | /api/v1/gyms/:gymId/workouts/:id            | Auth             | Get workout plan      |
| PUT    | /api/v1/gyms/:gymId/workouts/:id            | Trainer          | Update workout plan   |
| DELETE | /api/v1/gyms/:gymId/workouts/:id            | Trainer, Admin   | Delete workout plan   |
| GET    | /api/v1/me/workouts                         | Member           | My workout plans      |

### Diet Plans
| Method | Endpoint                                | Access           | Description        |
| ------ | --------------------------------------- | ---------------- | ------------------ |
| POST   | /api/v1/gyms/:gymId/diets              | Trainer          | Create diet plan   |
| GET    | /api/v1/gyms/:gymId/diets              | Trainer, Admin   | List diet plans    |
| GET    | /api/v1/me/diets                       | Member           | My diet plans      |
| PUT    | /api/v1/gyms/:gymId/diets/:id          | Trainer          | Update diet plan   |
| DELETE | /api/v1/gyms/:gymId/diets/:id          | Trainer, Admin   | Delete diet plan   |

### Classes & Bookings
| Method | Endpoint                                    | Access           | Description         |
| ------ | ------------------------------------------- | ---------------- | ------------------- |
| POST   | /api/v1/gyms/:gymId/classes                 | Admin, Trainer   | Create class        |
| GET    | /api/v1/gyms/:gymId/classes                 | Auth             | List classes        |
| POST   | /api/v1/gyms/:gymId/classes/:id/book        | Member           | Book class          |
| DELETE | /api/v1/gyms/:gymId/classes/:id/book        | Member           | Cancel booking      |
| GET    | /api/v1/me/bookings                         | Member           | My bookings         |

### Attendance
| Method | Endpoint                                    | Access         | Description         |
| ------ | ------------------------------------------- | -------------- | ------------------- |
| POST   | /api/v1/gyms/:gymId/attendance/check-in     | Staff, Member  | QR/manual check-in  |
| POST   | /api/v1/gyms/:gymId/attendance/check-out    | Staff, Member  | Check-out           |
| GET    | /api/v1/gyms/:gymId/attendance              | Staff, Admin   | Attendance log      |
| GET    | /api/v1/me/attendance                       | Member         | My attendance       |

### Analytics
| Method | Endpoint                                     | Access       | Description                 |
| ------ | -------------------------------------------- | ------------ | --------------------------- |
| GET    | /api/v1/analytics/platform                   | Super Admin  | Platform-wide stats         |
| GET    | /api/v1/gyms/:gymId/analytics/dashboard      | Admin        | Gym dashboard (KPIs)        |
| GET    | /api/v1/gyms/:gymId/analytics/revenue        | Admin        | Revenue breakdown           |
| GET    | /api/v1/gyms/:gymId/analytics/members        | Admin        | Member growth/churn         |
| GET    | /api/v1/me/analytics/progress                | Member       | Personal progress insights  |

### AI Features
| Method | Endpoint                                     | Access   | Description                    |
| ------ | -------------------------------------------- | -------- | ------------------------------ |
| POST   | /api/v1/ai/generate-workout                  | Member   | AI workout plan generation     |
| POST   | /api/v1/ai/generate-diet                     | Member   | AI diet plan generation        |
| POST   | /api/v1/ai/chat                              | Member   | Fitness chatbot                |
| POST   | /api/v1/ai/scan-food                         | Member   | Food image → nutrition data    |
| GET    | /api/v1/ai/progress-insights/:memberId       | Member   | AI progress analysis           |
| GET    | /api/v1/ai/churn-prediction/:gymId           | Admin    | Churn risk members list        |
| GET    | /api/v1/ai/crowd-prediction/:gymId           | Auth     | Peak hours prediction          |

### Notifications
| Method | Endpoint                      | Access | Description              |
| ------ | ----------------------------- | ------ | ------------------------ |
| GET    | /api/v1/me/notifications      | Auth   | List my notifications    |
| PUT    | /api/v1/me/notifications/:id  | Auth   | Mark as read             |

---

## Implementation Phases

### Phase 1 — Foundation (Week 1-2)
1. Project setup: TypeScript, Express, MongoDB connection, env config
2. Folder structure and utility helpers (apiResponse, apiError, asyncHandler)
3. User model with role field
4. Auth module: register, login, logout, refresh token, forgot/reset password
5. Auth middleware (JWT) + role-based access middleware
6. Validation middleware with Zod
7. Global error handler
8. Git repo + GitHub setup, Vercel deployment config

### Phase 2 — Core Gym Operations (Week 3-4)
1. Gym module: CRUD for gyms (super admin creates, gym admin manages)
2. Member module: registration, profile, listing, search, deactivation
3. MemberProfile module: fitness data, body metrics history
4. Trainer module: CRUD under a gym
5. Staff module: CRUD under a gym
6. Subscription plan module: create/update/list plans per gym
7. Member subscription module: assign plan to member, track active/expired

### Phase 3 — Fitness & Scheduling (Week 5-6)
1. Workout plan module: create, assign to members, list, templates
2. Diet plan module: create, assign, list
3. Class module: CRUD, schedule management
4. Class booking module: book, cancel, capacity enforcement
5. Attendance module: QR check-in/out, manual entry, attendance logs

### Phase 4 — Payments & Notifications (Week 7)
1. Payment gateway integration (Razorpay/Stripe)
2. Create order → verify payment → update subscription workflow
3. Webhook handler for async payment status
4. Invoice generation (PDF or link)
5. Notification module: in-app notifications
6. Push notification setup (Firebase Cloud Messaging)
7. Email notifications (Nodemailer) — welcome, payment receipt, reminders

### Phase 5 — AI Features (Week 8-9)
1. AI service layer: OpenAI API integration with prompt management
2. AI workout generator: takes member profile → returns personalized plan
3. AI diet generator: takes goals + preferences → returns meal plan
4. AI fitness chatbot: conversational fitness Q&A with chat history
5. AI food scanner: image upload → calorie/nutrition estimation
6. AI progress insights: analyze body metrics + workout history
7. AI churn prediction: flag at-risk members based on attendance/engagement
8. AI crowd prediction: predict peak hours from attendance data
9. Rate limiting on AI endpoints

### Phase 6 — Analytics & Polish (Week 10)
1. Platform analytics (super admin): total gyms, members, MRR
2. Gym dashboard analytics: member count, revenue, churn rate, attendance trends
3. Member progress dashboard: weight trends, workout consistency, BMI over time
4. API documentation with Swagger
5. Pagination, sorting, filtering across all list endpoints
6. Security hardening: rate limiting, helmet, input sanitization
7. Final testing, bug fixes, deployment optimization

---

## Key Architecture Decisions

### Multi-Tenancy
- **Approach:** Shared database, `gymId` field on every tenant-scoped document
- **Why:** Simpler to manage on MongoDB, sufficient for the scale described in the BRD
- **Enforcement:** Middleware automatically scopes queries to the user's gym

### Authentication Flow
- Access token (short-lived, 15min) in response body — client stores in memory
- Refresh token (7 days) in httpOnly cookie
- On access token expiry, client hits `/auth/refresh` to get new pair

### Role-Based Access Control
- Single `users` collection with `role` field
- `role.middleware.ts` accepts allowed roles per route: `authorize("admin", "trainer")`
- Gym-scoped routes verify user belongs to that gym

### API Versioning
- URL-based: `/api/v1/...`
- Allows future breaking changes without affecting existing clients

### AI Prompt Management
- Prompts stored as TypeScript template functions in `src/modules/ai/prompts/`
- Each prompt function takes member data and returns a structured prompt
- Responses parsed and validated before saving to DB

### Vercel Deployment
- `vercel.json` routes all requests to `api/index.ts`
- `api/index.ts` exports the Express app as a serverless function
- MongoDB Atlas for cloud database (connection pooling optimized for serverless)

---

## Environment Variables

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
OPENAI_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FIREBASE_SERVICE_ACCOUNT=
CLIENT_URL=http://localhost:3000
```

---

## Indexing Strategy (MongoDB)

| Collection          | Indexes                                      |
| ------------------- | -------------------------------------------- |
| users               | `{ email: 1 }` unique, `{ gymId: 1, role: 1 }` |
| gyms                | `{ ownerId: 1 }`, `{ isActive: 1 }`         |
| memberSubscriptions | `{ memberId: 1, status: 1 }`, `{ gymId: 1 }` |
| payments            | `{ gymId: 1, paidAt: -1 }`, `{ memberId: 1 }` |
| workoutPlans        | `{ gymId: 1, memberId: 1 }`                 |
| dietPlans           | `{ gymId: 1, memberId: 1 }`                 |
| classes             | `{ gymId: 1, isActive: 1 }`                 |
| classBookings       | `{ classId: 1, date: 1 }`, `{ memberId: 1 }` |
| attendance          | `{ gymId: 1, memberId: 1, checkIn: -1 }`    |
| notifications       | `{ userId: 1, isRead: 1, createdAt: -1 }`   |
