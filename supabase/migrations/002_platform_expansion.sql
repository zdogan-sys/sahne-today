-- Profiles tablosuna pro alanları ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro_individual bool default false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_individual_since timestamptz;

-- Venues tablosuna pro ve alt tür alanları ekle
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_pro_venue bool default false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS pro_venue_since timestamptz;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_subtype text check (venue_subtype in ('live_music','studio','dance_studio','other'));

-- Kurslar tablosu
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id uuid references profiles(id) on delete cascade,
  venue_id uuid references venues(id),
  title text not null,
  description text,
  course_type text check (course_type in ('individual','group','package')) not null,
  category text check (category in ('music','dance','theater','other')) not null,
  subcategory text,
  level text check (level in ('beginner','intermediate','advanced','all')),
  duration_minutes int default 60,
  price_per_session numeric not null,
  currency text default 'TRY',
  min_participants int default 1,
  max_participants int default 1,
  min_female int default 0,
  min_male int default 0,
  is_online bool default false,
  location text,
  status text check (status in ('active','paused','full','cancelled')) default 'active',
  created_at timestamptz default now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses viewable by everyone" ON courses FOR SELECT USING (true);
CREATE POLICY "Instructors manage own courses" ON courses FOR ALL USING (auth.uid() = instructor_id);

-- Ders saatleri tablosu
CREATE TABLE IF NOT EXISTS course_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  status text check (status in ('available','booked','cancelled')) default 'available',
  created_at timestamptz default now()
);
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions viewable by everyone" ON course_sessions FOR SELECT USING (true);
CREATE POLICY "Instructors manage own sessions" ON course_sessions FOR ALL USING (
  auth.uid() = (SELECT instructor_id FROM courses WHERE id = course_id)
);

-- Kurs kayıtları tablosu
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  session_id uuid references course_sessions(id),
  student_id uuid references profiles(id),
  student_name text not null,
  student_email text not null,
  student_phone text not null,
  gender text check (gender in ('female','male','other')),
  status text check (status in ('pending','confirmed','cancelled','waitlist')) default 'pending',
  payment_status text check (payment_status in ('pending','paid','refunded')) default 'pending',
  paytr_order_id text,
  amount_paid numeric,
  created_at timestamptz default now()
);
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own enrollments" ON course_enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Instructors view their course enrollments" ON course_enrollments FOR SELECT USING (
  auth.uid() = (SELECT instructor_id FROM courses WHERE id = course_id)
);
CREATE POLICY "Anyone can enroll" ON course_enrollments FOR INSERT WITH CHECK (true);

-- Stüdyo rezervasyonları tablosu
CREATE TABLE IF NOT EXISTS studio_reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade,
  reserver_id uuid references profiles(id),
  reserver_name text not null,
  reserver_email text not null,
  reserver_phone text not null,
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  duration_hours numeric not null,
  price_per_hour numeric not null,
  total_price numeric not null,
  status text check (status in ('pending','confirmed','cancelled')) default 'pending',
  paytr_order_id text,
  notes text,
  created_at timestamptz default now()
);
ALTER TABLE studio_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reservations viewable by owner" ON studio_reservations FOR SELECT USING (
  auth.uid() = reserver_id OR
  auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id)
);
CREATE POLICY "Anyone can reserve" ON studio_reservations FOR INSERT WITH CHECK (true);
