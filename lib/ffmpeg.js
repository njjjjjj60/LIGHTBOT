'use strict';

import { spawn } from 'child_process';
import { FFMPEG_CONFIG, LIMITS } from './config.js';

export async function downloadAudioBuffer(url) {
  if (!url) throw new Error('URL audio kosong');
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Download audio gagal (${res.status})`);

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > LIMITS.maxOriginalAudioSize) throw new Error('Audio terlalu besar');

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length || buffer.length > LIMITS.maxOriginalAudioSize) throw new Error('Buffer audio bermasalah');

  return buffer;
}

export async function compressAudio(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) throw new Error('Input buffer kosong');

  return new Promise((resolve, reject) => {
    let ffmpeg;
    try {
      ffmpeg = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error',
        '-i', 'pipe:0', '-vn',
        '-c:a', FFMPEG_CONFIG.codec,
        '-b:a', FFMPEG_CONFIG.bitrate,
        '-ar', FFMPEG_CONFIG.sampleRate,
        '-ac', FFMPEG_CONFIG.channels,
        '-application', 'audio',
        '-f', FFMPEG_CONFIG.format,
        'pipe:1'
      ], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      return reject(error);
    }

    const chunks = [];
    const errors = [];
    let outputSize = 0;
    let finished = false;

    const fail = (error) => {
      if (finished) return;
      finished = true;
      try { ffmpeg.kill('SIGKILL'); } catch {}
      reject(error);
    };

    ffmpeg.stdout.on('data', chunk => {
      outputSize += chunk.length;
      if (outputSize > LIMITS.maxCompressedAudioSize) return fail(new Error('Audio compress terlalu besar'));
      chunks.push(chunk);
    });

    ffmpeg.stderr.on('data', chunk => errors.push(chunk.toString()));
    ffmpeg.on('error', error => fail(error?.code === 'ENOENT' ? new Error('FFmpeg tidak ditemukan.') : error));

    ffmpeg.on('close', code => {
      if (finished) return;
      if (code !== 0) return fail(new Error(`FFmpeg gagal (${code}): ${errors.join('').trim()}`));
      const output = Buffer.concat(chunks);
      if (!output.length) return fail(new Error('FFmpeg menghasilkan audio kosong'));
      
      finished = true;
      resolve(output);
    });

    ffmpeg.stdin.on('error', error => {
      if (error?.code !== 'EPIPE') fail(error);
    });

    ffmpeg.stdin.end(inputBuffer);
  });
}