-- ===========================================================================
-- ردیاب کار — ساختار دیتابیس
-- این فایل را کامل کپی کن و در Supabase → SQL Editor اجرا کن.
-- اجرای دوباره‌اش مشکلی ندارد.
-- ===========================================================================

-- یک تفاوت با طرح اولیه: کلید هر جدول به‌جای serial، uuid است.
-- دلیلش آفلاین بودن است: وقتی اینترنت نیست، اپ باید همان لحظه شناسه بسازد.
-- با serial، شناسه را سرور می‌سازد و تا وصل شدن اینترنت معلوم نیست چیست —
-- آن‌وقت time_log نمی‌داند به کدام task وصل شود. با uuid این مشکل کلاً حذف می‌شود.

create extension if not exists "pgcrypto";

do $$ begin
  create type bucket_t as enum ('company','personal','learning');
exception when duplicate_object then null; end $$;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bucket bucket_t not null,
  sort int default 0,
  is_active boolean default true
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bucket bucket_t not null,
  status text default 'active' check (status in ('active','paused','done')),
  started_on date,
  ended_on date
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket bucket_t not null,
  category_id uuid not null references categories(id),
  project_id uuid references projects(id),
  status text default 'open' check (status in ('open','done','blocked','cancelled')),
  created_on date not null default current_date,
  closed_on date,
  note text,
  archived_at timestamptz          -- حذف نداریم؛ فقط همین پر می‌شود
);

-- زمان، به تفکیک روز. یک کار می‌تواند چند روز زمان بخورد.
create table if not exists time_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  occurred_on date not null,
  minutes int,                     -- اختیاری: خالی هم باشد رکورد ثبت می‌شود
  note text,
  created_at timestamptz default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  at_office boolean not null,
  arrived_at time,
  left_at time,
  note text
);

create table if not exists pinned_notes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz default now(),
  dismissed_at timestamptz
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  needs_decision text,
  opened_on date not null default current_date,
  resolved_on date
);

-- جلسه‌های آینده — رویداد روی یک روز، جدا از task و time_log
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  day date not null,
  time_at time,
  note text,
  created_at timestamptz default now(),
  cancelled_at timestamptz
);

-- الگوی کار تکرارشونده — پرکردن سریع ثبت سریع، خودش زمان نمی‌گیرد
create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket bucket_t not null,
  category_id uuid references categories(id),
  project_id uuid references projects(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- مرور دوره‌ای — یک رکورد برای هر بازه‌ی زمانی که مرور شده
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  range_from date not null,
  range_to date not null,
  wins text,
  stuck text,
  next text,
  created_at timestamptz default now(),
  unique (range_from, range_to)
);

create index if not exists time_logs_day_idx    on time_logs (occurred_on);
create index if not exists time_logs_task_idx   on time_logs (task_id);
create index if not exists tasks_created_idx    on tasks (created_on);
create index if not exists tasks_status_idx     on tasks (status) where archived_at is null;
create index if not exists meetings_day_idx     on meetings (day);

-- ---------------------------------------------------------------------------
-- دسترسی
--
-- خواسته‌ات این بود: بدون لاگین و بدون رمز. پس سیاست زیر به کلید عمومی اپ
-- اجازه‌ی خواندن و نوشتن می‌دهد. یعنی هر کسی که آدرس اپ و کلید anon را داشته
-- باشد، به داده دسترسی دارد. چون اسم هیچ آدمی در داده نیست، ریسکش پایین است،
-- ولی صفر نیست — آدرس Vercel را جایی منتشر نکن.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories','projects','tasks','time_logs','attendance','pinned_notes','blockers','meetings','task_templates','reviews']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists anon_all on %I', t);
    execute format(
      'create policy anon_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- داده‌ی اولیه (دسته‌ها و پروژه‌ها) عمداً اینجا نیست:
-- خود اپ بار اول آن‌ها را می‌سازد و بالا می‌فرستد، تا دو نسخه‌ی تکراری درست نشود.
