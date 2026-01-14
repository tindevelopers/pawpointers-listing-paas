# How to Open Your Portal in Builder.io UI

## ✅ Visual Editing is Now Enabled!

Your portal is now configured for visual editing. You can edit Builder.io pages directly on your live site.

## Step-by-Step Guide

### Method 1: From Builder.io Dashboard (Easiest)

1. **Start Your Development Server**
   ```bash
   cd apps/portal
   pnpm dev
   ```
   Your portal will be available at: `http://localhost:3030`

2. **Go to Builder.io Dashboard**
   - Visit https://builder.io
   - Sign in with your account (the one with API key `5a52d82defcf479eb265bdbda490769e`)

3. **Create or Open a Page**
   - Click "New Page" to create a new page
   - Or click on an existing page to edit it
   - Set the URL path (e.g., `/about`, `/test-page`)

4. **Open Visual Editor**
   - Look for the **"Open Visual Editor"** button (usually top right of the page editor)
   - Or click the **"Edit"** button with a visual editing icon
   - This will open your portal in an iframe with editing enabled

5. **Edit Your Page**
   - Your portal will load with Builder.io's editing overlay
   - Click on any element to edit it
   - Use the sidebar to modify content, styles, and components
   - Changes save automatically

### Method 2: Using Builder.io Studio

1. **Enable Studio Tab** (if not already enabled):
   - In Builder.io dashboard, click **Settings** (gear icon, bottom left)
   - Click **Edit** next to **Advanced Settings**
   - Toggle on **Show Studio Tab**
   - Click **Save**

2. **Open Studio**:
   - Click the **Studio** icon in the left sidebar
   - In the URL field, enter: `http://localhost:3030/your-page-path`
   - Press **Enter**
   - Your page will load with visual editing enabled

3. **Edit Your Page**:
   - Click on any element to edit it
   - Use the editing panel on the right
   - Changes save automatically

### Method 3: Direct URL Access (For Testing)

You can also enable visual editing by adding query parameters:

```
http://localhost:3030/your-page-path?builder.frameEditing=true
```

Or for preview mode:
```
http://localhost:3030/your-page-path?builder.preview=true
```

## Important Notes

### For Local Development

- **Your dev server must be running** (`pnpm dev`)
- **Use `http://localhost:3030`** as your site URL in Builder.io
- Visual editing works automatically when opened from Builder.io

### For Production/Deployed Sites

- **Your site must be deployed** and publicly accessible
- **Use your production URL** (e.g., `https://yourdomain.com`)
- **Set environment variables** in your hosting platform (Vercel, etc.)

## What You Can Do in Visual Editor

When visual editing is active, you can:

✅ **Click to Edit**: Click any element to edit it directly  
✅ **Drag & Drop**: Rearrange components by dragging them  
✅ **Style Panel**: Modify colors, fonts, spacing, etc.  
✅ **Add Components**: Add new components from Builder.io's library  
✅ **Responsive Preview**: Preview on different device sizes  
✅ **Undo/Redo**: Use Cmd/Ctrl + Z for undo  
✅ **Save**: Changes save automatically or click "Save" button  

## Troubleshooting

### "Open Visual Editor" Button Not Visible

**Possible causes:**
- Page is not published or saved
- You don't have edit permissions
- Browser cache issues

**Solutions:**
- Save/publish your page first
- Check your Builder.io account permissions
- Try a different browser or incognito mode
- Clear browser cache

### Visual Editing Overlay Not Appearing

**Possible causes:**
- API key not configured correctly
- Dev server not running
- URL mismatch

**Solutions:**
1. Check `.env.local` has the API key: `NEXT_PUBLIC_BUILDER_API_KEY=5a52d82defcf479eb265bdbda490769e`
2. Restart dev server: `pnpm dev`
3. Verify URL in Builder.io matches exactly: `http://localhost:3030/your-path`
4. Check browser console for errors

### Can't Connect to Local Site

**For local development:**
- Builder.io needs to access `localhost:3030`
- If Builder.io can't access localhost, use a tunnel:
  ```bash
  # Install ngrok
  npx ngrok http 3030
  
  # Use the ngrok URL in Builder.io (e.g., https://abc123.ngrok.io)
  ```

## Quick Reference

| Action | How To |
|--------|--------|
| **Open Visual Editor** | Click "Open Visual Editor" in Builder.io dashboard |
| **Use Studio** | Click Studio tab → Enter URL → Press Enter |
| **Enable Visual Editing** | Already enabled! Just open from Builder.io |
| **Disable Visual Editing** | Close the editor or remove query params |
| **Save Changes** | Auto-saves, or click "Save" button |

## Example Workflow

1. **Create a page in Builder.io**:
   - Go to Builder.io → New Page
   - Set URL: `/about`
   - Add some content
   - Save/Publish

2. **Open in Visual Editor**:
   - Click "Open Visual Editor" button
   - Your portal opens at `http://localhost:3030/about`
   - Editing overlay appears

3. **Edit the page**:
   - Click any element to edit
   - Modify content in the sidebar
   - Changes save automatically

4. **View published page**:
   - Visit `http://localhost:3030/about` normally
   - See your published content

## Need Help?

- **Builder.io Docs**: https://www.builder.io/c/docs/visual-editing
- **Builder.io Support**: https://builder.io/help
- **Full Guide**: See `BUILDER_IO_VISUAL_EDITING.md`

