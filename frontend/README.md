# Dokumentasi Frontend — Jagat Satwa

Frontend aplikasi monitoring burung berada di folder [`bird`](./bird/). Dokumen ini menjelaskan cara menjalankan frontend, struktur kode, halaman, dan aturan tampilan berdasarkan role.

## Teknologi

- React 18 dan React Router untuk komponen serta navigasi.
- Vite 5 untuk server pengembangan dan build.
- Axios untuk komunikasi dengan REST API.
- Tailwind CSS untuk styling.
- Recharts untuk grafik dashboard.
- Lucide React untuk ikon.

## Menjalankan aplikasi

Persyaratan: Node.js 20+ dan backend aktif. Dari PowerShell pada root repository:

```powershell
Set-Location frontend\bird
Copy-Item .env.example .env
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite. Variabel `.env` yang digunakan:

```dotenv
VITE_API_URL=http://localhost:3001/api
```

Ganti alamat API bila backend berjalan di host atau port lain. Jangan menyimpan kredensial atau secret backend di file frontend; nilai `VITE_*` akan masuk ke bundle browser.

Perintah lain:

```powershell
npm run build
npm run preview
```

## Struktur kode

```text
bird/src/
├── api/          # Klien HTTP dan pemanggil endpoint per modul
├── components/   # Komponen UI dan layout bersama
├── context/      # State autentikasi dan toast
├── pages/        # Halaman aplikasi per fitur
├── utils/        # Format tanggal, role, dan URL media
├── App.jsx       # Route dan whitelist role per halaman
└── main.jsx      # Entry point React
```

Komponen utama:

- `api/client.js`: konfigurasi Axios dan penyertaan token sesi pada permintaan API.
- `context/AuthContext.jsx`: informasi pengguna, role, token, login, dan logout.
- `components/ProtectedRoute.jsx`: memastikan halaman aplikasi hanya dibuka dengan sesi aktif.
- `App.jsx`: route aplikasi dan daftar role yang dapat membuka setiap route.
- `components/layout/Sidebar.jsx`: menu navigasi yang difilter berdasarkan role.
- `utils/media.js`: membentuk alamat URL berkas yang disajikan backend.

## Route halaman

| Route | Halaman |
|---|---|
| `/` | Dashboard |
| `/birds`, `/birds/:id` | Daftar dan detail burung |
| `/species` | Data spesies |
| `/domes`, `/habitats` | Dome dan zona kandang |
| `/breeding` | Breeding Record |
| `/feeding` | Feeding Schedule |
| `/training`, `/cleaning` | Pelatihan dan kebersihan kandang |
| `/health` | Monitoring Kesehatan |
| `/medications` | Pemberian Obat untuk Dokter Hewan |
| `/medication-reports` | Laporan Pemberian Obat untuk role lain yang diizinkan |
| `/transfers` | Perpindahan burung |
| `/tasks` | Penugasan |
| `/daily-reports` | Laporan Harian |
| `/documents` | Dokumentasi |
| `/reminders` | Pengingat |
| `/reports` | Reports |
| `/audit` | Audit Trail |
| `/users` | Manajemen Pengguna |
| `/settings` | Pengaturan |

Route `/feeding/types` sudah dihapus. Route `/inventory` diarahkan kembali ke Dashboard. Isian jenis pakan tetap tersedia di form Feeding Schedule sebagai teks.

## Ringkasan tampilan berdasarkan role

| Fitur/aksi | Super Admin | Head Keeper | Keeper | Dokter Hewan |
|---|---|---|---|---|
| Bird Management, Species | CRUD | CRUD | CRUD | Lihat |
| Dome, Habitat | CRUD | CRUD | CRUD | Tidak tersedia |
| Breeding Record | CRUD | CRUD | CRUD | Lihat |
| Feeding Schedule | CRUD | CRUD | Lihat saja | Tidak tersedia |
| Pelatihan, Kebersihan | CRUD | Lihat saja | CRUD | Tidak tersedia |
| Monitoring Kesehatan | CRUD | CRUD | CRUD | Lihat |
| Pemberian Obat | Lihat laporan | Lihat laporan | Lihat laporan | CRUD |
| Perpindahan | Ajukan dan lihat | Verifikasi dan lihat | Ajukan dan lihat | Tidak tersedia |
| Penugasan | Kelola tugas | Kelola tugas | Lihat tugas sendiri dan ubah progres | Tidak tersedia |
| Laporan Harian | Lihat | Verifikasi | Buat/kirim | Route diizinkan, menu belum tampil |
| Dokumentasi | Lihat | Lihat | Lihat | Route diizinkan, menu belum tampil |
| Pengingat | Pakan, kesehatan, penetasan | Pakan, kesehatan, penetasan | Pakan, kesehatan, penetasan | Kesehatan dan penetasan |
| Audit Trail, Pengguna | Kelola | Tidak tersedia | Tidak tersedia | Tidak tersedia |

`CRUD` berarti tambah, lihat, ubah, dan hapus. Pembatasan tombol di frontend hanya untuk tampilan; backend tetap menjadi pengendali izin akhir. Catatan: route Dokumentasi dan Laporan Harian menerima role Dokter Hewan di `App.jsx`, tetapi tautannya belum dimasukkan ke set navigasi Dokter Hewan pada `Sidebar.jsx`.

## Alur frontend penting

1. Pengguna login melalui halaman Login; Auth Context menyimpan state sesi.
2. Protected Route menjaga area aplikasi, lalu Role Route memeriksa role untuk route tertentu.
3. Sidebar hanya menampilkan menu yang ada dalam daftar role.
4. Halaman memanggil modul di `api/` untuk mengambil atau mengirim data ke backend.
5. Untuk unggahan, form mengirim berkas ke API Upload, kemudian menyimpan `fileUrl` yang diterima bersama data aktivitas.
6. `DocumentsPage` menampilkan dokumentasi dari URL backend dan menyediakan filter tanggal, kategori, burung, serta pengguna.
7. Pengingat kontrol kesehatan berasal dari tanggal di Pemberian Obat; pengingat penetasan menampilkan pasangan dan jenis kelamin kedua burung.

## Penanganan media

URL dasar API diambil dari `VITE_API_URL`. Berkas yang memiliki URL `/uploads/...` ditampilkan dengan utilitas `resolveMediaUrl`. Formulir memilih berkas dari perangkat dan mengunggahnya ke backend. Jika berkas fisik sudah tidak ada di penyimpanan backend, metadata saja tidak cukup untuk menampilkan gambar; berkas perlu diunggah kembali.

