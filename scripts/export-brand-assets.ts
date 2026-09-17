import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const CHROME_BIN = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const downloadsDir = 'C:\\Users\\pc\\Downloads'
const desktopDir = 'C:\\Users\\pc\\Desktop'
const assetsDir = path.resolve(process.cwd(), 'assets', 'brand')

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// 1. Vector SVG Logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2B28FF" />
      <stop offset="100%" stop-color="#0C09E0" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="118" fill="url(#blueGrad)" />
  <path d="M133,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#FFFFFF" />
  <path d="M283,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#FFFFFF" />
</svg>`

// Save SVG
const svgWorkspace = path.join(assetsDir, 'pythia-logo.svg')
const svgDownloads = path.join(downloadsDir, 'pythia-logo.svg')
fs.writeFileSync(svgWorkspace, svgContent)
fs.writeFileSync(svgDownloads, svgContent)
console.log('✓ Vector SVG Logo saved to Downloads:', svgDownloads)

// 2. High-Resolution 1024x1024 PNG Logo
const logoHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1024px; height:1024px;
    display:flex; align-items:center; justify-content:center;
    background:#070707;
  }
</style>
</head>
<body>
  ${svgContent.replace('width="512" height="512"', 'width="800" height="800"')}
</body>
</html>`

const tempLogoHtml = path.join(assetsDir, 'logo_1024.html')
fs.writeFileSync(tempLogoHtml, logoHtml)

const pngLogoWorkspace = path.join(assetsDir, 'pythia-logo.png')
const pngLogoDownloads = path.join(downloadsDir, 'pythia-logo.png')
const pngLogoDesktop = path.join(desktopDir, 'pythia-logo.png')

execSync(
  `cmd.exe /c ""${CHROME_BIN}" --headless=new --screenshot="${pngLogoDownloads}" --window-size=1024,1024 "file:///${tempLogoHtml.replace(/\\/g, '/')}"`
)
fs.copyFileSync(pngLogoDownloads, pngLogoWorkspace)
fs.copyFileSync(pngLogoDownloads, pngLogoDesktop)
console.log('✓ High-res 1024x1024 PNG Logo saved to Downloads & Desktop:', pngLogoDownloads)

// 3. Horizontal Brand Banner (1200x400)
const bannerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@700&family=IBM+Plex+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1200px; height:400px;
    background:#070707;
    display:flex; align-items:center; justify-content:center;
    gap: 48px;
    font-family:'IBM Plex Sans', sans-serif;
    position:relative;
    overflow:hidden;
  }
  body::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(circle at 35% 50%, rgba(17,15,255,0.3) 0%, transparent 65%);
  }
  .title { font-size: 88px; font-weight:700; color:#F5F5F5; letter-spacing: -0.02em; }
  .badge {
    font-family:'IBM Plex Mono', monospace;
    font-size:16px; font-weight:600;
    color:#00FF66; letter-spacing:0.18em;
    margin-top:10px;
    background:rgba(0,255,102,0.08);
    border:1px solid rgba(0,255,102,0.3);
    display:inline-block;
    padding:6px 14px;
    border-radius:2px;
  }
</style>
</head>
<body>
  ${svgContent.replace('width="512" height="512"', 'width="200" height="200"')}
  <div style="position:relative; z-index:2;">
    <div class="title">PYTHIA</div>
    <div class="badge">GENLAYER STUDIO NEXT · CHAIN 61997</div>
  </div>
</body>
</html>`

const tempBannerHtml = path.join(assetsDir, 'banner.html')
fs.writeFileSync(tempBannerHtml, bannerHtml)

const bannerDownloads = path.join(downloadsDir, 'pythia-logo-banner.png')
const bannerWorkspace = path.join(assetsDir, 'pythia-logo-banner.png')
execSync(
  `cmd.exe /c ""${CHROME_BIN}" --headless=new --screenshot="${bannerDownloads}" --window-size=1200,400 "file:///${tempBannerHtml.replace(/\\/g, '/')}"`
)
fs.copyFileSync(bannerDownloads, bannerWorkspace)
console.log('✓ Horizontal Brand Banner saved to Downloads:', bannerDownloads)

// 4. Save YouTube Thumbnail to Downloads & Desktop
const generatedThumbnail =
  'C:\\Users\\pc\\.gemini\\antigravity\\brain\\dfda1da2-53f7-4d82-ab2d-1bde8918b179\\pythia_youtube_thumbnail_1789610173182.jpg'
if (fs.existsSync(generatedThumbnail)) {
  const thumbDownloads = path.join(downloadsDir, 'pythia-youtube-thumbnail.jpg')
  const thumbDesktop = path.join(desktopDir, 'pythia-youtube-thumbnail.jpg')
  fs.copyFileSync(generatedThumbnail, thumbDownloads)
  fs.copyFileSync(generatedThumbnail, thumbDesktop)
  console.log('✓ 16:9 YouTube Thumbnail saved to Downloads & Desktop:', thumbDownloads)
}
