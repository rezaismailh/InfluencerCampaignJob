# Tali — Brand Brief

Dokumen ini adalah sumber kebenaran untuk identitas brand Tali. Semua keputusan desain, copy, dan UI di aplikasi harus mengikuti dokumen ini. Jika ada yang tidak tercakup, pilih opsi yang paling sejalan dengan **Janji Brand** di bawah.

---

## 1. Ringkasan produk

**Tali** adalah platform influencer marketing yang menghubungkan brand dengan **nano dan micro creator** (kisaran ribuan hingga puluhan ribu followers). Modelnya mirip Partipost: brand membuat campaign, banyak creator kecil ikut serta, dampaknya kolektif.

- **Pasar awal:** Indonesia.
- **Arah jangka panjang:** ekspansi ke Asia Tenggara dan pasar global. Nama, visual, dan copy dirancang tidak terlalu lokal.
- **Bentuk produk awal:** Progressive Web App (PWA), mobile-first.
- **Dua sisi pengguna:**
  - **Creator** — mendaftar, ikut campaign, mengunggah konten, menerima pembayaran.
  - **Brand / agensi** — membuat campaign, memilih creator, menyetujui konten, membayar.

## 2. Janji brand

> **Trusted. Dibayar tepat waktu. Membantu creator menghasilkan.**

Tiga hal ini adalah alasan creator memilih Tali dibanding platform lain. Setiap fitur dan setiap kalimat di aplikasi harus memperkuat setidaknya satu dari ketiganya. Khususnya, **status pembayaran harus selalu jelas, transparan, dan mudah ditemukan.**

**Janji vs. copy publik.** "Dibayar tepat waktu" adalah standar kerja internal (target transfer H+1, batas publik 3 hari kerja), bukan headline. Di copy publik, tunjukkan mekanismenya: tanggal cair terlihat sebelum gabung, setiap pengajuan punya tenggat yang bisa dipantau. Hindari klaim kata sifat ("tepat waktu", "terpercaya", "tercepat") dan klaim yang tidak sepenuhnya di tangan Tali.

**Positioning.** Untuk nano dan micro creator Indonesia, Tali adalah tempat ikut campaign terkurasi yang setiap langkahnya jelas dan tercatat, dari brief sampai transfer. Platform lain dibangun untuk brand; Tali dibangun dari sisi creator. Headline creator: *"Campaign yang jelas, dari brief sampai transfer."* Pesan untuk brand dipisah (campaign dikelola penuh, creator dikurasi, konten direview sebelum tayang).

## 3. Nama & filosofi

**Tali** berarti ikatan. Platform ini adalah tali yang mengikat kepercayaan antara brand dan creator: brand yakin kontennya dikerjakan, creator yakin dibayar. Ada juga makna *tali rezeki* — tali yang mengantarkan penghasilan ke creator.

- Ditulis selalu dengan huruf kecil dalam logo: **tali**.
- Dalam kalimat ditulis **Tali** (huruf kapital di awal).
- Jangan ditulis TALI (kapital semua), T.A.L.I, atau Tali.id dalam kalimat biasa.

**Tagline:** *Tied to trust.*
Versi Indonesia (opsional, untuk konteks lokal): *Ikatan yang menghasilkan.*

## 4. Logo

### 4.1 Wordmark (logo utama) — "Satu Tarikan"
Wordmark monoline "tali". Palang huruf **t** membentang melewati **a** dan **l**, lalu berakhir di **titik huruf i** yang berwarna limau. Titik itu adalah **simpul** — ujung tali yang mengikat. Satu tarikan dari awal sampai akhir = satu ikatan dari brief sampai pembayaran.

| File | Pemakaian |
|---|---|
| `assets/tali-wordmark-dark-bg.svg` | Di atas latar nila/gelap (versi utama) |
| `assets/tali-wordmark-light-bg.svg` | Di atas latar terang/putih |
| `assets/tali-wordmark-bold-dark-bg.svg` | Ukuran kecil (tinggi < 32px), misal header aplikasi |

### 4.2 Ikon aplikasi — "Klasik"
Huruf **t** dengan simpul limau di latar nila.

