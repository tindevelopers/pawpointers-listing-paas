# Builder.io Branch Configuration

## Default Behavior

**Builder.io defaults to the `main` branch** when no branch is specified.

## Your Current Setup

- **Local branch:** `builder` (you're currently on this)
- **Available branches:** `main`, `develop`, `builder`
- **Builder.io default:** Will use `main` unless configured otherwise

## How to Check/Change Branch in Builder.io

### Option 1: Check Current Branch Setting

1. Go to Builder.io Dashboard
2. Navigate to your Project
3. Click the **three-dot menu** (⋮) next to your project
4. Select **"Project Settings"**
5. Look for **"Primary Branch Name"** field
6. This shows which branch Builder.io is currently using

### Option 2: Change to `builder` Branch

If you want Builder.io to use the `builder` branch:

1. Go to **Project Settings** (as above)
2. Find **"Primary Branch Name"** field
3. Enter: `builder`
4. Click **"Save"**

### Option 3: Change to `develop` Branch

If you want Builder.io to use the `develop` branch:

1. Go to **Project Settings**
2. Find **"Primary Branch Name"** field
3. Enter: `develop`
4. Click **"Save"**

## Important Notes

- **Builder.io uses the branch you specify** for:
  - Cloning the repository
  - Running setup commands
  - Running dev commands
  - Building/deploying

- **Make sure your branch is pushed to remote:**
  ```bash
  git push origin builder
  ```

- **If you change branches in Builder.io**, it will:
  - Clone that branch
  - Run setup/dev commands from that branch
  - Use code from that branch

## Recommended Setup

Since you're working on the `builder` branch:

1. **Make sure `builder` branch is pushed:**
   ```bash
   git push origin builder
   ```

2. **Set Builder.io to use `builder` branch:**
   - Go to Project Settings
   - Set "Primary Branch Name" to: `builder`
   - Save

3. **Or keep using `main`** if you want Builder.io to work with production code

## Current Status

- ✅ You're on `builder` branch locally
- ✅ `builder` branch exists on remote (`remotes/origin/builder`)
- ⚠️ Builder.io is likely using `main` by default (unless you changed it)

## Next Steps

1. **Check Builder.io Project Settings** to see which branch it's using
2. **Change to `builder`** if you want Builder.io to use your Builder.io integration work
3. **Or merge `builder` into `main`** if you want Builder.io to use the main branch with your changes

