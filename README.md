# Dashboard Monitoring Broadcast & Ticketing Logistik

![License](https://img.shields.io/badge/license-GPL%20v3-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-22.x-green.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

Aplikasi web modern untuk monitoring broadcast WhatsApp dan sistem ticketing logistik dengan integrasi n8n automation. Aplikasi ini menyediakan dashboard real-time untuk memantau aktivitas broadcast, mengelola tiket, dan mengotomatisasi workflow menggunakan n8n.

## 🚀 Fitur Utama

### 📊 Dashboard Real-time
- **Monitoring Broadcast**: Pantau status broadcast WhatsApp secara real-time
- **Analytics**: Statistik lengkap pengiriman pesan dan tingkat keberhasilan
- **Live Updates**: WebSocket integration untuk update data secara langsung
- **Responsive Design**: Interface yang optimal di semua perangkat

### 🎫 Sistem Ticketing
- **Manajemen Tiket**: Buat, edit, dan kelola tiket dengan mudah
- **Status Tracking**: Pantau progress tiket dari awal hingga selesai
- **Priority Management**: Sistem prioritas untuk penanganan tiket
- **Assignment System**: Assign tiket ke user tertentu

### 👥 User Management
- **Role-based Access**: Sistem role Administrator dan Agent
- **Authentication**: Login aman dengan JWT token
- **User Profiles**: Manajemen profil dan informasi user
- **Activity Logs**: Tracking aktivitas user dalam sistem

### 🔗 Integrasi n8n
- **Webhook Integration**: Terima data dari n8n workflows
- **API Endpoints**: RESTful API untuk integrasi dengan n8n
- **Automated Workflows**: Otomatisasi proses bisnis
- **Real-time Sync**: Sinkronisasi data real-time dengan n8n

### 💾 Database Flexibility
- **PostgreSQL Support**: Database utama untuk production
- **SQLite Fallback**: Temporary database solution
- **Mock Database**: Development dan testing
- **Migration Tools**: Tools untuk migrasi data antar database

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS** - Styling Framework
- **Radix UI** - Component Library
- **Recharts** - Data Visualization
- **Socket.io Client** - Real-time Communication
- **Zustand** - State Management
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **TypeScript** - Type Safety
- **Socket.io** - WebSocket Server
- **JWT** - Authentication
- **Bcrypt** - Password Hashing
- **Joi** - Data Validation
- **CORS** - Cross-Origin Resource Sharing

### Database
- **PostgreSQL** - Primary Database
- **SQLite3** - Temporary/Fallback Database
- **Mock Database** - Development & Testing

### DevOps & Tools
- **ESLint** - Code Linting
- **Prettier** - Code Formatting
- **Nodemon** - Development Server
- **Concurrently** - Parallel Script Execution
- **TSX** - TypeScript Execution

## 📋 Prerequisites

Pastikan Anda telah menginstall:

- **Node.js** (v18 atau lebih tinggi)
- **pnpm** (package manager)
- **PostgreSQL** (opsional, untuk production)
- **Git** (untuk version control)

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yogisyahroni/Aplikasi-Ticketing-Monitoring-n8nv2.git
cd Aplikasi-Ticketing-Monitoring-n8nv2
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Salin file environment example dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Edit file `.env` dengan konfigurasi Anda:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ticketing_db
USE_SQLITE=true  # Set to true untuk menggunakan SQLite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 4. Database Setup

#### Opsi A: PostgreSQL (Production)

1. Buat database PostgreSQL:
```sql
CREATE DATABASE ticketing_db;
```

2. Jalankan migrasi:
```bash
pnpm run db:init
```

#### Opsi B: SQLite (Development/Testing)

Set environment variable:
```bash
# Di .env file
USE_SQLITE=true
```

Database SQLite akan dibuat otomatis saat aplikasi pertama kali dijalankan.

### 5. Jalankan Aplikasi

```bash
pnpm run dev
```

Aplikasi akan berjalan di:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🔐 Login Credentials

### Default Users (Mock Database)

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@logistik.com | admin123 |
| Administrator | admin@example.com | admin123 |
| Agent | agent1@example.com | admin123 |

## 📖 Usage Guide

### 1. Login ke Aplikasi
- Buka browser dan akses http://localhost:5173
- Gunakan credentials di atas untuk login
- Pilih role sesuai kebutuhan (Admin/Agent)

### 2. Dashboard
- **Overview**: Lihat ringkasan aktivitas sistem
- **Real-time Updates**: Monitor broadcast dan tiket secara langsung
- **Charts & Analytics**: Analisis data dengan visualisasi interaktif

### 3. Manajemen Tiket
- **Buat Tiket Baru**: Klik tombol "New Ticket"
- **Edit Tiket**: Klik pada tiket untuk mengedit
- **Filter & Search**: Gunakan filter untuk mencari tiket spesifik
- **Status Update**: Update status tiket sesuai progress

### 4. User Management (Admin Only)
- **Tambah User**: Buat akun user baru
- **Edit Profile**: Kelola informasi user
- **Role Assignment**: Assign role ke user

### 5. Monitoring
- **Broadcast Logs**: Monitor aktivitas broadcast WhatsApp
- **System Health**: Pantau kesehatan sistem
- **Performance Metrics**: Lihat metrik performa aplikasi

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | No |
| `USE_SQLITE` | Use SQLite instead of PostgreSQL | false | No |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration time | 24h | No |
| `PORT` | Server port | 3001 | No |
| `NODE_ENV` | Environment mode | development | No |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:5173 | No |

### Database Configuration

#### PostgreSQL Setup
```bash
# Install PostgreSQL
# Create database
createdb ticketing_db

# Run migrations
pnpm run db:init
```

#### SQLite Setup
```bash
# Set environment variable
echo "USE_SQLITE=true" >> .env

# Database akan dibuat otomatis
pnpm run dev
```

## 🚀 Deployment

### 1. Production Build

```bash
# Build aplikasi
pnpm run build

# Preview build
pnpm run preview
```

### 2. Environment Setup

Buat file `.env.production`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com
```

### 3. Deploy ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 4. Deploy ke VPS/Server

```bash
# Clone repository di server
git clone https://github.com/yogisyahroni/Aplikasi-Ticketing-Monitoring-n8nv2.git
cd Aplikasi-Ticketing-Monitoring-n8nv2

# Install dependencies
pnpm install

# Build aplikasi
pnpm run build

# Setup PM2 (Process Manager)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📡 API Documentation

### Authentication Endpoints

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Tickets Endpoints

```
GET    /api/tickets          # Get all tickets
POST   /api/tickets          # Create new ticket
GET    /api/tickets/:id      # Get ticket by ID
PUT    /api/tickets/:id      # Update ticket
DELETE /api/tickets/:id      # Delete ticket
```

### Users Endpoints

```
GET    /api/users            # Get all users (Admin only)
POST   /api/users            # Create new user (Admin only)
GET    /api/users/:id        # Get user by ID
PUT    /api/users/:id        # Update user
DELETE /api/users/:id        # Delete user (Admin only)
```

### Dashboard Endpoints

```
GET /api/dashboard/summary   # Get dashboard summary
GET /api/dashboard/stats     # Get statistics
```

### Broadcast Logs Endpoints

```
GET  /api/broadcast-logs     # Get broadcast logs
POST /api/broadcast-logs     # Create broadcast log
```

### n8n Integration Endpoints

```
POST /api/n8n/webhook        # Receive n8n webhook
GET  /api/n8n/status         # Get n8n integration status
```

### Sync Endpoints

```
POST /api/sync/export        # Export data
POST /api/sync/import        # Import data
POST /api/sync/backup        # Create backup
```

## 🔄 Migration Guide

### SQLite ke PostgreSQL

1. **Export data dari SQLite**:
```bash
pnpm run sqlite:export
```

2. **Setup PostgreSQL database**:
```bash
createdb ticketing_db
pnpm run db:init
```

3. **Import data ke PostgreSQL**:
```bash
# Update .env untuk PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/ticketing_db
USE_SQLITE=false

# Import data
pnpm run sqlite:import
```

### Backup & Restore

```bash
# Backup SQLite
pnpm run sqlite:backup

# Sync data
pnpm run sqlite:sync
```

## 🛠️ Development

### Project Structure

```
├── api/                    # Backend API
│   ├── config/            # Database & configuration
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── websocket/        # WebSocket server
│   └── server.ts         # Main server file
├── src/                   # Frontend React app
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom hooks
│   ├── store/           # State management
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── database/             # Database schemas & migrations
├── scripts/             # Utility scripts
└── public/              # Static assets
```

### Available Scripts

```bash
# Development
pnpm run dev              # Start dev server (frontend + backend)
pnpm run client:dev       # Start frontend only
pnpm run server:dev       # Start backend only

# Build
pnpm run build           # Build for production
pnpm run preview         # Preview production build

# Database
pnpm run db:init         # Initialize database
pnpm run db:reset        # Reset database

# SQLite Tools
pnpm run sqlite:export   # Export SQLite data
pnpm run sqlite:import   # Import data to SQLite
pnpm run sqlite:backup   # Backup SQLite database
pnpm run sqlite:sync     # Sync SQLite data

# Code Quality
pnpm run lint            # Run ESLint
pnpm run check           # TypeScript type checking
```

### Adding New Features

1. **Backend API**:
   - Tambah route di `api/routes/`
   - Implementasi middleware jika diperlukan
   - Update database schema jika perlu

2. **Frontend**:
   - Buat component di `src/components/`
   - Tambah page di `src/pages/`
   - Update routing di `src/App.tsx`

3. **Database**:
   - Update schema di `database/schema.sql`
   - Tambah migration script jika perlu

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Pastikan PostgreSQL berjalan
- Atau set `USE_SQLITE=true` di .env

#### 2. SQLite Module Error
```
Error: Cannot find module 'sqlite3'
```
**Solution**:
```bash
pnpm install sqlite3
# Atau gunakan mock database
USE_SQLITE=false  # di .env
```

#### 3. JWT Secret Missing
```
Error: JWT secret is required
```
**Solution**:
```bash
# Tambah di .env
JWT_SECRET=your-secret-key-here
```

#### 4. CORS Error
```
Access to fetch blocked by CORS policy
```
**Solution**:
```bash
# Update CORS_ORIGIN di .env
CORS_ORIGIN=http://localhost:5173
```

#### 5. Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Solution**:
```bash
# Kill process menggunakan port
npx kill-port 3001
# Atau ubah PORT di .env
```

### Debug Mode

Enable debug logging:
```bash
# Di .env
NODE_ENV=development
DEBUG=true
```

### Performance Issues

1. **Slow Database Queries**:
   - Check database indexes
   - Optimize query di API endpoints

2. **High Memory Usage**:
   - Monitor WebSocket connections
   - Check for memory leaks di React components

3. **Slow Frontend Loading**:
   - Enable code splitting
   - Optimize bundle size dengan Vite

## 🤝 Contributing

Kami menyambut kontribusi dari komunitas! Berikut cara berkontribusi:

### 1. Fork Repository

```bash
# Fork repository di GitHub
# Clone fork Anda
git clone https://github.com/yourusername/Aplikasi-Ticketing-Monitoring-n8nv2.git
```

### 2. Create Feature Branch

```bash
git checkout -b feature/amazing-feature
```

### 3. Development Guidelines

- **Code Style**: Ikuti ESLint configuration
- **TypeScript**: Gunakan type safety
- **Testing**: Tambah test untuk fitur baru
- **Documentation**: Update dokumentasi jika perlu

### 4. Commit Guidelines

```bash
# Format commit message
git commit -m "feat: add amazing feature"
git commit -m "fix: resolve login issue"
git commit -m "docs: update README"
```

### 5. Submit Pull Request

- Push ke branch Anda
- Buat Pull Request di GitHub
- Jelaskan perubahan yang dibuat
- Tunggu review dari maintainer

### Code Review Process

1. **Automated Checks**: ESLint, TypeScript, Build
2. **Manual Review**: Code quality, functionality
3. **Testing**: Pastikan tidak ada breaking changes
4. **Documentation**: Update jika diperlukan

## 📄 License

Proyek ini dilisensikan di bawah [GNU General Public License v3.0](LICENSE). <mcreference link="https://github.com/yogisyahroni/Aplikasi-Ticketing-Monitoring-n8nv2" index="0">0</mcreference>

### Ringkasan License

- ✅ **Commercial use** - Boleh digunakan untuk tujuan komersial
- ✅ **Modification** - Boleh dimodifikasi
- ✅ **Distribution** - Boleh didistribusikan
- ✅ **Patent use** - Memberikan hak paten
- ✅ **Private use** - Boleh digunakan secara pribadi

- ❌ **Liability** - Tidak ada jaminan
- ❌ **Warranty** - Tidak ada garansi

- ℹ️ **License and copyright notice** - Harus menyertakan lisensi
- ℹ️ **State changes** - Harus mencantumkan perubahan
- ℹ️ **Disclose source** - Harus membuka source code
- ℹ️ **Same license** - Harus menggunakan lisensi yang sama

## 👥 Team

- **Developer**: [Yogi Syahroni](https://github.com/yogisyahroni)
- **Project**: Dashboard Monitoring Broadcast & Ticketing Logistik
- **Version**: 2.0.0

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. **GitHub Issues**: [Create an issue](https://github.com/yogisyahroni/Aplikasi-Ticketing-Monitoring-n8nv2/issues)
2. **Documentation**: Baca dokumentasi lengkap di repository
3. **Community**: Join diskusi di GitHub Discussions

## 🔄 Changelog

### Version 2.0.0 (Current)
- ✨ Complete rewrite dengan TypeScript
- 🚀 Modern React 18 dengan Vite
- 💾 Multi-database support (PostgreSQL, SQLite, Mock)
- 🔗 n8n integration dengan webhook
- 📊 Real-time dashboard dengan WebSocket
- 🎫 Enhanced ticketing system
- 👥 Role-based user management
- 🛠️ Migration tools dan backup system
- 📱 Responsive design dengan Tailwind CSS
- 🔐 Secure authentication dengan JWT

### Version 1.0.0
- 📊 Basic dashboard monitoring
- 🎫 Simple ticketing system
- 👤 Basic user management

## 🚀 Roadmap

### Upcoming Features

- [ ] **Mobile App**: React Native mobile application
- [ ] **Advanced Analytics**: Machine learning insights
- [ ] **Multi-tenant**: Support multiple organizations
- [ ] **API Rate Limiting**: Enhanced security
- [ ] **Audit Logs**: Comprehensive activity tracking
- [ ] **Email Notifications**: Automated email alerts
- [ ] **File Attachments**: Support file uploads in tickets
- [ ] **Advanced Reporting**: Custom report generation
- [ ] **Integration Hub**: More third-party integrations
- [ ] **Dark Mode**: Theme customization

---

**Made with ❤️ by [Yogi Syahroni](https://github.com/yogisyahroni)**

*Dashboard Monitoring Broadcast & Ticketing Logistik - Solusi modern untuk monitoring dan manajemen ticketing dengan integrasi n8n automation.*