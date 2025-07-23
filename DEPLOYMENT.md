# Deployment Guide

## GitHub Setup

1. **Create a new repository** on GitHub named `sounds-like-home`
2. **Upload all files** from this project directory to the repository
3. **Important files to include:**
   - All `.js`, `.html`, `.css` files
   - `package.json` and `package-lock.json`
   - `vercel.json` (Vercel configuration)
   - `.gitignore` (excludes unnecessary files)
   - `README.md` and this `DEPLOYMENT.md`
   - `data/` folder with JSON files
   - `.env.example` (don't upload any actual `.env` files)

## Vercel Deployment

### Initial Setup
1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in and click "New Project"
   - Import your GitHub repository `sounds-like-home`

2. **Configure Build Settings:**
   - Framework Preset: Other
   - Build Command: `npm run build` (or leave empty)
   - Output Directory: Leave empty
   - Install Command: `npm install`

### Environment Variables
In Vercel dashboard, go to your project → Settings → Environment Variables and add:

```
NODE_ENV=production
SESSION_SECRET=your-super-secure-random-string-here
ADMIN_PASSWORD=your-secure-admin-password-here
```

**Important:** 
- Generate a strong random string for `SESSION_SECRET` (at least 32 characters)
- Choose a secure password for `ADMIN_PASSWORD` (this is what you'll use to access `/admin`)

### Deploy
1. Click "Deploy" - Vercel will automatically build and deploy
2. Your app will be available at: `https://soundslikehome-brett-5075s-projects.vercel.app/`

## Admin Panel Access

**URL:** `https://soundslikehome-brett-5075s-projects.vercel.app/admin`

**Default Login:** 
- Password: Whatever you set as `ADMIN_PASSWORD` in environment variables
- If no environment variable is set, the default is `welcomeadmin`

**Security Note:** Make sure to set a strong `ADMIN_PASSWORD` in production!

## Features Available After Deployment

✅ **Public Features:**
- Main app at root URL
- Audio recording (up to 90 seconds)
- Sequential prompt system
- Listen to random recordings
- Rainbow bubble visualization
- Mobile responsive design

✅ **Admin Features (requires login):**
- View all recordings and prompts
- Approve/reject recordings
- Add/edit/delete prompts
- Queue specific prompts to appear next
- Export data
- Auto-tagging system

## File Persistence

⚠️ **Important:** Vercel has ephemeral file systems, meaning uploaded recordings and JSON data files will be reset on each deployment. For production use, consider:

1. **Database Integration:** Replace JSON files with a database (PostgreSQL, MongoDB, etc.)
2. **Cloud Storage:** Use AWS S3, Cloudinary, or similar for audio file storage
3. **Vercel KV/Storage:** Use Vercel's storage solutions

## Troubleshooting

### Common Issues:

1. **Admin panel not accessible**
   - Check environment variables are set correctly
   - Ensure `ADMIN_PASSWORD` is set in Vercel dashboard

2. **Recordings not persisting**
   - Expected behavior on Vercel (ephemeral storage)
   - Consider implementing database storage for production

3. **Audio recording not working**
   - Ensure HTTPS is working (Vercel handles this automatically)
   - Check browser permissions for microphone access

### Logs
Check Vercel deployment logs in the Vercel dashboard under your project → Functions → View logs

## Next Steps for Production

For a full production deployment, consider:

1. **Database Integration** (PostgreSQL, MongoDB)
2. **Cloud Storage** for audio files (AWS S3, Google Cloud Storage)
3. **User Authentication** system
4. **Content Moderation** tools
5. **Analytics** integration
6. **CDN** for better global performance

---

**Need Help?** Check the Vercel documentation or GitHub issues for support.