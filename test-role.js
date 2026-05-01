const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: artist } = await supabase.from('artists').select('id').order('created_at', { ascending: false }).limit(1).single()
  const { data: band } = await supabase.from('bands').select('id').limit(1).single()
  
  if (artist && band) {
    // Delete existing relation if any
    await supabase.from('band_members').delete().eq('band_id', band.id).eq('artist_id', artist.id)

    const { error } = await supabase.from('band_members').insert({
      band_id: band.id,
      artist_id: artist.id,
      status: 'invited',
      role: 'applicant'
    })
    console.log('applicant role ->', error ? error.message : 'SUCCESS')
    if (!error) {
       await supabase.from('band_members').delete().eq('band_id', band.id).eq('artist_id', artist.id)
    }
  }
}
run()