Ringkasan Aplikasi: Dashboard Monitoring Broadcast & Ticketing Logistik (Terintegrasi n8n)

1. Ringkasan Aplikasi

Aplikasi ini adalah dashboard operasional terpusat yang dirancang untuk bekerja secara langsung dengan workflow n8n Anda. Tujuannya adalah memberikan visibilitas penuh terhadap alur "Broadcast Logistik" dan menyediakan sistem "Ticketing Customer Service" yang fungsional.

Alih-alih memantau log n8n secara manual, tim Anda (Tim Logistik, CS) dapat menggunakan aplikasi web ini untuk:

Memantau (Monitoring): Melihat status real-time dari setiap broadcast WhatsApp yang dikirim oleh n8n (misalnya, update status pengiriman ke pelanggan berdasarkan data Google Sheets).

Mengelola (Ticketing): Menerima dan mengelola tiket keluhan atau pertanyaan secara otomatis. Tiket ini dibuat oleh alur n8n "Customer Service" Anda (misalnya, ketika pelanggan membalas broadcast, atau ketika sistem mendeteksi anomali seperti delay_reason pada data Anda).

2. Fitur-Fitur Utama

Dashboard Utama

Widget ringkasan: "Total Broadcast Terkirim Hari Ini", "Broadcast Gagal", "Tiket Terbuka", "Tiket Ditutup Hari Ini".

Feed aktivitas real-time dari log broadcast terbaru.

Daftar tiket prioritas tinggi yang belum ditangani.

Modul 1: Monitoring Broadcast

Tampilan log terperinci dari setiap eksekusi workflow "Broadcast Logistic" Anda.

Kolom: Waktu, Nomor Resi (AWB), No. Telepon Pelanggan, Status (Terkirim, Gagal, Menunggu), Isi Pesan, Pesan Error (jika gagal).

Fitur pencarian dan filter berdasarkan Nomor Resi atau No. Telepon.

Modul 2: Sistem Ticketing

Pembuatan Tiket Otomatis: Aplikasi menyediakan API endpoint yang aman. Alur n8n "Automation CS" Anda akan memanggil endpoint ini untuk membuat tiket baru secara otomatis.

Antrian Tiket (Ticket Queue): Tampilan daftar semua tiket untuk agen CS.

Manajemen Tiket:

Melihat detail tiket (deskripsi masalah, data pelanggan, riwayat AWB).

Mengubah status tiket (Open, Pending, On-Hold, Closed).

Mengubah prioritas (Low, Medium, High).

Menugaskan tiket ke agen CS tertentu.

Menambahkan catatan internal atau balasan untuk pelanggan.

Riwayat Tiket: Semua aktivitas, catatan, dan perubahan status tercatat dalam tiket.

Modul 3: Manajemen Pengguna (Sederhana)

Sistem login untuk agen CS dan Admin.

Peran (Role):

Agent (Agen): Dapat melihat dan mengelola tiket yang ditugaskan padanya.

Admin: Dapat melihat semua tiket, memantau broadcast, dan mengelola pengguna.

3. Alur Aplikasi & Integrasi n8n

Aplikasi ini tidak "menarik" data dari n8n, melainkan n8n yang "mendorong" (push) data ke aplikasi ini melalui API. Ini membuat sistemnya sangat efisien dan real-time.

Alur A: Monitoring Broadcast

Trigger (n8n): Google Sheet di workflow automation broadcast logistic Anda ter-update (misal: kolom outbound_dest_time terisi).

Proses (n8n): Workflow berjalan, mengambil data (No. Resi, No. HP), mencoba mengirim pesan WhatsApp.

Integrasi (WAJIB DIMODIFIKASI): Di akhir alur n8n, Anda harus menambahkan node "HTTP Request".

Push (n8n -> Aplikasi): Node tersebut memanggil API aplikasi Anda (misal: POST /api/v1/broadcast-logs) dan mengirimkan data:

