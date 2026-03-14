import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Powered Gym Management API',
      version: '1.0.0',
      description: 'REST API for a multi-tenant gym management platform with AI features, payments, and analytics.',
      contact: { name: 'GymApp Support' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Development' },
      { url: 'https://your-app.vercel.app/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
            meta: {
              type: 'object',
              nullable: true,
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' }, nullable: true },
          },
        },
        // ── Auth ──────────────────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role'],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['gym_admin', 'member'] },
            gymId: { type: 'string', description: 'Required for members' },
            phone: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        // ── Gym ───────────────────────────────────────────────────────────────
        CreateGymRequest: {
          type: 'object',
          required: ['name', 'email', 'phone'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'object', properties: { street: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, pinCode: { type: 'string' }, country: { type: 'string' } } },
            settings: { type: 'object', properties: { currency: { type: 'string' }, timezone: { type: 'string' } } },
          },
        },
        // ── Subscription ──────────────────────────────────────────────────────
        CreatePlanRequest: {
          type: 'object',
          required: ['name', 'durationInDays', 'price'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            durationInDays: { type: 'integer', example: 30 },
            price: { type: 'number', example: 999 },
            features: { type: 'array', items: { type: 'string' } },
          },
        },
        // ── Payment ───────────────────────────────────────────────────────────
        RecordPaymentRequest: {
          type: 'object',
          required: ['memberId', 'amount', 'method'],
          properties: {
            memberId: { type: 'string' },
            subscriptionId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'INR' },
            method: { type: 'string', enum: ['cash', 'card', 'upi', 'bank_transfer'] },
            notes: { type: 'string' },
          },
        },
        // ── AI ────────────────────────────────────────────────────────────────
        GenerateWorkoutRequest: {
          type: 'object',
          required: ['memberId'],
          properties: {
            memberId: { type: 'string' },
            durationWeeks: { type: 'integer', default: 4 },
            daysPerWeek: { type: 'integer', default: 3 },
            additionalNotes: { type: 'string' },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['message', 'gymId'],
          properties: {
            message: { type: 'string', maxLength: 1000 },
            gymId: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & user session management' },
      { name: 'Gyms', description: 'Gym CRUD (super admin)' },
      { name: 'Members', description: 'Member management' },
      { name: 'Trainers', description: 'Trainer & staff management' },
      { name: 'Subscriptions', description: 'Subscription plans & member subscriptions' },
      { name: 'Payments', description: 'Payment recording & Razorpay integration' },
      { name: 'Workout Plans', description: 'Workout plan CRUD & assignment' },
      { name: 'Diet Plans', description: 'Diet plan CRUD & assignment' },
      { name: 'Classes', description: 'Gym class scheduling & enrollment' },
      { name: 'Attendance', description: 'Check-in/out & attendance logs' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'AI', description: 'AI-powered fitness features (workout gen, chatbot, food scan)' },
      { name: 'Analytics', description: 'Platform, gym, and member analytics' },
      { name: 'Me', description: 'Authenticated user\'s own data' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
