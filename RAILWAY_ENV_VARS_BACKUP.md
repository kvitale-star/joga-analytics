# Railway Environment Variables Backup

## Backend Service Environment Variables

Copy these into Railway → Backend Service → Variables:

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.railway.app
DATABASE_PATH=./data/joga.db
JWT_SECRET=your-production-secret-key-here
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=kvitale@gmail.com
ENABLE_PASSWORD_VALIDATION=true
```

## Frontend Service Environment Variables

Copy these into Railway → Frontend Service → Variables:

```env
VITE_USE_BACKEND_API=true
VITE_API_URL=https://your-backend.railway.app/api
```

## Important Notes

- Replace `your-frontend.railway.app` with your actual frontend domain
- Replace `your-backend.railway.app` with your actual backend domain
- Replace `your-production-secret-key-here` with a strong random string
- Replace `SG.your_api_key_here` with your actual SendGrid API key

## Why Variables Might Disappear

1. **Service was deleted and recreated** - Variables are tied to the service
2. **Looking at wrong service** - Make sure you're in the correct service
3. **Railway glitch** - Rare, but can happen
4. **Project was recreated** - Variables don't transfer between projects

## Prevention

- Keep a backup of your environment variables (like this file)
- Document all variables in a secure location
- Consider using Railway's variable groups if available
