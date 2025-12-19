# Deployment Setup Guide

This guide will help you set up automated deployment to Vercel using GitHub Actions.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: This repository should be connected to GitHub
3. **Admin Access**: You need admin access to the GitHub repository

## Step 1: Connect Vercel to GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository: `tindevelopers/tinadmin-master-admin-panel`
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
5. Click "Deploy"

## Step 2: Get Vercel Credentials

### Get Vercel Token
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it: `GitHub Actions Deploy`
4. Copy the token (you'll need it for GitHub secrets)

### Get Organization ID
1. Go to [vercel.com/account/settings](https://vercel.com/account/settings)
2. Copy your "Personal Account ID" or "Team ID"

### Get Project ID
1. Go to your project in Vercel dashboard
2. Go to "Settings" → "General"
3. Copy the "Project ID"

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add these three secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_TOKEN` | Your Vercel token | API token for Vercel |
| `VERCEL_ORG_ID` | Your organization ID | Vercel organization/team ID |
| `VERCEL_PROJECT_ID` | Your project ID | Vercel project ID |

## Step 4: Enable GitHub Actions

1. Go to your repository "Actions" tab
2. If prompted, click "I understand my workflows, go ahead and enable them"
3. The workflows should now be active

## Step 5: Test Deployment

1. **Create a test branch:**
   ```bash
   git checkout -b test-deployment
   git push origin test-deployment
   ```

2. **Create a pull request** to the `develop` branch
3. **Check the Actions tab** to see the CI/CD pipeline running
4. **Verify the preview deployment** is created in Vercel

## Deployment Flow

### Automatic Deployments

- **Pull Requests**: Creates preview deployments for testing
- **Push to `develop`**: Runs tests and creates preview deployment
- **Push to `main`**: Runs tests and deploys to production

### Manual Deployment

You can also deploy manually using the Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Monitoring Deployments

1. **GitHub Actions**: Check the "Actions" tab for build status
2. **Vercel Dashboard**: Monitor deployments at [vercel.com/dashboard](https://vercel.com/dashboard)
3. **Deployment URLs**: Each deployment gets a unique URL

## Troubleshooting

### Common Issues

1. **Build Failures**: Check the GitHub Actions logs for specific errors
2. **Missing Secrets**: Ensure all three Vercel secrets are added to GitHub
3. **Permission Issues**: Verify your Vercel account has access to the project

### Getting Help

- **GitHub Actions Logs**: Check the "Actions" tab in your repository
- **Vercel Logs**: Check the "Functions" tab in your Vercel project
- **Documentation**: 
  - [GitHub Actions](https://docs.github.com/en/actions)
  - [Vercel Documentation](https://vercel.com/docs)

## Environment Variables

If your application needs environment variables:

1. **Vercel Dashboard**: Go to your project → Settings → Environment Variables
2. **Add variables** for different environments (Preview, Production)
3. **GitHub Secrets**: Add sensitive variables as GitHub secrets

## Custom Domain (Optional)

1. Go to your Vercel project → Settings → Domains
2. Add your custom domain
3. Configure DNS settings as instructed by Vercel

---

**🎉 You're all set!** Your TinAdmin application will now automatically deploy to Vercel whenever you push to the `develop` or `main` branches.
