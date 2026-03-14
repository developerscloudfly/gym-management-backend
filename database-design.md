# Database Design — AI-Powered Gym Management Platform

## Database: MongoDB (MongoDB Atlas)
## ODM: Mongoose with TypeScript

---

## Audit Fields (Applied to All Collections)

Every collection includes the following audit fields for traceability:

| Field      | Type     | Required | Default | Description                                    |
| ---------- | -------- | -------- | ------- | ---------------------------------------------- |
| createdBy  | ObjectId | yes      |         | Ref → users. Who created this record           |
| updatedBy  | ObjectId | yes      |         | Ref → users. Who last modified this record     |
| createdAt  | Date     | auto     |         | Mongoose timestamps                            |
| updatedAt  | Date     | auto     |         | Mongoose timestamps                            |

**How it works:**
- `createdBy` is set once at creation time from `req.user._id` (the authenticated user)
- `updatedBy` is set on every update from `req.user._id`
- For system-generated records (cron jobs, webhooks), use a dedicated "system" user ObjectId
- For self-registration (auth/register), `createdBy` = the newly created user's own `_id` (set in post-save hook)
- These fields are auto-populated via a Mongoose plugin applied globally, so individual schemas don't need to repeat them

**Mongoose Plugin (applied once in db.ts):**
```typescript
// Every schema gets createdBy + updatedBy automatically
const auditPlugin = (schema: Schema) => {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  });
};
mongoose.plugin(auditPlugin);
```

> **Note:** In the collection tables below, `createdBy`, `updatedBy`, `createdAt`, and `updatedAt` are omitted to avoid repetition — they exist on **every** collection as described above.

---

## Relationships Overview

```
Super Admin (user)
  └── manages many → Gyms

Gym
  ├── has one → Gym Admin (user)
  ├── has many → Trainers (user)
  ├── has many → Staff (user)
  ├── has many → Members (user)
  │     ├── has one → MemberProfile
  │     ├── has many → MemberSubscriptions → links to SubscriptionPlan
  │     ├── has many → Payments
  │     ├── has many → ClassBookings → links to Class
  │     ├── has many → Attendance records
  │     ├── has many → WorkoutPlans (assigned by trainer or AI)
  │     ├── has many → DietPlans (assigned by trainer or AI)
  │     ├── has many → AiChatHistory
  │     └── has many → Notifications
  ├── has many → SubscriptionPlans
  ├── has many → Classes → taught by Trainer
  └── has many → Notifications
```

---

## Collection 1: users

Central collection for all roles. Role determines permissions.

| Field         | Type       | Required | Default   | Description                              |
| ------------- | ---------- | -------- | --------- | ---------------------------------------- |
| _id           | ObjectId   | auto     |           | Primary key                              |
| firstName     | String     | yes      |           | First name                               |
| lastName      | String     | yes      |           | Last name                                |
| email         | String     | yes      |           | Unique, lowercase, trimmed               |
| password      | String     | yes      |           | Bcrypt hashed (min 8 chars raw)          |
| phone         | String     | no       |           | With country code e.g. "+91XXXXXXXXXX"   |
| role          | String     | yes      |           | Enum: see below                          |
| gymId         | ObjectId   | no       | null      | Ref → gyms. null for super_admin         |
| avatar        | String     | no       | ""        | Cloudinary URL                           |
| isActive      | Boolean    | yes      | true      | Soft delete flag                         |
| isEmailVerified | Boolean  | yes      | false     | Email verification status                |
| refreshToken  | String     | no       | null      | Hashed refresh token                     |
| passwordResetToken | String | no     | null      | Hashed reset token                       |
| passwordResetExpiry | Date  | no     | null      | Reset token expiration                   |
| lastLogin     | Date       | no       | null      | Last successful login timestamp          |
| fcmToken      | String     | no       | null      | Firebase push notification token         |

