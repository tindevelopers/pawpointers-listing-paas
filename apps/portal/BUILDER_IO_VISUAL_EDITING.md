# Builder.io Visual Editing Guide

## Overview

Visual Editing allows you to edit Builder.io pages directly on your live site. You can open your portal in Builder.io's UI and edit pages visually without leaving your site.

## How Visual Editing Works

1. **Create/Edit Pages in Builder.io Dashboard**: Design pages in Builder.io's visual editor
2. **Open Visual Editing**: Click "Open Visual Editor" in Builder.io dashboard
3. **Edit on Live Site**: Your site opens with Builder.io's editing overlay
4. **Save Changes**: Changes are saved directly to Builder.io

## Enabling Visual Editing

Visual editing is **already enabled** in your portal! The `VisualEditing` component has been added to your root layout.

## How to Use Visual Editing

### Method 1: From Builder.io Dashboard (Recommended)

1. **Go to Builder.io Dashboard**
   - Visit https://builder.io
   - Sign in with your account

2. **Open Your Page**
   - Navigate to the page you want to edit
   - Click on the page to open it

3. **Enable Visual Editing**
   - Look for the **"Open Visual Editor"** button (usually in the top right)
   - Or click the **"Edit"** button with a visual editing icon
   - This will open your site in an iframe with editing enabled

4. **Edit Your Page**
   - Your portal will load with Builder.io's editing overlay
   - Click on any element to edit it
   - Use the sidebar to modify content, styles, and components
   - Changes are saved automatically

### Method 2: Direct URL Access

You can also enable visual editing by adding query parameters to your URL:

```
http://localhost:3030/your-page-path?builder.frameEditing=true
```

Or for preview mode:
```
http://localhost:3030/your-page-path?builder.preview=true
```

### Method 3: Using Builder.io Studio

1. **Enable Studio Tab** (if not already enabled):
   - In Builder.io dashboard, click **Settings** (bottom left)
   - Click **Edit** next to **Advanced Settings**
   - Toggle on **Show Studio Tab**

2. **Open Studio**:
   - Click the **Studio** icon in the left sidebar
   - Enter your page URL: `http://localhost:3030/your-page-path`
   - Press Enter
   - The page will load with visual editing enabled

## Visual Editing Features

When visual editing is active, you can:

- **Click to Edit**: Click any element to edit it directly
- **Drag & Drop**: Rearrange components by dragging them
- **Style Panel**: Modify colors, fonts, spacing, etc.
- **Component Library**: Add new components from Builder.io's library
- **Responsive Preview**: Preview how your page looks on different devices
- **Undo/Redo**: Use standard undo/redo shortcuts
- **Save**: Changes are saved automatically or click "Save" button

## Requirements

### For Local Development

1. **Development Server Running**:
   ```bash
   cd apps/portal
   pnpm dev
   ```

2. **Accessible URL**: 
   - Local: `http://localhost:3030`
   - Or use a tunnel service like ngrok for external access

### For Production

1. **Deployed Site**: Your portal must be deployed and accessible
2. **CORS Configuration**: Builder.io needs to access your site
3. **Environment Variables**: Ensure `NEXT_PUBLIC_BUILDER_API_KEY` is set

## Troubleshooting

### Visual Editing Not Appearing

**Issue**: No editing overlay when opening from Builder.io

**Solutions**:
1. **Check API Key**: Ensure `NEXT_PUBLIC_BUILDER_API_KEY` is set correctly
2. **Check URL**: Make sure the URL in Builder.io matches your site URL exactly
3. **Check Console**: Open browser console for any errors
4. **Restart Dev Server**: Restart your Next.js dev server
5. **Clear Cache**: Clear browser cache and cookies

### Can't Access Visual Editor from Builder.io

**Issue**: "Open Visual Editor" button not visible

**Solutions**:
1. **Check Permissions**: Ensure you have edit permissions for the space
2. **Check Page Status**: Page must be published or in draft mode
3. **Check Browser**: Try a different browser or incognito mode
4. **Check Builder.io Plan**: Visual editing may require a specific plan

### Changes Not Saving

**Issue**: Edits aren't being saved

**Solutions**:
1. **Check Connection**: Ensure you're connected to the internet
2. **Check API Key**: Verify API key is correct and has write permissions
3. **Check Console**: Look for API errors in browser console
4. **Refresh**: Try refreshing the page

## Security Considerations

### Development

- Visual editing works on `localhost` for development
- No additional security needed for local development

### Production

- **Authentication**: Consider adding authentication to restrict who can edit
- **CORS**: Ensure Builder.io domains are allowed in your CORS settings
- **API Key Security**: Never expose your private API key in client-side code
- **Public API Key**: The public API key is safe to use in client-side code

## Advanced Configuration

### Custom Visual Editing Behavior

You can customize visual editing in `components/builder/VisualEditing.tsx`:

```typescript
// Enable visual editing only for specific users
const canEdit = checkUserPermissions();

if (canEdit && isEditing) {
  // Enable visual editing
}
```

### Disable Visual Editing for Specific Pages

In your page component:

```typescript
export default function MyPage() {
  return (
    <BuilderComponent
      options={{
        noTrack: true, // Disable visual editing for this page
      }}
    />
  );
}
```

## Best Practices

1. **Use Draft Mode**: Test changes in draft mode before publishing
2. **Preview Changes**: Always preview changes before publishing
3. **Backup Content**: Export important content from Builder.io
4. **Version Control**: Builder.io keeps version history automatically
5. **Team Collaboration**: Use Builder.io's collaboration features for team editing

## Resources

- **Builder.io Visual Editing Docs**: https://www.builder.io/c/docs/visual-editing
- **Builder.io Studio Guide**: https://www.builder.io/c/docs/studio
- **Builder.io Dashboard**: https://builder.io
- **Support**: https://builder.io/help

## Quick Reference

### Enable Visual Editing
- From Builder.io dashboard: Click "Open Visual Editor"
- Via URL: Add `?builder.frameEditing=true`
- Via Studio: Use Studio tab in Builder.io

### Disable Visual Editing
- Close the visual editor window
- Remove query parameters from URL
- Or add `noTrack: true` to BuilderComponent options

### Save Changes
- Changes save automatically
- Or click "Save" button in Builder.io overlay
- Or use Cmd/Ctrl + S

