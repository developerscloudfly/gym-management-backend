# GYM Management Platform — API Reference

**Base URL:** `https://your-vercel-deployment.vercel.app/api/v1`
**Content-Type:** `application/json`
**Auth:** `Authorization: Bearer <accessToken>` on all protected routes

---

## Global Response Shape

Every endpoint returns:
```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": <object | array | null>,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

`meta` is only present on paginated list endpoints.

---

## Global Error Codes

| HTTP | Meaning |
|------|---------|
| 400 | Bad request / validation failed |
| 401 | Missing or invalid token |
| 403 | Insufficient role / not a member of this gym |
| 404 | Resource not found |
| 409 | Duplicate / conflict (e.g. email already exists) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

Validation error response includes a `details` array:
```json
{
  "success": false,
  "message": "Validation error",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

## Roles

| Role | Description | How created |
|------|-------------|-------------|
| `super_admin` | Platform owner — manages all gyms | Seed script (`npm run seed:superadmin`) |
| `gym_admin` | Gym owner — manages own gym | By `super_admin` via POST `/gyms` (auto-generated temp password, emailed) |
| `trainer` | Trainer — manages assigned members | By `gym_admin` via POST `/gyms/:gymId/trainers` |
| `staff` | Front desk — check-ins, member ops | By `gym_admin` via POST `/gyms/:gymId/staff` |
| `member` | Regular gym member | Self-registration via POST `/auth/register` or by `gym_admin`/`staff` |

---

## Rate Limits

| Limit | Scope |
|-------|-------|
| 100 req / 15 min | All API routes |
| 10 req / 15 min | Auth routes (login, register, forgot-password) |
| 20 req / hour | AI routes |

---

## Authentication (`/api/v1/auth`)

### POST `/auth/register`
Register a new **member** account. Only `member` role is allowed via public registration.
Gym admins are created by the `super_admin` when onboarding a gym (see [POST `/gyms`](#post-gyms--superadmin)).

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Secret123",
  "phone": "+911234567890"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | Yes | max 50 chars |
| `lastName` | string | Yes | max 50 chars |
| `email` | string | Yes | valid email |
| `password` | string | Yes | min 8, 1 uppercase, 1 lowercase, 1 number |
| `phone` | string | No | E.164 format e.g. `+91XXXXXXXXXX` |

> **Note:** `role` is always `member`. `gym_admin` registration is not allowed here.

**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id": "...", "firstName": "John", "email": "john@example.com", "role": "member" },
    "accessToken": "<jwt>"
  }
}
```
Refresh token is set as `httpOnly` cookie named `refreshToken`.

---

### POST `/auth/login`
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Secret123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "firstName": "John", "role": "member", "gymId": "..." },
    "accessToken": "<jwt>",
    "mustChangePassword": false
  }
}
```
Refresh token set as httpOnly cookie.

> **`mustChangePassword: true`** — Returned when the user was created with a temporary password (e.g. gym admins onboarded by super_admin). The frontend **must** redirect to the change-password screen. All API routes (except `/auth/change-password`, `/auth/logout`, `/auth/me`) are **blocked** until the password is changed.

---

### POST `/auth/change-password` 🔒
Change the current user's password. **Required** for users with a temporary password before they can access any other endpoint.

**Request Body:**
```json
{
  "currentPassword": "TempPass1a",
  "newPassword": "MyNewSecure123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `currentPassword` | string | Yes | The current (or temporary) password |
| `newPassword` | string | Yes | min 8, 1 uppercase, 1 lowercase, 1 number |

**Response 200:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### POST `/auth/refresh`
Exchange refresh token for a new access token.
Reads refresh token from `refreshToken` httpOnly cookie.

**Response 200:**
```json
{
  "data": { "accessToken": "<new_jwt>" }
}
```

---

### POST `/auth/forgot-password`
**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response 200:** Sends reset email. Returns generic success message.

---

### POST `/auth/reset-password`
**Request Body:**
```json
{
  "token": "<reset_token_from_email>",
  "password": "NewSecret123"
}
```

---

### POST `/auth/logout` 🔒
Clears refresh token cookie.

---

### GET `/auth/me` 🔒
Returns the currently authenticated user.

**Response 200:**
```json
{
  "data": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "member",
    "gymId": "...",
    "mustChangePassword": false
  }
}
```

---

## Gyms (`/api/v1/gyms`)

> All routes require `super_admin` except GET `/:id` (also allowed for `gym_admin`).

### POST `/gyms` 🔒 `super_admin`
Creates a new gym **and** its admin account in one call. A temporary password is auto-generated and emailed to the gym admin along with their login credentials.

**Request Body:**
```json
{
  "name": "FitZone",
  "description": "Premium gym",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  },
  "phone": "+912212345678",
  "email": "info@fitzone.com",
  "website": "https://fitzone.com",
  "settings": {
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "openingTime": "06:00",
    "closingTime": "22:00",
    "maxCapacity": 200
  },
  "owner": {
    "firstName": "Shahanawaz",
    "lastName": "Sayyed",
    "email": "admin@fitzone.com",
    "phone": "+919876543210"
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | max 100 chars |
| `address` | object | Yes | `street`, `city`, `state`, `zipCode`, `country` |
| `phone` | string | Yes | Gym contact number |
| `email` | string | Yes | Gym email |
| `website` | string | No | Valid URL |
| `settings` | object | No | Defaults: INR, Asia/Kolkata, 06:00–22:00, capacity 100 |
| `owner.firstName` | string | Yes | Gym admin's first name |
| `owner.lastName` | string | Yes | Gym admin's last name |
| `owner.email` | string | Yes | Gym admin's email — receives login credentials |
| `owner.phone` | string | No | E.164 format |

> **Password is NOT provided** — it is auto-generated and emailed to the admin. The admin must change it on first login (`mustChangePassword: true`).

**Response 201:**
```json
{
  "success": true,
  "message": "Gym and admin created successfully",
  "data": {
    "gym": { "_id": "...", "name": "FitZone", "ownerId": "...", "isActive": true },
    "owner": { "_id": "...", "firstName": "Shahanawaz", "lastName": "Sayyed", "email": "admin@fitzone.com" }
  }
}
```

**Email sent to gym admin:**
- Subject: "You're now the admin of FitZone — GymApp"
- Contains: login email, temporary password, login link
- Warning to change password on first login

---

### GET `/gyms` 🔒 `super_admin`
List all gyms with pagination.

**Query Params:** `page`, `limit`, `search`

---

### GET `/gyms/:id` 🔒 `super_admin | gym_admin`

---

### PUT `/gyms/:id` 🔒 `super_admin | gym_admin`
All fields optional (partial update).

---

### DELETE `/gyms/:id` 🔒 `super_admin`
Soft-deletes gym (`isActive: false`). Cascades to all gym users.

---

## Members (`/api/v1/gyms/:gymId/members`)

> Requires auth + must belong to gym (`gymId` in token must match URL `:gymId`).
> `super_admin` bypasses the gym-membership check.

### POST `/gyms/:gymId/members` 🔒 `gym_admin | staff`
Creates a user account + member profile in one call.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "Secret123",
  "phone": "+919876543210",
  "dateOfBirth": "1995-06-15",
  "gender": "female",
  "heightCm": 165,
  "weightKg": 60,
  "fitnessGoal": "weight_loss",
  "experienceLevel": "beginner"
}
```

| `fitnessGoal` values | `experienceLevel` values |
|---------------------|--------------------------|
| `weight_loss` | `beginner` |
| `muscle_gain` | `intermediate` |
| `endurance` | `advanced` |
| `flexibility` | |
| `general_fitness` | |
| `strength` | |
| `sports_performance` | |

---

### GET `/gyms/:gymId/members` 🔒 `gym_admin | staff | trainer`
**Query Params:** `page`, `limit`, `search`, `isActive`

---

### GET `/gyms/:gymId/members/:id` 🔒 `gym_admin | staff | trainer`

---

### PUT `/gyms/:gymId/members/:id` 🔒 `gym_admin | staff`
**Request Body (all optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+919876543210",
  "avatar": "https://..."
}
```

