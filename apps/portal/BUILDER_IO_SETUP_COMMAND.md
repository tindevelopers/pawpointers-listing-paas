# Builder.io Setup Command - Fixed Version

## Problem
The setup command is failing with "Setup failed (exit code null)".

## Solution

Try these setup commands in order (simplest first):

### Option 1: Simple pnpm install (Recommended)
```bash
pnpm install
```

### Option 2: If pnpm not available, use npm
```bash
npm install
```

### Option 3: With explicit pnpm installation
```bash
npm install -g pnpm@10.6.1
pnpm install
```

### Option 4: Minimal setup (if others fail)
```bash
# Just verify pnpm is available
which pnpm || npm install -g pnpm
pnpm --version
```

## Troubleshooting

### If "pnpm install" fails:

1. **Check if pnpm is available**:
   - Builder.io might not have pnpm installed
   - Try: `npm install -g pnpm` first

2. **Use npm instead**:
   ```bash
   npm install
   ```
   Note: This might be slower but should work

3. **Check package.json**:
   - Verify `packageManager` field exists
   - Builder.io should auto-detect pnpm from this

### If you get "command not found":

Try this sequence:
```bash
# Install pnpm globally
npm install -g pnpm@10.6.1

# Then install dependencies
pnpm install
```

## Recommended Setup Command

**Start with this simple version:**

```bash
pnpm install
```

**If that fails, try:**

```bash
npm install -g pnpm@10.6.1 && pnpm install
```

**If pnpm still doesn't work:**

```bash
npm install
```

## Next Steps

After setup command works:
1. **Dev Command** should be:
   ```bash
   cd apps/portal && pnpm dev
   ```
   Or:
   ```bash
   pnpm turbo dev --filter=@tinadmin/portal
   ```

2. **Root Directory** should be: `apps/portal`

3. **Build Command** should be:
   ```bash
   cd ../.. && pnpm turbo build --filter=@tinadmin/portal
   ```

## Alternative: Skip Setup Command

If setup keeps failing, you can:
1. Click "Setup Command Not Needed"
2. Manually install dependencies before using Builder.io
3. Or configure Builder.io to use pre-built dependencies

