# 🥗 NutriUP — Level Up Your Health

> **Final Project — Mata Kuliah Mobile App Development**
> Dibuat oleh: **Waraney Kamagi**

---

## 📖 Deskripsi

**NutriUP** adalah aplikasi mobile berbasis kecerdasan buatan (AI) yang membantu pengguna merencanakan pola makan sehat dan jadwal olahraga secara personal dan otomatis.

### Masalah yang Diselesaikan

Banyak orang kesulitan membuat rencana diet dan olahraga yang konsisten karena:
- Tidak tahu harus mulai dari mana
- Rencana yang tersedia di internet bersifat generik dan tidak sesuai kondisi tubuh masing-masing
- Sulit melacak progres belanja bahan makanan setiap minggunya

NutriUP menyelesaikan masalah ini dengan memberikan **rencana mingguan yang dipersonalisasi** berdasarkan data pengguna (tinggi, berat badan, usia) dan prompt tujuan kesehatan yang mereka masukkan sendiri — semua dibuat secara otomatis oleh AI.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🤖 **One-Prompt Generation** | Kolom teks sederhana di mana user bisa mengetik keinginan mereka, dan AI akan merombak seluruh dashboard (jadwal, kalori) secara instan. |
| 📋 **Daily Action Plan (Dashboard Utama)** | UI tidak menampilkan kalender yang rumit, melainkan tugas hari ini saja. Contoh: "Sarapan: Oatmeal (300 kalori)", "Olahraga: Lari 15 Menit".  |
| 🔁 **Task Swap** | Ganti task yang tidak sesuai dengan alternatif baru yang di-generate AI secara instan |
| 🛒 **​Auto-Grocery List** | Saat AI membuatkan pola makan selama seminggu, AI juga otomatis membuatkan daftar belanja (bawang, dada ayam, sayur) agar user mudah berbelanja. |
| ✅ **Proactive Check-in** | Notifikasi yang dikirim otomatis oleh Convex Scheduled Functions. Misalnya, "Sudah waktunya makan siang nih, jangan lupa menu ayam bakarnya ya!" |
| 🍳 **Weekly Recipe Generator** | Generate 3 resep sehat berbasis bahan grocery yang dimiliki |
| 🗑️ **Reset Plan** | Hapus semua plan dan mulai dari awal dengan prompt baru (streak tetap aman) |
| 🕒 **Smart Evaluation** | Di akhir minggu, AI akan meminta user memasukkan berat badan terbaru, lalu AI akan secara otomatis menyesuaikan kalori minggu depan jika target tidak tercapai. |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | [Expo](https://expo.dev/) (React Native) |
| **Bahasa** | TypeScript |
| **Backend & Database** | [Convex](https://convex.dev/) — real-time backend as a service |
| **AI / LLM** | [Groq API](https://groq.com/) dengan model LLaMA 3.3 70B & LLaMA 3.1 8B |
| **Navigasi** | Expo Router (file-based routing) |
| **Animasi** | React Native Reanimated |
| **Styling** | React Native StyleSheet + NativeWind (Tailwind CSS) |
| **Ikon** | Expo Vector Icons (Ionicons) |

---

## 📁 Struktur Proyek

```
Final_Revisi/
├── app/
│   ├── index.tsx          # Login screen
│   └── (tabs)/
│       ├── index.tsx      # Dashboard / Action Plan
│       ├── grocery.tsx    # Grocery List & Recipe
│       └── profile.tsx    # Profile, Check-in, Reset Plan
├── convex/
│   ├── schema.ts          # Definisi tabel database
│   ├── gemini.ts          # Logika AI (generate plan, swap, recipes)
│   ├── dashboard.ts       # Queries & mutations utama
│   ├── users.ts           # Autentikasi & manajemen user
│   └── crons.ts           # Cron job untuk reminder otomatis
└── components/
    └── OffTopicModal.tsx  # Modal error off-topic prompt
```

---

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan Convex backend (dev mode)
npx convex dev

# Jalankan aplikasi Expo
npx expo start
```

> Pastikan file `.env.local` sudah berisi `GEMINI_API_KEY` (Groq API Key) dan `CONVEX_DEPLOYMENT`.

---

### 👤 Pembuat

**Waraney Kamagi, David Kapal, & Ivan Kaseger**
Final Project — Mata Kuliah Mobile App Development
Semester 6