| File | Pemakaian |
|---|---|
| `assets/tali-icon.svg`, `favicon.svg` | Favicon, ikon umum |
| `assets/icon-192.png`, `icon-512.png` | PWA manifest (`purpose: any`) |
| `assets/icon-maskable-512.png` | PWA manifest (`purpose: maskable`) |
| `assets/apple-touch-icon.png` | iOS home screen (180×180) |
| `assets/tali-icon-round.svg`, `social-avatar-1080.png` | Foto profil media sosial (dipotong bulat) |

### 4.3 Aturan logo
- **Simpul (titik) selalu berwarna limau.** Di latar gelap pakai `limau-400 #C8F03C`; di latar terang pakai `limau-700 #5E8A00` karena limau terang tidak terbaca di atas putih.
- Ruang kosong di sekeliling logo minimal setinggi huruf **a** pada wordmark.
- Tinggi minimum wordmark: 20px (pakai versi bold di bawah 32px).
- **Jangan:** memutar, memiringkan, memberi bayangan, gradien, outline, mengganti font wordmark dengan teks biasa, atau mengubah warna simpul menjadi selain limau.
- Wordmark adalah gambar (SVG), **bukan** teks bertipe font. Jangan menulis ulang "tali" dengan Plus Jakarta Sans sebagai logo.

## 5. Warna — palet "Nila & Limau"

Filosofi: **nila** adalah pewarna alami tenun dan batik Nusantara — memberi kesan dalam, terpercaya, dan berakar. **Limau** memberi energi muda dan menonjol di layar. Nila = sisi platform yang aman; limau = sisi creator yang bersemangat.

### 5.1 Warna inti
| Nama | Hex | Peran |
|---|---|---|
| Nila | `#24206B` | Warna utama brand, latar splash, header, tombol sekunder |
| Limau | `#C8F03C` | Aksen: simpul logo, tombol aksi utama **di atas latar nila**, highlight pembayaran |
| Gading | `#F7F5EF` | Teks dan garis terang di atas nila |
| Limau tua | `#5E8A00` | Aksen limau versi latar terang |
| Teks | `#1A174F` | Teks utama di latar terang |
| Teks redup | `#4A4870` | Teks sekunder |
| Latar | `#F6F5FA` | Latar aplikasi mode terang |
| Garis | `#E3E1EE` | Border, pemisah |

Skala lengkap ada di `tokens.css` (Tailwind v4) dan `tokens.json`.

### 5.2 Warna semantik
| Nama | Hex | Pemakaian |
|---|---|---|
| Sukses | `#1F8A5B` | Pembayaran berhasil, konten disetujui |
| Peringatan | `#B5700A` | Menunggu review, mendekati deadline |
| Bahaya | `#C2362F` | Gagal, ditolak, error |
| Info | `#4B44A8` | Informasi netral |

### 5.3 Aturan warna
- **Limau tidak pernah dipakai sebagai warna teks di latar terang.** Di latar terang, limau hanya untuk elemen kecil (titik, badge) dan versi `limau-700`.
- Tombol aksi utama:
  - Di latar nila → latar limau `#C8F03C`, teks nila `#24206B`.
  - Di latar terang → latar nila `#24206B`, teks gading `#F7F5EF`.
- Rasio aksen: nila dominan, limau maksimal ±10% area layar. Limau adalah "momen" — saldo, tombol utama, status dibayar — bukan dekorasi.
- Jangan pakai gradien. Jangan pakai hitam murni atau near-black (`#000`, `#111`) sebagai latar; gunakan nila-950 `#110E35` untuk mode gelap.
- Semua teks wajib kontras minimal 4.5:1 (3:1 untuk teks ≥ 24px).

## 6. Tipografi

**Plus Jakarta Sans** (Google Fonts) — satu keluarga font untuk semua. Font ini dibuat oleh desainer Indonesia, selaras dengan cerita brand.

| Gaya | Ukuran / line-height | Weight |
|---|---|---|
| Display | 40 / 48 | 800 |
| H1 | 32 / 40 | 800 |
| H2 | 24 / 32 | 700 |
| H3 | 20 / 28 | 700 |
| Body | 16 / 24 | 400–500 |
| Label / tombol | 15 / 20 | 700 |
| Caption | 13 / 18 | 500 |