---

### DELETE `/gyms/:gymId/members/:id` 🔒 `gym_admin`
Soft-deactivates member.

---

## Member Self-Service (`/api/v1/me`)

> All routes require `member` role.

### GET `/me/profile` 🔒 `member`
Returns own user + full fitness profile.

**Response 200:**
```json
{
  "data": {
    "user": { "_id": "...", "firstName": "Jane", "email": "jane@example.com" },
    "profile": {
      "fitnessGoal": "weight_loss",
      "experienceLevel": "beginner",
      "heightCm": 165,
      "weightKg": 60,
      "bodyMetricsHistory": [...]
    }
  }
}
```

---

### PUT `/me/profile` 🔒 `member`
**Request Body (all optional):**
```json
{
  "dateOfBirth": "1995-06-15",
  "gender": "female",
  "heightCm": 165,
  "weightKg": 60,
  "fitnessGoal": "weight_loss",
  "experienceLevel": "beginner",
  "dietaryPreference": "vegetarian",
  "medicalConditions": ["asthma"],
  "injuries": ["knee_pain"],
  "emergencyContact": {
    "name": "John Smith",
    "phone": "+919876543210",
    "relation": "father"
  }
}
```

| `dietaryPreference` values |
|---------------------------|
| `none`, `vegetarian`, `vegan`, `keto`, `paleo`, `gluten_free`, `dairy_free` |

---

### POST `/me/body-metrics` 🔒 `member`
Add a body measurement snapshot.

**Request Body:**
```json
{
  "date": "2025-03-15",
  "weightKg": 72.5,
  "bodyFatPct": 18.5,
  "muscleMassKg": 35,
  "bmi": 23.4,
  "chest": 95,
  "waist": 80,
  "hips": 92,
  "biceps": 34,
  "thighs": 55,
  "notes": "Morning measurement"
}
```

---

## Trainers (`/api/v1/gyms/:gymId/trainers`)

> All routes: `gym_admin` only.

### POST `/gyms/:gymId/trainers` 🔒 `gym_admin`
**Request Body:**
```json
{
  "firstName": "Mike",
  "lastName": "Johnson",
  "email": "mike@fitzone.com",
  "password": "Trainer123",
  "phone": "+911234567890",
  "specialization": "Strength & Conditioning"
}
```

---

### GET `/gyms/:gymId/trainers` 🔒 `gym_admin`
**Query Params:** `page`, `limit`, `search`

---

### GET `/gyms/:gymId/trainers/:id` 🔒 `gym_admin`
Returns a single trainer by ID.

**Response 200:**
```json
{
  "success": true,
  "message": "Trainer fetched",
  "data": {
    "_id": "64abc...",
    "firstName": "Mike",
    "lastName": "Johnson",
    "email": "mike@fitzone.com",
    "phone": "+911234567890",
    "role": "trainer",
    "gymId": "64def...",
    "isActive": true
  }
}
```

