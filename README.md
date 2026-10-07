# Tali

PWA influencer campaign untuk nano dan micro creator: tim Tali mengkurasi job, creator mengirim storyline/draft/caption, lalu mencairkan fee setelah posting sesuai term of payment (TOP). Transfer manual oleh admin keuangan, maksimal H+3 hari kerja.

Spesifikasi produk: [`docs/PRD.md`](docs/PRD.md). Identitas brand: [`BRAND.md`](BRAND.md). Konvensi kode: [`CLAUDE.md`](CLAUDE.md).

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript, Tailwind CSS v4 dengan token di `styles/tokens.css`
- Supabase: Postgres + RLS, Auth (OTP email + Google), Storage (bucket privat `uploads`)
- next-intl (`id` default, `en`), PWA (manifest + `public/sw.js`), Web Push, email via Resend
- Deploy di Railway (aplikasi + cron)

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi nilai Supabase dan kunci lainnya
npm run dev                  # http://localhost:3000
```

Pemeriksaan yang sama dengan CI:

```bash
npm run lint && npm run typecheck && npm test && npm run i18n && npm run build
npm run db:test   # migrasi + tes RLS/aturan bisnis di PostgreSQL lokal (butuh initdb/pg_ctl/psql)
```

`npm run db:test` menjalankan `supabase/migrations/*.sql` di PostgreSQL biasa dengan shim kecil (`supabase/tests/shim.sql`) pengganti skema `auth`/`storage` Supabase, lalu `supabase/tests/rls_and_rules.sql`.

## Setup Supabase (sekali)

1. Buat project baru, region **Singapore**. Paket gratis cukup untuk pilot (lihat batasnya di PRD).
2. **Database**: jalankan semua file di `supabase/migrations/` **berurutan sesuai nama** di SQL Editor (setiap file sekali saja), atau `npx supabase link` lalu `npx supabase db push`. Setiap ada file migrasi baru, jalankan file itu saja.
3. **Auth → Providers**
   - Email: aktif. Di **Authentication → Emails → Templates**, isi dua template dengan file di `supabase/templates/` (aplikasi login pakai kode 6 digit `{{ .Token }}`, tanpa link):

     | Template | Subject | Body |
     | --- | --- | --- |
     | Magic Link | `{{ .Token }} adalah kode masuk Tali kamu` | `supabase/templates/magic-link.html` |
     | Confirm signup | `Selamat datang di Tali, ini kode verifikasimu` | `supabase/templates/confirm-signup.html` |
   - Google: aktifkan dan isi Client ID/Secret dari Google Cloud Console. Di consent screen Google, isi privacy policy `https://<domain>/privasi` dan terms `https://<domain>/ketentuan`.
4. **Auth → URL Configuration**: Site URL = URL Railway, tambahkan `https://<domain>/auth/callback` ke Redirect URLs.
5. **Project Settings → API**: salin URL, `anon` key, dan `service_role` key ke environment variable.
6. **Akun staf**: login sekali ke aplikasi, lalu set perannya di SQL Editor:

   ```sql
   update public.profiles set role = 'owner'   where email = 'founder@tali.id';  -- kurator + keuangan
   update public.profiles set role = 'curator' where email = 'kurator@tali.id';
   update public.profiles set role = 'finance' where email = 'keuangan@tali.id';
   ```

7. **Hari libur nasional**: isi lewat menu Admin → Hari libur, supaya tenggat H+3 hari kerja tepat.

## Deploy di Railway

1. New Project → Deploy from GitHub repo ini. Railway mendeteksi Next.js: build `npm run build`, start `npm start`. Pilih region Asia (Singapore).
2. Isi variable sesuai `.env.example`:

   | Variable | Keterangan |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dari Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Hanya untuk cron/pengiriman notifikasi; jangan dibagikan |
   | `NEXT_PUBLIC_SITE_URL` | URL publik, mis. `https://tali.up.railway.app` sampai domain final dipilih |
   | `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32`. Mengenkripsi nomor rekening, HP, alamat. **Simpan cadangannya**: kalau hilang, data terenkripsi tidak bisa dibaca |
   | `CRON_SECRET` | String acak panjang untuk endpoint cron |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Opsional, untuk email notifikasi |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Opsional, untuk Web Push (`npx web-push generate-vapid-keys`) |
   | `CONTACT_WA`, `CONTACT_EMAIL` | Opsional, kontak brand di halaman pembuka. WA format internasional tanpa `+` (mis. `62812...`). Tombol tidak tampil kalau kosong |

3. Generate domain di Settings → Networking.
4. **Cron**: tambahkan dua service Cron di project yang sama (image `curlimages/curl` atau repo ini), dengan variable `APP_URL` dan `CRON_SECRET`:

   | Jadwal (UTC) | Command |
   | --- | --- |
   | `0 0 * * *` (07:00 WIB) | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/daily` |
   | `*/10 * * * *` | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/deliver` |

   `daily` mengirim notifikasi "fee siap dicairkan" dan pengingat tenggat ke admin keuangan. `deliver` mengirim email/push yang tertunda (aksi di aplikasi juga langsung mencoba mengirim).

