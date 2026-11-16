# Dokumentasi Backend — Jagat Satwa

Backend menyediakan REST API untuk aplikasi monitoring burung. Aplikasi memakai Node.js, Express, Prisma ORM, dan MySQL. Proses API utama berada di `src/app.js`; server membaca port dan konfigurasi dari `.env`.

## Persyaratan

- Node.js 20 atau lebih baru.
- MySQL yang dapat diakses dari komputer backend.
- npm.

## Konfigurasi dan menjalankan

Di PowerShell dari root repository:

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Isi `.env` tanpa membagikan nilainya:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/bird_monitoring_db"
JWT_SECRET="isi-dengan-secret-acak-dan-rahasia"
PORT=3001
SEED_INITIAL_PASSWORD=
```

`SEED_INITIAL_PASSWORD` hanya digunakan bila membuat akun awal dari seed. Gunakan kata sandi kuat dan rahasiakan file `.env`.

Pasang dependensi, terapkan migrasi yang tersedia, buat Prisma Client, lalu jalankan server:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Server berjalan pada `http://localhost:3001`; prefix API adalah `/api`. Untuk menjalankan server tanpa nodemon, gunakan `npm start`.

### Seed akun awal (opsional)

Seed hanya membuat akun yang belum ada dan tidak mengganti kata sandi akun yang sudah tersedia:

```powershell
$env:SEED_INITIAL_PASSWORD = 'gunakan-password-awal-kuat'
npx prisma db seed
```

Hapus variabel sesi setelah penggunaan dan ganti kata sandi akun seed saat login pertama. Periksa `prisma/seed.js` sebelum menjalankan seed agar memahami akun yang dibuat.

## Struktur kode

```text
backend/
├── prisma/
│   ├── migrations/  # Migrasi skema basis data
│   ├── schema.prisma
│   └── seed.js
└── src/
    ├── lib/rbac.js
    ├── middlewares/ # autentikasi, otorisasi, audit
    ├── routes/      # handler REST API per modul
    ├── app.js        # middleware dan pemasangan route
    └── server.js     # konfigurasi port dan listen
```

## Route API

Semua route `/api` memerlukan token kecuali endpoint autentikasi yang dirancang untuk login. Role diperiksa kembali oleh middleware atau handler masing-masing.

| Prefix | Fungsi |
|---|---|
| `/api/auth` | Login dan endpoint autentikasi. |
| `/api/users` | Manajemen pengguna; khusus Super Admin. |
| `/api/birds` | Data burung dan relasinya. |
| `/api/species` | Data spesies. |
| `/api/domes` | Data dome. |
| `/api/habitats` | Data habitat/zona kandang. |
| `/api/feeding` | Jadwal pakan. Keeper hanya membaca; Super Admin dan Head Keeper mengelola. |
| `/api/breeding` | Catatan reproduksi dan pasangan burung. |
| `/api/health` | Catatan Monitoring Kesehatan. Tanggal kontrol berikutnya tidak dikelola di modul ini. |
| `/api/transfers` | Pengajuan dan verifikasi perpindahan burung. |
| `/api/reminders` | Pengingat pakan, kontrol dari Pemberian Obat, dan penetasan. |
| `/api/uploads` | Unggah metadata dan berkas dokumentasi. |
| `/api/workflows` | Pelatihan, kebersihan, tugas, laporan harian, notifikasi, dan pemberian obat. |
| `/api/dashboard` | Ringkasan dashboard. |
| `/api/reports` | Data laporan. |
| `/api/audit` | Riwayat audit; dibatasi untuk Super Admin. |

Endpoint daftar Keeper aktif untuk form tugas berada di `GET /api/workflows/tasks/keepers` dan hanya dapat diakses Head Keeper/Super Admin.

## Hak akses dan alur backend

1. `authenticate` membaca bearer token, memverifikasi JWT, mengambil status aktif serta role akun dari basis data, lalu mengisi `req.user`.
2. `authorize([...roles])` membandingkan role terstandardisasi dengan role yang diizinkan route.
3. Handler memvalidasi parameter dan payload, memanggil Prisma, lalu mengirim JSON dan status HTTP.
4. `audit.middleware.js` dipasang pada prefix `/api` untuk mencatat aktivitas yang didukung.

Ringkasan alur khusus:

- **Penugasan:** Super Admin/Head Keeper mengelola penugasan dan memilih Keeper aktif; Keeper hanya melihat tugas yang diberikan kepadanya serta memperbarui progresnya.
- **Laporan Harian:** Keeper/Dokter Hewan membuat dan mengirim; Head Keeper memeriksa dan menyetujui atau meminta revisi.
- **Perpindahan:** Keeper/Super Admin mengajukan; Head Keeper memverifikasi pengajuan.
- **Pemberian Obat:** hanya Dokter Hewan yang membuat, mengubah, atau menghapus catatan. Laporan dibaca oleh role lain yang diizinkan.
- **Pengingat kesehatan:** bersumber dari `MedicalTreatment.nextCheckup`; pengingat Dokter Hewan tidak menyertakan jadwal pakan.
- **Pengingat penetasan:** bersumber dari tanggal menetas pada Breeding Record dan menyertakan data kedua burung.

## Prisma dan migrasi

Skema berada di `prisma/schema.prisma` dengan datasource MySQL. Model utama meliputi User, Bird, Species, Dome, Habitat, BreedingRecord, FeedingSchedule, HealthRecord, MedicalTreatment, BirdTransfer, TrainingRecord, CleaningRecord, TaskAssignment, DailyReport, DailyReportReview, MediaDocument, Notification, dan AuditLog.

Untuk lingkungan lokal, setelah mengubah skema gunakan migrasi bernama, misalnya:

```powershell
npx prisma migrate dev --name nama_perubahan
npx prisma generate
```

Untuk menerapkan migrasi yang sudah dikomit pada lingkungan target, gunakan `npx prisma migrate deploy`. Buat cadangan basis data sebelum migrasi pada basis data berisi data penting. Jangan menggunakan reset database pada lingkungan yang datanya harus dipertahankan.

## Unggahan berkas

- Berkas masuk melalui `POST /api/uploads` dengan form field `file`.
- Tipe yang diterima: JPEG, PNG, WebP, MP4, WebM, dan PDF.
- Batas ukuran unggahan: 20 MB.
- Berkas disimpan di `backend/uploads` dan dilayani melalui prefix `/uploads`.
- API menyimpan URL relatif, misalnya `/uploads/<nama-acak>`, di record `MediaDocument` atau record aktivitas terkait.
- Folder berkas perlu dicadangkan bersama basis data. Record metadata tidak memulihkan isi berkas yang hilang.

## Error dan status respons

API menggunakan status HTTP seperti `400` untuk payload/parameter tidak valid, `401` untuk sesi tidak sah, `403` untuk role yang tidak diizinkan, `404` untuk data tidak ditemukan, dan `500` untuk kegagalan server. Format detail respons mengikuti route terkait (`message` atau `error`). Jangan kirim stack trace atau secret kepada pengguna akhir pada konfigurasi produksi.

## Catatan pemeliharaan

- Jangan commit `.env`, kredensial, token, atau data pribadi.
- Backup database dan `uploads/` secara teratur.
- Katalog route `feeding-types` sudah dihapus; model lama pada skema/migrasi, jika masih ada, tidak berarti endpoint tersebut aktif.
- File `src/routes/inventory.routes.js` belum dipasang pada `src/app.js`; jangan menganggap endpoint di file tersebut aktif tanpa memasang dan menguji route secara sengaja.
- Selaraskan izin route, menu frontend, dan kebutuhan operasional saat menambah fitur baru.

