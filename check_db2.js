const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve('e:/MyRealTimeProjects/OriginalWorking/FitnessApp/.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: days, error: dayErr } = await supabase.from('program_days').select('*').limit(5);
    console.log('days count:', days ? days.length : 0);
    if (dayErr) console.error('dayErr:', dayErr);

    if (days && days.length > 0) {
        for (const d of days) {
            console.log('Day:', d.id, d.title);
            const { data: w } = await supabase.from('day_workouts').select('*').eq('program_day_id', d.id);
            console.log('  Workouts:', w ? w.length : 0);
            const { data: m } = await supabase.from('day_meals').select('*').eq('program_day_id', d.id);
            console.log('  Meals:', m ? m.length : 0);
        }
    }
}

check().then(() => console.log('Done'));
