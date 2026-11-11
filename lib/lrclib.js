'use strict';

import { LRCLIB_CONFIG } from './config.js';

export async function getLRCLyrics({ title, artist, duration = 0, album = '' }) {
  try {
    if (!title || !artist) return null;

    const params = new URLSearchParams();
    params.set('track_name', title);
    params.set('artist_name', artist);
    if (album) params.set('album_name', album);

    if (Number.isFinite(Number(duration)) && Number(duration) >= 1 && Number(duration) <= 3600) {
      params.set('duration', Math.round(Number(duration)));
    }

    const url = `${LRCLIB_CONFIG.api}/get?${params.toString()}`;
    console.log('[LRCLIB] Request:', url);

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': LRCLIB_CONFIG.userAgent
      }
    });

    if (res.status === 404 || res.status === 429 || !res.ok) return null;

    const data = await res.json();
    return data ? {
      id: data.id || null,
      trackName: data.trackName || title,
      artistName: data.artistName || artist,
      albumName: data.albumName || '',
      duration: Number(data.duration || duration || 0),
      instrumental: Boolean(data.instrumental),
      plainLyrics: data.plainLyrics || '',
      syncedLyrics: data.syncedLyrics || ''
    } : null;
  } catch (error) {
    console.log('[LRCLIB ERROR]', error?.message || error);
    return null;
  }
}

export function parseSyncedLyrics(lrc = '') {
  if (!lrc || typeof lrc !== 'string') return [];

  const result = [];
  const lines = lrc.split(/\r?\n/);

  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!matches.length) continue;

    const text = rawLine.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim();

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      let fraction = Number(match[3] || 0);

      if (String(match[3] || '').length === 1) fraction *= 100;
      else if (String(match[3] || '').length === 2) fraction *= 10;

      const time = minutes * 60 + seconds + fraction / 1000;
      result.push({ time, text });
    }
  }

  result.sort((a, b) => a.time - b.time);
  const cleaned = [];
  for (const item of result) {
    const last = cleaned[cleaned.length - 1];
    if (last && Math.abs(last.time - item.time) < 0.001 && last.text === item.text) continue;
    cleaned.push(item);
  }

  return cleaned;
}

export function plainLyricsToSynced(lyrics = '') {
  if (!lyrics) return [];
  return lyrics.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((text, index) => ({ time: index * 5, text }));
}