{ "tracking_number": "LOG2024...", "phone": "628...", "status": "success", "message": "Paket Anda..." }

ATAU: { "tracking_number": "LOG2024...", "phone": "628...", "status": "failed", "error": "Nomor tidak terdaftar WA" }

Aplikasi: Menerima data ini dan menyimpannya ke tabel broadcast_logs. Pengguna di dashboard langsung melihat log baru ini.

Alur B: Pembuatan Tiket Otomatis

Trigger (n8n): Alur automation CS fix Anda ter-trigger. Ini bisa dari berbagai sumber:

Pelanggan membalas pesan broadcast WhatsApp (via Webhook WA).

Alur Broadcast Logistik menemukan data anomali (misal: status = "fraud" atau sla_status = "Delayed") dan memanggil webhook alur CS.

Proses (n8n): Workflow CS mengidentifikasi data (No. Resi, isi pesan pelanggan, dll).

Integrasi (WAJIB DIMODIFIKASI): Alur n8n ini juga menggunakan node "HTTP Request".

Push (n8n -> Aplikasi): Node memanggil API aplikasi Anda (misal: POST /api/v1/tickets) dan mengirimkan data:

{ "tracking_number": "LOG2024...", "subject": "Komplain Keterlambatan", "description": "Pelanggan membalas: 'Paket saya kok belum sampai?'", "priority": "high", "customer_phone": "628..." }

Aplikasi: Menerima data ini, membuat entri baru di tabel tickets dengan status = 'open'.

Aplikasi: Agen CS melihat tiket baru muncul di antrian mereka dan mulai menanganinya.

4. Draf Skema Database (PostgreSQL)

Berikut adalah skema database dasar untuk PostgreSQL yang mencakup kedua kebutuhan (ticketing dan broadcast). Skrip ini telah dibuat idempoten (aman dijalankan ulang) dengan menambahkan IF NOT EXISTS dan DROP IF EXISTS.

-- Ekstensi untuk menghasilkan UUID (opsional, tapi bagus untuk ID unik)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel untuk pengguna aplikasi (Agen CS, Admin)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('agent', 'admin')), -- Peran pengguna
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tipe data ENUM untuk status dan prioritas tiket
-- Menggunakan blok DO untuk membuat tipe data ENUM secara idempoten
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'on_hold', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END$$;

-- Tabel utama untuk sistem ticketing dari Alur B
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY, -- ID tiket yang mudah dibaca (1, 2, 3...)
    ticket_uid VARCHAR(30) UNIQUE NOT NULL, -- ID tiket yang ramah (misal: "CS-2024-0001")
    tracking_number VARCHAR(50) UNIQUE, -- Nomor resi/AWB terkait
    customer_phone VARCHAR(30),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- Deskripsi awal masalah
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    
    -- Relasi ke agen yang menangani
    assigned_to_user_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ, -- Waktu tiket ditutup
    
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index untuk pencarian tabel tickets
CREATE INDEX IF NOT EXISTS idx_tickets_tracking_number ON tickets (tracking_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets (assigned_to_user_id);

-- Tabel untuk mencatat log broadcast dari Alur A
CREATE TABLE IF NOT EXISTS broadcast_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(50), 
    consignee_phone VARCHAR(30),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    message_content TEXT, -- Isi pesan yang dikirim
    error_message TEXT, -- Diisi jika status = 'failed'
    broadcast_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tracking_number) REFERENCES tickets(tracking_number) ON DELETE SET NULL
);

-- Index untuk pencarian tabel broadcast_logs
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_tracking_number ON broadcast_logs (tracking_number);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_phone ON broadcast_logs (consignee_phone);

