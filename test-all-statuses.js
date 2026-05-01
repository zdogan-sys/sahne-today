const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const tests = ['invited', 'accepted', 'declined', 'applied', 'request', 'wait']
  for (const t of tests) {
    const { error } = await supabase.from('band_members').insert({
      band_id: 'f80b3aac-1a88-41b3-b78a-4ada45d04fd4',
      artist_id: 'b5fed938-1099-4978-9c71-a996b6b9548c',
      status: t
    })
    console.log(t, '->', error ? error.message : 'SUCCESS')
    if (!error) {
       await supabase.from('band_members').delete().eq('status', t)
    }
  }
}
run()