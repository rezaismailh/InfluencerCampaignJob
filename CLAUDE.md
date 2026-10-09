# CLAUDE.md — Tali

Tali adalah PWA influencer marketing untuk nano & micro creator (pasar Indonesia, siap ekspansi global).
**Baca `BRAND.md` sebelum membuat UI, copy, atau aset apa pun.** Semua warna, font, logo, dan tone mengikuti dokumen itu.
**Spesifikasi produk ada di `docs/PRD.md`.** Kalau kode dan PRD berbeda, tanyakan dulu sebelum mengubah perilaku.

## Keputusan produk yang memengaruhi kode

- Brand **bukan** pengguna aplikasi. Peran: `creator`, `curator`, `finance`, `owner` (kurator + keuangan).
- Job dikurasi tim Tali; tipe `non_visit` / `visit` / `both` (klien memilih per creator: kurator menetapkan `work_mode` saat menerima). Fee `fixed`, `open` (creator mengajukan rate, batas atas opsional) atau `tier`; job `both` punya fee visit terpisah (`fee_visit`, `rate_cap_visit`, `tier_fees_visit`, lihat `public.mode_fee`). Satu job bisa beberapa platform dengan satu fee.
- Syarat creator opsional per job: gender, hijab (khusus perempuan), jenis akun. Disimpan di profil; yang belum mengisi ditanya saat daftar. Niche/persona di job hanya info (tidak menyaring).
- Storyline (link Google Docs) → draft (link Google Drive / foto) → caption; masing-masing wajib disetujui, revisi tidak dibatasi, feedback tim Tali dan brand dicatat terpisah. Kurator bisa menandai disetujui di luar aplikasi (`mark_offline_approved`) dan mengisi link postingan atas nama creator (`staff_submit_post`).
- Pencairan manual by request setelah TOP: H+7/H+14/H+30, atau tanggal bayar bulanan dengan cut-off (mis. bayar tgl 21, cut-off tgl 14). Patokannya tanggal posting dikonfirmasi, atau tanggal insight dikirim kalau job mewajibkan insight (`public.ready_date`). Minimal Rp 10.000, biaya Rp 2.500 kecuali BCA/Mandiri, transfer maks. H+3 hari kerja. Tidak ada unggah bukti transfer; admin keuangan menandai status.
- Tidak ada Xendit, eKYC, potong PPh, atau akses klien di MVP.

## Stack

| Lapisan | Pilihan |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions) + **TypeScript**. Middleware bernama `proxy.ts` |
| Styling | **Tailwind CSS v4** + `styles/tokens.css` (`bg-nila-800`, `text-limau-400`) |
| Komponen UI | Komponen sendiri di `components/ui` + ikon **Lucide** |
| PWA | `app/manifest.ts` + `public/sw.js` (cache shell, offline, push) |
| Backend & DB | **Supabase** (Postgres, Auth, Storage, RLS), region Singapura, paket gratis dulu |
| Form & validasi | Server Actions + **Zod**; aturan uang dan urutan review ada di fungsi SQL |
| i18n | **next-intl** tanpa prefix URL (cookie `NEXT_LOCALE`, `id` default, `en`) |
| Notifikasi | Tabel `notifications` (in-app) + email (Brevo/Resend) + Web Push, dikirim `lib/notify.ts` |
| Hosting | **Railway** (aplikasi + cron yang memanggil `/api/cron/*`) |

## Konvensi

- Mobile-first. Uji di lebar 360px.
- Semua warna dari token; **jangan** menulis hex langsung di komponen.
- Semua teks UI lewat `next-intl` (`messages/id.json`, `messages/en.json`). Jalankan `npm run i18n` setelah menambah key.
- Uang disimpan sebagai **integer rupiah**. Tampilkan dengan `formatRupiah` (`lib/money.ts`) dan kelas `tabular`.
- Semua tabel memakai RLS. Penulisan yang melibatkan uang, status, atau urutan review lewat fungsi `security definer` di migrasi, bukan update langsung.
- Data pribadi (rekening, HP, alamat) dienkripsi di server dengan `lib/crypto.ts`; nomor rekening ke creator selalu tersamar (`•••4417`).
- Status pencairan: `requested` (diajukan), `processing` (diproses), `transferred` (ditransfer), `failed` (gagal), semuanya tercatat di `payout_events`.
- Error dari fungsi SQL berupa kode (`below_minimum`, `storyline_not_approved`, …) yang dipetakan ke `messages.*.errors` lewat `lib/action-state.ts`.
- Aset logo ada di `public/brand/` dan `public/icons/` — pakai file SVG, jangan menggambar ulang logo dengan teks.

## Pemeriksaan sebelum commit

```bash
npm run lint && npm run typecheck && npm test && npm run i18n && npm run build && npm run db:test
```

## Struktur folder

```
app/(creator)/        beranda, job, partisipasi/[id], saldo, profil, notifikasi
app/admin/            kurasi job, review, akun sosial, pencairan, klien, hari libur
app/onboarding/       profil + akun sosial
app/api/cron/         daily (fee siap, pengingat SLA), deliver (email/push)
components/ui/        komponen berbrand
lib/                  auth, supabase, crypto, money, dates, social, payout, notify
messages/             id.json, en.json
supabase/migrations/  skema + RLS + fungsi
supabase/tests/       tes SQL (npm run db:test)
tests/                tes unit (vitest)
```
