# SQLite Migration Guide
## Dashboard Monitoring Broadcast & Ticketing Logistik

### Overview
Panduan ini menjelaskan cara menggunakan SQLite sebagai database sementara dan proses migrasi ke PostgreSQL ketika database utama kembali online.

## 🚀 Quick Start dengan SQLite

### 1. Konfigurasi Environment
Pastikan file `.env` memiliki konfigurasi berikut:
```env
# SQLite Configuration (set to true to use SQLite instead of PostgreSQL)
USE_SQLITE=true
```

### 2. Menjalankan Aplikasi
```bash
# Install dependencies
pnpm install

# Jalankan aplikasi (akan otomatis menggunakan SQLite)
pnpm run dev
```

### 3. Login Default
- **Admin**: admin@ticketing.com / admin123
- **Agent**: agent@ticketing.com / agent123

## 📊 Fitur SQLite

### Automatic Fallback
Aplikasi akan otomatis beralih ke SQLite jika:
- PostgreSQL tidak tersedia
- Koneksi PostgreSQL gagal
- Environment variable `USE_SQLITE=true`

### Data Structure
SQLite menggunakan struktur tabel yang sama dengan PostgreSQL:
- `users` - Data pengguna dan autentikasi
- `tickets` - Data tiket customer service
- `ticket_comments` - Komentar dan catatan tiket
- `broadcast_logs` - Log broadcast n8n
- `dashboard_summary` - Ringkasan dashboard

### Database Location
Database SQLite disimpan di: `database/ticketing_monitoring.sqlite`

## 🔄 Sinkronisasi Data

### Command Line Interface
```bash
# Export data SQLite ke JSON
pnpm run sqlite:export

# Import data JSON ke PostgreSQL
pnpm run sqlite:import

# Buat backup data SQLite
pnpm run sqlite:backup

# Sinkronisasi penuh SQLite → PostgreSQL
pnpm run sqlite:sync
```

### REST API Endpoints
```http
# Export data
POST /api/sync/export

# Import data ke PostgreSQL
POST /api/sync/import

# Buat backup
POST /api/sync/backup

# Sinkronisasi penuh
POST /api/sync/sync

# Status sinkronisasi
GET /api/sync/status

# Download export file
GET /api/sync/download/export

# Download backup file
GET /api/sync/download/backup/:filename
```

## 📋 Proses Migrasi ke PostgreSQL

### Langkah 1: Persiapan PostgreSQL
1. Pastikan PostgreSQL server berjalan
2. Buat database dengan nama sesuai konfigurasi
3. Jalankan schema PostgreSQL:
```bash
psql -U postgres -d ticketing_monitoring -f database/schema.sql
```

### Langkah 2: Export Data dari SQLite
```bash
# Via command line
pnpm run sqlite:export

# Via API
curl -X POST http://localhost:3001/api/sync/export
```

### Langkah 3: Import Data ke PostgreSQL
```bash
# Via command line
pnpm run sqlite:import

# Via API
curl -X POST http://localhost:3001/api/sync/import
```

### Langkah 4: Switch ke PostgreSQL
1. Update file `.env`:
```env
USE_SQLITE=false
# atau hapus baris USE_SQLITE
```

2. Restart aplikasi:
```bash
pnpm run dev
```

### Langkah 5: Verifikasi
1. Login ke aplikasi
2. Periksa data dashboard
3. Verifikasi data tiket dan pengguna
4. Test semua fitur utama

## 🛠️ Troubleshooting

### SQLite Database Corrupt
```bash
# Buat backup terlebih dahulu
pnpm run sqlite:backup

# Hapus database dan restart aplikasi
rm database/ticketing_monitoring.sqlite
pnpm run dev
```

### Migration Failed
```bash
# Periksa log error
tail -f logs/application.log

# Coba export manual
node scripts/sqlite-sync.js export

# Periksa file export
cat database/sqlite-export.json
```

### PostgreSQL Connection Issues
1. Periksa konfigurasi database di `.env`
2. Test koneksi PostgreSQL:
```bash
psql -U postgres -h localhost -p 5432 -d ticketing_monitoring
```

### Data Inconsistency
```bash
# Buat backup sebelum migrasi
pnpm run sqlite:backup

# Gunakan backup untuk restore jika diperlukan
node scripts/sqlite-sync.js import database/backup-YYYY-MM-DD.json
```

## 📈 Performance Considerations

### SQLite Optimizations
- Database menggunakan WAL mode untuk performa lebih baik
- Foreign keys diaktifkan untuk integritas data
- Indexes dibuat untuk query yang sering digunakan

### Limitations
- SQLite tidak mendukung concurrent writes yang tinggi
- Beberapa fitur PostgreSQL tidak tersedia (UUID, ENUM types)
- Performa query kompleks mungkin lebih lambat

## 🔒 Security Notes

### Data Protection
- Database SQLite file harus dilindungi dengan permission yang tepat
- Backup files berisi data sensitif (password hash)
- Gunakan HTTPS untuk API sync endpoints

### Migration Security
- Validasi data sebelum import ke PostgreSQL
- Gunakan transaction untuk atomic operations
- Backup data sebelum migrasi

## 📝 Monitoring & Logging

### Log Files
- Application logs: `logs/application.log`
- Sync logs: `logs/sync.log`
- Error logs: `logs/error.log`

### Monitoring Endpoints
```http
# Health check
GET /api/health

# Sync status
GET /api/sync/status

# Database status
GET /api/dashboard/stats
```

## 🚨 Emergency Procedures

### Rollback to SQLite
1. Set `USE_SQLITE=true` di `.env`
2. Restart aplikasi
3. Restore dari backup jika diperlukan

### Data Recovery
```bash
# List available backups
ls -la database/backup-*.json

# Restore from specific backup
node scripts/sqlite-sync.js import database/backup-YYYY-MM-DD.json
```

### Complete Reset
```bash
# Backup current data
pnpm run sqlite:backup

# Remove SQLite database
rm database/ticketing_monitoring.sqlite

# Restart application (will create fresh database)
pnpm run dev
```

## 📞 Support

Untuk bantuan teknis:
1. Periksa log files untuk error details
2. Gunakan backup data untuk recovery
3. Dokumentasikan langkah-langkah yang menyebabkan masalah
4. Sertakan informasi environment (OS, Node.js version, dll)

---

**Note**: Panduan ini dibuat untuk memastikan transisi yang mulus dari SQLite ke PostgreSQL tanpa mengganggu operasional aplikasi.