-- Tabel untuk menyimpan komentar/balasan/catatan internal pada tiket
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id BIGINT NOT NULL,
    user_id UUID, -- Agen yang membuat komentar
    comment_text TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT TRUE, -- (TRUE = Catatan internal, FALSE = Balasan ke customer)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE, -- Hapus komentar jika tiket dihapus
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger untuk otomatis update kolom 'updated_at' di tabel tickets
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger jika sudah ada sebelum membuatnya lagi, untuk menghindari error
DROP TRIGGER IF EXISTS set_timestamp_tickets ON tickets;
CREATE TRIGGER set_timestamp_tickets
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();



5. Rekomendasi Teknologi & Best Practice

Berikut adalah rekomendasi tumpukan teknologi (tech stack) dan praktik terbaik untuk membangun aplikasi ini secara modern, fungsional, dan memiliki desain yang menarik.

a. Query Database (Dashboard & Grafik)

Untuk menampilkan data grafik (misal: "Tiket Terbuka", "Broadcast Gagal") di dashboard, sangat tidak disarankan untuk melakukan query COUNT(*) langsung ke tabel tickets atau broadcast_logs setiap kali dashboard di-load. Ini akan menjadi sangat lambat seiring bertambahnya data.

Best Practice: Gunakan Tabel Agregasi (Aggregation Tables) atau Materialized Views (PostgreSQL).

Contoh: Buat tabel baru bernama dashboard_summary.

Buat background worker (pekerja latar belakang) yang berjalan setiap 5 menit.

Pekerja ini akan menghitung data (misal: SELECT status, COUNT(1) FROM tickets GROUP BY status) dan menyimpan hasilnya di tabel dashboard_summary.

Dashboard Anda HANYA akan mengambil data dari tabel dashboard_summary yang kecil dan cepat ini.

Kebutuhan Real-time Lainnya: Untuk kebutuhan data yang lebih real-time (seperti di Modul Ticketing), pastikan Anda menggunakan INDEX pada kolom yang sering dicari (seperti status, assigned_to_user_id, tracking_number) seperti yang sudah dirancang di skema di atas.

b. Autentikasi & Keamanan (Login)

Untuk sistem login "Agen CS" dan "Admin" (Modul 3).

Teknologi: JWT (JSON Web Tokens).

Best Practice Flow:

Password Hashing: Saat pengguna mendaftar (atau admin membuatkan akun), password tidak boleh disimpan sebagai teks biasa. Gunakan algoritma hashing yang kuat seperti bcrypt atau Argon2 untuk menyimpan password_hash di tabel users.

Login: Pengguna mengirim email + password.

Verifikasi: Server mengambil data users berdasarkan email, lalu menggunakan fungsi bcrypt.compare() untuk membandingkan password yang dikirim dengan password_hash di database.

Pembuatan Token: Jika valid, server membuat JWT yang berisi data non-sensitif seperti user_id dan role (misal: { "userId": "...", "role": "agent" }). Token ini ditandatangani dengan secret key (kunci rahasia) yang hanya diketahui server.

Respon: Server mengirim token ini ke client (browser).

Penyimpanan Client: Client menyimpan JWT ini (misalnya di localStorage atau HttpOnly Cookie untuk keamanan lebih).

Otorisasi: Untuk setiap permintaan API (misal: "tutup tiket"), client mengirimkan JWT ini di header Authorization: Bearer <token>. Server akan memverifikasi token ini sebelum memproses permintaan.

c. Desain UI/UX & Visualisasi (Desain Menarik)

Untuk membangun antarmuka (UI) yang modern, responsif, dan menarik.

Frontend Framework: Sangat direkomendasikan menggunakan framework JavaScript modern seperti React atau Vue.js. Ini mempermudah pengelolaan state (data) dan komponen UI yang kompleks.

Desain & Komponen (Paling Direkomendasikan):

TailwindCSS: Gunakan utility-first CSS framework ini. Tailwind memberi Anda blok bangunan (seperti flex, pt-4, rounded-lg) untuk membuat desain kustom dengan cepat tanpa menulis CSS manual.

