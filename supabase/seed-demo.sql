-- ==================================================
-- SAHNE.TODAY Demo Data — Ankara Blues/Rock Sahnesi
-- ==================================================
-- Kullanıcı UUID formatı : a00...00XX (auth + profile)
-- Artist UUID formatı    : b00...00XX
-- Band UUID formatı      : c00...00XX
-- ==================================================

-- 1. FAKE AUTH USERS
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated','tumer.dalgakiran@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated','bogac.imir@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000003','authenticated','authenticated','umutcan.guney@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated','cagri.erisen@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000005','authenticated','authenticated','omer.aydincilar@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000006','authenticated','authenticated','evren.tufekcioglu@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000007','authenticated','authenticated','mehmetali.acet@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000008','authenticated','authenticated','baturalp.ozcan@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000009','authenticated','authenticated','necip.ahishalio@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000010','authenticated','authenticated','aydin.aybar@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000011','authenticated','authenticated','ozgur.yildirim@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000012','authenticated','authenticated','tolga.baytore@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000013','authenticated','authenticated','can.bayoglu@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000014','authenticated','authenticated','baris.simsek@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000015','authenticated','authenticated','emre.alp@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000016','authenticated','authenticated','tamer.evsin@demo.sahne.today',crypt('Demo123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false)
ON CONFLICT (id) DO NOTHING;

-- 2. PROFILES
INSERT INTO public.profiles (id, role, display_name, city) VALUES
  ('a0000000-0000-0000-0000-000000000001','artist','Tümer Dalgakıran','Ankara'),
  ('a0000000-0000-0000-0000-000000000002','artist','Boğaç İmir','Ankara'),
  ('a0000000-0000-0000-0000-000000000003','artist','Umutcan Güney','Ankara'),
  ('a0000000-0000-0000-0000-000000000004','artist','Çağrı Erişen','Ankara'),
  ('a0000000-0000-0000-0000-000000000005','artist','Ömer Faruk Aydıncılar','Ankara'),
  ('a0000000-0000-0000-0000-000000000006','artist','Evren Tüfekçioğlu','Ankara'),
  ('a0000000-0000-0000-0000-000000000007','artist','Mehmet Ali Acet','Ankara'),
  ('a0000000-0000-0000-0000-000000000008','artist','Baturalp Özcan','Ankara'),
  ('a0000000-0000-0000-0000-000000000009','artist','Necip Ahışhalıoğlu','Ankara'),
  ('a0000000-0000-0000-0000-000000000010','artist','Aydın Aybar','Ankara'),
  ('a0000000-0000-0000-0000-000000000011','artist','Özgür Yıldırım','Ankara'),
  ('a0000000-0000-0000-0000-000000000012','artist','Tolga Baytöre','Ankara'),
  ('a0000000-0000-0000-0000-000000000013','artist','Can Bayoğlu','Ankara'),
  ('a0000000-0000-0000-0000-000000000014','artist','Barış Can Şimşek','Ankara'),
  ('a0000000-0000-0000-0000-000000000015','artist','Emre Alp','Ankara'),
  ('a0000000-0000-0000-0000-000000000016','artist','Tamer Evşin','Ankara')
ON CONFLICT (id) DO NOTHING;

-- 3. ARTISTS
INSERT INTO public.artists (id, profile_id, stage_name, instruments, city, genres, past_venues) VALUES
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Tümer Dalgakıran',ARRAY['Bas Gitar','Vokal'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29','Tenedos Ankara','Beat Taurous','Zürafa Pub','Terra Pub']),
  ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Boğaç İmir',ARRAY['Gitar'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29','Tenedos Ankara']),
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','Umutcan Güney',ARRAY['Klavye'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29','Tenedos Ankara']),
  ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','Çağrı Erişen',ARRAY['Davul'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29','Tenedos Ankara','Beat Taurous']),
  ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005','Ömer Faruk Aydıncılar',ARRAY['Vokal'],'Ankara',ARRAY['Blues'],ARRAY['Beat Taurous','Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000006','Evren Tüfekçioğlu',ARRAY['Gitar'],'Ankara',ARRAY['Blues'],ARRAY['Beat Taurous','Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000007','Mehmet Ali Acet',ARRAY['Gitar','Vokal'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Zürafa Pub','Deppo29','Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000008','Baturalp Özcan',ARRAY['Davul','Vokal'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Zürafa Pub','Deppo29','Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000009','Necip Ahışhalıoğlu',ARRAY['Klavye'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Zürafa Pub','Deppo29','Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000010','Aydın Aybar',ARRAY['Klavye'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29']),
  ('b0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000011','Özgür Yıldırım',ARRAY['Gitar'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29']),
  ('b0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000012','Tolga Baytöre',ARRAY['Vokal'],'Ankara',ARRAY['Blues','Rock'],ARRAY['Muddy Waters','Deppo29']),
  ('b0000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000013','Can Bayoğlu',ARRAY['Gitar','Vokal'],'Ankara',ARRAY['Blues'],ARRAY['Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000014','Barış Can Şimşek',ARRAY['Davul'],'Ankara',ARRAY['Blues'],ARRAY['Muddy Waters']),
  ('b0000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000015','Emre Alp',ARRAY['Gitar'],'Ankara',ARRAY['Blues'],ARRAY['Terra Pub']),
  ('b0000000-0000-0000-0000-000000000016','a0000000-0000-0000-0000-000000000016','Tamer Evşin',ARRAY['Davul'],'Ankara',ARRAY['Blues'],ARRAY['Terra Pub'])
ON CONFLICT (id) DO NOTHING;

-- 4. BANDS
INSERT INTO public.bands (id, creator_id, name, city, genres) VALUES
  ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Ankara Pi Stones','Ankara',ARRAY['Blues','Rock']),
  ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','Blues and Bones','Ankara',ARRAY['Blues']),
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000007','Boogie People','Ankara',ARRAY['Blues','Rock']),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000010','Müdüriyet','Ankara',ARRAY['Blues','Rock']),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000013','Texas Strut','Ankara',ARRAY['Blues']),
  ('c0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000015','Terra Blues Band','Ankara',ARRAY['Blues'])
ON CONFLICT (id) DO NOTHING;

-- 5. BAND MEMBERS
INSERT INTO public.band_members (band_id, artist_id, role, status, joined_at) VALUES
  -- Ankara Pi Stones
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Bas / Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','Gitar','accepted',now()),
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','Klavye','accepted',now()),
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','Davul','accepted',now()),
  -- Blues and Bones
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000005','Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','Bas','accepted',now()),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000006','Gitar','accepted',now()),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000004','Davul','accepted',now()),
  -- Boogie People
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000007','Gitar / Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000008','Davul / Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000009','Klavye','accepted',now()),
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','Bas','accepted',now()),
  -- Müdüriyet
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000010','Klavye','accepted',now()),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000004','Davul','accepted',now()),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000011','Gitar','accepted',now()),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000012','Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001','Bas','accepted',now()),
  -- Texas Strut
  ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000013','Gitar / Vokal','accepted',now()),
  ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','Bas','accepted',now()),
  ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000014','Davul','accepted',now()),
  -- Terra Blues Band
  ('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000015','Gitar','accepted',now()),
  ('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000001','Bas','accepted',now()),
  ('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000016','Davul','accepted',now())
ON CONFLICT (band_id, artist_id) DO NOTHING;