- **Angka uang** (saldo, fee, payout) memakai `font-variant-numeric: tabular-nums` dan weight 700–800. Format: `Rp 1.250.000` (titik sebagai pemisah ribuan).
- Gunakan sentence case. Jangan pakai ALL CAPS untuk label atau judul.
- Letter-spacing negatif ringan (−0.5 sampai −1px) hanya untuk Display dan H1.

## 7. Bentuk & layout

- Radius: 8 / 12 / 16 / 24px. Kartu 16px, tombol 14–16px, chip 999px. Hierarki boleh berbeda radius — jangan seragamkan semuanya.
- Mobile-first: desain di lebar 360–430px dulu, lalu perlebar.
- Touch target minimal 44×44px.
- Garis (stroke) ikon: rounded cap, 2px, gaya monoline — selaras dengan wordmark. Rekomendasi: Lucide.
- Bayangan sangat minim; gunakan border `garis` dan perbedaan latar untuk memisahkan elemen.
- Satu elemen menonjol per layar. Di dashboard creator, itu adalah **saldo / pembayaran berikutnya**.

## 8. Suara & tone

**Kepribadian:** jujur, jelas, hangat, bisa diandalkan. Seperti teman yang kebetulan sangat rapi soal uang.

- **Bahasa utama:** Bahasa Indonesia santai-sopan ("kamu", bukan "Anda" untuk creator; "Anda" boleh untuk sisi brand/korporat).
- **Bahasa kedua:** English, untuk persiapan ekspansi. Semua copy harus melalui sistem i18n, jangan hardcode.
- Kalimat pendek, kata kerja aktif. Tombol menyebut apa yang terjadi: "Ajukan pencairan", bukan "Submit".
- Tentang uang: **selalu spesifik.** Sebut nominal, tanggal, dan status. Jangan pernah samar.
- Error tidak minta maaf berlebihan dan tidak samar: jelaskan apa yang terjadi dan apa langkah berikutnya.

| ❌ Hindari | ✅ Gunakan |
|---|---|
| "Pembayaran sedang diproses." | "Rp 750.000 akan masuk ke BCA •••4417 paling lambat Jumat, 16 Okt." |
| "Oops! Terjadi kesalahan 😢" | "Video belum terunggah karena ukurannya lebih dari 200 MB. Kompres dulu, lalu coba lagi." |
| "Submit" | "Kirim konten" |
| "Tidak ada data." | "Belum ada campaign yang kamu ikuti. Lihat campaign yang buka sekarang." |

## 9. Prinsip produk (yang memengaruhi UI)

1. **Transparansi pembayaran di depan.** Setiap campaign menampilkan fee, syarat, dan tanggal pembayaran sebelum creator bergabung.
2. **Status selalu terlihat.** Alur konten: Diundang → Bergabung → Konten dikirim → Direview → Disetujui → Dibayar. Tampilkan sebagai timeline yang jelas.
3. **Ringan untuk HP spek rendah dan koneksi lambat.** Banyak nano creator memakai HP entry-level. Hindari aset berat, prioritaskan kecepatan.
4. **Dua sisi, satu brand.** Creator dan brand melihat produk yang sama secara visual, tapi dengan bahasa yang disesuaikan.

## 10. PWA

```json
{
  "name": "Tali",
  "short_name": "Tali",
  "description": "Platform campaign untuk creator. Tied to trust.",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#24206B",
  "background_color": "#24206B",
  "lang": "id",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Splash / layar sambutan: latar nila, wordmark gading di tengah, tagline "Tied to trust." di bawahnya, tombol "Daftar sebagai Creator" (limau) dan "Saya brand / agensi" (outline).

## 11. Catatan terbuka

- **Merek dagang:** nama "Tali" belum didaftarkan. Pengecekan PDKI kelas 35 relatif aman; kelas 9 dan 42 perlu dicek lebih lanjut, terutama kemiripan bunyi dengan merek "TALLY". Jangan cetak materi dalam jumlah besar sebelum ini selesai.
- **Domain:** belum dipastikan. Kandidat: tali.id, tali.app, taliapp.id, gettali.com.
- **Logo:** masih tahap konsep. Sebelum final, rapikan oleh desainer grafis (optical balance titik simpul, kerning wordmark).
