'use strict';

import sharp from 'sharp';

export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function getThumb(url) {
  try {
    if (!url) return Buffer.alloc(0);
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw)
      .resize(250, 250, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 50 })
      .toBuffer();
  } catch {
    return Buffer.alloc(0);
  }
}

export async function createHighQualityThumbnail(conn, thumb) {
  return null;
}

export function createMusicPlayer({ title, artist, duration, audioSrc, imageSrc, lyrics }) {
  const safeTitle = escapeHtml(title);
  const safeArtist = escapeHtml(artist);
  const safeDuration = escapeHtml(duration || '0:00');
  const safeImage = imageSrc || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMGQxmatePC9zdmc+';
  const lyricsJson = Buffer.from(JSON.stringify(lyrics || []), 'utf8').toString('base64');

  return `
<style>
  :root { --ink: #ffffff; --muted: #b9b1b6; --sys: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { background: transparent; color: var(--ink); font-family: var(--sys); min-height: 100vh; }
  .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px 12px; }
  .player { position: relative; width: 100%; max-width: 330px; border-radius: 18px; overflow: hidden; background: #1a0d12; box-shadow: 0 18px 40px rgba(0,0,0,.5); }
  .bg { position: absolute; inset: -30%; width: 160%; height: 160%; object-fit: cover; filter: blur(38px) saturate(1.5); opacity: .85; z-index: 0; }
  .veil { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(20,8,12,.55) 0%, rgba(20,8,12,.72) 45%, rgba(12,5,8,.94) 100%); }
  .content { position: relative; z-index: 2; padding: 16px 18px 20px; }
  .lyrics-panel { position: absolute; inset: 0; z-index: 10; background: rgba(12,5,8,.96); backdrop-filter: blur(18px); display: flex; flex-direction: column; padding: 20px; transform: translateY(100%); transition: transform .35s cubic-bezier(.4,0,.2,1); }
  .lyrics-panel.is-open { transform: translateY(0); }
  .lyrics-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-weight: 600; font-size: 14px; letter-spacing: 1px; }
  .lyrics-status { font-size: 9px; color: var(--muted); margin-top: 4px; }
  .lyrics-close { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 15; }
  .lyrics-text { flex: 1; overflow-y: auto; font-size: 15px; line-height: 1.35; text-align: center; padding: 35vh 5px 35vh; scroll-behavior: smooth; }
  .lyric-line { display: block; color: rgba(255,255,255,.32); font-size: 15px; font-weight: 500; line-height: 1.5; padding: 7px 4px; margin: 2px 0; opacity: .65; transition: all .25s ease; }
  .lyric-line.is-past { color: rgba(255,255,255,.55); opacity: .72; }
  .lyric-line.is-active { color: #ffffff; opacity: 1; transform: scale(1.06); font-weight: 700; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
  .head__mid { text-align: center; flex: 1; min-width: 0; }
  .head__from { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
  .head__album { font-size: 12px; font-weight: 600; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .poster { width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,.06); box-shadow: 0 12px 26px rgba(0,0,0,.45); margin-bottom: 18px; }
  .poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .info { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
  .info__title { font-size: 17px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .info__artist { font-size: 12px; color: var(--muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .info__heart { width: 34px; height: 34px; background: none; border: none; color: var(--muted); cursor: pointer; }
  .info__heart.is-on { color: #ff5c8a; }
  .bar { position: relative; height: 6px; border-radius: 4px; background: rgba(255,255,255,.22); cursor: pointer; margin-bottom: 7px; padding: 4px 0; }
  .bar-inner { position: relative; width: 100%; height: 100%; background: rgba(255,255,255,.22); border-radius: 4px; }
  .bar__fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 4px; background: #fff; }
  .bar__dot { position: absolute; top: 50%; left: 0; width: 11px; height: 11px; border-radius: 50%; background: #fff; transform: translate(-50%,-50%); }
  .time { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 14px; }
  .controls { display: flex; align-items: center; justify-content: space-between; }
  .ctrl { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--ink); background: none; border: none; cursor: pointer; }
  .ctrl.is-off { opacity: .32; cursor: default; }
  .play { width: 56px; height: 56px; border-radius: 50%; background: #fff; color: #12070b; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,.4); }
  .note { margin-top: 14px; text-align: center; font-size: 10px; color: var(--muted); }
</style>

<div class="wrap">
  <div class="player">
    <img class="bg" src="${safeImage}" alt="">
    <div class="veil"></div>
    <div class="lyrics-panel" id="lyrics-panel">
      <div class="lyrics-head">
        <div><div>LYRICS</div><div class="lyrics-status" id="lyrics-status">Synced lyrics</div></div>
        <div class="lyrics-close" id="btn-close-lyrics">✕</div>
      </div>
      <div class="lyrics-text" id="lyrics-text"></div>
    </div>
    <div class="content">
      <div class="head">
        <div class="head__mid"><div class="head__from">YT Music Audio</div><div class="head__album">${safeArtist}</div></div>
      </div>
      <div class="poster"><img src="${safeImage}" alt="${safeTitle}"></div>
      <div class="info">
        <div class="info__names"><div class="info__title">${safeTitle}</div><div class="info__artist">${safeArtist}</div></div>
        <button class="info__heart" id="heart">♥</button>
      </div>
      <div class="bar" id="bar">
        <div class="bar-inner">
          <div class="bar__fill" id="fill"></div>
          <div class="bar__dot" id="dot"></div>
        </div>
      </div>
      <div class="time"><span id="cur">0:00</span><span id="dur">${safeDuration}</span></div>
      <div class="controls">
        <button class="ctrl" id="btn-lyrics">🎤</button>
        <button class="ctrl is-off" disabled>⏮</button>
        <button class="play" id="play"><span id="icon-play">▶</span><span id="icon-pause" style="display:none">⏸</span></button>
        <button class="ctrl is-off" disabled>⏭</button>
        <button class="ctrl is-off" disabled>🔁</button>
      </div>
      <div class="note"> ＃ 𝙽𝙾𝚇 〢 𝚆𝙸𝙻𝙻𝙸𝙰𝙼 𝚇 𝚂𝙷𝙰𝙽𝙺𝚂</div>
    </div>
  </div>
</div>
<audio id="audio" preload="metadata" src="${audioSrc}"></audio>
<script>
(function() {
  const audio = document.getElementById('audio'), play = document.getElementById('play'), bar = document.getElementById('bar'), fill = document.getElementById('fill'), dot = document.getElementById('dot'), cur = document.getElementById('cur'), dur = document.getElementById('dur'), heart = document.getElementById('heart'), iconPlay = document.getElementById('icon-play'), iconPause = document.getElementById('icon-pause'), btnLyrics = document.getElementById('btn-lyrics'), btnCloseLyrics = document.getElementById('btn-close-lyrics'), lyricsPanel = document.getElementById('lyrics-panel'), lyricsText = document.getElementById('lyrics-text');
  let lyrics = [];
  try { lyrics = JSON.parse(decodeURIComponent(escape(atob('${lyricsJson}')))); } catch(e) {}
  let lyricElements = [], activeIndex = -1;
  let autoOpenTriggered = false;
  
  function renderLyrics() {
    lyricsText.innerHTML = '';
    if (!lyrics.length) { lyricsText.innerHTML = 'Lirik tidak tersedia'; return; }
    const frag = document.createDocumentFragment();
    lyrics.forEach((l, i) => {
      const el = document.createElement('div');
      el.className = 'lyric-line'; el.textContent = l.text || '♪';
      frag.appendChild(el); lyricElements.push(el);
    });
    lyricsText.appendChild(frag);
  }
  renderLyrics();

  function updateLyrics(time) {
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) { if (time >= Number(lyrics[i].time || 0)) idx = i; else break; }
    
    if (idx !== -1 && !autoOpenTriggered && lyrics.length > 0) {
      autoOpenTriggered = true;
      lyricsPanel.classList.add('is-open');
    }

    if (idx === -1 || idx === activeIndex) return;
    activeIndex = idx;
    lyricElements.forEach((el, i) => { el.classList.toggle('is-active', i === idx); el.classList.toggle('is-past', i < idx); });
    if (lyricElements[idx]) lyricElements[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  btnLyrics.onclick = () => lyricsPanel.classList.add('is-open');
  btnCloseLyrics.onclick = () => lyricsPanel.classList.remove('is-open');
  heart.onclick = () => heart.classList.toggle('is-on');
  
  play.onclick = async () => {
    if (audio.paused) { await audio.play(); iconPlay.style.display = 'none'; iconPause.style.display = 'block'; }
    else { audio.pause(); iconPlay.style.display = 'block'; iconPause.style.display = 'none'; }
  };

  bar.onclick = (e) => {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pos * audio.duration;
  };

  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 100;
    fill.style.width = p + '%'; dot.style.left = p + '%';
    const m = Math.floor(audio.currentTime / 60), s = Math.floor(audio.currentTime % 60);
    cur.textContent = m + ':' + String(s).padStart(2, '0');
    updateLyrics(audio.currentTime);
  };

  audio.onloadedmetadata = () => {
    const m = Math.floor(audio.duration / 60), s = Math.floor(audio.duration % 60);
    dur.textContent = m + ':' + String(s).padStart(2, '0');
  };
})();
</script>
`;
}