**Role Enum Values:**
- `super_admin` — Platform owner, no gymId
- `gym_admin` — Owns/manages a single gym
- `trainer` — Assigned to a gym
- `staff` — Assigned to a gym
- `member` — Assigned to a gym

**Indexes:**
| Index                    | Type     | Purpose                          |
| ------------------------ | -------- | -------------------------------- |
| `{ email: 1 }`          | Unique   | Login lookup, duplicate prevention |
| `{ gymId: 1, role: 1 }` | Compound | List users by gym and role       |
| `{ role: 1 }`           | Single   | Filter by role (super admin queries) |
| `{ isActive: 1 }`       | Single   | Filter active/inactive users     |

**Pre-save Hooks:**
- Hash password with bcrypt (saltRounds: 10) if password field is modified
- Lowercase email

**Instance Methods:**
- `comparePassword(candidatePassword): Promise<boolean>`
- `generateAccessToken(): string`
- `generateRefreshToken(): string`

---

## Collection 2: gyms

Each gym is a tenant on the platform.

| Field         | Type       | Required | Default   | Description                          |
| ------------- | ---------- | -------- | --------- | ------------------------------------ |
| _id           | ObjectId   | auto     |           | Primary key                          |
| name          | String     | yes      |           | Gym name                             |
| slug          | String     | yes      |           | URL-friendly unique identifier       |
| description   | String     | no       | ""        | Gym description                      |
| logo          | String     | no       | ""        | Cloudinary URL                       |
| coverImage    | String     | no       | ""        | Cloudinary URL                       |
| ownerId       | ObjectId   | yes      |           | Ref → users (gym_admin)              |
| address       | Object     | yes      |           | See sub-schema below                 |
| phone         | String     | yes      |           | Gym contact number                   |
| email         | String     | yes      |           | Gym contact email                    |
| website       | String     | no       | ""        | Gym website URL                      |
| settings      | Object     | no       |           | See sub-schema below                 |
| isActive      | Boolean    | yes      | true      | Soft delete / deactivation flag      |

**address sub-schema:**
| Field    | Type   | Required | Description        |
| -------- | ------ | -------- | ------------------ |
| street   | String | yes      | Street address     |
| city     | String | yes      | City               |
| state    | String | yes      | State/Province     |
| zipCode  | String | yes      | Postal/ZIP code    |
| country  | String | yes      | Country            |

**settings sub-schema:**
| Field        | Type   | Required | Default   | Description               |
| ------------ | ------ | -------- | --------- | ------------------------- |
| currency     | String | no       | "INR"     | ISO 4217 currency code    |
| timezone     | String | no       | "Asia/Kolkata" | IANA timezone        |
| openingTime  | String | no       | "06:00"   | HH:mm format              |
| closingTime  | String | no       | "22:00"   | HH:mm format              |
| maxCapacity  | Number | no       | 100       | Total gym member capacity |

**Indexes:**
| Index               | Type   | Purpose                       |
| ------------------- | ------ | ----------------------------- |
| `{ slug: 1 }`       | Unique | URL-safe lookup               |
| `{ ownerId: 1 }`    | Single | Find gyms by owner            |
| `{ isActive: 1 }`   | Single | Filter active gyms            |

---

## Collection 3: memberProfiles

Extended fitness data for members. One-to-one with a user of role "member".

| Field               | Type       | Required | Default     | Description                           |
| ------------------- | ---------- | -------- | ----------- | ------------------------------------- |
| _id                 | ObjectId   | auto     |             | Primary key                           |
| userId              | ObjectId   | yes      |             | Ref → users (unique per user)         |
| gymId               | ObjectId   | yes      |             | Ref → gyms                            |
| dateOfBirth         | Date       | no       | null        |                                       |
| gender              | String     | no       | null        | Enum: "male", "female", "other"       |
| heightCm            | Number     | no       | null        | Height in centimeters                 |
| weightKg            | Number     | no       | null        | Current weight in kg                  |
| fitnessGoal         | String     | no       | "general"   | Enum: see below                       |
| experienceLevel     | String     | no       | "beginner"  | Enum: see below                       |
| dietaryPreference   | String     | no       | "none"      | Enum: see below                       |
| medicalConditions   | [String]   | no       | []          | Free text list                        |
| injuries            | [String]   | no       | []          | Current injuries to avoid exercises   |
| emergencyContact    | Object     | no       | null        | See sub-schema below                  |
| bodyMetricsHistory  | [Object]   | no       | []          | See sub-schema below                  |

