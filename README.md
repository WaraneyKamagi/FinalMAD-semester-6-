# NutriUP — AI-Powered Nutrition & Workout Planner

> **Dokumentasi Teknis** — Disesuaikan dengan jurnal akademik *COGITO Smart Journal* v2  
> Dikembangkan sebagai proyek akhir mata kuliah Mobile Application Development  
> Universitas Klabat, Fakultas Ilmu Komputer

---

## Daftar Isi
1. [Tentang Aplikasi](#tentang-aplikasi)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Fitur Utama](#fitur-utama)
4. [Data Model](#data-model)
5. [Struktur Proyek](#struktur-proyek)
6. [Instalasi & Setup](#instalasi--setup)
7. [Variabel Lingkungan](#variabel-lingkungan)
8. [Catatan Perubahan (Changelog)](#catatan-perubahan-changelog)
9. [Hasil Pengujian Fungsional](#hasil-pengujian-fungsional)
10. [Keterbatasan](#keterbatasan)

---

## Tentang Aplikasi

NutriUP adalah aplikasi mobile lintas platform (Android & iOS) yang mengintegrasikan **Large Language Model (LLM)** untuk menghasilkan rencana nutrisi dan olahraga yang dipersonalisasi. Cukup dengan satu kalimat tujuan, AI akan membangun jadwal 7 hari lengkap beserta daftar belanja otomatis.

**Stack Teknologi:**
- **Frontend:** Expo SDK + React Native (TypeScript)
- **Backend:** Convex (serverless, reactive)
- **AI:** Groq API (model: `llama-3.3-70b-versatile`, kompatibel format Gemini)
- **Navigation:** Expo Router (file-based routing)

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│              Expo / React Native Client                 │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │  Login   │  │  Dashboard  │  │  Grocery/Profile  │  │
│  │ Screen   │  │ (Today tab) │  │     Screens       │  │
│  └────┬─────┘  └──────┬──────┘  └─────────┬─────────┘  │
└───────┼───────────────┼──────────────────┼─────────────┘
        │               │                  │
        ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Convex Serverless Backend                  │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  │
│  │ users.ts │  │dashboard │  │gemini  │  │crons.ts  │  │
│  │ (auth)   │  │   .ts    │  │  .ts   │  │(15-min)  │  │
│  └──────────┘  └──────────┘  └───┬────┘  └──────────┘  │
└──────────────────────────────────┼─────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Groq LLM API      │
                        │  llama-3.3-70b      │
                        │  temp=0.4, 8192tok  │
                        └─────────────────────┘
```

---

## Fitur Utama

### 1. One-Prompt Generation
Pengguna mengetik satu kalimat tujuan kesehatan (contoh: *"I want to lose 2kg in 1 month"*). Sistem memanggil `generatePlan` Convex action yang:
- Mejalankan **safety filter** sebelum API call dilakukan
- Menyusun system prompt dengan profil pengguna: **nama, usia, berat, tinggi**
- Memanggil Groq LLM dengan `temperature=0.4` dan `maxOutputTokens=8192`
- Menjalankan **multi-stage JSON extraction pipeline** (3 tahap) untuk parsing output
- Menyimpan `dailyTasks` (7 hari) dan `groceryList` ke Convex database secara atomik

**Safety Filter** — prompt dicek terhadap 14 frasa berbahaya sebelum API dipanggil:
```
"extreme", "very low calorie", "starvation", "lose 5kg in a week",
"lose 10kg in 2 weeks", "detox only", "anorexia", "purging",
"laxative", "crash diet", "500 calories", "no carb",
"fasting only", "skip meals"
```
Jika cocok, action melempar exception → UI menampilkan **"Unsafe Goal Layout"** warning card. Tidak ada data yang ditulis ke database.

---

### 2. Daily Action Plan (Dashboard)
- Hanya menampilkan tugas **hari ini** (bukan multi-week calendar)
- Setiap task card menampilkan: ikon tipe (🍽️ meal / 🏋️ workout), judul, waktu, dan deskripsi
- **Progress bar** di bagian atas menunjukkan rasio penyelesaian hari ini
- Tap card → `toggleTaskCompletion` mutation → update `completed` field
- Saat semua task hari ini selesai → logika streak otomatis berjalan
- Tombol **shuffle** (🔀) per card → `swapTask` action → AI generate alternatif

---

### 3. Auto-Grocery List
- Dibuat secara atomik bersamaan dengan `generatePlan`
- Setiap item memiliki: `name`, `category` (Protein/Vegetables/Grains/Dairy/Other), `amount`
- Tampil di tab Grocery dengan **pengelompokan per kategori** (section headers)
- Tap item → toggle `purchased` state (persisted ke database)
- Tombol **Generate Recipes** → `generateWeeklyRecipes` action → 3 resep masak dari bahan yang ada

---

### 4. Proactive Check-in (Notifikasi Otomatis)
Diimplementasikan via **Convex Scheduled Functions** (`convex/crons.ts`):
- Interval: **setiap 15 menit**
- Logika: scan semua task hari ini yang belum selesai → cek apakah waktu task dalam `reminderLeadMins` ke depan (default: 20 menit)
- **90-menit deduplication window** per task untuk mencegah notifikasi berulang
- Notifikasi tampil sebagai dismissible cards di bagian "Reminders" Dashboard
- `reminderLeadMins` bisa dikonfigurasi user di tab Profile (range: 5–120 menit)

---

### 5. Smart Evaluation (Evaluasi Mingguan)
Dari tab Profile:
1. User memasukkan berat badan terkini
2. `handleEvaluation` memanggil `updateWeight` mutation → persist berat baru
3. Langsung re-invoke `generatePlan` dengan prompt: *"My new weight is X kg. Please adjust my meal and workout plan to keep me progressing towards my goal."*
4. AI generate jadwal 7 hari baru yang dikalibrasi ke baseline terkini
5. Sistem ini membentuk **closed-loop adaptive planning**

---

### 6. Gamification (Streak & Badge)
Dihitung dalam `toggleTaskCompletion` mutation:
- Saat semua task hari ini selesai → cek apakah `lastCompletedDate` adalah hari kemarin
  - Jika ya → `currentStreak += 1`
  - Jika tidak → reset ke `1`
- Badge otomatis diberikan pada threshold:
  - 🥉 **3-day streak**
  - 🥈 **7-day streak**
  - 🥇 **30-day streak**
- `currentStreak`, `bestStreak`, dan badge strip ditampilkan di Dashboard

---

## Data Model

### `users`
| Field | Type | Keterangan |
|---|---|---|
| `name` | string | Nama pengguna |
| `token` | string | Simple auth token (nama lowercase tanpa spasi) |
| `age` | number? | Usia dalam tahun |
| `weight` | number | Berat badan (kg) |
| `height` | number | Tinggi badan (cm) |
| `hasPromptedAI` | boolean? | Apakah user sudah generate plan |
| `currentStreak` | number? | Streak aktif (hari) |
| `bestStreak` | number? | Rekor streak terbaik |
| `lastCompletedDate` | string? | Tanggal terakhir semua task selesai (YYYY-MM-DD) |
| `badges` | string[]? | Array badge yang diraih |
| `reminderLeadMins` | number? | Lead time notifikasi (default: 20) |

### `dailyTasks`
| Field | Type | Keterangan |
|---|---|---|
| `userId` | Id\<users\> | Relasi ke user |
| `date` | string | Tanggal task (YYYY-MM-DD) |
| `time` | string | Waktu task (HH:MM) |
| `type` | string | `"meal"` atau `"workout"` |
| `title` | string | Judul task dengan porsi/durasi |
| `description` | string | Detail bahan/gerakan + kalori |
| `calories` | number? | Estimasi kalori |
| `durationMins` | number? | Durasi (menit) |
| `completed` | boolean | Status penyelesaian |

**Index:** `by_user_date` → [`userId`, `date`]

### `groceryLists`
| Field | Type | Keterangan |
|---|---|---|
| `userId` | Id\<users\> | Relasi ke user |
| `weekStart` | string | Tanggal mulai minggu (YYYY-MM-DD) |
| `items` | object[] | Array item belanja |
| `items[].name` | string | Nama bahan |
| `items[].category` | string | Kategori (Protein/Vegetables/Grains/Dairy/Other) |
| `items[].amount` | string | Jumlah/porsi |
| `items[].purchased` | boolean | Status sudah dibeli |

### `notifications`
| Field | Type | Keterangan |
|---|---|---|
| `userId` | Id\<users\> | Relasi ke user |
| `message` | string | Pesan reminder |
| `createdAt` | number | Timestamp (ms) |
| `read` | boolean | Status sudah dibaca |
| `kind` | string? | Tipe notifikasi (misal: `"task-reminder"`) |
| `taskId` | Id\<dailyTasks\>? | Task terkait (untuk deduplication) |

### `weeklyRecipes`
| Field | Type | Keterangan |
|---|---|---|
| `userId` | Id\<users\> | Relasi ke user |
| `weekStart` | string | Tanggal mulai minggu |
| `recipes` | object[] | Array resep |
| `recipes[].title` | string | Nama resep |
| `recipes[].prepMins` | number? | Waktu persiapan |
| `recipes[].calories` | number? | Estimasi kalori |
| `recipes[].ingredients` | string[] | Daftar bahan |
| `recipes[].steps` | string[] | Langkah-langkah memasak |

---

## Struktur Proyek

```
NutriUP_MAD_FINAL/
├── app/
│   ├── _layout.tsx          # Root layout (ConvexProvider)
│   ├── index.tsx            # Login / onboarding screen
│   ├── modal.tsx            # Modal screen
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigator (Today, Grocery, Profile)
│       ├── index.tsx        # Dashboard — Daily Action Plan
│       ├── grocery.tsx      # Grocery & Recipes tab
│       └── profile.tsx      # Profile, Smart Evaluation, Reminders
├── convex/
│   ├── schema.ts            # Convex database schema (5 collections)
│   ├── users.ts             # login, updateWeight, updateReminderLeadMins
│   ├── dashboard.ts         # getTodayTasks, toggleTaskCompletion, getNotifications, dll.
│   ├── gemini.ts            # generatePlan, swapTask, generateWeeklyRecipes, savePlan
│   └── crons.ts             # Proactive check-in scheduler (15-min interval)
├── components/              # Shared components
├── constants/               # Theme constants
├── assets/                  # Icons, images
├── .env.local               # API keys (tidak di-commit)
├── app.json                 # Expo config
└── package.json
```

---

## Instalasi & Setup

### Prasyarat
- Node.js ≥ 18
- npm ≥ 9
- Expo Go app (untuk testing di device)
- Akun Convex (gratis di [convex.dev](https://convex.dev))
- Akun Groq (gratis di [console.groq.com](https://console.groq.com))

### Langkah-langkah

```bash
# 1. Clone repository
git clone <repo-url>
cd NutriUP_MAD_FINAL

# 2. Install dependencies
npm install

# 3. Setup Convex backend
npx convex dev
# Ikuti instruksi login dan buat project baru

# 4. Buat file .env.local
# (lihat bagian Variabel Lingkungan di bawah)

# 5. Jalankan aplikasi
npx expo start
```

---

## Variabel Lingkungan

Buat file `.env.local` di dalam folder `NutriUP_MAD_FINAL/`:

```env
# Groq API Key (digunakan sebagai GEMINI_API_KEY di Convex)
# Daftar gratis di: https://console.groq.com
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
EXPO_PUBLIC_CONVEX_URL=<your-convex-url>
```

Di **Convex Dashboard** → Settings → Environment Variables, tambahkan:
```
GEMINI_API_KEY = <your-groq-api-key>
```

> **Catatan:** Variabel ini disebut `GEMINI_API_KEY` di kode untuk kompatibilitas dengan versi sebelumnya yang menggunakan Gemini API. Nilainya sekarang adalah Groq API Key.

---

## Catatan Perubahan (Changelog)

### v2.1.0 — Journal Alignment Update (April 2026)

Pembaruan ini dilakukan untuk menyesuaikan implementasi dengan ekspektasi yang didokumentasikan dalam jurnal akademik *COGITO Smart Journal* v2.

#### ✅ GAP 1 — Age dimasukkan ke System Prompt AI
**File:** `convex/gemini.ts` — fungsi `generatePlan`

**Sebelum:**
```
Client profile: Name: ${user.name}, Weight: ${user.weight}kg, Height: ${user.height}cm.
```
**Sesudah:**
```
Client profile: Name: ${user.name}, Age: ${user.age ?? "N/A"} years old, Weight: ${user.weight}kg, Height: ${user.height}cm.
- Tailor calorie targets and exercise intensity to the user's age, weight, and height.
```
**Alasan:** Jurnal Sec. 3.4 secara eksplisit menyatakan system prompt harus mencakup *"height, weight, age, and stated goal"*. Usia sangat mempengaruhi kebutuhan kalori basal (BMR) dan intensitas latihan yang aman.

---

#### ✅ GAP 2 — Safety Filter Diperluas
**File:** `convex/gemini.ts` — fungsi `isUnsafePrompt`

**Sebelum:** 6 frasa risiko  
**Sesudah:** 14 frasa risiko

Frasa baru yang ditambahkan:
- `"anorexia"` — kondisi eating disorder berbahaya
- `"purging"` — perilaku purging
- `"laxative"` — penyalahgunaan obat pencahar untuk diet
- `"crash diet"` — diet ekstrim tanpa supervisi medis
- `"500 calories"` — target kalori sangat rendah (di bawah BMR)
- `"no carb"` — eliminasi total karbohidrat
- `"fasting only"` — puasa total tanpa nutrisi
- `"skip meals"` — melewatkan makan secara sengaja

**Alasan:** Jurnal Sec. 3.4 menyebut filter harus mencakup semua *"high-risk phrases"* secara umum. Implementasi awal terlalu sempit dan bisa dilewati dengan variasi kalimat.

---

#### 🔜 GAP 3 — Grocery Grouping per Kategori *(Dalam Proses)*
**File:** `app/(tabs)/grocery.tsx`

Grocery items akan ditampilkan dalam section headers per kategori (Protein, Vegetables, Grains, Dairy, Other) sesuai jurnal Sec. 3.6: *"categorization is designed to mirror the layout of physical supermarket sections"*.

---

#### 🔜 GAP 4 — Fix hasPromptedAI Reset saat Login Ulang *(Dalam Proses)*
**File:** `convex/users.ts`

Login ulang dengan akun yang sama tidak akan lagi menghapus akses ke plan yang sudah dibuat.

---

#### 🔜 GAP 5 — Calorie/Duration Badge di Task Card *(Dalam Proses)*
**File:** `app/(tabs)/index.tsx`

Setiap task card akan menampilkan annotation kalori (🔥 X kcal) atau durasi (⏱ X min) sesuai jurnal Sec. 3.5.

---

#### 🔜 GAP 6 — Best Streak di Dashboard *(Dalam Proses)*
**File:** `app/(tabs)/index.tsx`

`bestStreak` akan ditampilkan di samping `currentStreak` di Dashboard.

---

## Hasil Pengujian Fungsional

12 test case dijalankan di perangkat Android 14 (fisik) dan Android Emulator API 34:

| No | Fitur | Kondisi Test | Hasil |
|---|---|---|---|
| 1 | One-Prompt Generation — valid | Submit "I want to lose 2kg in 1 month" | ✅ PASS |
| 2 | One-Prompt Generation — extreme | Submit "Starvation diet, lose 10kg in 2 weeks" | ✅ PASS |
| 3 | Daily Action Plan — task display | Buka Dashboard dengan task tersedia | ✅ PASS |
| 4 | Daily Action Plan — completion toggle | Tap task card | ✅ PASS |
| 5 | Auto-Grocery List — generation | Generate plan | ✅ PASS |
| 6 | Auto-Grocery List — purchase toggle | Tap grocery item | ✅ PASS |
| 7 | Proactive Check-in | Cron job berjalan; task dalam lead-time window | ✅ PASS |
| 8 | Smart Evaluation — weight update | Masukkan berat baru di Profile | ✅ PASS |
| 9 | Task Swap — meal | Tap shuffle di meal task | ✅ PASS |
| 10 | Task Swap — workout | Tap shuffle di workout task | ✅ PASS |
| 11 | Streak & Badge | Semua task selesai berturut-turut; threshold 7 hari | ✅ PASS |
| 12 | Weekly Recipe Generation | Tap "Generate Recipes" di Grocery tab | ✅ PASS |

**Hasil: 12/12 test cases PASS (100% functional correctness)**

---

## Keterbatasan

1. **Autentikasi Prototipe** — Token autentikasi adalah nama lowercase tanpa spasi, disimpan sebagai module-level constant. Harus diganti dengan OAuth 2.0 atau JWT untuk produksi.
2. **Estimasi Kalori AI** — Tidak divalidasi terhadap Dietary Reference Intakes (DRI). Diperlukan integrasi API database nutrisi tervalidasi.
3. **Smart Evaluation** — Bergantung sepenuhnya pada pemahaman LLM tentang matematika defisit kalori, bukan algoritma eksplisit.
4. **Pengujian Terbatas** — Hanya functional correctness testing. Belum ada longitudinal RCT dengan pengguna nyata.

---

## Lisensi & Pengakuan

Proyek ini dikembangkan sebagai tugas akhir mata kuliah Mobile Application Development, Universitas Klabat.  
Tim mengucapkan terima kasih kepada:
- Convex Development Team atas dokumentasi yang komprehensif
- Groq untuk inferensi LLM berkecepatan tinggi
- Expo Team untuk SDK cross-platform yang matang