---

### PUT `/gyms/:gymId/trainers/:id` 🔒 `gym_admin`
**Request Body (all optional):** `firstName`, `lastName`, `phone`, `avatar`

---

### DELETE `/gyms/:gymId/trainers/:id` 🔒 `gym_admin`
Soft-deactivates trainer.

---

## Staff (`/api/v1/gyms/:gymId/staff`)

Same CRUD as Trainers, same role restrictions.

### POST `/gyms/:gymId/staff` 🔒 `gym_admin`

### GET `/gyms/:gymId/staff` 🔒 `gym_admin`
**Query Params:** `page`, `limit`, `search`

### GET `/gyms/:gymId/staff/:id` 🔒 `gym_admin`
Returns a single staff member by ID. Same response shape as GET single trainer.

### PUT `/gyms/:gymId/staff/:id` 🔒 `gym_admin`

### DELETE `/gyms/:gymId/staff/:id` 🔒 `gym_admin`

---

## Subscription Plans (`/api/v1/gyms/:gymId/plans`)

### GET `/gyms/:gymId/plans` 🔒 All gym members
List active plans for the gym.

---

### POST `/gyms/:gymId/plans` 🔒 `gym_admin`
**Request Body:**
```json
{
  "name": "Monthly Elite",
  "description": "Full access",
  "durationInDays": 30,
  "price": 2499,
  "currency": "INR",
  "features": ["Gym access", "1 PT session", "Locker"],
  "maxFreeze": 5
}
```

---

### PUT `/gyms/:gymId/plans/:planId` 🔒 `gym_admin`
All fields optional.

---

### DELETE `/gyms/:gymId/plans/:planId` 🔒 `gym_admin`
Soft-deactivates plan.

---

## Member Subscriptions

### POST `/gyms/:gymId/subscriptions` 🔒 `gym_admin | staff`
Assign a plan to a member. Cancels any existing active subscription first.

**Request Body:**
```json
{
  "memberId": "64abc...",
  "planId": "64def...",
  "startDate": "2025-04-01",
  "autoRenew": false
}
```

---

### GET `/gyms/:gymId/members/:memberId/subscriptions` 🔒 `gym_admin | staff`
Lists subscription history for a member.

---

### PUT `/gyms/:gymId/subscriptions/:subscriptionId/cancel` 🔒 `gym_admin | staff`
**Request Body (optional):**
```json
{ "cancelReason": "Member requested cancellation" }
```

---

## Workout Plans (`/api/v1/gyms/:gymId/workout-plans`)

### POST `/gyms/:gymId/workout-plans` 🔒 `trainer | gym_admin`
**Request Body:**
```json
{
  "title": "6-Week Fat Loss",
  "description": "Progressive overload program",
  "goal": "weight_loss",
  "difficultyLevel": "intermediate",
  "durationWeeks": 6,
  "isTemplate": false,
  "memberId": "64abc...",
  "startDate": "2025-04-01",
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": "monday",
          "isRestDay": false,
          "focusArea": "Chest & Triceps",
          "exercises": [
            {
              "name": "Bench Press",
              "category": "strength",
              "sets": 4,
              "reps": "8-10",
              "weightKg": 60,
              "restSeconds": 90,
              "notes": "Control the descent",
              "orderIndex": 0
            }
          ]
        },
        {
          "day": "tuesday",
          "isRestDay": true,
          "exercises": []
        }
      ]
    }
  ]
}
```

| `goal` values | `difficultyLevel` | `day` values | `category` values |
|--------------|-------------------|--------------|-------------------|
| `weight_loss` | `beginner` | `monday` – `sunday` | `strength` |
| `muscle_gain` | `intermediate` | `rest` | `cardio` |
| `endurance` | `advanced` | | `flexibility` |
| `flexibility` | | | `balance` |
| `general_fitness` | | | |
| `strength` | | | |
| `sports_performance` | | | |

---

### GET `/gyms/:gymId/workout-plans` 🔒 `trainer | gym_admin`
**Query Params:** `page`, `limit`, `memberId`, `isTemplate`, `status`

---

### GET `/gyms/:gymId/workout-plans/:id` 🔒 All gym users

---

### PUT `/gyms/:gymId/workout-plans/:id` 🔒 `trainer | gym_admin`
All body fields optional.

---

### DELETE `/gyms/:gymId/workout-plans/:id` 🔒 `trainer | gym_admin`

---

### POST `/gyms/:gymId/workout-plans/:id/assign` 🔒 `trainer | gym_admin`
Assign a template plan to a member. Archives their current active plan.

**Request Body:**
```json
{
  "memberId": "64abc...",
  "startDate": "2025-04-01"
}
```

---

## Diet Plans (`/api/v1/gyms/:gymId/diet-plans`)

### POST `/gyms/:gymId/diet-plans` 🔒 `trainer | gym_admin`
**Request Body:**
```json
{
  "title": "2000kcal Cut",
  "description": "High protein deficit diet",
  "goal": "weight_loss",
  "dietaryPreference": "none",
  "dailyCalorieTarget": 2000,
  "dailyProteinG": 160,
  "dailyCarbsG": 180,
  "dailyFatG": 55,
  "waterLiters": 3,
  "isTemplate": false,
  "memberId": "64abc...",
  "startDate": "2025-04-01",
  "endDate": "2025-04-30",
  "meals": [
    {
      "mealType": "breakfast",
      "time": "08:00",
      "items": [
        {
          "name": "Oats",
          "quantity": "100g",
          "calories": 389,
          "proteinG": 17,
          "carbsG": 66,
          "fatG": 7,
          "fiberG": 10
        }
      ]
    }
  ]
}
```