**fitnessGoal Enum:**
`"weight_loss"`, `"muscle_gain"`, `"endurance"`, `"flexibility"`, `"general_fitness"`, `"strength"`, `"sports_performance"`

**experienceLevel Enum:**
`"beginner"`, `"intermediate"`, `"advanced"`

**dietaryPreference Enum:**
`"none"`, `"vegetarian"`, `"vegan"`, `"keto"`, `"paleo"`, `"gluten_free"`, `"dairy_free"`

**emergencyContact sub-schema:**
| Field    | Type   | Required | Description          |
| -------- | ------ | -------- | -------------------- |
| name     | String | yes      | Contact person name  |
| phone    | String | yes      | Contact phone        |
| relation | String | yes      | Relation to member   |

**bodyMetricsHistory sub-schema (array of snapshots):**
| Field       | Type   | Required | Description                     |
| ----------- | ------ | -------- | ------------------------------- |
| date        | Date   | yes      | Measurement date                |
| weightKg    | Number | yes      | Weight at time of measurement   |
| bodyFatPct  | Number | no       | Body fat percentage             |
| muscleMassKg| Number | no       | Muscle mass in kg               |
| bmi         | Number | no       | Auto-calculated or entered      |
| chest       | Number | no       | Chest measurement in cm         |
| waist       | Number | no       | Waist measurement in cm         |
| hips        | Number | no       | Hip measurement in cm           |
| biceps      | Number | no       | Biceps measurement in cm        |
| thighs      | Number | no       | Thigh measurement in cm         |
| notes       | String | no       | Optional notes from trainer     |

**Indexes:**
| Index                  | Type   | Purpose                           |
| ---------------------- | ------ | --------------------------------- |
| `{ userId: 1 }`        | Unique | One profile per user              |
| `{ gymId: 1 }`         | Single | List all profiles in a gym        |

---

## Collection 4: subscriptionPlans

Plan templates created by gym admins.

| Field          | Type       | Required | Default | Description                     |
| -------------- | ---------- | -------- | ------- | ------------------------------- |
| _id            | ObjectId   | auto     |         | Primary key                     |
| gymId          | ObjectId   | yes      |         | Ref → gyms                      |
| name           | String     | yes      |         | e.g. "Monthly Basic", "Annual"  |
| description    | String     | no       | ""      |                                 |
| durationInDays | Number     | yes      |         | 30, 90, 180, 365, etc.         |
| price          | Number     | yes      |         | Amount in smallest currency unit (paise/cents) |
| currency       | String     | yes      | "INR"   | ISO 4217                        |
| features       | [String]   | no       | []      | e.g. ["Pool access", "Personal trainer"] |
| maxFreeze      | Number     | no       | 0       | Days a member can freeze/pause  |
| isActive       | Boolean    | yes      | true    |                                 |

**Indexes:**
| Index                       | Type     | Purpose                      |
| --------------------------- | -------- | ---------------------------- |
| `{ gymId: 1, isActive: 1 }` | Compound | List active plans per gym    |

---

## Collection 5: memberSubscriptions

Tracks which member has which plan, and its status.

