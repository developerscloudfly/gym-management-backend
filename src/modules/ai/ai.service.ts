import OpenAI from 'openai';
import { Types } from 'mongoose';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { MemberProfile } from '../member/memberProfile.model';
import { WorkoutPlan } from '../workout/workout.model';
import { DietPlan } from '../diet/diet.model';
import { Attendance } from '../attendance/attendance.model';
import { MemberSubscription } from '../subscription/memberSubscription.model';
import { AIChat } from './aiChat.model';
import { buildWorkoutPrompt, WorkoutPromptContext } from './prompts/workout.prompt';
import { buildDietPrompt, DietPromptContext } from './prompts/diet.prompt';
import { buildChatbotSystemPrompt } from './prompts/chatbot.prompt';
import { buildFoodScannerPrompt } from './prompts/foodScanner.prompt';

// ─── OpenAI Client ────────────────────────────────────────────────────────────

const getOpenAI = (): OpenAI => {
  if (!env.OPENAI_API_KEY) throw ApiError.internal('OpenAI API key not configured');
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const parseJsonResponse = <T>(content: string): T => {
  // Strip markdown code fences if present
  const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
};

// ─── AI Workout Generator ─────────────────────────────────────────────────────

export const generateWorkoutPlan = async (
  memberId: string,
  gymId: string,
  trainerId: string,
  options: { durationWeeks?: number; daysPerWeek?: number; additionalNotes?: string }
) => {
  const profile = await MemberProfile.findOne({
    userId: new Types.ObjectId(memberId),
    gymId: new Types.ObjectId(gymId),
  });
  if (!profile) throw ApiError.notFound('Member profile not found');

  const ctx: WorkoutPromptContext = { profile, ...options };
  const prompt = buildWorkoutPrompt(ctx);

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const planData = parseJsonResponse<Record<string, unknown>>(raw);

  const workoutData: Record<string, unknown> = {
    gymId: new Types.ObjectId(gymId),
    trainerId: new Types.ObjectId(trainerId),
    memberId: new Types.ObjectId(memberId),
    title: planData.title,
    description: planData.description,
    goal: planData.goal,
    weeks: planData.weeks,
    isAiGenerated: true,
    status: 'active',
    createdBy: new Types.ObjectId(trainerId),
    updatedBy: new Types.ObjectId(trainerId),
  };
  const plan = await WorkoutPlan.create(workoutData as unknown as Parameters<typeof WorkoutPlan.create>[0]);

  return plan;
};

// ─── AI Diet Generator ────────────────────────────────────────────────────────

export const generateDietPlan = async (
  memberId: string,
  gymId: string,
  trainerId: string,
  options: { targetCalories?: number; additionalNotes?: string }
) => {
  const profile = await MemberProfile.findOne({
    userId: new Types.ObjectId(memberId),
    gymId: new Types.ObjectId(gymId),
  });
  if (!profile) throw ApiError.notFound('Member profile not found');

  const ctx: DietPromptContext = { profile, ...options };
  const prompt = buildDietPrompt(ctx);

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const planData = parseJsonResponse<Record<string, unknown>>(raw);

  const dietData: Record<string, unknown> = {
    gymId: new Types.ObjectId(gymId),
    trainerId: new Types.ObjectId(trainerId),
    memberId: new Types.ObjectId(memberId),
    title: planData.title,
    goal: planData.goal,
    dietaryPreference: profile.dietaryPreference,
    dailyCalorieTarget: planData.dailyCalorieTarget,
    meals: planData.meals,
    isAiGenerated: true,
    status: 'active',
    createdBy: new Types.ObjectId(trainerId),
    updatedBy: new Types.ObjectId(trainerId),
  };
  const plan = await DietPlan.create(dietData as unknown as Parameters<typeof DietPlan.create>[0]);

  return plan;
};

// ─── AI Fitness Chatbot ───────────────────────────────────────────────────────

export const chat = async (memberId: string, gymId: string, userMessage: string) => {
  const [profile, chatHistory] = await Promise.all([
    MemberProfile.findOne({
      userId: new Types.ObjectId(memberId),
      gymId: new Types.ObjectId(gymId),
    }),
    AIChat.findOne({
      memberId: new Types.ObjectId(memberId),
      gymId: new Types.ObjectId(gymId),
      isActive: true,
    }),
  ]);

  const systemPrompt = buildChatbotSystemPrompt(profile);

  // Build message history for context (last 20 messages)
  const history = chatHistory?.messages.slice(-20) ?? [];
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.8,
    max_tokens: 600,
  });

  const assistantMessage = completion.choices[0].message.content ?? '';

  // Persist chat history
  if (chatHistory) {
    chatHistory.messages.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date() }
    );
    await chatHistory.save();
  } else {
    await AIChat.create({
      memberId: new Types.ObjectId(memberId),
      gymId: new Types.ObjectId(gymId),
      messages: [
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date() },
      ],
    });
  }

  return { reply: assistantMessage };
};

