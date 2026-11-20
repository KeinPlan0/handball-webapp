# Security Audit Report - handball-webapp
## Date: 2026-11-20

---

## Executive Summary

After a thorough review of the handball-webapp codebase, **no critical security vulnerabilities or hardcoded credentials were found**. The application appears to follow reasonable security practices for a client-side React application.

However, several **bug/feature issues** were identified that should be addressed.

---

## ✅ Security Findings - NO CRITICAL ISSUES

### 1. No Hardcoded Credentials
- ✅ No API keys, secrets, or passwords found in source code
- ✅ No hardcoded authentication tokens
- ✅ No sensitive environment variables committed to repository
- ✅ `.gitignore` properly excludes `.env*` files and `node_modules`
- ✅ `CREDENTIALS/` directory only contains a public `.ics` calendar file

### 2. Local Storage Only Architecture
- The app stores data locally in `localStorage` (player names, timers, rotation plans)
- No backend API calls are made
- No external authentication systems integrated
- This is actually a security feature - no server-side attack surface

### 3. HTTPS Resources Only
- External fonts are loaded over HTTPS: `https://fonts.googleapis.com/...`
- No mixed content issues

### 4. GitHub Actions Security
- Deploy workflow uses proper permissions (`contents: read`, `pages: write`, `id-token: write`)
- Uses GitHub's deploy-pages action for secure deployment
- No secrets are required for deployment (static site)

---

## ⚠️ Issues Found (Bugs/Feature Problems)

### Issue #1: Missing `addName` Validation - Potential Data Corruption
**File:** `src/Components/NameList.tsx`

**Problem:** The `addName` function does not check for duplicate names before adding them to the list. This could lead to:
- Duplicate player names in the roster
- Timer confusion when multiple players have the same name
- Incorrect rotation calculations

**Severity:** Medium

**Current Code:**
```typescript
const addName = () => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setNames(prev => [...prev, trimmed]);  // No duplicate check!
    setName("");
};
```

**Recommendation:** Add a check to prevent duplicate names:
```typescript
const addName = () => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    if (names.some(n => n.trim().toLowerCase() === trimmed.toLowerCase())) {
        // Show error/warning
        return;
    }
    setNames(prev => [...prev, trimmed]);
    setName("");
};
```

---

### Issue #2: PlayerTimer Storage Key Can Be Broken
**File:** `src/Components/PlayerTimer.tsx`

**Problem:** The storage key includes the player name, which can cause issues if:
- Player names contain special characters that don't encode well
- Names are very long
- The same player name appears multiple times (see Issue #1)

**Current Code:**
```typescript
const storageKey = `playerTimer:${index}:${name ?? "unknown"}`;
```

**Recommendation:** Use a more robust identifier:
```typescript
const storageKey = `playerTimer:${index}`;
```

---

### Issue #3: MatchClock Duration Not Validated on Load
**File:** `src/Components/MatchClock.tsx`

**Problem:** When loading a saved clock, the duration is not validated. If corrupted data exists, it could cause unexpected behavior.

**Current Code:**
```typescript
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  const parsed = JSON.parse(saved) as Partial<SavedClock>;
  // ... parsing logic
}
```

**Recommendation:** Add validation for all loaded values with fallbacks.

---

### Issue #4: Error Handling in Wechseln.tsx May Hide Bugs
**File:** `src/pages/Wechseln.tsx`

**Problem:** Multiple `try-catch` blocks silently swallow errors without logging. While this provides graceful degradation, it makes debugging difficult.

**Examples:**
```typescript
try {
    localStorage.setItem(GOALKEEPER_NAMES_KEY, JSON.stringify(next));
} catch {
    // The current selection remains usable for this page session.
}
```

**Recommendation:** Add `console.error()` for debugging while maintaining graceful degradation:
```typescript
try {
    localStorage.setItem(GOALKEEPER_NAMES_KEY, JSON.stringify(next));
} catch (err) {
    console.error("Failed to save goalkeeper names:", err);
    // The current selection remains usable for this page session.
}
```

---

### Issue #5: Hardcoded Max Duration of 240 Minutes
**Files:** `src/hooks/useMatchDuration.ts`, `src/pages/Wechseln.tsx`, `src/Components/MatchClock.tsx`

**Problem:** The maximum match duration is hardcoded as 240 minutes (4 hours). While reasonable for handball, this is not configurable and could be problematic for very long tournaments.

**Severity:** Low

**Recommendation:** Make this configurable or document why 240 is the hard limit.

---

### Issue #6: No Input Sanitization for Player Names
**File:** `src/Components/NameList.tsx`

**Problem:** Player names are stored directly from user input without sanitization. While React protects against XSS in most cases, malicious users could insert:
- Very long strings that break the UI
- Unicode control characters
- Emoji that might cause display issues

**Severity:** Low

**Recommendation:** Sanitize input:
```typescript
const sanitizeName = (name: string) => {
    // Remove control characters but allow reasonable unicode
    return name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 40);
};
```

---

## 📋 Recommendations Summary

### High Priority
1. ✅ **No action needed** - No critical security vulnerabilities found
2. ⚠️ **Add duplicate name prevention** in NameList component

### Medium Priority
3. ⚠️ **Improve storage key generation** for PlayerTimer
4. ⚠️ **Add validation** for loaded MatchClock data

### Low Priority
5. ℹ️ **Add console logging** for debugging (optional)
6. ℹ️ **Document duration limit** or make it configurable
7. ℹ️ **Add input sanitization** for player names

---

## Conclusion

**This application is secure for local, client-side use.** The security posture is actually quite good:
- No backend = no server-side vulnerabilities
- LocalStorage only = no data transmission risks
- No external API calls = no API key exposure
- GitHub deployment uses proper security practices

The issues found are typical of frontend applications and are mostly about data validation and user experience rather than security.

---

## Audit Completed
- **Files analyzed:** 14 source files
- **Security vulnerabilities:** 0
- **Bugs/feature issues:** 6
- **Overall risk level:** LOW