Shadcn/ui: Ini bukan library komponen biasa. Ini adalah kumpulan komponen re-usable (seperti Tombol, Tabel Data, Dialog, Kartu) yang dibangun di atas TailwindCSS. Desainnya sangat bersih, modern, dan mudah diakses.

Visualisasi Data (Grafik Dashboard):

Gunakan library charting seperti Recharts (jika menggunakan React) atau Chart.js. Library ini memudahkan pembuatan grafik batang, lingkaran (pie chart), dan garis (line chart) yang interaktif untuk widget dashboard Anda.

Prinsip Desain:

Responsif: Pastikan aplikasi dapat digunakan dengan baik di desktop maupun di perangkat seluler (tablet agen CS). TailwindCSS sangat membantu dalam hal ini.

Intuitif: Alur harus jelas. Agen CS harus bisa langsung mengerti cara mengambil tiket, mengubah status, dan menambahkan komentar tanpa perlu pelatihan khusus.

Kontras & Keterbacaan: Gunakan font yang jelas (misal: Inter, Poppins) dan pastikan kontras warna teks dan latar belakang baik.

6. User Stories (Cerita Pengguna)

Ini adalah rincian fungsionalitas dari perspektif pengguna.

Peran: Admin

US-A1 (Login): "Sebagai Admin, saya ingin login ke aplikasi menggunakan email dan password saya agar saya dapat mengakses dashboard admin."

US-A2 (Lihat Dashboard): "Sebagai Admin, saya ingin melihat dashboard utama dengan ringkasan widget (Total Broadcast, Gagal, Tiket Terbuka) agar saya bisa memantau kesehatan operasional secara sekilas."

US-A3 (Lihat Semua Tiket): "Sebagai Admin, saya ingin melihat semua tiket dalam antrian (terlepas dari siapa yang ditugaskan) agar saya bisa memantau beban kerja tim."

US-A4 (Tugaskan Tiket): "Sebagai Admin, saya ingin menugaskan (assign) tiket yang berstatus 'open' dan belum ditugaskan ke 'Agen' tertentu agar tiket tersebut dapat segera ditangani."

US-A5 (Lihat Log Broadcast): "Sebagai Admin, saya ingin mengakses modul 'Monitoring Broadcast' dan mencari log berdasarkan No. Resi agar saya bisa melakukan investigasi jika ada masalah."

US-A6 (Manajemen Pengguna): "Sebagai Admin, saya ingin membuat, mengedit, dan menonaktifkan akun 'Agen' agar saya bisa mengelola tim CS."

Peran: Agent (Agen CS)

US-C1 (Login): "Sebagai Agen CS, saya ingin login ke aplikasi menggunakan email dan password saya agar saya bisa mengakses antrian tiket saya."

US-C2 (Lihat Antrian Saya): "Sebagai Agen CS, saya ingin melihat daftar tiket yang ditugaskan hanya kepada saya agar saya bisa fokus pada pekerjaan saya."

US-C3 (Buka Detail Tiket): "Sebagai Agen CS, saya ingin mengklik sebuah tiket di antrian saya untuk melihat semua detailnya (deskripsi masalah, riwayat pelanggan, data AWB)."

US-C4 (Ubah Status Tiket): "Sebagai Agen CS, saya ingin mengubah status tiket (misalnya dari 'open' ke 'pending' atau 'closed') agar status pekerjaan saya selalu ter-update."

US-C5 (Tambah Catatan Internal): "Sebagai Agen CS, saya ingin menambahkan catatan internal ke tiket (yang tidak bisa dilihat pelanggan) agar saya bisa mencatat temuan investigasi saya."

US-C6 (Tutup Tiket): "Sebagai Agen CS, saya ingin menutup tiket ketika masalah sudah selesai, yang juga akan mencatat 'closed_at' timestamp."

Peran: Sistem (n8n Workflow)

