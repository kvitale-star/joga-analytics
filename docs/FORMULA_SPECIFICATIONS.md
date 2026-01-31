# Formula Specifications for Computed Fields

**📝 Use this document to provide formulas for missing computed fields.**

Simply fill in the formulas below and I'll implement them in the code.

---

## Missing Formulas

### 1. SPI (Sustained Passing Index)

**Current Status:** Not implemented - placeholder exists

**Location in Code:** `backend/src/services/matchStatsService.ts` - `calculateSPI()` function

**Provide Formula:**

- **SPI** = 
  ```
  [Your formula here]
  ```
  
- **SPI (w)** (Weighted) = 
  ```
  [Your formula here]
  ```
  
- **Opp SPI** = 
  ```
  [Your formula here]
  ```
  
- **Opp SPI (w)** (Weighted) = 
  ```
  [Your formula here]
  ```

**Notes/Examples:**
- [Add any notes or examples here]

---

### 2. Total Attempts (1st Half)

**Current Status:** Not computed - excluded from form but not implemented

**Location in Code:** `backend/src/services/matchStatsService.ts` - `computeMatchStats()` function

**Provide Formula:**

```
Total Attempts (1st Half) = [Your formula here]
```

**Example:**
- If shotsFor1stHalf = 8
- If attemptsFor1stHalf = 12
- Expected result: ?

**Notes:**
- [Add any notes here]

---

### 3. Total Attempts (2nd Half)

**Current Status:** Not computed - excluded from form but not implemented

**Location in Code:** `backend/src/services/matchStatsService.ts` - `computeMatchStats()` function

**Provide Formula:**

```
Total Attempts (2nd Half) = [Your formula here]
```

**Example:**
- If shotsFor2ndHalf = 6
- If attemptsFor2ndHalf = 10
- Expected result: ?

**Notes:**
- [Add any notes here]

---

### 4. Pass Strings (3-5)

**Current Status:** Not computed - excluded from form but not implemented

**Location in Code:** `backend/src/services/matchStatsService.ts` - `computeMatchStats()` function

**Provide Formula:**

```
Pass Strings (3-5) = [Your formula here]
```

**Example:**
- If "3-pass string" = 5
- If "4-pass string" = 8
- If "5-pass string" = 12
- Expected result: 25? (sum of all three?)

**Notes:**
- [Add any notes here]

---

### 5. Pass Strings (6+)

**Current Status:** Not computed - excluded from form but not implemented

**Location in Code:** `backend/src/services/matchStatsService.ts` - `computeMatchStats()` function

**Provide Formula:**

```
Pass Strings (6+) = [Your formula here]
```

**Example:**
- If "6-pass string" = 10
- If "7-pass string" = 6
- If "8-pass string" = 3
- If "9-pass string" = 1
- If "10-pass string" = 0
- Expected result: 20? (sum of all five?)

**Notes:**
- [Add any notes here]

---

## How to Provide Formulas

You can provide formulas in any of these formats:

1. **Mathematical notation:**
   ```
   SPI = (passesInChain / totalPasses) * 100
   ```

2. **Plain English:**
   ```
   SPI equals the number of passes in a pass chain divided by the team's total passes, multiplied by 100
   ```

3. **Code-like syntax:**
   ```
   SPI = passesInChain / totalPasses * 100
   ```

4. **With examples:**
   ```
   If passesInChain = 50 and totalPasses = 200, then SPI = 25
   ```

Once you provide the formulas, I'll:
1. Implement them in `backend/src/services/matchStatsService.ts`
2. Update the verification script to test them
3. Update this documentation