| Field         | Type       | Required | Default    | Description                         |
| ------------- | ---------- | -------- | ---------- | ----------------------------------- |
| _id           | ObjectId   | auto     |            | Primary key                         |
| memberId      | ObjectId   | yes      |            | Ref → users                         |
| gymId         | ObjectId   | yes      |            | Ref → gyms                          |
| planId        | ObjectId   | yes      |            | Ref → subscriptionPlans             |
| startDate     | Date       | yes      |            | Subscription start                  |
| endDate       | Date       | yes      |            | Computed: startDate + plan.duration |
| status        | String     | yes      | "active"   | Enum: see below                     |
| freezeHistory | [Object]   | no       | []         | See sub-schema below                |
| autoRenew     | Boolean    | no       | false      |                                     |
| cancelledAt   | Date       | no       | null       | When cancelled                      |
| cancelReason  | String     | no       | null       |                                     |

**status Enum:**
`"active"`, `"expired"`, `"cancelled"`, `"frozen"`

**freezeHistory sub-schema:**
| Field     | Type | Required | Description            |
| --------- | ---- | -------- | ---------------------- |
| startDate | Date | yes      | Freeze start           |
| endDate   | Date | no       | Freeze end (null = ongoing) |
| reason    | String | no     | Reason for freeze      |

**Indexes:**
| Index                               | Type     | Purpose                           |
| ----------------------------------- | -------- | --------------------------------- |
| `{ memberId: 1, status: 1 }`        | Compound | Find active subscription for member |
| `{ gymId: 1, status: 1 }`           | Compound | Gym-wide subscription stats       |
| `{ endDate: 1 }`                    | Single   | Cron: find expiring subscriptions |

---

## Collection 6: payments

| Field          | Type       | Required | Default     | Description                         |
| -------------- | ---------- | -------- | ----------- | ----------------------------------- |
| _id            | ObjectId   | auto     |             | Primary key                         |
| memberId       | ObjectId   | yes      |             | Ref → users                         |
| gymId          | ObjectId   | yes      |             | Ref → gyms                          |
| subscriptionId | ObjectId   | no       | null        | Ref → memberSubscriptions           |
| amount         | Number     | yes      |             | Amount in smallest unit (paise/cents) |
| currency       | String     | yes      | "INR"       |                                     |
| method         | String     | yes      |             | Enum: see below                     |
| status         | String     | yes      | "pending"   | Enum: see below                     |
| gatewayOrderId | String     | no       | null        | Razorpay/Stripe order ID            |
| gatewayPaymentId | String   | no       | null        | Razorpay/Stripe payment ID          |
| gatewaySignature | String   | no       | null        | For verification                    |
| description    | String     | no       | ""          | e.g. "Monthly plan - Jan 2026"      |
| invoiceNumber  | String     | yes      |             | Auto-generated: "INV-GYM001-0001"   |
| receiptUrl     | String     | no       | null        | Generated receipt/invoice link      |
| paidAt         | Date       | no       | null        | When payment was confirmed          |
| refundedAt     | Date       | no       | null        |                                     |
| refundAmount   | Number     | no       | null        | Partial or full refund amount       |
| metadata       | Object     | no       | {}          | Any extra gateway data              |

**method Enum:**
`"cash"`, `"card"`, `"upi"`, `"net_banking"`, `"wallet"`, `"online"`

**status Enum:**
`"pending"`, `"completed"`, `"failed"`, `"refunded"`, `"partially_refunded"`

**Indexes:**
| Index                        | Type     | Purpose                        |
| ---------------------------- | -------- | ------------------------------ |
| `{ gymId: 1, paidAt: -1 }`   | Compound | Revenue reports per gym        |
| `{ memberId: 1, paidAt: -1 }`| Compound | Member payment history         |
| `{ invoiceNumber: 1 }`       | Unique   | Invoice lookup                 |
| `{ status: 1 }`              | Single   | Filter by payment status       |
| `{ gatewayOrderId: 1 }`      | Sparse   | Webhook payment verification   |

---

## Collection 7: workoutPlans