US-S1 (Catat Log Broadcast): "Sebagai workflow n8n-Broadcast, saya ingin mengirim (POST) data log (berhasil atau gagal) ke API aplikasi agar setiap broadcast tercatat."

US-S2 (Buat Tiket Otomatis): "Sebagai workflow n8n-CS, saya ingin mengirim (POST) data masalah (dari balasan WA atau anomali) ke API aplikasi agar tiket baru dibuat secara otomatis."

7. Spesifikasi API Endpoint (Kontrak API)

Definisi teknis untuk developer backend dan frontend.

A. Endpoint Internal (n8n -> Aplikasi)

Autentikasi: Menggunakan Static API Key (kunci rahasia) yang dikirim di header X-API-KEY. Kunci ini harus disimpan di credentials n8n.

POST /api/v1/broadcast-logs

Tujuan: Dipanggil oleh n8n (Alur A) setiap selesai mengirim broadcast.

Request Body:

{
  "tracking_number": "LOG2024000821",
  "consignee_phone": "6287885358663",
  "status": "success", // "success" atau "failed"
  "message_content": "Paket Anda LOG2024000821 sedang diantar...",
  "error_message": null // Diisi jika status "failed"
}


Success Response (201 Created):

{
  "status": "created",
  "log_id": "a1b2c3d4-..."
}


Error Response (400 Bad Request):

{
  "error": "tracking_number is required"
}


POST /api/v1/tickets

Tujuan: Dipanggil oleh n8n (Alur B) untuk membuat tiket baru.

Request Body:

{
  "tracking_number": "LOG2024000735",
  "customer_phone": "6287885358663",
  "subject": "Komplain Keterlambatan Paket",
  "description": "Pelanggan membalas: 'Paket saya kok belum sampai?'",
  "priority": "high" // "low", "medium", "high", "urgent"
}


Success Response (201 Created):

{
  "status": "created",
  "ticket_uid": "CS-2024-0001"
}


B. Endpoint Frontend (Aplikasi -> Server)

Autentikasi: Menggunakan JWT (JSON Web Token) yang didapat saat login, dikirim di header Authorization: Bearer <token>.

POST /api/v1/auth/login

Tujuan: Login untuk Admin dan Agen.

Request Body: { "email": "...", "password": "..." }

Success Response (200 OK):

{
  "token": "ey...",
  "user": {
    "id": "...",
    "full_name": "Agent 001",
    "role": "agent"
  }
}


GET /api/v1/tickets

Tujuan: Mendapatkan daftar tiket untuk antrian.

Query Params (Opsional):

?status=open: Filter berdasarkan status.

?assigned_to=me: (Hanya untuk Agen) Mengambil tiket yang ditugaskan padanya.

?priority=high: Filter berdasarkan prioritas.

Success Response (200 OK): [ { ...daftar tiket... } ]

GET /api/v1/tickets/:id

Tujuan: Mendapatkan detail satu tiket (termasuk komentarnya).

Success Response (200 OK): { ...detail tiket..., comments: [ ... ] }

PUT /api/v1/tickets/:id

Tujuan: Mengubah status, prioritas, atau menugaskan tiket.

Request Body:

{
  "status": "pending", // Opsional
  "priority": "low", // Opsional
  "assigned_to_user_id": "a1b2c3d4-..." // Opsional (hanya Admin)
}


Success Response (200 OK): { ...data tiket yang sudah diupdate... }

POST /api/v1/tickets/:id/comments

Tujuan: Menambahkan catatan/komentar baru ke tiket.

Request Body:

{
  "comment_text": "Sudah dihubungi via WA, menunggu balasan.",
  "is_internal_note": true
}


Success Response (201 Created): { ...data komentar yang baru dibuat... }

GET /api/v1/broadcast-logs

Tujuan: (Hanya Admin) Melihat log broadcast dengan filter.

Query Params (Opsional):

?tracking_number=LOG...

?phone=628...

Success Response (200 OK): [ { ...daftar log... } ]