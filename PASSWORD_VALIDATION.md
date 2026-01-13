# Password Validation Feature

Password validation has been added to prevent users from using weak or common passwords.

## Features

- ✅ Checks against top 100 most common passwords (case-insensitive)
- ✅ Minimum 8 characters required
- ✅ Must contain at least one letter and one number
- ✅ Can be disabled for testing via environment variable
- ✅ Works in both browser database mode and backend API mode

## Environment Variables

### Frontend (Browser Database Mode)

Add to `.env` in the project root:

```env
# Enable/disable password validation (default: enabled)
VITE_ENABLE_PASSWORD_VALIDATION=true   # or false to disable
```

### Backend (API Mode)

Add to `backend/.env`:

```env
# Enable/disable password validation (default: enabled)
ENABLE_PASSWORD_VALIDATION=true   # or false to disable
```

## Usage

### For Testing (Disable Validation)

**Frontend:**
```env
VITE_ENABLE_PASSWORD_VALIDATION=false
```

**Backend:**
```env
ENABLE_PASSWORD_VALIDATION=false
```

Then restart your dev servers.

### For Production (Enable Validation)

**Frontend:**
```env
VITE_ENABLE_PASSWORD_VALIDATION=true
```
Or simply omit the variable (defaults to enabled).

**Backend:**
```env
ENABLE_PASSWORD_VALIDATION=true
```
Or simply omit the variable (defaults to enabled).

## Where Validation is Applied

Password validation is checked when:

1. **Creating a new user** (`createUser`)
2. **Creating initial admin** (`createInitialAdmin` / setup wizard)
3. **Resetting password** (`resetPassword`)
4. **Changing password** (`changePassword`)

## Validation Rules

1. **Minimum length**: 8 characters
2. **Common passwords**: Cannot use any of the top 100 most common passwords
3. **Complexity**: Must contain at least one letter and one number

## Error Messages

- `"Password must be at least 8 characters long"`
- `"This password is too common. Please choose a more secure password."`
- `"Password must contain at least one letter and one number"`

## Testing

To test with weak passwords during development:

1. Set `VITE_ENABLE_PASSWORD_VALIDATION=false` in `.env` (frontend)
2. Set `ENABLE_PASSWORD_VALIDATION=false` in `backend/.env` (backend)
3. Restart both servers
4. You can now use passwords like "password123" or "12345678" for testing

**Remember to re-enable validation before deploying to production!**