| `mealType` values |
|------------------|
| `breakfast`, `morning_snack`, `lunch`, `evening_snack`, `dinner`, `pre_workout`, `post_workout` |

---

### GET `/gyms/:gymId/diet-plans` 🔒 `trainer | gym_admin`

---

### GET `/gyms/:gymId/diet-plans/:id` 🔒 All gym users

---

### PUT `/gyms/:gymId/diet-plans/:id` 🔒 `trainer | gym_admin`

---

### DELETE `/gyms/:gymId/diet-plans/:id` 🔒 `trainer | gym_admin`

---

### POST `/gyms/:gymId/diet-plans/:id/assign` 🔒 `trainer | gym_admin`
**Request Body:**
```json
{
  "memberId": "64abc...",
  "startDate": "2025-04-01",
  "endDate": "2025-04-30"
}
```

---

## Classes (`/api/v1/gyms/:gymId/classes`)

### GET `/gyms/:gymId/classes` 🔒 All gym users
**Query Params:** `page`, `limit`, `status`, `trainerId`, `date`

---

### GET `/gyms/:gymId/classes/:classId` 🔒 All gym users

---

### POST `/gyms/:gymId/classes` 🔒 `gym_admin | trainer`
**Request Body:**
```json
{
  "name": "HIIT Blast",
  "description": "High intensity interval training",
  "category": "Cardio",
  "trainerId": "64abc...",
  "startTime": "2025-04-01T07:00:00.000Z",
  "endTime": "2025-04-01T08:00:00.000Z",
  "capacity": 20,
  "location": "Studio A",
  "recurrence": "weekly"
}
```

| `recurrence` values | `status` values |
|--------------------|-----------------|
| `none` | `scheduled` |
| `daily` | `ongoing` |
| `weekly` | `completed` |
| | `cancelled` |

---

### PATCH `/gyms/:gymId/classes/:classId` 🔒 `gym_admin | trainer`
All fields optional. Can also update `status`.

---

### PATCH `/gyms/:gymId/classes/:classId/cancel` 🔒 `gym_admin | trainer`
Cancels the class.

---

### POST `/gyms/:gymId/classes/:classId/enroll` 🔒 All gym users
**Request Body:**
```json
{ "memberId": "64abc..." }
```

---

### DELETE `/gyms/:gymId/classes/:classId/enroll` 🔒 All gym users
Unenroll from a class.

---

## Attendance (`/api/v1/gyms/:gymId/attendance`)

### GET `/gyms/:gymId/attendance/my` 🔒 Member (own records)
**Query Params:** `page`, `limit`, `from`, `to`

---

### GET `/gyms/:gymId/attendance` 🔒 `gym_admin | staff`
**Query Params:** `page`, `limit`, `memberId`, `from`, `to`, `type`

---

### POST `/gyms/:gymId/attendance` 🔒 `gym_admin | staff | trainer`
Record a check-in.

**Request Body:**
```json
{
  "memberId": "64abc...",
  "type": "gym_checkin",
  "classId": null,
  "checkInTime": "2025-04-01T07:05:00.000Z",
  "status": "present",
  "notes": ""
}
```

| `type` | `status` |
|--------|---------|
| `gym_checkin` | `present` |
| `class` | `absent` |
| | `late` |

---

### PATCH `/gyms/:gymId/attendance/:attendanceId/checkout` 🔒 `gym_admin | staff | trainer`
**Request Body (optional):**
```json
{ "checkOutTime": "2025-04-01T09:00:00.000Z" }
```

---

### GET `/gyms/:gymId/attendance/member/:memberId` 🔒 `gym_admin | staff | trainer`

---

### GET `/gyms/:gymId/attendance/member/:memberId/summary` 🔒 `gym_admin | staff | trainer`
Returns streak and visit stats for a member.

**Response 200:**
```json
{
  "data": {
    "currentStreak": 5,
    "longestStreak": 14,
    "totalVisits": 87,
    "lastVisit": "2026-03-29T07:15:00.000Z"
  }
}
```

---

### POST `/gyms/:gymId/attendance/class/:classId` 🔒 `gym_admin | trainer`
Bulk mark attendance for a class.

**Request Body:**
```json
{
  "attendances": [
    { "memberId": "64abc...", "status": "present", "notes": "" },
    { "memberId": "64def...", "status": "absent" }
  ]
}
```

---

## Payments (`/api/v1/gyms/:gymId/payments`)

### POST `/gyms/:gymId/payments` 🔒 `gym_admin | staff`
Record an offline/manual payment (cash, card, UPI).

**Request Body:**
```json
{
  "memberId": "64abc...",
  "subscriptionId": "64def...",
  "amount": 2499,
  "currency": "INR",
  "method": "cash",
  "notes": "April subscription",
  "paidAt": "2025-04-01T10:00:00.000Z"
}
```

| `method` values |
|----------------|
| `cash`, `card`, `upi`, `bank_transfer` |

---

### GET `/gyms/:gymId/payments` 🔒 `gym_admin | staff`
**Query Params:** `page`, `limit`, `memberId`, `from`, `to`, `method`

---

### GET `/gyms/:gymId/payments/:paymentId` 🔒 `gym_admin | staff`

---

### POST `/gyms/:gymId/payments/create-order` 🔒 `member`
Initiate a Razorpay payment order.

