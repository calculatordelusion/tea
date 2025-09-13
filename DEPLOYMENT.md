# Vercel Deployment Guide

## 🚀 Deploy to Vercel

This project is ready for deployment on Vercel with the following configuration:

### Prerequisites
- GitHub repository: `https://github.com/calculatordelusion/tea`
- Vercel account (sign up at [vercel.com](https://vercel.com))
- OpenRouter API keys for DeepSeek V3 and R1 models

### Step 1: Import Project to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import from GitHub: `https://github.com/calculatordelusion/tea`
4. Select the repository and click "Import"

### Step 2: Configure Environment Variables (CRITICAL STEP)
⚠️ **This step is required - the deployment will fail without these variables!**

In the Vercel project settings, add these environment variables:

1. Go to your project in Vercel dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Click **Add New** for each variable:

**🔑 CRITICAL: Add these EXACT environment variables:**

**Variable 1 (V3 API Key):**
- Name: `VITE_DEEPSEEK_V3_API_KEY`
- Value: `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`
- Environment: ✅ Production ✅ Preview ✅ Development

**Variable 2 (R1 API Key):**
- Name: `VITE_DEEPSEEK_R1_API_KEY`
- Value: `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`
- Environment: ✅ Production ✅ Preview ✅ Development

**🔧 Also add these Vercel secrets (for build time):**
- Secret Name: `vite-deepseek-v3-api-key`
- Secret Value: `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`

- Secret Name: `vite-deepseek-r1-api-key`  
- Secret Value: `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`

5. Click **Save** after each variable
6. **Important**: Redeploy your project after adding variables!

### Step 3: Deploy Settings
Vercel will automatically detect this as a Vite project. The `vercel.json` configuration includes:
- Build command: `vite build`
- Output directory: `dist`
- SPA routing support
- Environment variable configuration

### Step 4: Deploy
1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

## 🔧 Project Configuration

### Build Configuration
- **Framework**: Vite (React + TypeScript)
- **Build Command**: `npm run build` or `npm run vercel-build`
- **Output Directory**: `dist`
- **Node Version**: 18.x or higher

### API Integration
- **Provider**: OpenRouter.ai
- **Models**: 
  - DeepSeek V3: `deepseek/deepseek-chat`
  - DeepSeek R1: `deepseek/deepseek-r1`
- **Features**: File upload support (PDF, DOCX, TXT, Images)

### Environment Variables Setup in Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:
   - `VITE_DEEPSEEK_V3_API_KEY`
   - `VITE_DEEPSEEK_R1_API_KEY`

### Domain Configuration (Optional)
After deployment, you can:
1. Add a custom domain in Vercel settings
2. Configure SSL (automatic with Vercel)
3. Set up redirects if needed

## 🛠️ Local Development

To run locally:
```bash
npm install
npm run dev
```

Access at: `http://localhost:3001` (or another port if 3001 is busy)

## 🔍 Troubleshooting

### Common Issues:
1. **Build Fails**: Check Node version (requires 18.x+)
2. **API Errors**: Verify environment variables are set correctly
3. **Routing Issues**: Ensure `vercel.json` routing configuration is present

### Support:
- Check Vercel build logs for specific errors
- Verify API keys have sufficient credits on OpenRouter
- Ensure all dependencies are properly installed

## 📝 Notes

- The `.env` file is excluded from git for security
- API keys are configured via Vercel environment variables
- The app supports both German and English interfaces
- File upload supports: PDF, DOCX, TXT, and image files
