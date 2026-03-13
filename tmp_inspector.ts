import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function inspectDay2() {
  const { data: users } = await supabase.from('users').select('id, email').limit(1);
  if (!users || users.length === 0) return console.log('No users found');

  const userId = users[0].id;
  console.log('Querying for User:', users[0].email);

  const { data: program } = await supabase.from('programs')
    .select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();
  
  if (!program) return console.log('No program found.');

  const { data: week } = await supabase.from('program_weeks')
    .select('id').eq('program_id', program.id).eq('week_number', 1).single();

  const { data: day } = await supabase.from('program_days')
    .select('*').eq('program_week_id', week?.id).eq('day_number', 2).single();

  if (!day) return console.log('Day 2 not found.');

  const { data: workouts } = await supabase.from('day_workouts')
    .select('*').eq('program_day_id', day.id);

  console.log('Day 2 Focus:', day.title, ' - ', day.focus_type);
  console.log('Workouts Generated:', workouts);
}

inspectDay2();
