import fs from 'fs'
import path from 'path'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const FFMPEG_BIN =
  'C:\\Users\\pc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe'
const FFPROBE_BIN =
  'C:\\Users\\pc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffprobe.exe'
const CHROME_BIN =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const SLIDES = [
  {
    num: 1,
    eyebrow: '01 / THE AGENTIC ECONOMY DILEMMA',
    title: 'A Citation Is <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">A Payment</em>.',
    desc: 'AI models scrape the human web for free while hallucinating citations. Traditional blockchains cannot browse or verify live content. Pythia introduces verifiable decentralized truth and autonomous creator micro-licensing.',
    cards: [
      { num: 'PROBLEM 01', title: 'Uncompensated Content', desc: 'Creators receive zero value when LLMs answer questions based on their writing.' },
      { num: 'PROBLEM 02', title: 'Hallucinated Citations', desc: 'Centralized AI synthesizes fictitious quotes and sources without accountability.', highlight: true },
      { num: 'PROBLEM 03', title: 'Smart Contract Blindness', desc: 'EVM contracts cannot read or reason about live web data without centralized oracles.' },
    ],
    narration:
      "Welcome to Pythia. Today's AI models scrape human articles, books, and social posts to answer user prompts, without attributing or paying the creators who wrote them. Worse, centralized AI hallucinates fake sources with zero cryptographic accountability, while legacy smart contracts are blind to the live web. Pythia changes this forever: every citation is a payment.",
  },
  {
    num: 2,
    eyebrow: '02 / DUAL-CHAIN ARCHITECTURE',
    title: 'Decentralized AI + <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">Native Settlement</em>.',
    desc: 'We decouple qualitative AI consensus from financial settlement. GenLayer acts as the supreme court of qualitative attribution, while Arc Testnet executes lightning-fast micro-licensing payouts.',
    cards: [
      { num: 'REASONING LAYER', title: 'GenLayer Studio Next', desc: 'Chain ID 61997. Multi-validator consensus on semantic equivalence (Consensus v0.6) with cryptographic evidence checking.', highlight: true },
      { num: 'SETTLEMENT LAYER', title: 'Arc Testnet (USDC)', desc: 'Instant sub-cent financial rails. 80% creator share settled directly to author upon citation acceptance.', success: true },
      { num: 'PRIVACY LAYER', title: 'Zero-Address Proofs', desc: 'Permanent HMAC tokens. Authors prove ownership across X, Substack, and blogs without exposing their wallet address.' },
    ],
    narration:
      "Pythia pairs GenLayer Intelligent Contracts with Arc Testnet's sub-cent USDC settlements. On GenLayer Studio Next, independent validators render live web pages, calculate SHA-256 evidence hashes, and reach BFT consensus on citations under the Equivalence Principle. On Arc Testnet, automated USDC micropayments settle directly to the verified creator's wallet.",
  },
  {
    num: 3,
    eyebrow: '03 / CREATOR WORKFLOW: REGISTER & PRICE',
    title: 'Register, Verify & <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">Set Your Price</em>.',
    desc: 'Creators claim ownership across any platform—X, Substack, Medium, or custom blogs—using zero-address cryptographic proofs that protect their on-chain financial privacy.',
    codeBox: `
      <div style="background:#101010; border:1px solid rgba(245,245,245,0.12); padding:24px; border-radius:3px; font-family:'IBM Plex Mono', monospace; font-size:17px; line-height:1.9;">
        <p style="color:#606060;">// 1. Permanent Reusable Creator Code</p>
        <p style="color:#00FF66; font-weight:700;">pythia_verify_e4b5ddb507662a30991912c3ad5d910f</p>
        <p style="color:#606060; margin-top:14px;">// 2. URL & Citation Fee Configuration</p>
        <p style="color:#CACACA;">Target URL: <span style="color:#9C9BFF;">https://x.com/stratton001/status/2100352044867428566</span></p>
        <p style="color:#CACACA;">Citation Fee: <span style="color:#00FF66; font-weight:700;">$0.05 USDC</span> · Ownership Proof: <span style="color:#00FF66;">VERIFIED (Zero-Address)</span></p>
      </div>
    `,
    narration:
      "Let's look at the creator workflow. Creators can claim ownership of any content—whether on X, Substack, Medium, or personal blogs—without exposing their wallet. Pythia generates an opaque verification code derived via HMAC-SHA256. Creators include this code in their post, register the URL, set their citation fee, for example five cents, and start earning.",
  },
  {
    num: 4,
    eyebrow: '04 / LIVE RESEARCH: BFT CONSENSUS',
    title: 'Verifiable Attribution via <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">GenVM</em>.',
    desc: 'GenLayer validators execute independent web fetches and comparative equivalence checks. If an author\'s page was tampered with or fails to answer the query, the contract detects the discrepancy and refuses to charge.',
    codeBox: `
      <div style="background:#101010; border:1px solid rgba(245,245,245,0.12); padding:24px; border-radius:3px; font-family:'IBM Plex Mono', monospace; font-size:16px; line-height:1.8;">
        <p style="color:#606060; margin-bottom:6px;">GenLayer Studio Next Contract: 0x631578596e9c33ce5a969Fa99b856Bfb8AFc7ceA</p>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top:12px;">
          <div>
            <p style="color:#9C9BFF;">gl.nondet.web.request(url) -> 200 OK</p>
            <p style="color:#CACACA;">Evidence Hash: <span style="color:#00FF66;">MATCHED (SHA-256)</span></p>
            <p style="color:#CACACA;">Equivalence Principle: <span style="color:#00FF66;">prompt_comparative BFT ACCEPTED</span></p>
          </div>
          <div style="border-left: 1px solid rgba(245,245,245,0.15); padding-left: 20px;">
            <p style="color:#F5F5F5;">Answer: <span style="color:#CACACA;">"Pythia triggers native USDC settlements via cryptographic authorization receipts..."</span></p>
            <p style="color:#00FF66; margin-top:8px; font-weight:700;">Citations Accepted: ["x.com/stratton001"]</p>
          </div>
        </div>
      </div>
    `,
    narration:
      "Now let's run an autonomous research session. The agent retrieves candidate sources off-chain and hands evidence to our Intelligent Contract on GenLayer Studio Next at address 0x6315...7ceA. Independent validators fetch the live post, verify evidence hashes, and execute consensus under the Equivalence Principle, accepting the citation.",
  },
  {
    num: 5,
    eyebrow: '05 / SETTLEMENT & CREATOR CONSOLE',
    title: 'Instant Settlement & <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">Full Control</em>.',
    desc: 'Creators earn 80% of every citation fee settled in USDC. The dashboard provides complete lifecycle management: real-time inline fee editing and safe source deletion.',
    cards: [
      { num: 'EARNINGS LEDGER', title: '80% Creator Share', desc: 'Direct USDC settlement on Arc Testnet. Verifiable transaction hashes and receipt signatures.', success: true },
      { num: 'LIFECYCLE MANAGEMENT', title: 'Inline Fee Editor', desc: 'Update citation licensing fees from 0.00 to 100.00 USDC in one click with instant validation.', highlight: true },
      { num: 'UNINDEXING SAFETY', title: 'Delete Registered Source', desc: 'Safely removes chunks from AI retrieval while permanently preserving historical earnings receipts.' },
    ],
    narration:
      "When the citation is accepted, a cryptographic authorization receipt triggers an instant USDC payment on Arc Testnet directly to the creator's wallet. In the Creator Console, authors view their earnings ledger, edit citation fees inline with instant validation, or delete sources with safe vector unindexing while preserving historical payout receipts.",
  },
  {
    num: 6,
    eyebrow: '06 / HACKATHON SUMMARY & CONCLUSION',
    title: 'Built on <em style="color:#110FFF; text-shadow:0 0 30px rgba(17,15,255,0.8);">GenLayer Studio Next</em>.',
    desc: '"Attribution without payment is a screenshot. Payment without verifiable attribution is a guess."',
    codeBox: `
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-family:'IBM Plex Mono', monospace; font-size:16px; text-align:center; margin-top:20px;">
        <div style="background:#0B0B0B; padding: 20px; border: 1px solid rgba(245,245,245,0.12);">
          <p style="color:#606060; font-size:12px; margin-bottom:6px;">NETWORK</p>
          <p style="color:#9C9BFF; font-weight:700; font-size:18px;">Studio Next</p>
        </div>
        <div style="background:#0B0B0B; padding: 20px; border: 1px solid rgba(245,245,245,0.12);">
          <p style="color:#606060; font-size:12px; margin-bottom:6px;">CHAIN ID</p>
          <p style="color:#F5F5F5; font-weight:700; font-size:18px;">61997</p>
        </div>
        <div style="background:#0B0B0B; padding: 20px; border: 1px solid rgba(245,245,245,0.12);">
          <p style="color:#606060; font-size:12px; margin-bottom:6px;">CONSENSUS</p>
          <p style="color:#00FF66; font-weight:700; font-size:18px;">v0.6 Positional</p>
        </div>
        <div style="background:#0B0B0B; padding: 20px; border: 1px solid rgba(245,245,245,0.12);">
          <p style="color:#606060; font-size:12px; margin-bottom:6px;">INTELLIGENT CONTRACT</p>
          <p style="color:#CACACA; font-size:13px; font-family:monospace; word-break:break-all;">0x6315...7ceA</p>
        </div>
      </div>
    `,
    narration:
      "Pythia is fully compliant with the GenLayer Hackathon Studio Next requirements: running on Chain 61997, Consensus v0.6, Transaction Kit RC2, and genlayer-js v2. Attribution without payment is a screenshot. Payment without verifiable attribution is a guess. Thank you!",
  },
]

