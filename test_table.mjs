import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
    const { data: progs } = await supabase.from('programs').select('*').limit(5);
    console.log('PROGRAMS:', progs?.length);
    const { data: days } = await supabase.from('program_days').select('*').limit(5);
    console.log('PROGRAM DAYS:', days?.length);
    const { data: ws } = await supabase.from('day_workouts').select('*').limit(5);
    console.log('DAY WORKOUTS:', ws?.length);
}

check();
