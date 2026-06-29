# 🚀 Discord Clone - Quick Reference

**Phase 1 + 2 Complete** | Last Updated: 2026-06-29

---

## 📁 Quick Navigation

- **Full Documentation:** `README.md`
- **Quick Setup:** `QUICKSTART.md`
- **Phase 1 Details:** `PHASE1-COMPLETE.md`
- **Phase 2 Details:** `PHASE2-COMPLETE.md`

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Setup database (one-time)
.\setup-database.ps1

# 2. Start backend
cd backend
npm run dev

# 3. Start frontend (new terminal)
cd frontend
npm run dev

# 4. Open browser
http://localhost:3000
```

---

## 🎯 What Works Right Now

### ✅ Phase 1: Authentication
- Register account
- Login/logout
- JWT authentication
- Protected routes
- Profile management

### ✅ Phase 2: Real-time Chat
- Create servers
- Create channels (auto "general" on server create)
- Send messages
- Real-time updates (Socket.io)
- Edit/delete messages
- Typing indicators (backend ready)
- Join/leave servers
- Server & channel management

---

## 📊 API Quick Reference

### Auth
```bash
POST /api/auth/register    # Register user
POST /api/auth/login       # Login user
GET  /api/auth/me          # Get current user (requires auth)
POST /api/auth/logout      # Logout
```

### Servers
```bash
POST   /api/servers           # Create server
GET    /api/servers           # Get user's servers
GET    /api/servers/:id       # Get server details
PATCH  /api/servers/:id       # Update server
DELETE /api/servers/:id       # Delete server
POST   /api/servers/:id/join  # Join server
POST   /api/servers/:id/leave # Leave server
```

### Channels
```bash
POST   /api/channels/servers/:serverId/channels  # Create channel
GET    /api/channels/:id                         # Get channel
PATCH  /api/channels/:id                         # Update channel
DELETE /api/channels/:id                         # Delete channel
```

### Messages
```bash
POST   /api/channels/:channelId/messages  # Send message
GET    /api/channels/:channelId/messages  # Get messages (?limit=50&before=msgId)
PATCH  /api/messages/:id                  # Edit message
DELETE /api/messages/:id                  # Delete message
```

---

## 🔌 Socket.io Events

### Connect
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});
```

### Events
```javascript
// Join channel
socket.emit('channel:join', channelId);

// Send typing indicator
socket.emit('typing:start', channelId);
socket.emit('typing:stop', channelId);

// Listen for messages
socket.on('message:create', (msg) => console.log(msg));
socket.on('message:update', (msg) => console.log(msg));
socket.on('message:delete', (data) => console.log(data));
```

---

## 🗄️ Database Schema

```sql
users          -- User accounts
servers        -- Discord servers
channels       -- Text/voice channels
messages       -- Chat messages
server_members -- Server membership
roles          -- Server roles (ready, not used yet)
member_roles   -- Role assignments (ready, not used yet)
```

---

## 🛠️ Tech Stack

### Backend
- Node.js 20+ + TypeScript
- Express 4.x
- Socket.io 4.x
- PostgreSQL 14+
- JWT + bcrypt
- Zod validation

### Frontend
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state)
- Socket.io-client
- Axios

---

## 📂 Project Structure

```
discord-clone/
├── backend/src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── middleware/     # Auth & socket middleware
│   ├── utils/          # DB & JWT utilities
│   └── index.ts        # Main server
│
├── frontend/
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   └── lib/            # API & state management
│
└── database/
    └── schema.sql      # PostgreSQL schema
```

---

## 🧪 Test Accounts

```
Email: test@example.com
Password: password123

Email: admin@example.com
Password: password123
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
# Update backend/.env with correct credentials
DATABASE_URL=postgresql://postgres:***@localhost:5432/discord_clone
```

### Port Already in Use
```bash
# Kill process on port 3001 (backend)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Kill process on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Socket Not Connecting
- Check backend is running on port 3001
- Check token is valid (login again)
- Check browser console for errors

### Messages Not Appearing
- Check Socket.io connection (browser console)
- Check backend logs for errors
- Refresh page and rejoin channel

---

## 📝 Development Tips

### Backend Development
```bash
cd backend
npm run dev        # Auto-reload with nodemon
npm run build      # TypeScript compile check
```

### Frontend Development
```bash
cd frontend
npm run dev        # Next.js dev server
npm run build      # Production build
npm run lint       # ESLint check
```

### Database Management
```bash
# Connect to database
psql -U postgres -d discord_clone

# View tables
\dt

# View schema
\d users
\d messages

# Clear messages (for testing)
DELETE FROM messages;
```

---

## 🔥 Common Tasks

### Create New User (SQL)
```sql
INSERT INTO users (username, email, password_hash)
VALUES ('newuser', 'new@example.com', '$2b$10$...');
```

### Create Server via API
```javascript
const response = await fetch('http://localhost:3001/api/servers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Server',
    description: 'Test server'
  })
});
```

### Send Message via API
```javascript
const response = await fetch(`http://localhost:3001/api/channels/${channelId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Hello world!'
  })
});
```

---

## 📚 File Locations

- Backend: `C:\Users\xraym\.openclaw\workspace\discord-clone\backend`
- Frontend: `C:\Users\xraym\.openclaw\workspace\discord-clone\frontend`
- Database: `C:\Users\xraym\.openclaw\workspace\discord-clone\database`
- Docs: `C:\Users\xraym\.openclaw\workspace\discord-clone\*.md`

---

## 🎯 Next Steps

**Current Status:** Phase 1 + 2 Complete ✅

**Ready for Phase 3:**
- Member list UI
- Typing indicators UI
- Message reactions
- File uploads
- User mentions

**Or Phase 4 (Bot API):**
- Bot registration
- Bot commands
- Bot SDK

**Or Deploy:**
- Vercel + Railway
- Production ready

---

## 💡 Quick Commands

```bash
# Full restart
taskkill /F /IM node.exe    # Kill all Node processes
cd backend && npm run dev   # Restart backend
cd frontend && npm run dev  # Restart frontend

# Fresh install
rm -rf node_modules package-lock.json
npm install

# Reset database
psql -U postgres -d discord_clone -f database/schema.sql
```

---

**For full details, see:**
- `PHASE1-COMPLETE.md` - Auth system details
- `PHASE2-COMPLETE.md` - Real-time chat details
- `README.md` - Full documentation

**Questions? Check the docs or ask Boss!** 🦜
