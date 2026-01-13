# ORM/Query Builder Explained

## What is an ORM/Query Builder?

**ORM (Object-Relational Mapping)** and **Query Builders** are tools that help you interact with databases using code instead of writing raw SQL.

## The Problem They Solve

### Without ORM/Query Builder (Raw SQL):

```typescript
// You write SQL strings directly
const user = await db.prepare(`
  SELECT id, email, name, role, email_verified, preferences,
         is_active, created_at, updated_at, last_login_at
  FROM users
  WHERE email = ?
`).get(email.toLowerCase());

// Then manually map database columns to your TypeScript types
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as UserRole,
  emailVerified: Boolean(user.email_verified),  // snake_case → camelCase
  preferences: JSON.parse(user.preferences || '{}'),
  isActive: Boolean(user.is_active),
  createdAt: new Date(user.created_at),  // string → Date
  updatedAt: new Date(user.updated_at),
  lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
};
```

**Problems:**
- ❌ Repetitive code (mapping columns every time)
- ❌ Easy to make typos in SQL strings
- ❌ No type safety (TypeScript can't check SQL)
- ❌ Manual date/JSON parsing
- ❌ Hard to refactor (change column name = update everywhere)

### With ORM/Query Builder:

```typescript
// Type-safe, clean code
const user = await db
  .selectFrom('users')
  .select(['id', 'email', 'name', 'role', 'emailVerified', 'preferences'])
  .where('email', '=', email.toLowerCase())
  .executeTakeFirst();

// Automatically mapped to your TypeScript types!
// No manual conversion needed
return user; // Already the right type!
```

**Benefits:**
- ✅ Type-safe (TypeScript knows the return type)
- ✅ Less code (no manual mapping)
- ✅ Auto-converts dates, JSON, booleans
- ✅ Prevents SQL injection
- ✅ Easier refactoring

## Is It Necessary?

### Short Answer: **No, but it's helpful**

You can absolutely write raw SQL (like you're doing now with SQL.js). However, ORMs/Query Builders make your code:
- More maintainable
- Type-safe
- Less error-prone
- Easier to refactor

## Your Current Code (Raw SQL)

Looking at your `authService.ts` and `userService.ts`, you're already writing raw SQL:

```typescript
// From authService.ts
const user = await queryOne<{
  id: number;
  email: string;
  name: string;
  role: string;
  email_verified: number;  // Database uses 0/1
  preferences: string;      // Database stores JSON as string
  is_active: number;
  created_at: string;       // Database stores as string
  updated_at: string;
  last_login_at: string | null;
}>(
  db,
  `SELECT id, email, name, role, email_verified, preferences,
          is_active, created_at, updated_at, last_login_at
   FROM users
   WHERE email = ?`,
  [email.toLowerCase().trim()]
);

// Then manually convert:
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as UserRole,
  emailVerified: Boolean(user.email_verified),  // Manual conversion
  preferences: JSON.parse(user.preferences || '{}'),  // Manual parsing
  isActive: Boolean(user.is_active),
  createdAt: new Date(user.created_at),  // Manual date conversion
  updatedAt: new Date(user.updated_at),
  lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
};
```

**This works fine!** But you have to:
1. Write the SQL string
2. Define the database row type (with snake_case)
3. Manually map to your TypeScript types (camelCase)
4. Convert booleans, dates, JSON manually

## With Query Builder (Example)

### Option 1: Kysely (Type-Safe Query Builder)

```typescript
// Define your database schema once
interface Database {
  users: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'coach' | 'viewer';
    email_verified: number;
    preferences: string;
    is_active: number;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  };
}

// Then use it - TypeScript knows everything!
const user = await db
  .selectFrom('users')
  .select([
    'id',
    'email', 
    'name',
    'role',
    'email_verified',
    'preferences',
    'is_active',
    'created_at',
    'updated_at',
    'last_login_at'
  ])
  .where('email', '=', email.toLowerCase())
  .executeTakeFirst();

// Kysely can auto-convert with plugins:
// - Dates: string → Date
// - Booleans: 0/1 → true/false  
// - JSON: string → object
```

### Option 2: Drizzle ORM

```typescript
// Define schema once
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email').notNull().unique(),
  name: varchar('name').notNull(),
  role: varchar('role').notNull(),
  emailVerified: boolean('email_verified').default(false),
  preferences: json('preferences'),
  // ... etc
});

// Then query - auto-mapped!
const user = await db.select().from(users).where(eq(users.email, email));
// user is already the right TypeScript type!
```

## Do You Need It?

### You DON'T need it if:
- ✅ You're comfortable writing SQL
- ✅ Your queries are simple
- ✅ You don't mind manual type mapping
- ✅ You want minimal dependencies
- ✅ You're using SQLite (simple queries)

### You SHOULD consider it if:
- ✅ You have many similar queries (lots of repetition)
- ✅ You want type safety (catch errors at compile time)
- ✅ You want to reduce boilerplate code
- ✅ You're planning to switch databases later (ORM abstracts differences)
- ✅ You have a team (easier for others to understand)

## Recommendation for Your Project

### Start Without ORM (Recommended)

**Why:**
1. Your current raw SQL approach works fine
2. SQLite queries are simple
3. You already have helper functions (`queryOne`, `queryAll`, `execute`)
4. Less dependencies = simpler setup
5. You can always add an ORM later

**Your current pattern is actually good:**
```typescript
// Helper function handles the boilerplate
export async function queryOne<T>(db, sql: string, params: any[]): Promise<T | null> {
  // ... handles the SQL execution
}

// Then you use it:
const user = await queryOne<UserRow>(db, 'SELECT * FROM users WHERE id = ?', [id]);
// Map once, reuse everywhere
```

### Add ORM Later If:

1. **You find yourself repeating the same mapping code:**
   ```typescript
   // If you're doing this 20+ times:
   emailVerified: Boolean(user.email_verified),
   preferences: JSON.parse(user.preferences || '{}'),
   createdAt: new Date(user.created_at),
   // → Consider an ORM
   ```

2. **You want better type safety:**
   - ORMs catch SQL errors at compile time
   - TypeScript knows your query results

3. **You're switching to MySQL/MariaDB:**
   - ORMs handle database differences
   - Easier migration

## Comparison: Your Code vs ORM

### Your Current Approach (Raw SQL + Helpers)

**Pros:**
- ✅ Simple, direct
- ✅ Full control over SQL
- ✅ No extra dependencies
- ✅ Easy to understand
- ✅ Works great with SQLite

**Cons:**
- ❌ Manual type mapping
- ❌ Repetitive code
- ❌ No compile-time SQL checking

### With ORM/Query Builder

**Pros:**
- ✅ Type-safe queries
- ✅ Less boilerplate
- ✅ Auto type conversion
- ✅ Easier refactoring
- ✅ Database-agnostic

**Cons:**
- ❌ Extra dependency
- ❌ Learning curve
- ❌ Sometimes generates inefficient SQL
- ❌ Less control over exact SQL

## Practical Example: Your getUserById

### Current (Raw SQL):
```typescript
export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDatabase();
  const user = await queryOne<{
    id: number;
    email: string;
    name: string;
    role: string;
    email_verified: number;
    preferences: string;
    is_active: number;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  }>(
    db,
    `SELECT id, email, name, role, email_verified, preferences,
            is_active, created_at, updated_at, last_login_at
     FROM users
     WHERE id = ?`,
    [userId]
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    emailVerified: Boolean(user.email_verified),
    preferences: JSON.parse(user.preferences || '{}'),
    isActive: Boolean(user.is_active),
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
  };
}
```

### With Kysely Query Builder:
```typescript
export async function getUserById(userId: number): Promise<User | null> {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) return null;

  // With Kysely plugins, this mapping could be automatic
  return mapUserRowToUser(user); // But you'd still need this function
}
```

**Reality:** You'd still need a mapping function, but the query is cleaner.

## My Recommendation

**For your project: Start without ORM, add later if needed**

1. **Your current approach is fine** - you have good helper functions
2. **SQLite is simple** - no complex queries needed
3. **You can always add an ORM later** - it's not a one-way decision
4. **Focus on getting the backend working first** - add polish later

**When to reconsider:**
- After you've built 10+ similar query functions
- If you find yourself copying/pasting mapping code
- If you switch to MySQL and want database abstraction
- If you want stronger type safety

## Bottom Line

**ORM/Query Builder = Convenience tool, not requirement**

- ✅ Your raw SQL approach works perfectly
- ✅ ORMs make code cleaner but add complexity
- ✅ Start simple, add ORM later if you need it
- ✅ Many successful apps use raw SQL

Think of it like: Do you need a framework to write HTML? No, but React makes it easier. Same concept - SQL works fine, ORMs make it nicer.