| Field         | Type       | Required | Default    | Description                         |
| ------------- | ---------- | -------- | ---------- | ----------------------------------- |
| _id           | ObjectId   | auto     |            | Primary key                         |
| gymId         | ObjectId   | yes      |            | Ref → gyms                          |
| trainerId     | ObjectId   | no       | null       | Ref → users. null if AI-generated   |
| memberId      | ObjectId   | no       | null       | Ref → users. null = template        |
| title         | String     | yes      |            | e.g. "12-Week Muscle Building"      |
| description   | String     | no       | ""         |                                     |
| goal          | String     | yes      |            | Same enum as fitnessGoal            |
| difficultyLevel | String   | yes      | "beginner" | Enum: "beginner", "intermediate", "advanced" |
| durationWeeks | Number     | yes      |            | Total weeks in the plan             |
| isTemplate    | Boolean    | no       | false      | Reusable template flag              |
| isAiGenerated | Boolean    | no       | false      |                                     |
| weeks         | [Object]   | yes      |            | See sub-schema below                |
| status        | String     | yes      | "active"   | Enum: "active", "completed", "archived" |
| startDate     | Date       | no       | null       | When member started this plan       |

**weeks sub-schema:**
| Field      | Type     | Required | Description          |
| ---------- | -------- | -------- | -------------------- |
| weekNumber | Number   | yes      | 1, 2, 3...          |
| days       | [Object] | yes      | See days sub-schema  |

**days sub-schema:**
| Field      | Type     | Required | Description                      |
| ---------- | -------- | -------- | -------------------------------- |
| day        | String   | yes      | Enum: "monday" - "sunday", "rest" |
| isRestDay  | Boolean  | no       | false                            |
| focusArea  | String   | no       | e.g. "chest", "back", "legs"     |
| exercises  | [Object] | yes      | See exercises sub-schema         |

**exercises sub-schema:**
| Field        | Type   | Required | Default | Description                     |
| ------------ | ------ | -------- | ------- | ------------------------------- |
| name         | String | yes      |         | Exercise name                   |
| category     | String | no       |         | Enum: "strength", "cardio", "flexibility", "balance" |
| sets         | Number | no       | null    | Number of sets                  |
| reps         | String | no       | null    | "12" or "8-12" or "AMRAP"      |
| weightKg     | Number | no       | null    | Suggested weight                |
| durationMin  | Number | no       | null    | For timed exercises (cardio)    |
| restSeconds  | Number | no       | 60      | Rest between sets               |
| notes        | String | no       | ""      | Trainer tips / form cues        |
| orderIndex   | Number | yes      |         | Exercise order in the day       |

**Indexes:**
| Index                             | Type     | Purpose                       |
| --------------------------------- | -------- | ----------------------------- |
| `{ gymId: 1, memberId: 1 }`       | Compound | Find plans for a member       |
| `{ trainerId: 1 }`                | Single   | Find plans by trainer         |
| `{ gymId: 1, isTemplate: 1 }`     | Compound | List templates per gym        |
| `{ memberId: 1, status: 1 }`      | Compound | Member's active plan          |

---

## Collection 8: dietPlans

| Field              | Type       | Required | Default    | Description                    |
| ------------------ | ---------- | -------- | ---------- | ------------------------------ |
| _id                | ObjectId   | auto     |            | Primary key                    |
| gymId              | ObjectId   | yes      |            | Ref → gyms                     |
| trainerId          | ObjectId   | no       | null       | Ref → users                    |
| memberId           | ObjectId   | no       | null       | Ref → users. null = template   |
| title              | String     | yes      |            | e.g. "Lean Bulk Diet Plan"     |
| description        | String     | no       | ""         |                                |
| goal               | String     | yes      |            | Same enum as fitnessGoal       |
| dietaryPreference  | String     | no       | "none"     | Same enum as in memberProfiles |
| dailyCalorieTarget | Number     | yes      |            | Target calories per day        |
| dailyProteinG      | Number     | no       | null       | Protein target in grams        |
| dailyCarbsG        | Number     | no       | null       | Carbs target in grams          |
| dailyFatG          | Number     | no       | null       | Fat target in grams            |
| waterLiters        | Number     | no       | null       | Daily water intake target      |
| meals              | [Object]   | yes      |            | See sub-schema below           |
| isTemplate         | Boolean    | no       | false      |                                |
| isAiGenerated      | Boolean    | no       | false      |                                |
| status             | String     | yes      | "active"   | Enum: "active", "completed", "archived" |
| startDate          | Date       | no       | null       |                                |
| endDate            | Date       | no       | null       |                                |

