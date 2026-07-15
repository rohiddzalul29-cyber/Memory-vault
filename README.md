# Memory Vault

Website pribadi untuk menyimpan foto, video, quotes, dan journal — dengan tampilan scrapbook/polaroid, dijaga password, dan didukung Supabase.

## Struktur Project

```
memory-vault/
├── index.html            # Halaman publik (login + Home/Memories/Quotes/Journal)
├── dashboard.html         # Halaman admin (login + kelola memory)
├── css/
│   ├── variables.css      # Token desain bersama (warna, font, login screen)
│   ├── index.css          # Style khusus index.html
│   └── dashboard.css      # Style khusus dashboard.html
├── js/
│   ├── supabase-config.js # Konfigurasi Supabase (URL, anon key, admin email)
│   ├── index.js           # Logic index.html
│   └── dashboard.js       # Logic dashboard.html
└── sql/
    └── schema.sql          # Seluruh SQL: tabel, RLS, function, storage bucket
```

## Langkah Setup

1. **Buat project Supabase** di https://supabase.com.

2. **Jalankan SQL**: buka *SQL Editor* di Supabase, tempel isi `sql/schema.sql`, lalu jalankan.
   Sebelum menjalankan, ganti `'ganti-password-ini'` pada bagian `insert into settings`
   dengan password yang kamu inginkan untuk halaman publik (`index.html`).

3. **Buat akun admin untuk dashboard**:
   Buka *Authentication > Users > Add user*, isi email bebas (misalnya
   `admin@memoryvault.local`) dan password pilihanmu. Password ini yang
   akan dipakai untuk login ke `dashboard.html`.

4. **Isi konfigurasi** di `js/supabase-config.js`:
   - `SUPABASE_URL` dan `SUPABASE_ANON_KEY` → ambil dari *Project Settings > API*.
   - `ADMIN_EMAIL` → samakan dengan email admin yang dibuat di langkah 3.

5. **Buka `index.html`** untuk halaman publik, dan **`dashboard.html`** untuk mengelola memory.
   Bisa dijalankan langsung dari file, atau di-hosting di layanan static hosting
   apa pun (Netlify, Vercel, GitHub Pages, dll).

## Catatan Keamanan (penting untuk dibaca)

- **Dashboard** aman secara nyata: menggunakan Supabase Auth (email + password),
  dan semua operasi tambah/ubah/hapus memory diproteksi Row Level Security
  yang memeriksa status login (`auth.role() = 'authenticated'`). Tanpa login,
  operasi ini akan selalu ditolak oleh database — bukan hanya disembunyikan di UI.

- **Halaman publik (`index.html`)** memakai model "shared password" sederhana:
  password dicek lewat function `verify_site_password` di database (hash-nya
  tidak pernah dikirim ke browser), tapi setelah lolos, konten `memories`
  diambil lewat query biasa yang **bisa dibaca siapa pun yang memiliki anon key**
  (anon key memang publik dan terlihat di kode frontend). Artinya password
  gate ini efektif untuk mencegah orang lewat *browsing biasa*, tapi bukan
  proteksi tingkat database terhadap seseorang yang sengaja memanggil API
  Supabase secara langsung.

  Untuk kebutuhan personal (menyimpan kenangan, bukan data sangat sensitif),
  ini biasanya cukup. Jika ke depannya kamu ingin proteksi yang lebih ketat,
  opsi upgrade-nya adalah mengubah halaman publik untuk memakai Supabase Auth
  juga (bukan cuma password gate), sehingga policy `memories_public_select`
  bisa diubah menjadi `using (auth.role() = 'authenticated')`.

## Quotes & Journal

Kedua tab ini sengaja dibuat sederhana (data statis di `js/index.js`,
pada variabel `QUOTES` dan `JOURNAL_ENTRIES`) karena tidak diminta sebagai
tabel Supabase pada spesifikasi awal. Edit langsung isinya di file tersebut,
atau kembangkan menjadi tabel Supabase sendiri kapan saja jika ingin
mengelolanya lewat dashboard.
