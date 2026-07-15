-- =========================================================
-- MEMORY VAULT — SUPABASE SCHEMA
-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- =========================================================

-- Aktifkan extension untuk hashing password (bcrypt)
create extension if not exists pgcrypto;

-- =========================================================
-- 1. TABEL: settings
-- Menyimpan hash password untuk halaman publik (index.html)
-- Hanya boleh dibaca lewat function RPC (verify_site_password),
-- tidak pernah dibaca langsung oleh client.
-- =========================================================
create table if not exists settings (
  id int primary key default 1,
  site_password_hash text not null,
  updated_at timestamptz default now(),
  constraint settings_single_row check (id = 1)
);

alter table settings enable row level security;
-- Sengaja TIDAK dibuat policy select/insert/update untuk anon/authenticated.
-- Artinya table ini sepenuhnya terkunci dari akses langsung client,
-- hanya bisa diakses lewat function SECURITY DEFINER di bawah.

-- Masukkan password awal untuk halaman index.
-- Ganti 'ganti-password-ini' dengan password yang kamu inginkan lalu jalankan.
insert into settings (id, site_password_hash)
values (1, crypt('R26H01D08', gen_salt('bf')))
on conflict (id) do update set site_password_hash = excluded.site_password_hash;


-- =========================================================
-- 2. TABEL: memories
-- Menyimpan seluruh data memory (foto/video + caption dsb).
-- =========================================================
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  description text,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  memory_date date not null,
  created_at timestamptz default now()
);

alter table memories enable row level security;

-- Siapa saja boleh MEMBACA memories (halaman publik index.html
-- yang sudah dilindungi password gate akan menampilkan data ini).
create policy "memories_public_select"
  on memories for select
  using (true);

-- Hanya user yang sudah login (Supabase Auth) yang boleh menambah,
-- mengubah, atau menghapus memory — ini yang dipakai oleh dashboard.html.
create policy "memories_authenticated_insert"
  on memories for insert
  with check (auth.role() = 'authenticated');

create policy "memories_authenticated_update"
  on memories for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "memories_authenticated_delete"
  on memories for delete
  using (auth.role() = 'authenticated');


-- =========================================================
-- 3. FUNCTION: verify_site_password
-- Mengecek password halaman publik TANPA pernah mengirim hash
-- ke client. Function ini "SECURITY DEFINER" sehingga bisa
-- membaca tabel settings meski tabel itu terkunci RLS.
-- =========================================================
create or replace function verify_site_password(input_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  select site_password_hash into stored_hash from settings where id = 1;
  if stored_hash is null then
    return false;
  end if;
  return stored_hash = crypt(input_password, stored_hash);
end;
$$;

-- Izinkan anon & authenticated memanggil function ini (tapi tidak
-- bisa membaca isi tabel settings secara langsung).
grant execute on function verify_site_password(text) to anon, authenticated;


-- =========================================================
-- 4. STORAGE BUCKET untuk foto & video
-- =========================================================
insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', true)
on conflict (id) do nothing;

-- Siapa saja boleh melihat/mengunduh file (karena bucket public,
-- dan halaman publik butuh menampilkan foto/video-nya).
create policy "memory_media_public_read"
  on storage.objects for select
  using (bucket_id = 'memory-media');

-- Hanya user yang login (dashboard) yang boleh upload / update / hapus file.
create policy "memory_media_authenticated_insert"
  on storage.objects for insert
  with check (bucket_id = 'memory-media' and auth.role() = 'authenticated');

create policy "memory_media_authenticated_update"
  on storage.objects for update
  using (bucket_id = 'memory-media' and auth.role() = 'authenticated');

create policy "memory_media_authenticated_delete"
  on storage.objects for delete
  using (bucket_id = 'memory-media' and auth.role() = 'authenticated');


-- =========================================================
-- 5. SETUP AKUN ADMIN UNTUK DASHBOARD
-- Dashboard menggunakan Supabase Auth (email + password) supaya
-- RLS di atas benar-benar berlaku (auth.role() = 'authenticated').
-- Buat user admin lewat:
--   Supabase Dashboard > Authentication > Users > Add user
-- Isi email & password sesuka kamu (email tidak perlu nyata,
-- misalnya admin@memoryvault.local), lalu masukkan email yang
-- sama ke ADMIN_EMAIL di js/dashboard-config.js
-- =========================================================
