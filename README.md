# Sistem Buku Tamu Digital & Barcode Meja Piket

Sistem pencatatan buku tamu digital modern berbasis **QR Code / Barcode** dengan database otomatis **Google Sheets** dan antarmuka responsif **Mobile-First** yang dapat di-deploy secara mudah di **Vercel** maupun **Google Apps Script**.

---

## Fitur Utama

### 1. Portal Tamu (`index.html`)
* **Mobile-First & Touch-Friendly**: Didesain khusus untuk smartphone pengunjung dengan input ergonomis tanpa efek *auto-zoom*.
* **Sistem Akun & Persistent Cache (`localStorage`)**: 
  * Pengunjung cukup mengisi data identitas sekali pada kunjungan pertama.
  * Sistem otomatis menyimpan profil dan menerbitkan **E-Badge Barcode Akun Pribadi** yang tidak akan logout otomatis.
* **Kunjungan Berulang Cepat (*Repeat Visits*)**: Tamu yang pernah berkunjung cukup mengisi tujuan dan keperluan hari itu.
* **Cetak & Unduh Pass**: Menyediakan fitur cetak kartu pass tamu dan unduh gambar QR Code langsung ke perangkat.
* **Bebas Emote / Emoji**: Tampilan bersih, minimalis, dan profesional dengan tipografi Inter dan ikon vektor SVG.

### 2. Portal Admin Meja Piket (`admin.html`)
* **Otentikasi Login Admin**:
  * **Username**: `admin`
  * **Password**: `mplbasvi`
* **Scanner Kamera Meja Piket**: Pemindai QR responsif untuk membaca barcode di layar HP tamu.
* **Aksi Cepat Check-In & Check-Out**: Memperbarui status dan waktu kedatangan/kepulangan tamu secara *real-time*.
* **Tabel Rekap Data Kunjungan**: Filter pencarian nama/instansi/ID dan tombol sinkronisasi data langsung ke Google Sheets.
* **Generator Standee QR Meja Piket**: Menghasilkan QR Code meja resepsionis beresolusi tinggi yang siap dicetak untuk dipajang di meja piket.
* **Konfigurasi Otomatis (`config.js`)**: Seluruh perangkat tamu dan admin otomatis terhubung ke Google Sheets yang sama.

### 3. Backend Google Apps Script (`backend_google_apps_script.js`)
* **REST API Database Google Sheets**: Menangani penyimpanan data, sinkronisasi live, pencarian ID, dan update status.
* **Self-Healing & Container-Bound Database**: Otomatis mendeteksi Google Spreadsheet aktif atau membuat spreadsheet baru di folder *"Shopifi Engine"*.
* **Pencarian Terkini (*Reverse Lookup*)**: Selalu memproses kunjungan terbaru untuk tamu yang berkunjung berulang kali.

---

## Struktur File Proyek

```text
buku_tamu/
├── config.js                            # Konfigurasi URL Google Apps Script (Wajib untuk Vercel)
├── vercel.json                          # Routing URL bersih untuk Vercel (/admin & /)
├── index.html                           # Portal Pengunjung / Tamu (Mobile-First)
├── admin.html                           # Portal Admin Meja Piket & Scanner Barcode
├── backend_google_apps_script.js         # Kode Backend Google Apps Script (Code.gs)
├── tamu.html                            # Alias redirect ke index.html
├── frontend_portal_buku_tamu_barcode_piket.html # Legacy redirect
└── README.md                            # Dokumentasi panduan proyek
```

---

## Panduan Deployment di Vercel (Rekomendasi Utama)

### Langkah 1: Siapkan Backend di Google Apps Script
1. Buka **[script.google.com](https://script.google.com/)** $\rightarrow$ klik **Proyek Baru**.
2. Beri nama proyek: `Buku Tamu Digital Engine`.
3. Buka file `Code.gs`, tempelkan seluruh isi dari file [`backend_google_apps_script.js`](backend_google_apps_script.js).
4. Klik **Simpan (Ctrl + S)**.
5. Klik **Terapkan (Deploy)** $\rightarrow$ **Penerapan baru (New deployment)**:
   * **Jenis**: *Aplikasi Web (Web app)*
   * **Jalankan sebagai**: *Saya (Me)*
   * **Akses**: *Siapa saja (Anyone)* $\leftarrow$ *(PENTING)*
6. Berikan otorisasi akun Google dan salin **URL Aplikasi Web** yang didapatkan (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 2: Masukkan URL ke `config.js`
Buka file [`config.js`](config.js) di proyek Anda dan tempelkan URL tersebut:

```javascript
window.APP_CONFIG = {
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbx123456789.../exec"
};
```

---

### Langkah 3: Deploy Frontend ke Vercel
1. Unggah folder proyek ini ke **GitHub** atau deploy langsung via **Vercel CLI / Vercel Dashboard**.
2. Vercel akan otomatis membaca file `index.html`, `admin.html`, `config.js`, dan `vercel.json`.
3. Setelah deployment selesai, Anda mendapatkan domain Vercel (contoh: `https://buku-tamu-saya.vercel.app`):
   * **Portal Pengunjung / Tamu**: `https://buku-tamu-saya.vercel.app/`
   * **Portal Admin Meja Piket**: `https://buku-tamu-saya.vercel.app/admin` (atau `/admin.html`)

---

## Kredensial Default

* **Akses Portal Admin**:
  * **Username**: `admin`
  * **Password**: `mplbasvi`
* **Lokasi Database Google Sheets**: Google Drive $\rightarrow$ Folder *"Shopifi Engine"* $\rightarrow$ File *"Shopifi_Visitor_DB"*.

---

## Lisensi & Hak Cipta
Dibuat untuk kebutuhan operasional buku tamu digital & meja resepsionis modern. Bebas dimodifikasi dan dikembangkan sesuai kebutuhan instansi/organisasi.