**meals sub-schema:**
| Field     | Type     | Required | Description                             |
| --------- | -------- | -------- | --------------------------------------- |
| mealType  | String   | yes      | Enum: "breakfast", "morning_snack", "lunch", "evening_snack", "dinner", "pre_workout", "post_workout" |
| time      | String   | no       | Suggested time e.g. "08:00"             |
| items     | [Object] | yes      | See items sub-schema                    |

**items sub-schema:**
| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| name      | String | yes      | Food item name                 |
| quantity  | String | yes      | e.g. "200g", "1 cup", "2 pcs" |
| calories  | Number | yes      | kcal                           |
| proteinG  | Number | no       |                                |
| carbsG    | Number | no       |                                |
| fatG      | Number | no       |                                |
| fiberG    | Number | no       |                                |
| notes     | String | no       | e.g. "substitute with tofu"    |

**Indexes:**
| Index                             | Type     | Purpose                    |
| --------------------------------- | -------- | -------------------------- |
| `{ gymId: 1, memberId: 1 }`       | Compound | Find diets for a member    |
| `{ trainerId: 1 }`                | Single   | Find diets by trainer      |
| `{ gymId: 1, isTemplate: 1 }`     | Compound | List templates per gym     |

---

## Collection 9: classes

Recurring group classes offered by a gym.

| Field           | Type       | Required | Default  | Description                     |
| --------------- | ---------- | -------- | -------- | ------------------------------- |
| _id             | ObjectId   | auto     |          | Primary key                     |
| gymId           | ObjectId   | yes      |          | Ref → gyms                      |
| trainerId       | ObjectId   | yes      |          | Ref → users (trainer)           |
| name            | String     | yes      |          | e.g. "Morning Yoga", "HIIT"    |
| description     | String     | no       | ""       |                                 |
| category        | String     | yes      |          | Enum: "yoga", "hiit", "zumba", "crossfit", "spinning", "pilates", "boxing", "strength", "cardio", "other" |
| schedule        | [Object]   | yes      |          | See sub-schema below            |
| maxCapacity     | Number     | yes      |          | Max members per session         |
| difficultyLevel | String     | no       | "all"    | Enum: "beginner", "intermediate", "advanced", "all" |
| duration        | Number     | yes      |          | Duration in minutes             |
| location        | String     | no       | ""       | Room/area in the gym            |
| isActive        | Boolean    | yes      | true     |                                 |

**schedule sub-schema:**
| Field     | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| dayOfWeek | String | yes      | Enum: "monday" - "sunday"       |
| startTime | String | yes      | HH:mm format e.g. "07:00"      |
| endTime   | String | yes      | HH:mm format e.g. "08:00"      |

**Indexes:**
| Index                         | Type     | Purpose                    |
| ----------------------------- | -------- | -------------------------- |
| `{ gymId: 1, isActive: 1 }`   | Compound | List active classes        |
| `{ trainerId: 1 }`            | Single   | Trainer's class schedule   |

---

## Collection 10: classBookings

| Field      | Type       | Required | Default   | Description                        |
| ---------- | ---------- | -------- | --------- | ---------------------------------- |
| _id        | ObjectId   | auto     |           | Primary key                        |
| classId    | ObjectId   | yes      |           | Ref → classes                      |
| memberId   | ObjectId   | yes      |           | Ref → users                        |
| gymId      | ObjectId   | yes      |           | Ref → gyms                         |
| date       | Date       | yes      |           | Specific date of the booked session |
| status     | String     | yes      | "booked"  | Enum: "booked", "attended", "cancelled", "no_show" |
| cancelledAt| Date       | no       | null      |                                    |

