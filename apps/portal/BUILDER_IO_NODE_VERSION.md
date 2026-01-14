# Builder.io Node.js Version Configuration

## Node.js Version Requirements

### Project Requirements

- **Minimum:** Node.js >= 20.0.0 (from `package.json` engines)
- **Recommended:** Node.js 20.x or 22.x
- **Builder.io Default:** Node.js 22 (included by default)

## Does Node Version Matter?

**Yes, but Node 22 is fine!** Here's why:

### ✅ Node 22 is Compatible

- ✅ Next.js 15.4.8 supports Node.js 18, 20, and 22
- ✅ React 19 works with Node.js 20+
- ✅ All dependencies are compatible with Node.js 22
- ✅ Builder.io includes Node 22 by default

### Version Compatibility Matrix

| Component | Node 18 | Node 20 | Node 22 |
|-----------|---------|--------|--------|
| Next.js 15.4.8 | ✅ | ✅ | ✅ |
| React 19 | ✅ | ✅ | ✅ |
| pnpm 10.6.1 | ✅ | ✅ | ✅ |
| Project Requirement | ❌ | ✅ | ✅ |

## Recommendation

### Use Node.js 22 (Default)

**Why:**
- ✅ Included by default in Builder.io
- ✅ Fully compatible with all dependencies
- ✅ Meets project requirements (>= 20.0.0)
- ✅ Latest LTS version
- ✅ No configuration needed

### Alternative: Node.js 20

If you prefer Node.js 20:
- Select "20.18.1" from the dropdown
- Also fully compatible
- Matches project minimum requirement exactly

## Configuration in Builder.io

### Option 1: Use Default (Recommended)

**Runtime Dependencies:**
- Leave as "Latest (auto)" or "Node 22"
- No changes needed

### Option 2: Specify Node 20

**Runtime Dependencies:**
- Select "20.18.1" from dropdown
- Works perfectly fine

## Summary

- ✅ **Node 22 (default):** Recommended - works perfectly
- ✅ **Node 20:** Also fine if you prefer
- ❌ **Node 18:** Below project minimum requirement
- ❌ **Node 16 or below:** Not supported

## Action

**No action needed!** Builder.io's default Node 22 is perfect for your project.

Just proceed with:
- **Setup Command:** `npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install`
- **Dev Command:** `cd apps/portal && pnpm dev`

The Node version is already correctly configured! 🎉

