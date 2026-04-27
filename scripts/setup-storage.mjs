import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const buckets = [
  { name: 'avatars', maxFileSize: 5242880 },
  { name: 'venues',  maxFileSize: 10485760 },
]

// 1. Bucket'ları oluştur
for (const bucket of buckets) {
  const { data: existing } = await supabase.storage.getBucket(bucket.name)
  if (existing) {
    console.log(`✓ '${bucket.name}' zaten mevcut`)
  } else {
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: bucket.maxFileSize,
    })
    if (error) console.error(`✗ '${bucket.name}':`, error.message)
    else console.log(`✓ '${bucket.name}' oluşturuldu`)
  }
}

// 2. RLS policy'leri SQL ile ekle
const sql = `
do $$
begin
  -- avatars
  if not exists (select 1 from pg_policies where policyname = 'avatars_public_select' and tablename = 'objects') then
    execute 'create policy avatars_public_select on storage.objects for select using (bucket_id = ''avatars'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avatars_auth_insert' and tablename = 'objects') then
    execute 'create policy avatars_auth_insert on storage.objects for insert to authenticated with check (bucket_id = ''avatars'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avatars_auth_update' and tablename = 'objects') then
    execute 'create policy avatars_auth_update on storage.objects for update to authenticated using (bucket_id = ''avatars'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avatars_auth_delete' and tablename = 'objects') then
    execute 'create policy avatars_auth_delete on storage.objects for delete to authenticated using (bucket_id = ''avatars'')';
  end if;
  -- venues
  if not exists (select 1 from pg_policies where policyname = 'venues_public_select' and tablename = 'objects') then
    execute 'create policy venues_public_select on storage.objects for select using (bucket_id = ''venues'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'venues_auth_insert' and tablename = 'objects') then
    execute 'create policy venues_auth_insert on storage.objects for insert to authenticated with check (bucket_id = ''venues'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'venues_auth_update' and tablename = 'objects') then
    execute 'create policy venues_auth_update on storage.objects for update to authenticated using (bucket_id = ''venues'')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'venues_auth_delete' and tablename = 'objects') then
    execute 'create policy venues_auth_delete on storage.objects for delete to authenticated using (bucket_id = ''venues'')';
  end if;
end $$;
`

const { error: sqlErr } = await supabase.rpc('query', { query: sql }).catch(() => ({ error: 'rpc unavailable' }))

if (sqlErr) {
  // RPC yoksa SQL dosyasını kullan
  console.log('\n⚠  Policy\'ler otomatik eklenemedi.')
  console.log('   Supabase SQL Editor\'da şunu çalıştır:\n')
  console.log(`create policy "avatars_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "venues_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'venues');`)
} else {
  console.log('✓ Policy\'ler eklendi')
}

console.log('\nTamamlandı.')
