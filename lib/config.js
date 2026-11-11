'use strict';

import { Buffer } from 'buffer';

export const METADATA_DECRYPTION_KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');

export const HEADERS = {
  'Content-Type': 'application/json',
  'Origin': 'https://yt.savetube.me',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
};

export const FFMPEG_CONFIG = {
  bitrate: '16k',
  sampleRate: '24000',
  channels: '1',
  codec: 'libopus',
  format: 'ogg'
};

export const LIMITS = {
  maxOriginalAudioMb: 25,
  maxOriginalAudioSize: 25 * 1024 * 1024,
  maxCompressedAudioMb: 6,
  maxCompressedAudioSize: 6 * 1024 * 1024
};

export const LRCLIB_CONFIG = {
  api: 'https://lrclib.net/api',
  userAgent: 'AnyaMD-Play2/1.0 (https://github.com/)'
};