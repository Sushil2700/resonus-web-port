const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// Exercise the actual browser-registered handlers and audio engine, without
// production credentials or depending on the host OS's media-panel layout.
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.mediaActions = {};
      window.testAudio = [];
      const register = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);
      navigator.mediaSession.setActionHandler = (action, handler) => {
        register(action, handler);
        window.mediaActions[action] = handler;
      };
      window.Audio = new Proxy(window.Audio, {
        construct(target, args) {
          const audio = Reflect.construct(target, args);
          window.testAudio.push(audio);
          return audio;
        },
      });
    });
    const songs = [1, 2, 3].map(n => ({
      id: `media-${n}`, title: `Media track ${n}`, artist: 'Test artist',
      album: 'Test album', albumId: 'test-album', duration: 60,
      contentType: 'audio/wav', suffix: 'wav', isDir: false,
    }));
    const album = { id: 'test-album', name: 'Test album', artist: 'Test artist', songCount: 3, duration: 180 };
    const wav = Buffer.alloc(44 + 8000 * 2 * 60);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
    await page.route('https://test.invalid/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.split('/').pop().replace('.view', '');
      if (endpoint === 'stream' || endpoint === 'download') {
        const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
        return route.fulfill({
          status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1),
          headers: { 'accept-ranges': 'bytes', ...(range ? { 'content-range': `bytes ${start}-${end}/${wav.length}` } : {}) },
        });
      }
      await route.fulfill({ json: { 'subsonic-response': {
        status: 'ok', version: '1.16.1', type: 'subsonic', openSubsonic: true,
        musicFolders: { musicFolder: [{ id: 1, name: 'Music' }] },
        albumList2: { album: [album] }, albumList: { album: [album] },
        album: { ...album, song: songs }, artists: { index: [] },
        starred2: { song: [], album: [], artist: [] }, genres: { genre: [] },
        playlists: { playlist: [] }, randomSongs: { song: songs },
        searchResult3: { song: songs, album: [album], artist: [] },
        internetRadioStations: { internetRadioStation: [] }, playQueue: { entry: [] },
        scanStatus: { scanning: false, count: 3 }, lyricsList: { structuredLyrics: [] },
      } } });
    });
    await page.goto(process.env.RESONUS_TEST_URL || 'http://127.0.0.1:8080');
    await page.getByText('Add profile', { exact: true }).click();
    await page.getByText('OpenSubsonic', { exact: true }).click();
    await page.getByPlaceholder('https://my-music-server.com').fill('https://test.invalid');
    await page.getByPlaceholder('Username', { exact: true }).fill('media-test');
    await page.getByPlaceholder('Password', { exact: true }).fill('test-only');
    await page.getByText('Sign in', { exact: true }).click();
    await page.locator('.desktop-sidebar').waitFor();
    await page.getByText('Media track 1', { exact: true }).first().click();

    const track = async n => {
      await page.waitForFunction(n => navigator.mediaSession.metadata?.title === `Media track ${n}` &&
        window.testAudio.some(a => !a.paused && a.currentTime > 0 &&
          new URL(a.src).searchParams.get('id') === `media-${n}`), n);
    };
    const action = (name, details = {}) => page.evaluate(({ name, details }) => {
      if (typeof window.mediaActions[name] !== 'function') throw Error(`Missing media action: ${name}`);
      window.mediaActions[name]({ action: name, ...details });
    }, { name, details });
    await track(1);
    assert.equal(await page.evaluate(() => navigator.mediaSession.metadata.artist), 'Test artist');
    assert.equal(await page.evaluate(() => window.mediaActions.seekforward), null);
    assert.equal(await page.evaluate(() => window.mediaActions.seekbackward), null);
    await action('nexttrack');
    await track(2);
    await action('nexttrack');
    await track(3);
    await action('seekto', { seekTime: 0 });
    await action('previoustrack');
    await track(2);
    await action('seekto', { seekTime: 15 });
    await page.waitForFunction(() => window.testAudio.some(a => !a.paused && a.currentTime >= 15));
    await page.waitForFunction(() => Number(document.querySelector('input[aria-label="Playback position"]').value) >= 15);
    await action('previoustrack');
    await page.waitForFunction(() => window.testAudio.some(a => !a.paused && a.currentTime < 3));
    assert.equal(await page.evaluate(() => navigator.mediaSession.metadata.title), 'Media track 2', 'Previous restarts after three seconds');
    await action('pause');
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'paused' && window.testAudio.every(a => a.paused));
    await action('play');
    await track(2);
    await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing');
    // Clearing playback must also remove every native action and metadata.
    await page.locator('.desktop-track').click();
    const pause = page.locator('[role="button"][aria-label="Pause"]');
    await pause.hover();
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForFunction(() => navigator.mediaSession.metadata === null &&
      navigator.mediaSession.playbackState === 'none' &&
      Object.values(window.mediaActions).every(handler => handler === null));
    assert.deepEqual(errors, []);
    console.log('PASS: native next/previous, restart, seek, pause/play, metadata and stop cleanup');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
