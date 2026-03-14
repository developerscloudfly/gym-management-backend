import { IMemberProfile } from '../../member/memberProfile.model';

export interface DietPromptContext {
  profile: IMemberProfile;
  targetCalories?: number;
  additionalNotes?: string;
}

export const buildDietPrompt = (ctx: DietPromptContext): string => {
  const { profile, targetCalories, additionalNotes } = ctx;

  const latestMetric = profile.bodyMetricsHistory[profile.bodyMetricsHistory.length - 1];
  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return `You are a certified nutritionist. Create a detailed, personalized daily diet plan.

MEMBER PROFILE:
- Age: ${age ?? 'unknown'}
- Gender: ${profile.gender ?? 'not specified'}
- Height: ${profile.heightCm ? profile.heightCm + ' cm' : 'unknown'}
- Current Weight: ${latestMetric?.weightKg ?? profile.weightKg ?? 'unknown'} kg
- Fitness Goal: ${profile.fitnessGoal.replace(/_/g, ' ')}
- Experience Level: ${profile.experienceLevel}
- Dietary Preference: ${profile.dietaryPreference}
- Medical Conditions: ${profile.medicalConditions.length ? profile.medicalConditions.join(', ') : 'none'}
${targetCalories ? `- Target Daily Calories: ${targetCalories} kcal` : ''}
${additionalNotes ? `- Additional notes: ${additionalNotes}` : ''}

INSTRUCTIONS:
- Create a full daily meal plan with breakfast, morning snack, lunch, afternoon snack, dinner, and pre/post workout meals if applicable
- Each meal should list individual food items with name, quantity, calories, protein, carbs, and fat
- Respect the dietary preference strictly (e.g., no meat for vegetarian)
- Provide a balanced macro split appropriate for the fitness goal
- Include total daily macros

RESPOND WITH VALID JSON ONLY in this exact structure:
{
  "title": "string",
  "goal": "string",
  "dietaryPreference": "string",
  "dailyCalorieTarget": 2000,
  "macros": { "proteinG": 150, "carbsG": 200, "fatG": 65 },
  "meals": [
    {
      "name": "breakfast",
      "time": "7:00 AM",
      "items": [
        {
          "name": "string",
          "quantity": "string",
          "calories": 200,
          "proteinG": 15,
          "carbsG": 25,
          "fatG": 5
        }
      ]
    }
  ]
}`;
};
