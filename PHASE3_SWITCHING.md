# Phase 3: Switching Between Browser DB and Backend API

You can now switch between the browser database (SQL.js) and backend API modes using a feature flag.

## How to Switch

### Use Browser Database (Original - Default)
**No configuration needed!** Just make sure `VITE_USE_BACKEND_API` is not set or is `false`.

The app will use:
- `authService.browser.ts` - Direct SQL.js database calls
- Data stored in browser `localStorage`
- No backend server required

### Use Backend API (New)
Add to your `.env` file (in the project root):

```env
VITE_USE_BACKEND_API=true
VITE_API_URL=http://localhost:3001/api
```

Then:
1. Make sure backend is running: `cd backend && npm run dev`
2. Restart your frontend dev server
3. The app will use:
   - `authService.api.ts` - HTTP requests to backend
   - Data stored in backend SQLite database
   - Backend server required

## Current Status

✅ **Completed:**
- API client (`apiClient.ts`)
- API-based auth service (`authService.api.ts`)
- Browser-based auth service (`authService.browser.ts`) - **RESTORED**
- Router that switches between them (`authService.ts`)

⏳ **Still TODO:**
- Refactor `userService.ts` to support both modes
- Refactor `teamService.ts` to support both modes
- Update `AuthContext` if needed (should work as-is)

## Testing

### Test Browser Mode (Default)
1. Don't set `VITE_USE_BACKEND_API`
2. Start frontend: `npm run dev`
3. App uses browser database

### Test API Mode
1. Set `VITE_USE_BACKEND_API=true` in `.env`
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `npm run dev`
4. App uses backend API

## Files Structure

```
src/services/
├── apiClient.ts              # HTTP client for backend API
├── authService.ts            # Router (switches between browser/API)
├── authService.browser.ts    # Browser DB implementation (SQL.js)
├── authService.api.ts        # Backend API implementation
├── userService.ts            # Still uses browser DB (needs refactoring)
└── teamService.ts            # Still uses browser DB (needs refactoring)
```

## Notes

- Both implementations have the same function signatures
- The router automatically selects the right one based on the feature flag
- You can switch back and forth during development
- Once API mode is stable, you can remove the browser implementation