**Request Body:**
```json
{
  "subscriptionId": "64abc...",
  "currency": "INR"
}
```

**Response 201:**
```json
{
  "data": {
    "orderId": "order_...",
    "amount": 249900,
    "currency": "INR",
    "keyId": "rzp_..."
  }
}
```
> Use `orderId` and `keyId` to open the Razorpay checkout widget in the frontend.

---

### POST `/gyms/:gymId/payments/verify` 🔒 `member`
Verify Razorpay payment after checkout widget callback.

**Request Body:**
```json
{
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "..."
}
```

---

### POST `/api/v1/payments/webhook`
Razorpay webhook (no auth). Verifies HMAC signature from `X-Razorpay-Signature` header.

---

## Notifications (`/api/v1/me/notifications`)

### GET `/me/notifications` 🔒 All authenticated users
**Query Params:** `page`, `limit`, `isRead`

---

### GET `/me/notifications/unread-count` 🔒 All authenticated users
**Response:** `{ "data": { "count": 3 } }`

---

### PATCH `/me/notifications/read-all` 🔒 All authenticated users

---

### PATCH `/me/notifications/:notificationId/read` 🔒 All authenticated users

---

### DELETE `/me/notifications/:notificationId` 🔒 All authenticated users

---

## AI Features

> All AI routes are rate-limited to **20 req / hour**.
> Requires `OPENAI_API_KEY` env var to be set.

### POST `/gyms/:gymId/ai/generate-workout` 🔒 `gym_admin | trainer`
Generate a personalized workout plan for a member using their fitness profile.

**Request Body:**
```json
{
  "memberId": "64abc...",
  "durationWeeks": 4,
  "daysPerWeek": 3,
  "additionalNotes": "Focus on lower body, avoid running due to knee issue"
}
```

**Response:** Returns a complete workout plan object (same shape as creating a workout plan manually).

---

### POST `/gyms/:gymId/ai/generate-diet` 🔒 `gym_admin | trainer`
Generate a personalized diet plan for a member.

**Request Body:**
```json
{
  "memberId": "64abc...",
  "targetCalories": 2200,
  "additionalNotes": "Member is lactose intolerant"
}
```

**Response:** Returns a complete diet plan object.

---

### GET `/gyms/:gymId/ai/churn-prediction` 🔒 `gym_admin`
Predicts which members are at risk of churning based on attendance patterns.

**Response:**
```json
{
  "data": {
    "atRiskMembers": [
      { "memberId": "...", "name": "Jane Doe", "riskScore": 0.87, "reason": "No check-in in 14 days" }
    ]
  }
}
```

---

### GET `/gyms/:gymId/ai/crowd-prediction` 🔒 `gym_admin | trainer | staff`
Predicts peak hours for the next 7 days based on historical attendance.

---

### GET `/gyms/:gymId/ai/progress/:memberId` 🔒 `gym_admin | trainer`
AI-generated insights about a member's fitness journey.

---

### POST `/ai/chat` 🔒 All authenticated users
Send a message to the AI fitness chatbot. Maintains conversation history per user.

**Request Body:**
```json
{
  "message": "What should I eat after a heavy leg day?",
  "gymId": "64abc..."
}
```

**Response:**
```json
{
  "data": { "reply": "After a heavy leg day, prioritize..." }
}
```

---

### GET `/ai/chat/history` 🔒 All authenticated users
Retrieve chat history with the AI chatbot.

---

### DELETE `/ai/chat/history` 🔒 All authenticated users
Clear all chat history.

---

### POST `/ai/scan-food` 🔒 All authenticated users
Scan a food image to get nutritional breakdown (requires `OPENAI_API_KEY`).

