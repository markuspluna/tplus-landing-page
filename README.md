# tplus-landing-page

A landing page for t+ - an offchain DEX with millisecond confirmations and optimal settlement.

## 🚀 Deployment to Cloudflare Pages

This project is ready to be deployed to Cloudflare Pages. Here's how:

### Prerequisites
- A Cloudflare account
- Git repository (GitHub, GitLab, or Bitbucket)

### Deployment Steps

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Prepare for Cloudflare Pages deployment"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
   - Click "Create a project"
   - Connect your Git repository
   - Configure build settings:
     - **Build command**: (leave empty)
     - **Build output directory**: `/` (root directory)
     - **Root directory**: `/` (leave as default)

3. **Deploy**
   - Cloudflare Pages will automatically detect this as a static site
   - The deployment will use `index.html` as the entry point
   - All assets in `tplus_files/` will be served correctly

### Project Structure
```
tplus-landing/
├── index.html          # Main landing page
├── index.css           # Stylesheet (minimal)
├── _headers            # Security headers for Cloudflare
├── _redirects          # Redirect rules
├── tplus_files/        # Static assets (images, JS)
│   ├── *.webp          # Images
│   └── index-*.js      # JavaScript
└── README.md           # This file
```

### Features
- ✅ Static HTML/CSS/JS landing page
- ✅ Optimized for static hosting
- ✅ Security headers configured
- ✅ Asset caching configured
- ✅ Responsive design
- ✅ Interactive animations

### Custom Domain (Optional)
To use a custom domain:
1. Go to your Pages project settings
2. Add your custom domain
3. Update DNS records as instructed

### Troubleshooting
- If assets don't load, check that `tplus_files/` directory is included in deployment
- If styles are broken, verify `index.css` is accessible
- Check Cloudflare Pages deployment logs for any errors
