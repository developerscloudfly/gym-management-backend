import { IMemberProfile } from '../../member/memberProfile.model';

export interface WorkoutPromptContext {
  profile: IMemberProfile;
  durationWeeks?: number;
  daysPerWeek?: number;
  additionalNotes?: string;
}

export const buildWorkoutPrompt = (ctx: WorkoutPromptContext): string => {
  const { profile, durationWeeks = 4, daysPerWeek = 3, additionalNotes } = ctx;

  const latestMetric = profile.bodyMetricsHistory[profile.bodyMetricsHistory.length - 1];
  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return `You are an expert fitness coach. Create a detailed, personalized ${durationWeeks}-week workout plan.

MEMBER PROFILE:
- Age: ${age ?? 'unknown'}
- Gender: ${profile.gender ?? 'not specified'}
- Height: ${profile.heightCm ? profile.heightCm + ' cm' : 'unknown'}
- Current Weight: ${latestMetric?.weightKg ?? profile.weightKg ?? 'unknown'} kg
- Body Fat: ${latestMetric?.bodyFatPct ? latestMetric.bodyFatPct + '%' : 'unknown'}
- Fitness Goal: ${profile.fitnessGoal.replace(/_/g, ' ')}
- Experience Level: ${profile.experienceLevel}
- Medical Conditions: ${profile.medicalConditions.length ? profile.medicalConditions.join(', ') : 'none'}
- Injuries: ${profile.injuries.length ? profile.injuries.join(', ') : 'none'}
- Days per week available: ${daysPerWeek}
${additionalNotes ? `- Additional notes: ${additionalNotes}` : ''}

INSTRUCTIONS:
- Create a ${durationWeeks}-week progressive workout plan with ${daysPerWeek} workout days per week
- Each day should contain 4-6 exercises appropriate for the member's level
- Include sets, reps, rest seconds, and brief notes for each exercise
- Progressively increase intensity across weeks
- Avoid exercises that conflict with any injuries or medical conditions

RESPOND WITH VALID JSON ONLY in this exact structure:
{
  "title": "string",
  "description": "string",
  "goal": "string",
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": "monday",
          "exercises": [
            {
              "name": "string",
              "sets": 3,
              "reps": "10-12",
              "restSeconds": 60,
              "notes": "string"
            }
          ]
        }
      ]
    }
  ]
}`;
};