function chunkText(text: string, maxLength = 80): string[] {
  const chunks: string[] = []
  const rawClauses = text.split(/(?<=[.!?,;])\s+/)
  let current = ''

  for (const clause of rawClauses) {
    if (clause.length <= maxLength) {
      if (!current) {
        current = clause
      } else if (current.length + 1 + clause.length <= maxLength) {
        current += ' ' + clause
      } else {
        chunks.push(current)
        current = clause
      }
    } else {
      const words = clause.split(/\s+/)
      for (const word of words) {
        if (!current) {
          current = word
        } else if (current.length + 1 + word.length <= maxLength) {
          current += ' ' + word
        } else {
          chunks.push(current)
          current = word
        }
      }
    }
  }
  if (current) chunks.push(current)
  return chunks
}

async function fetchGoogleTTSChunk(text: string, retries = 3): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodeURIComponent(text)}`
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      })
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer())
      }
      if (attempt === retries) {
        throw new Error(`TTS failed with status ${res.status}: ${res.statusText}`)
      }
    } catch (e: any) {
      if (attempt === retries) throw e
    }
    await new Promise((r) => setTimeout(r, attempt * 500))
  }
  throw new Error('TTS unreachable')
}

async function fetchGoogleTTS(fullText: string): Promise<Buffer> {
  const chunks = chunkText(fullText, 80)
  const buffers: Buffer[] = []
  for (const chunk of chunks) {
    buffers.push(await fetchGoogleTTSChunk(chunk))
    await new Promise((r) => setTimeout(r, 200))
  }
  return Buffer.concat(buffers)
}

function generateSlideHtml(slide: (typeof SLIDES)[0]): string {
  const cardsHtml = slide.cards
    ? `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 40px;">
        ${slide.cards
          .map(
            (c) => `
          <div style="background: ${c.highlight ? 'rgba(17,15,255,0.12)' : c.success ? 'rgba(0,255,102,0.06)' : 'rgba(16,16,16,0.85)'}; border: 1px solid ${c.highlight ? 'rgba(17,15,255,0.6)' : c.success ? 'rgba(0,255,102,0.4)' : 'rgba(245,245,245,0.12)'}; padding: 32px; border-radius: 2px;">
            <p style="font-family:'IBM Plex Mono', monospace; font-size:14px; color:#606060; margin-bottom:12px;">${c.num}</p>
            <h3 style="font-size:22px; font-weight:600; margin-bottom:10px; color:${c.highlight ? '#9C9BFF' : c.success ? '#00FF66' : '#F5F5F5'};">${c.title}</h3>
            <p style="font-size:16px; color:#CACACA; line-height:1.5;">${c.desc}</p>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : slide.codeBox || ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 1920px;
    height: 1080px;
    background: #070707;
    color: #F5F5F5;
    font-family: 'IBM Plex Sans', sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 80px 100px;
  }
  body::before {
    content: "";
    position: absolute;
    width: 1200px; height: 1200px;
    right: -400px; bottom: -500px;
    background: radial-gradient(circle, rgba(17,15,255,0.38) 0%, rgba(17,15,255,0.08) 45%, transparent 70%);
    pointer-events: none;
  }
  body::after {
    content: "";
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.18) 2px 4px);
    pointer-events: none;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    position: relative;
    z-index: 2;
  }
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    letter-spacing: 0.25em;
    color: #CACACA;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: #00FF66;
    box-shadow: 0 0 16px #00FF66;
  }
  h1 {
    font-size: 72px;
    line-height: 1.05;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 24px;
    position: relative;
    z-index: 2;
  }
  p.desc {
    font-size: 26px;
    line-height: 1.5;
    color: #CACACA;
    max-width: 1400px;
    position: relative;
    z-index: 2;
  }
  .content-area {
    margin-top: auto;
    position: relative;
    z-index: 2;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid rgba(245,245,245,0.12);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px;
    color: #606060;
    position: relative;
    z-index: 2;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="eyebrow"><span class="dot"></span>${slide.eyebrow}</div>
    <div style="font-family:'IBM Plex Mono', monospace; font-size:16px; color:#9C9BFF; background:rgba(17,15,255,0.15); border:1px solid #110FFF; padding:6px 16px; border-radius:2px;">
      GENLAYER STUDIO NEXT · CHAIN 61997
    </div>
  </div>

  <h1>${slide.title}</h1>
  <p class="desc">${slide.desc}</p>

  <div class="content-area">
    ${cardsHtml}
  </div>

  <div class="footer">
    <div>PYTHIA // AUTONOMOUS AGENT RESEARCH & CREATOR MICRO-LICENSING</div>
    <div style="color:#CACACA;">GENLAYER HACKATHON · STUDIO NEXT</div>
  </div>
</body>
</html>`
}

async function main() {
  console.log('=== STARTING AUTOMATED DEMO VIDEO GENERATOR ===')

  const workDir = path.resolve(process.cwd(), 'assets', 'pitch', 'render')
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true })
  }

  const clips: string[] = []

  for (const slide of SLIDES) {
    console.log(`\n--- Processing Slide ${slide.num} / ${SLIDES.length} ---`)

    // 1. Generate Audio via Google TTS (Google US English)
    const audioPath = path.join(workDir, `audio_slide${slide.num}.mp3`)
    if (!fs.existsSync(audioPath)) {
      console.log(`Generating Google US English audio for Slide ${slide.num}...`)
      const audioBuffer = await fetchGoogleTTS(slide.narration)
      fs.writeFileSync(audioPath, audioBuffer)
    } else {
      console.log(`Audio for Slide ${slide.num} already exists.`)
    }

    // 2. Measure audio duration
    const durationOutput = execSync(
      `"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    )
      .toString()
      .trim()
    const audioDuration = parseFloat(durationOutput)
    const slideDuration = Math.ceil(audioDuration) + 1.5 // add 1.5s padding
    console.log(`Slide ${slide.num} audio duration: ${audioDuration}s (clip duration: ${slideDuration}s)`)

    // 3. Write Slide HTML
    const htmlPath = path.join(workDir, `slide${slide.num}.html`)
    fs.writeFileSync(htmlPath, generateSlideHtml(slide))

    // 4. Capture 1080p Screenshot via Chrome Headless
    const pngPath = path.join(workDir, `slide${slide.num}.png`)
    console.log(`Capturing 1080p slide image via Chrome headless...`)
    execSync(
      `cmd.exe /c ""${CHROME_BIN}" --headless=new --hide-scrollbars --virtual-time-budget=2000 --screenshot="${pngPath}" --window-size=1920,1080 "file:///${htmlPath.replace(/\\/g, '/')}"`
    )

    if (!fs.existsSync(pngPath)) {
      throw new Error(`Failed to capture screenshot for Slide ${slide.num}`)
    }
    console.log(`Slide ${slide.num} image captured successfully.`)

    // 5. Render Video Clip via FFmpeg
    const clipPath = path.join(workDir, `clip${slide.num}.mp4`)
    console.log(`Encoding clip ${slide.num} to MP4...`)

    execSync(
      `"${FFMPEG_BIN}" -y -loop 1 -t ${slideDuration} -i "${pngPath}" -i "${audioPath}" -af "apad=pad_dur=1.5" -c:v libx264 -preset medium -crf 20 -r 30 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 44100 -ac 2 -shortest "${clipPath}"`
    )

    clips.push(clipPath)
    console.log(`Clip ${slide.num} generated: ${clipPath}`)
  }

  // 6. Concatenate Clips into Final MP4 Video
  console.log('\n--- Concatenating all clips into final broadcast MP4 ---')
  const concatListPath = path.join(workDir, 'concat_list.txt')
  const concatContent = clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatListPath, concatContent)

  const finalVideoPath = path.resolve(process.cwd(), 'assets', 'pitch', 'pythia-genlayer-demo.mp4')
  execSync(
    `"${FFMPEG_BIN}" -y -f concat -safe 0 -i "${concatListPath}" -c copy -movflags +faststart "${finalVideoPath}"`
  )

  console.log('\n=== FINAL VIDEO GENERATED SUCCESSFULLY! ===')
  console.log('Final Video Location:', finalVideoPath)

  // 7. Copy to Desktop, Downloads, and public/ for instant access
  const desktopTarget = 'C:\\Users\\pc\\Desktop\\pythia-genlayer-demo.mp4'
  const downloadsTarget = 'C:\\Users\\pc\\Downloads\\pythia-genlayer-demo.mp4'
  const publicTarget = path.resolve(process.cwd(), 'public', 'pythia-genlayer-demo.mp4')

  try {
    fs.copyFileSync(finalVideoPath, desktopTarget)
    console.log('Copied to Desktop:', desktopTarget)
  } catch (e: any) {
    console.warn('Desktop copy warning:', e.message)
  }

  try {
    fs.copyFileSync(finalVideoPath, downloadsTarget)
    console.log('Copied to Downloads:', downloadsTarget)
  } catch (e: any) {
    console.warn('Downloads copy warning:', e.message)
  }

  try {
    fs.copyFileSync(finalVideoPath, publicTarget)
    console.log('Copied to Public:', publicTarget)
  } catch (e: any) {
    console.warn('Public copy warning:', e.message)
  }
}

main().catch((err) => {
  console.error('Video generation error:', err)
  process.exit(1)
})