**Indexes:**
| Index                                      | Type     | Purpose                           |
| ------------------------------------------ | -------- | --------------------------------- |
| `{ classId: 1, date: 1 }`                  | Compound | Count bookings per session        |
| `{ memberId: 1, date: -1 }`                | Compound | Member's booking history          |
| `{ classId: 1, memberId: 1, date: 1 }`     | Compound + Unique | Prevent duplicate bookings |

---

## Collection 11: attendance

| Field      | Type       | Required | Default    | Description                       |
| ---------- | ---------- | -------- | ---------- | --------------------------------- |
| _id        | ObjectId   | auto     |            | Primary key                       |
| memberId   | ObjectId   | yes      |            | Ref → users                       |
| gymId      | ObjectId   | yes      |            | Ref → gyms                        |
| checkIn    | Date       | yes      |            | Check-in timestamp                |
| checkOut   | Date       | no       | null       | Check-out timestamp               |
| method     | String     | yes      | "manual"   | Enum: "qr", "manual"             |
| duration   | Number     | no       | null       | Computed: checkOut - checkIn (min)|
| markedBy   | ObjectId   | no       | null       | Ref → users (staff who marked)    |

**Indexes:**
| Index                                       | Type     | Purpose                        |
| ------------------------------------------- | -------- | ------------------------------ |
| `{ gymId: 1, checkIn: -1 }`                 | Compound | Gym attendance log (recent first) |
| `{ memberId: 1, checkIn: -1 }`              | Compound | Member attendance history      |
| `{ gymId: 1, memberId: 1, checkIn: -1 }`    | Compound | Per-member gym attendance      |

---

## Collection 12: aiChatHistory

Stores fitness chatbot conversations.

| Field      | Type       | Required | Default | Description                    |
| ---------- | ---------- | -------- | ------- | ------------------------------ |
| _id        | ObjectId   | auto     |         | Primary key                    |
| memberId   | ObjectId   | yes      |         | Ref → users                    |
| gymId      | ObjectId   | yes      |         | Ref → gyms                     |
| title      | String     | no       | ""      | Auto-generated from first msg  |
| messages   | [Object]   | yes      |         | See sub-schema below           |
| isActive   | Boolean    | yes      | true    | Soft delete                    |

**messages sub-schema:**
| Field     | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| role      | String | yes      | Enum: "user", "assistant"           |
| content   | String | yes      | Message text                        |
| timestamp | Date   | yes      | When message was sent               |

**Indexes:**
| Index                           | Type     | Purpose                    |
| ------------------------------- | -------- | -------------------------- |
| `{ memberId: 1, updatedAt: -1 }`| Compound | Recent chats for a member |

---

## Collection 13: foodScans

Stores AI food scan results for nutrition tracking.

| Field          | Type       | Required | Default | Description                    |
| -------------- | ---------- | -------- | ------- | ------------------------------ |
| _id            | ObjectId   | auto     |         | Primary key                    |
| memberId       | ObjectId   | yes      |         | Ref → users                    |
| gymId          | ObjectId   | yes      |         | Ref → gyms                     |
| imageUrl       | String     | yes      |         | Cloudinary URL of food photo   |
| mealType       | String     | no       | null    | Enum: same as dietPlan meals   |
| results        | Object     | yes      |         | See sub-schema below           |
| date           | Date       | yes      |         | When the meal was consumed     |

**results sub-schema:**
| Field          | Type     | Required | Description                   |
| -------------- | -------- | -------- | ----------------------------- |
| foods          | [Object] | yes      | Detected food items           |
| totalCalories  | Number   | yes      | Sum of all items              |
| totalProteinG  | Number   | no       |                               |
| totalCarbsG    | Number   | no       |                               |
| totalFatG      | Number   | no       |                               |

