// =========================================================
// KONFIGURASI SUPABASE
// Ganti dua nilai di bawah dengan milik project Supabase kamu.
// Keduanya AMAN untuk ditaruh di frontend (anon key memang public,
// keamanan sesungguhnya diatur lewat RLS & function di database).
// =========================================================
const SUPABASE_URL = "https://kmyrozbzkxarlnfzbnnw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXJvemJ6a3hhcmxuZnpibm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTQ0NDcsImV4cCI6MjA5OTU5MDQ0N30.7rrQaRV1n2nQrlbF8Vbw-el2hfwG3P20oA_IlcW5uFw";

// Dipakai oleh dashboard.html untuk sign-in ke Supabase Auth.
// Ganti sesuai email user yang kamu buat di
// Supabase Dashboard > Authentication > Users.
const ADMIN_EMAIL = "rohiddzalul29@gmail.com";

// Nama bucket storage tempat foto & video disimpan.
const MEDIA_BUCKET = "memory-media";

// Membuat satu instance client Supabase yang dipakai di seluruh app.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
