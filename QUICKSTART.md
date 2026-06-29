# Discord Clone - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install PostgreSQL (if not installed)
Download from: https://www.postgresql.org/download/windows/

**Default credentials:**
- Username: `postgres`
- Password: `postgres` (set during installation)
- Port: `5432`

### Step 2: Create Database

**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `discord_clone`
4. Click Save

**Option B: Using Command Line**
```bash
# Open Command Prompt and run:
psql -U postgres
# Enter password when prompted

# Then in psql:
CREATE DATABASE discord_clone;
\q
```

### Step 3: Run Database Schema

```bash
cd C:\Users\xraym\.openclaw\workspace\discord-clone

# Run schema
psql -U postgres -d discord_clone -f database\schema.sql
# Enter password when prompted
```

### Step 4: Start Backend

```bash
cd backend

# Start server (auto-reload on changes)
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   Discord Clone Backend                ║
║   Server running on port 3001          ║
║   Environment: development             ║
╚════════════════════════════════════════╝
✅ Database connected
```

### Step 5: Start Frontend (New Terminal)

```bash
cd frontend

# Start Next.js dev server
npm run dev
```

Open browser: http://localhost:3000

### Step 6: Test It!

1. Click "Register"
2. Create account:
   - Username: `testuser`
   - Email: `test@test.com`
   - Password: `password123`
3. You'll be logged in automatically!

---

## 🐛 Troubleshooting

### Database Connection Error

**Error:** `ECONNREFUSED localhost:5432`

**Fix:**
1. Check PostgreSQL is running:
   - Windows: Open Services → PostgreSQL should be "Running"
2. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/discord_clone
   ```

### Port Already in Use

**Error:** `Port 3001 is already in use`

**Fix:**
```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Frontend Build Error

**Error:** `Module not found`

**Fix:**
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📝 Test Accounts (Pre-seeded)

**Account 1:**
- Email: `test@example.com`
- Password: `password123`

**Account 2:**
- Email: `admin@example.com`
- Password: `password123`

---

## 🎯 What's Working Right Now

✅ User registration
✅ User login
✅ JWT authentication
✅ Protected routes
✅ Logout
✅ Discord-like UI

---

## 📁 File Locations

- Backend: `C:\Users\xraym\.openclaw\workspace\discord-clone\backend`
- Frontend: `C:\Users\xraym\.openclaw\workspace\discord-clone\frontend`
- Database: `C:\Users\xraym\.openclaw\workspace\discord-clone\database`

---

## 🔥 Next Steps

Boss tinggal:
1. Install PostgreSQL (if needed)
2. Create database `discord_clone`
3. Run schema SQL
4. Start backend (`npm run dev`)
5. Start frontend (`npm run dev`)
6. Open http://localhost:3000
7. Register & enjoy!

**Phase 1 DONE! Ready untuk Phase 2 (Real-time Chat)?**