**results.foods item sub-schema:**
| Field    | Type   | Required | Description     |
| -------- | ------ | -------- | --------------- |
| name     | String | yes      | Food item name  |
| portion  | String | yes      | Estimated portion |
| calories | Number | yes      |                 |
| proteinG | Number | no       |                 |
| carbsG   | Number | no       |                 |
| fatG     | Number | no       |                 |

**Indexes:**
| Index                            | Type     | Purpose                    |
| -------------------------------- | -------- | -------------------------- |
| `{ memberId: 1, date: -1 }`      | Compound | Member's scan history      |

---

## Collection 14: notifications

| Field      | Type       | Required | Default | Description                          |
| ---------- | ---------- | -------- | ------- | ------------------------------------ |
| _id        | ObjectId   | auto     |         | Primary key                          |
| userId     | ObjectId   | yes      |         | Ref → users (recipient)              |
| gymId      | ObjectId   | no       | null    | Ref → gyms. null for platform-level  |
| title      | String     | yes      |         | Notification title                   |
| body       | String     | yes      |         | Notification body text               |
| type       | String     | yes      |         | Enum: see below                      |
| data       | Object     | no       | {}      | Extra payload (deeplink info, IDs)   |
| isRead     | Boolean    | yes      | false   |                                      |
| readAt     | Date       | no       | null    |                                      |
| channel    | String     | yes      | "in_app"| Enum: "in_app", "push", "email", "all" |

**type Enum:**
`"payment_success"`, `"payment_failed"`, `"subscription_expiring"`, `"subscription_expired"`, `"workout_assigned"`, `"diet_assigned"`, `"class_reminder"`, `"class_cancelled"`, `"achievement"`, `"general"`, `"welcome"`

**Indexes:**
| Index                                     | Type     | Purpose                        |
| ----------------------------------------- | -------- | ------------------------------ |
| `{ userId: 1, isRead: 1, createdAt: -1 }` | Compound | Unread notifications feed      |
| `{ userId: 1, createdAt: -1 }`            | Compound | All notifications for user     |
| `{ createdAt: 1 }` + TTL (90 days)        | TTL      | Auto-delete old notifications  |

---

## Data Validation Rules Summary

| Field Pattern    | Rule                                                  |
| ---------------- | ----------------------------------------------------- |
| email            | Valid email format, lowercase, trimmed, unique         |
| password         | Min 8 chars, must contain uppercase, lowercase, number |
| phone            | Regex: `/^\+[1-9]\d{6,14}$/`                          |
| price/amount     | Positive integer (stored in smallest currency unit)    |
| dates            | ISO 8601 format, endDate > startDate                   |
| enums            | Validated against allowed values at schema level       |
| ObjectId refs    | Validated for existence before write (service layer)   |
| arrays           | Max length limits to prevent abuse (e.g. 50 exercises) |

---

## Soft Delete Strategy

- **Never hard-delete** users, gyms, subscriptions, or plans
- Use `isActive: false` for deactivation
- Queries always filter `isActive: true` by default
- Admin can view deactivated records with explicit filter

## Audit & Timestamp Strategy

- All collections use Mongoose `timestamps: true` (auto `createdAt` + `updatedAt`)
- All collections include `createdBy` + `updatedBy` (ObjectId ref → users) via global Mongoose plugin
- `createdBy` is set once at insert time from the authenticated user (`req.user._id`)
- `updatedBy` is set on every update from the authenticated user (`req.user._id`)
- For webhook/cron-triggered writes, a dedicated `SYSTEM_USER_ID` is used as the actor
- All dates stored in UTC
- Client converts to local timezone for display
- These audit fields enable full traceability: **who** created/modified a record and **when**

## Data Cascade Rules

| When this happens...             | Then...                                          |
| -------------------------------- | ------------------------------------------------ |
| Gym deactivated                  | All gym users set isActive: false                |
| Member deactivated               | Active subscription set to "cancelled"           |
| Trainer deactivated              | Classes reassigned or deactivated                |
| Subscription plan deactivated    | Existing subscriptions continue, no new signups  |
| Class deactivated                | Future bookings set to "cancelled"               |