export const getChatHistory = async (memberId: string, gymId: string) => {
  const chatHistory = await AIChat.findOne({
    memberId: new Types.ObjectId(memberId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });
  return chatHistory?.messages ?? [];
};

export const clearChatHistory = async (memberId: string, gymId: string) => {
  await AIChat.findOneAndUpdate(
    { memberId: new Types.ObjectId(memberId), gymId: new Types.ObjectId(gymId) },
    { messages: [] }
  );
};

// ─── AI Food Scanner ──────────────────────────────────────────────────────────

export const scanFood = async (imageBase64: string) => {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildFoodScannerPrompt() },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'low',
            },
          },
        ],
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  return parseJsonResponse<Record<string, unknown>>(raw);
};

// ─── AI Progress Insights ─────────────────────────────────────────────────────

export const getProgressInsights = async (memberId: string, gymId: string) => {
  const [profile, workoutPlans, dietPlans, attendanceCount] = await Promise.all([
    MemberProfile.findOne({ userId: new Types.ObjectId(memberId), gymId: new Types.ObjectId(gymId) }),
    WorkoutPlan.find({ memberId: new Types.ObjectId(memberId), gymId: new Types.ObjectId(gymId) }).sort({ createdAt: -1 }).limit(3),
    DietPlan.find({ memberId: new Types.ObjectId(memberId), gymId: new Types.ObjectId(gymId) }).sort({ createdAt: -1 }).limit(1),
    Attendance.countDocuments({ memberId: new Types.ObjectId(memberId), gymId: new Types.ObjectId(gymId), isActive: true }),
  ]);

  if (!profile) throw ApiError.notFound('Member profile not found');

  const metrics = profile.bodyMetricsHistory.slice(-6);
  const weightTrend = metrics.length >= 2
    ? metrics[metrics.length - 1].weightKg - metrics[0].weightKg
    : null;

  const prompt = `You are a fitness progress analyst. Analyze the following member data and provide personalized insights.

PROFILE:
- Goal: ${profile.fitnessGoal.replace(/_/g, ' ')}
- Experience: ${profile.experienceLevel}
- Total gym visits: ${attendanceCount}

BODY METRICS (last ${metrics.length} records):
${metrics.map((m) => `  - ${new Date(m.date).toLocaleDateString()}: ${m.weightKg}kg${m.bodyFatPct ? `, ${m.bodyFatPct}% body fat` : ''}`).join('\n')}
Weight change: ${weightTrend !== null ? `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} kg` : 'insufficient data'}

Active workout plans: ${workoutPlans.length}
Active diet plans: ${dietPlans.length}

RESPOND WITH VALID JSON ONLY:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["list of positive trends"],
  "improvements": ["list of areas to focus on"],
  "recommendations": ["3-5 actionable recommendations"],
  "progressScore": 0-100
}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  return parseJsonResponse<Record<string, unknown>>(raw);
};

// ─── AI Churn Prediction ──────────────────────────────────────────────────────

export const getChurnPrediction = async (gymId: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Members with active subscriptions
  const activeSubscriptions = await MemberSubscription.find({
    gymId: new Types.ObjectId(gymId),
    status: 'active',
  }).populate('memberId', 'firstName lastName email');

  if (!activeSubscriptions.length) return { atRiskMembers: [], total: 0 };

  const memberIds = activeSubscriptions.map((s) => s.memberId);

  // Attendance in last 30 days per member
  const recentAttendance = await Attendance.aggregate([
    {
      $match: {
        gymId: new Types.ObjectId(gymId),
        memberId: { $in: memberIds },
        checkInTime: { $gte: thirtyDaysAgo },
        isActive: true,
      },
    },
    { $group: { _id: '$memberId', count: { $sum: 1 }, lastVisit: { $max: '$checkInTime' } } },
  ]);

  const attendanceMap = new Map(
    recentAttendance.map((r) => [r._id.toString(), { count: r.count as number, lastVisit: r.lastVisit as Date }])
  );

  const atRiskMembers = activeSubscriptions
    .map((sub) => {
      const memberId = (sub.memberId as unknown as { _id: Types.ObjectId; firstName: string; lastName: string; email: string });
      const attendance = attendanceMap.get(memberId._id.toString());
      const visitCount = attendance?.count ?? 0;
      const lastVisit = attendance?.lastVisit;
      const daysSinceLastVisit = lastVisit
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Risk score: 0–100 (higher = more at risk)
      let riskScore = 0;
      if (visitCount === 0) riskScore += 50;
      else if (visitCount <= 2) riskScore += 30;
      else if (visitCount <= 5) riskScore += 15;

      if (daysSinceLastVisit >= 14) riskScore += 40;
      else if (daysSinceLastVisit >= 7) riskScore += 20;

      // Subscription expiring soon
      const daysToExpiry = Math.floor(
        (new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysToExpiry <= 7) riskScore += 10;

      return {
        memberId: memberId._id,
        name: `${memberId.firstName} ${memberId.lastName}`,
        email: memberId.email,
        riskScore: Math.min(riskScore, 100),
        visitsLast30Days: visitCount,
        daysSinceLastVisit,
        subscriptionExpiresIn: daysToExpiry,
      };
    })
    .filter((m) => m.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore);

  return { atRiskMembers, total: atRiskMembers.length };
};

// ─── AI Crowd Prediction ──────────────────────────────────────────────────────

export const getCrowdPrediction = async (gymId: string) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const hourlyData = await Attendance.aggregate([
    {
      $match: {
        gymId: new Types.ObjectId(gymId),
        checkInTime: { $gte: ninetyDaysAgo },
        isActive: true,
      },
    },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$checkInTime' }, // 1=Sun, 7=Sat
          hour: { $hour: '$checkInTime' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
  ]);

  const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Build a structured prediction map
  const predictionMap: Record<string, { hour: number; avgVisitors: number; label: string }[]> = {};

  for (const entry of hourlyData) {
    const day = dayNames[entry._id.dayOfWeek as number];
    if (!predictionMap[day]) predictionMap[day] = [];
    const avg = Math.round((entry.count as number) / 13); // ~13 weeks in 90 days
    predictionMap[day].push({
      hour: entry._id.hour as number,
      avgVisitors: avg,
      label: avg > 10 ? 'very busy' : avg > 6 ? 'busy' : avg > 3 ? 'moderate' : 'quiet',
    });
  }

  // Find peak hours per day
  const peakHours = Object.entries(predictionMap).map(([day, hours]) => {
    const peak = hours.reduce((max, h) => (h.avgVisitors > max.avgVisitors ? h : max), hours[0]);
    return { day, peakHour: peak?.hour, peakAvgVisitors: peak?.avgVisitors };
  });

  return { predictionMap, peakHours };
};
