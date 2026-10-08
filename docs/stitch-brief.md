# Brief Google Stitch — Tali (3 layar inti)

Tempel bagian "Prompt" ke Google Stitch (mode **Mobile**). Kalau Stitch menerima gambar, lampirkan juga screenshot layar yang sekarang (lihat daftar di bawah) supaya hasilnya tidak terlalu jauh dari isi aplikasi.

---

## Prompt

Design a mobile web app (PWA), 360px wide, in Indonesian, for **Tali**, a platform where nano and micro content creators (1K–100K followers) join brand campaigns curated by the Tali team. Creators are young Indonesians on TikTok/Instagram; many are new to paid collaborations. The app must feel trustworthy and calm, like a good banking app (Jago, GoPay), and clear about money, like Upwork. Avoid hype, crypto vibes, gradients and stock-photo heroes.

**Brand**
- Font: Plus Jakarta Sans only. Money in tabular numbers, weight 700–800, format "Rp 1.250.000".
- Colors: Nila #24206B (primary, buttons on light bg, headers), Limau #C8F03C (accent, only on Nila backgrounds), Gading #F7F5EF (text on Nila), text #1A174F, secondary text #4A4870, app background #F6F5FA, borders #E3E1EE, success #1F8A5B, warning #B5700A, danger #C2362F, info #4B44A8.
- Primary button on light background: Nila fill, Gading text. On Nila background: Limau fill, Nila text.
- Radius: cards 16px, buttons 14px, chips fully rounded. Lucide-style line icons, 2px stroke.
- Bottom navigation with 4 tabs: Beranda, Job, Saldo, Profil. Header: small "tali" logo left, bell icon right.
- Copy tone: plain everyday Indonesian, short sentences, no jargon (no "TOP", "deliverable", "open rate").

**Screen 1 — Daftar job ("Job yang buka")**
- Title "Job yang buka", subtitle "Fee, syarat, dan tanggal cair sudah terlihat sebelum kamu daftar."
- Horizontal filter chips: Semua, Instagram, TikTok, YouTube.
- Job cards. Each card: a brand avatar (logo, or a category icon in a light Nila square when the brand is hidden), brand label, job title, fee in large bold, chips for job type + platforms, and 2–3 small facts with icons.
  - Card A: "Brand snack nasional" (hidden brand, food icon) · "Review wafer coklat baru" · fee "Ajukan rate-mu", "Maksimal Rp 750.000" · chips "Dari rumah", "TikTok", "Instagram" · facts "Fee cair tiap tanggal 21", "Daftar sampai 20 Okt 2026", "Posting paling lambat 5 Nov 2026".
  - Card B: "Klinik kecantikan" (beauty icon) · "Coba facial di cabang Kemang" · "Rp 400.000" · chips "Datang ke lokasi", "Instagram" · "Fee cair 7 hari setelah posting", "Daftar sampai 15 Okt 2026".
  - Card C: "Kopi Kenangan Senja" (real logo) · "Konten menu musim hujan" · "Rp 150.000 – Rp 2.500.000" (fee per account size) · "TikTok" · "Fee cair 14 hari setelah posting".

**Screen 2 — Detail job** (Card A)
- Back link "‹ Job". Brand avatar + "Brand snack nasional" + title.
- Summary card: label "Fee", big "Ajukan rate-mu", "Maksimal Rp 750.000", note "Satu fee untuk semua platform di atas.", chips, then a list with icons: wallet "Fee cair tiap tanggal 21", calendar "Daftar sampai 20 Okt 2026", calendar-check "Posting paling lambat 5 Nov 2026", people "Untuk 20 creator".
- Card "Kapan fee cair": "Fee cair tiap tanggal 21. Patokannya tanggal kamu mengirim insight postingan." Then a 2-row mini table: "Insight dikirim sampai 14 Okt → cair 21 Okt" and "Insight dikirim setelah 14 Okt → cair 21 Nov". Footnote: "Setelah kamu ajukan pencairan, uang masuk paling lambat 3 hari kerja."
- Card "Yang perlu kamu buat": "1 video TikTok (30–60 detik) + 1 Reels Instagram dengan audio yang sama." Then "Syarat": bullets "Minimal 1.000 followers", "Niche: Kuliner", "Persona: Gen Z".
- Collapsed accordion "Detail lainnya" (brief, product, review time).
- Share buttons: "Bagikan", "WhatsApp".
- Sticky action bar above the bottom nav: label "Rate yang kamu ajukan", a money input with "Rp" prefix showing "350.000", and a Nila button "Daftar job ini"; small hint "Total untuk semua yang perlu kamu buat di job ini. Maksimal Rp 750.000."

**Screen 3 — Progres kerjaan** (after the creator is picked)
- Header: brand + job title, chip "Terpilih", fee agreed "Rp 350.000".
- A vertical step tracker with dates: Terpilih (2 Okt) ✓, Produk diterima (5 Okt) ✓, Ide konten disetujui (7 Okt, 1 revisi) ✓, Draft konten — current step, Caption, Sudah posting, Insight disetujui, Fee ditransfer.
- Current step card "Draft konten": status chip "Perlu revisi" (warning color), two separate feedback boxes "Feedback tim Tali: Audio terlalu pelan di detik 10–15." and "Feedback brand: Tolong tampilkan kemasan lebih lama.", a field "Link Google Drive", photo upload tiles, button "Kirim revisi".
- History list: "Kiriman awal · dikirim 8 Okt", "Revisi 1 · dikirim 9 Okt".
- Locked cards below in muted style: "Caption — bisa dikirim setelah draft disetujui", "Posting — kamu bisa posting setelah draft dan caption disetujui".

Make 2 variations per screen: one calm and airy, one denser with stronger Nila headers.

---

## Screenshot yang membantu (opsional, dari HP kamu)

1. Halaman **Job** (daftar) dan **detail job** versi terbaru, setelah PR ini di-deploy.
2. Halaman **progres kerjaan** (`/partisipasi/...`) dari akun creator yang sudah terpilih. Paling penting, karena belum pernah saya lihat dengan data asli.
3. Halaman **Saldo** dan **Beranda** kalau sudah ada isinya.
4. Hasil Stitch yang kamu suka. Kirim ke sini, nanti saya terjemahkan ke komponen yang ada (warna dan font tetap dari token).
