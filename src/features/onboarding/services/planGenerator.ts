import { supabase } from '../../../core/supabase/client';

type PlanData = {
  user_id: string;
  day_number: number;
  workout_text: string;
  meal_text: string;
};

// Generates a simple text-based plan depending on the user's selections
export const generateAndSavePlan = async (
  userId: string,
  goal: string,
  level: string,
  environment: string,
  dietType: string
) => {
  const plans: PlanData[] = [];
  
  const wTarget = goal === 'Weight Loss' ? 'Cardio & Light Weights' 
                : goal === 'Muscle Gain' ? 'Heavy Lifting/Hypertrophy' 
                : 'General Fitness routines';
                
  const wEnv = environment === 'Home' ? 'bodyweight exercises and limited equipment'
             : 'full gym equipment';
             
  const mType = dietType === 'Vegan' ? 'plant-based macronutrients'
              : dietType === 'Keto' ? 'low-carb, high-fat'
              : 'balanced macros';

  for (let i = 1; i <= 7; i++) {
    // Generate simple repetitive or varied strings
    let workout = `Day ${i} workout: ${level} level. Focus on ${wTarget} using ${wEnv}.`;
    let meals = `Day ${i} meals: Structured around ${mType} to support your goal of ${goal}.`;
    
    // Add some simple variations per day
    if (i === 3 || i === 6) {
      workout = `Day ${i} workout: Active Recovery / Stretching. Keep it light.`;
    }
    
    plans.push({
      user_id: userId,
      day_number: i,
      workout_text: workout,
      meal_text: meals,
    });
  }

  // Insert to supabase
  const { error } = await supabase.from('plans').insert(plans);
  
  if (error) {
    throw error;
  }
};