5. **Backup** (paket gratis Supabase tidak punya backup otomatis): jalankan `pg_dump` terjadwal dari connection string Supabase dan simpan di luar Supabase, atau upgrade ke Pro sebelum pilot dengan transfer sungguhan.

## Struktur

```
app/
  page.tsx, masuk/, auth/, lanjut/   pembuka, login, callback, keluar, redirect per peran
  onboarding/                        profil + akun sosial (link → username otomatis)
  (creator)/                         beranda, job, partisipasi/[id], saldo, profil, notifikasi
  admin/                             ringkasan, job, review, partisipasi/[id], akun-sosial, pencairan, klien, libur
  api/cron/                          daily, deliver
components/                          UI berbrand (components/ui), form server action, uploader foto
lib/                                 auth, Supabase client, enkripsi, uang, tanggal kerja, parsing link sosial, notifikasi
messages/                            id.json, en.json (cek dengan npm run i18n)
supabase/migrations/                 skema, RLS, fungsi bisnis
supabase/tests/                      tes SQL
tests/                               tes unit (vitest)
```

## Kebijakan Privasi dan Syarat & Ketentuan

Teksnya ada di `messages/*.json` (`legal.privacy`, `legal.terms`), tanggal berlaku di `components/legal-page.tsx`. Isinya mengikuti cara aplikasi memakai data; minta orang yang paham hukum meninjau sebelum dianggap final, dan perbarui teks serta tanggalnya bila alur data berubah.

## Aturan yang dijaga di database

Semua penulisan data penting lewat fungsi `security definer` yang memvalidasi peran dan tahap:

- Creator bisa gabung job bila profil lengkap dan punya akun di platform job, boleh yang masih menunggu verifikasi (open rate: rate wajib, tidak boleh melebihi batas atas). Kurator baru bisa menerima pelamar setelah akunnya terverifikasi dan followers memenuhi syarat.
- Brand bisa disamarkan per job: `jobs.brand_name` berisi label yang dilihat publik dan pelamar, nama asli di tabel `job_brands` yang hanya bisa dibaca staf serta creator yang diundang/diterima. Form job menolak simpan bila nama asli masih tertulis di teks publik job.
- Pengunjung tanpa login melihat ringkasan job yang buka lewat `public_open_jobs()` (tanpa brief); tabel `jobs` tidak bisa dibaca anon.
- Storyline harus disetujui sebelum draft/caption; versi baru hanya bila diminta revisi; revisi tidak dibatasi.
- Posting hanya setelah draft dan caption disetujui; `ready_at` = tanggal konfirmasi + TOP.
- Pencairan: minimal Rp 10.000, biaya Rp 2.500 kecuali BCA/Mandiri, tenggat 3 hari kerja (melewati Sabtu, Minggu, tabel `holidays`), jejak audit di `payout_events`. Pencairan gagal melepas job agar bisa diajukan ulang.
