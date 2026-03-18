const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve('e:/MyRealTimeProjects/OriginalWorking/FitnessApp/.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: days, error: dayErr } = await supabase.from('program_days').select('*').order('created_at', { ascending: false }).limit(3);
    console.log('recent days count:', days ? days.length : 0);

    if (days && days.length > 0) {
        const { data: w } = await supabase.from('day_workouts').select('*').eq('program_day_id', days[0].id);
        console.log('workouts for latest day count:', w ? w.length : 0);

        const { data: m } = await supabase.from('day_meals').select('*').eq('program_day_id', days[0].id);
        console.log('meals for latest day count:', m ? m.length : 0);

        const { data: profile } = await supabase.from('users').select('*').limit(1);
        console.log('profile env:', profile ? profile[0].environment : null);
    }
}

check().then(() => console.log('Done'));
