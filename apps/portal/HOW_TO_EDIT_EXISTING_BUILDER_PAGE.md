# How to Edit an Existing Builder.io Page

## Quick Steps

### Method 1: From Builder.io Dashboard (Easiest)

1. **Go to Builder.io Dashboard**
   - Visit https://builder.io
   - Sign in with your account

2. **Find Your Page**
   - In the left sidebar, click **"Content"** or **"Pages"**
   - Look for your existing page in the list
   - Click on the page name to open it

3. **Open Visual Editor**
   - Once the page is open, look for the **"Open Visual Editor"** button
   - It's usually in the top right corner of the page editor
   - Click it to open your portal with visual editing enabled

4. **Edit Your Page**
   - Your portal will load at the page's URL
   - Builder.io's editing overlay will appear
   - Click on any element to edit it
   - Changes save automatically

### Method 2: Direct URL Access

If you know the page URL:

1. **Get the Page URL**
   - In Builder.io dashboard, open your page
   - Check the URL field (e.g., `/about`, `/contact`, `/test-page`)

2. **Open in Browser**
   - Make sure your dev server is running: `http://localhost:3030`
   - Visit: `http://localhost:3030/your-page-url`
   - Example: `http://localhost:3030/about`

3. **Enable Visual Editing**
   - Add `?builder.frameEditing=true` to the URL
   - Full URL: `http://localhost:3030/your-page-url?builder.frameEditing=true`
   - This opens the page with Builder.io's editing overlay

### Method 3: Using Builder.io Studio

1. **Enable Studio Tab** (if not already enabled):
   - In Builder.io dashboard → Settings → Advanced Settings
   - Toggle on **"Show Studio Tab"**

2. **Open Studio**:
   - Click the **Studio** icon in the left sidebar
   - Enter your page URL: `http://localhost:3030/your-page-url`
   - Press Enter
   - The page loads with visual editing enabled

## Step-by-Step Guide

### Finding Your Existing Page

1. **In Builder.io Dashboard**:
   ```
   Builder.io → Content → Pages
   ```
   - You'll see a list of all your pages
   - Each page shows:
     - Page name
     - URL path
     - Last modified date
     - Status (Published/Draft)

2. **Search for Your Page**:
   - Use the search bar at the top
   - Filter by status, tags, or date
   - Click on the page to open it

### Opening Visual Editor

Once you've opened your page in Builder.io:

**Option A: Visual Editor Button**
- Look for a button labeled **"Open Visual Editor"** or **"Edit Visually"**
- Usually located in the top right corner
- Click it to open your site with editing enabled

**Option B: Edit Mode**
- Click the **"Edit"** button (pencil icon)
- This opens the page in Builder.io's editor
- Then click **"Open Visual Editor"** to edit on your live site

**Option C: Preview Mode**
- Click **"Preview"** button
- Then look for **"Edit in Visual Editor"** option
- This opens your site with editing overlay

### Editing Your Page

When visual editing is active:

1. **Click to Edit**:
   - Click any element on the page
   - A sidebar appears with editing options
   - Modify text, images, styles, etc.

2. **Add Components**:
   - Click **"+"** button or drag from component library
   - Add new sections, images, text, etc.

3. **Rearrange Elements**:
   - Drag elements to reorder them
   - Use the sidebar to adjust spacing and layout

4. **Save Changes**:
   - Changes save automatically
   - Or click **"Save"** button in Builder.io overlay
   - Click **"Publish"** to make changes live

## Troubleshooting

### Can't Find Your Page

**Issue**: Page not showing in Builder.io dashboard

**Solutions**:
- Check if you're in the correct space/workspace
- Verify you have access permissions
- Try searching by URL path
- Check if page is archived or deleted

### Visual Editor Not Opening

**Issue**: "Open Visual Editor" button not working

**Solutions**:
1. **Check Dev Server**:
   ```bash
   # Make sure server is running
   cd apps/portal
   pnpm dev
   ```

2. **Check URL**:
   - Verify the page URL in Builder.io matches your site
   - For local: `http://localhost:3030`
   - For production: `https://yourdomain.com`

3. **Check API Key**:
   - Verify `.env.local` has: `NEXT_PUBLIC_BUILDER_API_KEY=5a52d82defcf479eb265bdbda490769e`
   - Restart dev server after adding API key

4. **Try Direct URL**:
   - Visit: `http://localhost:3030/your-page-url?builder.frameEditing=true`
   - This bypasses Builder.io dashboard

### Page Not Loading

**Issue**: Page shows 404 or error

**Solutions**:
- Verify the page URL in Builder.io matches the route
- Check that the page is published (not just saved as draft)
- Try accessing the page directly: `http://localhost:3030/your-page-url`
- Check browser console for errors

## Quick Reference

| Action | How To |
|--------|--------|
| **Find Page** | Builder.io → Content → Pages → Click page name |
| **Open Visual Editor** | Click "Open Visual Editor" button in page editor |
| **Edit Directly** | Visit `http://localhost:3030/page-url?builder.frameEditing=true` |
| **Use Studio** | Studio tab → Enter URL → Press Enter |
| **Save Changes** | Auto-saves or click "Save" button |
| **Publish** | Click "Publish" button in Builder.io |

## Example Workflow

1. **Open Builder.io**: https://builder.io
2. **Find Your Page**: Content → Pages → Click on your page
3. **Open Visual Editor**: Click "Open Visual Editor" button
4. **Your Portal Opens**: At `http://localhost:3030/your-page-url`
5. **Edit**: Click elements to edit, use sidebar to modify
6. **Save**: Changes save automatically
7. **Publish**: Click "Publish" when ready

## Need Help?

- **Builder.io Docs**: https://www.builder.io/c/docs/visual-editing
- **Builder.io Support**: https://builder.io/help
- **Check Console**: Open browser DevTools (F12) for errors