**Request Body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "data": {
    "items": [
      { "name": "Rice", "estimatedCalories": 206, "proteinG": 4.3, "carbsG": 44.5, "fatG": 0.4 }
    ],
    "totalCalories": 550
  }
}
```

---

### GET `/ai/progress-insights` 🔒 `member`
AI-generated insights about the logged-in member's own progress.

---

## Analytics

### GET `/analytics/super-admin/dashboard` 🔒 `super_admin`
Platform-wide dashboard with KPIs, gym-level insights, revenue, and activity feed.

**Response:**
```json
{
  "data": {
    "kpis": {
      "totalGyms": 48,
      "activeGyms": 45,
      "totalMembers": 12450,
      "mrr": 125000.00,
      "churnRate": 3.2,
      "aiUsageCount": 0
    },
    "expiringSubscriptions": [
      { "gymId": "...", "gymName": "FitZone", "label": "5 member subscriptions expiring within 7 days", "severity": "medium", "value": "5" }
    ],
    "failedPayments": [
      { "gymId": "...", "gymName": "PowerHouse", "label": "₹25000 failed", "severity": "high", "value": "25000" }
    ],
    "highChurnGyms": [
      { "gymId": "...", "gymName": "EasyFit", "label": "12.5% churn rate", "severity": "high", "value": "12.5" }
    ],
    "rapidGrowthGyms": [
      { "gymId": "...", "gymName": "FitZone", "label": "+32 new members this month", "severity": "low", "value": "32" }
    ],
    "recentActivity": [
      { "id": "...", "type": "gym_registered", "description": "New gym 'FitZone' registered", "timestamp": "2026-03-26T09:30:00.000Z", "gymName": "FitZone", "amount": null },
      { "id": "...", "type": "payment_received", "description": "Subscription payment received from PowerHouse", "timestamp": "2026-03-26T08:00:00.000Z", "gymName": "PowerHouse", "amount": 15000 }
    ],
    "revenueByGym": [
      { "gymId": "...", "gymName": "FitZone", "revenue": 48500, "memberCount": 320, "growth": 0 }
    ],
    "monthlyRevenue": [
      { "month": "Jan 2026", "revenue": 98000, "gyms": 45 }
    ],
    "paymentStats": { "successful": 1240, "failed": 38, "pending": 15, "successRate": 96.9 },
    "aiInsights": [],
    "systemStats": { "apiResponseTime": 0, "activeUsers": 0, "errorRate": 0, "uptime": 99.9 }
  }
}
```

`recentActivity.type` values: `gym_registered` | `subscription_renewal` | `payment_received` | `gym_deactivated`

> **Backward compatible alias:** `GET /analytics/platform` still works (returns legacy shape).

---

### GET `/gyms/:gymId/analytics/gym-admin-dashboard` 🔒 `gym_admin | super_admin`
Full gym dashboard — KPIs, action items, today's activity, revenue stats, classes, and trainer stats.

**Response:**
```json
{
  "data": {
    "kpis": {
      "activeMembers": 320,
      "todayCheckIns": 45,
      "dailyRevenue": 8500,
      "monthlyRevenue": 185000,
      "activeSubscriptions": 298,
      "classesToday": 8
    },
    "expiringMemberships": [
      { "memberId": "...", "memberName": "Jane Smith", "email": "jane@example.com", "detail": "Expires in 2 days", "daysLeft": 2, "avatarInitials": "JS" }
    ],
    "failedPayments": [
      { "memberId": "...", "memberName": "Bob Wilson", "email": "bob@example.com", "detail": "₹2500 payment failed" }
    ],
    "inactiveMembers": [
      { "memberId": "...", "memberName": "Alice Johnson", "email": "alice@example.com", "detail": "No check-in for 14+ days" }
    ],
    "overloadedTrainers": [
      { "memberId": "...", "memberName": "Alex Brown", "email": "", "detail": "16/15 members (over capacity)" }
    ],
    "todayActivity": [
      { "_id": "...", "type": "check_in", "memberName": "Jane Smith", "message": "Jane Smith checked in", "timestamp": "2026-03-30T07:05:00.000Z" },
      { "_id": "...", "type": "payment_received", "memberName": "Bob Wilson", "message": "Monthly fee paid by Bob Wilson", "timestamp": "2026-03-30T08:00:00.000Z" }
    ],
    "memberInsights": [
      { "memberId": "...", "memberName": "Alice Johnson", "type": "churn_risk", "insight": "No gym visit in 14+ days. High churn probability.", "severity": "high", "lastSeen": null }
    ],
    "revenueStats": {
      "today": 8500,
      "pendingPayments": 5,
      "failedTransactions": 3,
      "weeklyRevenue": [
        { "day": "Mon", "revenue": 12000 },
        { "day": "Tue", "revenue": 9500 }
      ],
      "pendingList": [
        { "memberId": "...", "memberName": "Bob Wilson", "amount": 2500, "dueDate": "2026-03-15T00:00:00.000Z" }
      ]
    },
    "todayClasses": [
      { "classId": "...", "name": "Morning Yoga", "trainerName": "Sarah Lee", "startTime": "2026-03-30T07:00:00.000Z", "endTime": "2026-03-30T08:00:00.000Z", "enrolled": 12, "capacity": 15, "status": "ongoing", "location": "Studio A" }
    ],
    "trainerStats": [
      { "trainerId": "...", "trainerName": "Alex Brown", "sessionsCompleted": 48, "activeMembers": 12, "rating": 0, "avatarInitials": "AB", "workloadStatus": "normal" }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `todayActivity.type` | `check_in` \| `payment_received` |
| `memberInsights.type` | `churn_risk` \| `attendance_drop` \| `top_active` |
| `trainerStats.workloadStatus` | `normal` \| `high` \| `overloaded` |
| `todayClasses.status` | `upcoming` \| `ongoing` \| `completed` \| `cancelled` |

> **Backward compatible alias:** `GET /gyms/:gymId/analytics/dashboard` still works.

---

### GET `/gyms/:gymId/analytics/trainer-dashboard/:trainerId` 🔒 `trainer | gym_admin | super_admin`
Trainer's personal dashboard — assigned members, today's schedule, missed workouts, and member progress.

**Response:**
```json
{
  "data": {
    "kpis": {
      "assignedMembers": 12,
      "sessionsToday": 5,
      "completedSessions": 3,
      "pendingAssignments": 4
    },
    "missedWorkouts": [
      { "memberId": "...", "memberName": "Tom Hardy", "detail": "Missed workouts this week" }
    ],
    "pendingSessions": [
      { "memberId": "...", "memberName": "Morning Yoga", "detail": "Session not started – overdue" }
    ],
    "unassignedPlans": [
      { "memberId": "...", "memberName": "Raj Patel", "detail": "No workout plan assigned" }
    ],
    "todaySchedule": [
      { "sessionId": "...", "memberName": "Morning Yoga", "time": "2026-03-30T09:00:00.000Z", "endTime": "2026-03-30T10:00:00.000Z", "type": "general", "status": "completed", "location": "Studio A" }
    ],
    "myMembers": [
      { "memberId": "...", "memberName": "Jane Smith", "progressStatus": "on_track", "lastActivity": "2026-03-29T09:00:00.000Z", "goal": "weight_loss", "workoutPlanAssigned": true, "dietPlanAssigned": false, "attendanceRate": 0.85 }
    ],
    "memberProgress": [
      { "memberId": "...", "memberName": "Jane Smith", "weightChange": 0, "strengthImprovement": 0, "attendanceRate": 0.85, "weeklyAttendance": [{ "week": "Last 30d", "sessions": 17 }] }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `todaySchedule.status` | `completed` \| `upcoming` \| `ongoing` \| `missed` |
| `myMembers.progressStatus` | `on_track` \| `needs_attention` \| `excellent` |
| `myMembers.attendanceRate` | `0.0`–`1.0` (fraction of expected sessions attended in last 30d) |

> **Note:** `assignedMembers` = unique members with an active workout plan assigned by this trainer. `todaySchedule` is derived from GymClass records, not 1-on-1 personal training sessions.

---

### GET `/gyms/:gymId/analytics/staff-dashboard` 🔒 `staff | gym_admin | super_admin`
Front-desk dashboard — today's check-ins, alerts, available classes, and pending payments.

**Response:**
```json
{
  "data": {
    "kpis": {
      "todayCheckIns": 45,
      "newMembersToday": 3,
      "activeMembersPresent": 28,
      "pendingPaymentsCount": 12
    },
    "alerts": [
      { "memberId": "...", "memberName": "Jane Smith", "alertType": "expired_membership", "detail": "Membership expires in 1 day", "daysOverdue": 0 },
      { "memberId": "...", "memberName": "Bob Wilson", "alertType": "payment_pending", "detail": "Overdue payment of ₹2500", "daysOverdue": 5 }
    ],
    "recentCheckIns": [
      { "memberId": "...", "memberName": "Jane Smith", "membershipStatus": "active", "checkedInAt": "2026-03-30T09:15:00.000Z", "planName": "Monthly Premium" }
    ],
    "availableClasses": [
      { "classId": "...", "name": "Morning Yoga", "trainerName": "Sarah Lee", "time": "2026-03-30T10:00:00.000Z", "availableSlots": 3, "totalCapacity": 15 }
    ],
    "pendingPayments": [
      { "paymentId": "...", "memberName": "Bob Wilson", "amount": 2500, "planName": "Monthly Premium", "dueDate": "2026-03-25T00:00:00.000Z", "status": "overdue" }
    ],
    "activityFeed": [
      { "_id": "...", "type": "check_in", "memberName": "Jane Smith", "message": "Jane Smith checked in", "timestamp": "2026-03-30T09:15:00.000Z" },
      { "_id": "...", "type": "registration", "memberName": "Raj Patel", "message": "Raj Patel joined as new member", "timestamp": "2026-03-30T09:00:00.000Z" }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `alerts.alertType` | `expired_membership` \| `payment_pending` |
| `recentCheckIns.membershipStatus` | `active` \| `expired` \| `expiring_soon` (≤7 days) \| `cancelled` \| `frozen` |
| `activityFeed.type` | `check_in` \| `registration` |
| `pendingPayments.status` | `pending` \| `overdue` |

---

### GET `/gyms/:gymId/analytics/revenue` 🔒 `gym_admin`

**Query Params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | ISO date string | 3 months ago | Start of period |
| `to` | ISO date string | today | End of period |
| `groupBy` | `day` \| `month` | `month` | Grouping granularity |

**Response:**
```json
{
  "data": {
    "summary": {
      "totalRevenue": 325000,
      "avgMonthlyRevenue": 108333,
      "growth": 12.5
    },
    "chart": [
      { "label": "Jan 2026", "revenue": 98000 },
      { "label": "Feb 2026", "revenue": 112000 },
      { "label": "Mar 2026", "revenue": 115000 }
    ]
  }
}
```

> `chart[].label` format: `"MMM YYYY"` when `groupBy=month`, `"YYYY-MM-DD"` when `groupBy=day`.
> `growth` is percentage change vs. the equivalent prior period.

---

### GET `/gyms/:gymId/analytics/members` 🔒 `gym_admin`

**Query Params:** `from` (ISO date, default 3 months ago), `to` (ISO date, default today)

**Response:**
```json
{
  "data": {
    "totalMembers": 320,
    "activeMembers": 298,
    "newMembersThisMonth": 32,
    "churnRate": 3.2,
    "attendanceByDay": [
      { "day": "Sun", "count": 40 },
      { "day": "Mon", "count": 85 },
      { "day": "Tue", "count": 72 },
      { "day": "Wed", "count": 78 },
      { "day": "Thu", "count": 68 },
      { "day": "Fri", "count": 90 },
      { "day": "Sat", "count": 110 }
    ],
    "membershipDistribution": [
      { "planName": "Monthly Premium", "count": 180 },
      { "planName": "Quarterly", "count": 95 },
      { "planName": "Annual", "count": 45 }
    ]
  }
}
```

---

### GET `/analytics/platform` 🔒 `super_admin`
Legacy endpoint. Returns raw totals (totalGyms, activeGyms, totalMembers, mrr, gymGrowth).
Use `GET /analytics/super-admin/dashboard` for the full dashboard shape.

---

### GET `/me/analytics/dashboard` 🔒 Any authenticated user (auto-scoped to logged-in member)
Member's personal dashboard — subscription status, attendance streak, upcoming classes, active plans, and recent activity. No `gymId` needed — scoped from the auth token.

**Response:**
```json
{
  "data": {
    "subscription": {
      "planName": "Monthly Premium",
      "status": "active",
      "startDate": "2026-03-01T00:00:00.000Z",
      "endDate": "2026-03-31T00:00:00.000Z",
      "daysLeft": 1,
      "autoRenew": false
    },
    "attendance": {
      "totalCheckIns": 87,
      "thisMonthCheckIns": 18,
      "currentStreak": 5,
      "longestStreak": 14,
      "weeklyAttendance": [
        { "day": "Sun", "count": 1 },
        { "day": "Mon", "count": 4 },
        { "day": "Tue", "count": 3 },
        { "day": "Wed", "count": 4 },
        { "day": "Thu", "count": 3 },
        { "day": "Fri", "count": 4 },
        { "day": "Sat", "count": 2 }
      ]
    },
    "upcomingClasses": [
      { "classId": "...", "name": "HIIT Blast", "trainerName": "Mike Johnson", "startTime": "2026-03-31T07:00:00.000Z", "endTime": "2026-03-31T08:00:00.000Z", "location": "Studio A", "status": "scheduled" }
    ],
    "workoutPlan": { "planId": "...", "title": "6-Week Fat Loss", "status": "active", "startDate": "2026-03-01T00:00:00.000Z" },
    "dietPlan": { "planId": "...", "title": "2000kcal Cut", "status": "active", "startDate": "2026-03-01T00:00:00.000Z" },
    "recentActivity": [
      { "_id": "...", "type": "check_in", "message": "You checked in at the gym", "timestamp": "2026-03-30T07:05:00.000Z" },
      { "_id": "...", "type": "payment", "message": "Payment of ₹2499 completed", "timestamp": "2026-03-01T10:00:00.000Z" }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `subscription` | `null` if no active subscription |
| `workoutPlan` / `dietPlan` | `null` if none assigned |
| `recentActivity.type` | `check_in` \| `payment` |
| `attendance.weeklyAttendance` | Check-ins per day of week over the last 30 days |

---

### GET `/me/analytics/progress` 🔒 `member`
Member's personal progress analytics: weight trend, workout consistency, BMI change over time.

**Response:**
```json
{
  "data": {
    "bodyMetrics": [
      { "date": "...", "weightKg": 72, "bmi": 23.4, "bodyFatPct": 18 }
    ],
    "workoutPlans": [
      { "_id": "...", "title": "6-Week Fat Loss", "status": "active", "createdAt": "...", "isAiGenerated": false }
    ],
    "attendance": {
      "weeklyBreakdown": [{ "_id": { "week": 12, "year": 2026 }, "visits": 4 }],
      "totalLast90Days": 48,
      "avgVisitsPerWeek": 3.7
    },
    "subscriptionHistory": []
  }
}
```

---

## Pagination

All list endpoints support:

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Items per page (max 100) |

---

## Authentication Flow (Frontend)

```
1. POST /auth/login → receive { accessToken, mustChangePassword } + refreshToken cookie
2. If mustChangePassword === true → redirect to change-password screen
   2a. POST /auth/change-password with { currentPassword, newPassword }
   2b. On success → proceed to dashboard
3. Store accessToken in memory (NOT localStorage)
4. Add header to every request: Authorization: Bearer <accessToken>
5. On 401 → POST /auth/refresh → get new accessToken → retry original request
6. On 403 with "must change your temporary password" → redirect to change-password screen
7. On logout → POST /auth/logout (clears cookie)
```

### Gym Admin Onboarding Flow

```
1. Super admin creates gym via POST /gyms with owner details
2. Backend auto-generates a temporary password
3. Backend sends invite email to gym admin with credentials
4. Gym admin logs in → receives mustChangePassword: true
5. Gym admin calls POST /auth/change-password
6. Gym admin can now access all gym management features
```

---

## Razorpay Payment Flow (Frontend)

```
1. POST /gyms/:gymId/payments/create-order → { orderId, amount, currency, keyId }
2. Open Razorpay checkout widget with keyId + orderId
3. On payment success, Razorpay calls your handler with:
   { razorpayOrderId, razorpayPaymentId, razorpaySignature }
4. POST /gyms/:gymId/payments/verify with those 3 values
5. On success → subscription is activated
```

---

## Known Gaps / Not Yet Implemented

| Gap | Notes |
|-----|-------|
| File/image upload (avatar, food scanner) | Currently accepts `base64` strings. If you need multipart form upload, the backend needs a Multer + Cloudinary endpoint. |
| Email templates | Backend sends reset-password emails. HTML templates are plain text — can be improved. |
| Real-time notifications | Backend stores notifications in DB. For real-time delivery, a WebSocket or SSE endpoint needs to be added. |
| Push notifications (mobile) | Firebase FCM integration is listed in the plan but not yet implemented. |
| Subscription auto-renewal | `autoRenew` flag is stored but the cron job to auto-renew expired subscriptions is not implemented. |
| Workout log / exercise completion | Members cannot currently mark individual exercises as done. A workout session log model needs to be added. |
| Class waitlist | When `enrolledCount >= capacity`, the API rejects enrollment. A waitlist feature is not yet built. |
| Social login (Google, etc.) | Not implemented. |
| Multi-currency billing | Only INR is fully tested. |
| Trainer/staff invite flow | Trainers/staff are created via API — no email invite link yet. |
| AI usage tracking | `aiUsageCount` in super admin dashboard KPIs is always `0` — no AI usage model exists yet. |
| Trainer 1-on-1 sessions | `todaySchedule` in the trainer dashboard is derived from GymClass records, not personal training sessions. A dedicated session model would be needed for that. |
| Member dashboard class_booking activity | `recentActivity` in member dashboard only includes `check_in` and `payment` types. Class booking events are not yet tracked as activity records. |
