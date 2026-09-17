import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const FFMPEG_PATH =
  'C:\\Users\\pc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Ensure assets/pitch directory exists
    const pitchDir = path.resolve(process.cwd(), 'assets', 'pitch')
    if (!fs.existsSync(pitchDir)) {
      fs.mkdirSync(pitchDir, { recursive: true })
    }

    const webmPath = path.join(pitchDir, 'pythia-demo-video.webm')
    const mp4Path = path.join(pitchDir, 'pythia-demo-video.mp4')

    // Save uploaded WebM
    fs.writeFileSync(webmPath, buffer)
    console.log(`Saved WebM video (${(buffer.length / 1024 / 1024).toFixed(2)} MB) to:`, webmPath)

    // Convert to MP4 using FFmpeg if available
    let convertedMp4 = false
    if (fs.existsSync(FFMPEG_PATH)) {
      try {
        console.log('Transcoding to MP4 using FFmpeg...')
        await execFileAsync(FFMPEG_PATH, [
          '-y',
          '-i', webmPath,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '22',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          mp4Path,
        ])
        convertedMp4 = true
        console.log('Successfully transcoded to MP4:', mp4Path)
      } catch (ffmpegErr: any) {
        console.warn('FFmpeg transcode warning:', ffmpegErr.message)
      }
    }

    // Copy to user's Desktop and Downloads for immediate access
    const desktopPath = path.join('C:', 'Users', 'pc', 'Desktop', 'pythia-demo-video.mp4')
    const downloadsPath = path.join('C:', 'Users', 'pc', 'Downloads', 'pythia-demo-video.mp4')
    const webmDownloadsPath = path.join('C:', 'Users', 'pc', 'Downloads', 'pythia-demo-video.webm')

    const destinationPaths: string[] = []

    if (convertedMp4 && fs.existsSync(mp4Path)) {
      try {
        fs.copyFileSync(mp4Path, desktopPath)
        destinationPaths.push(desktopPath)
      } catch {}
      try {
        fs.copyFileSync(mp4Path, downloadsPath)
        destinationPaths.push(downloadsPath)
      } catch {}
    } else {
      try {
        fs.copyFileSync(webmPath, webmDownloadsPath)
        destinationPaths.push(webmDownloadsPath)
      } catch {}
    }

    return NextResponse.json({
      success: true,
      convertedMp4,
      savedAt: convertedMp4 ? mp4Path : webmPath,
      exportedLocations: destinationPaths,
    })
  } catch (error: any) {
    console.error('Save demo video error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
