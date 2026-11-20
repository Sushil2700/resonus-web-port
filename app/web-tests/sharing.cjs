const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.RESONUS_TEST_URL || 'http://127.0.0.1:8080';
function wav() {
  const b = Buffer.alloc(44 + 44100 * 2 * 4);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(b.length - 44, 40);
  return b;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.phoneShareCalls = 0; navigator.share = async () => { window.phoneShareCalls++; }; });
    const playlist = { id: 'test-playlist', name: 'Sharing test', owner: 'web-test', songCount: 1, public: false };
    const song = { id: 'test-song', title: 'Sharing track', artist: 'Test artist', album: 'Test album', duration: 4, suffix: 'wav' };
    let created = 0, revoked = 0, downloadable, permissionFailure = false;
    await page.route(`${base}/rest/**`, async route => {
      const url = new URL(route.request().url());
      const endpoint = url.pathname.split('/').pop().replace('.view', '');
      if (endpoint === 'createShare') {
        created++;
        assert.equal(url.searchParams.get('id'), playlist.id);
        assert.ok(Number(url.searchParams.get('expires')) > Date.now());
      }
      if (endpoint === 'deleteShare') revoked++;
      if (endpoint === 'updatePlaylist' && url.searchParams.has('public')) playlist.public = url.searchParams.get('public') === 'true';
      const data = { status: 'ok', version: '1.16.1', type: 'navidrome', serverVersion: '0.63.2', openSubsonic: true,
        user: { username: 'web-test', shareRole: true }, musicFolders: { musicFolder: [{ id: 1, name: 'Music' }] },
        albumList2: { album: [] }, albumList: { album: [] }, artists: { index: [] }, starred2: { song: [], album: [], artist: [] },
        genres: { genre: [] }, playlists: { playlist: [playlist] }, playlist: { ...playlist, entry: [song] },
        randomSongs: { song: [] }, internetRadioStations: { internetRadioStation: [] }, playQueue: { entry: [] }, scanStatus: { scanning: false },
        shares: { share: [{ id: 'Abcd123456', url: 'https://navidrome.example.com/share/Abcd123456' }] } };
      await route.fulfill({ json: { 'subsonic-response': data } });
    });
    await page.route(`${base}/auth/login`, route => route.fulfill({ json: { token: 'test-only' } }));
    await page.route(`${base}/api/share/**`, async route => {
      downloadable = route.request().postDataJSON().downloadable;
      await route.fulfill({ status: permissionFailure ? 403 : 200, json: {} });
    });
    await page.goto(base);
    await page.getByText('Add profile', { exact: true }).click();
    await page.getByText('Navidrome', { exact: true }).click();
    await page.getByPlaceholder('Username', { exact: true }).fill('web-test');
    await page.getByPlaceholder('Password', { exact: true }).fill('test-only');
    await page.getByText('Sign in', { exact: true }).click();
    await page.locator('.desktop-sidebar').waitFor();
    await page.goto(`${base}/playlist/test-playlist`);
    await page.getByText('Sharing test', { exact: true }).first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    async function openShare() {
      await page.getByRole('button', { name: 'More options', exact: true }).first().click();
      await page.getByText('Share', { exact: true }).click();
      await page.getByRole('switch', { name: 'Allow downloads', exact: true }).waitFor();
    }
    await openShare();
    const toggle = page.getByRole('switch', { name: 'Allow downloads', exact: true });
    if (!(await toggle.isChecked())) await toggle.click();
    await page.getByRole('button', { name: '1 hour', exact: true }).click();
    const link = page.getByLabel('Sharing link');
    await link.waitFor();
    assert.equal(await link.inputValue(), 'https://navidrome.example.com/share/Abcd123456');
    assert.equal(downloadable, true, 'Download preference reaches Navidrome');
    assert.equal(created, 1);
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await link.inputValue());
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await openShare();
    assert.equal(await link.count(), 0, 'A reopened sheet cannot show the previous link');
    await toggle.click();
    await page.getByRole('button', { name: '1 day', exact: true }).click();
    await link.waitFor();
    assert.equal(downloadable, false, 'Downloads can be turned off again');
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Unavailable'); }; });
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    await page.getByText('Select and copy the link above.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await openShare();
    await page.getByText('Pick a date…', { exact: true }).click();
    await page.getByLabel('Expiry date').fill('2099-02-31');
    await page.getByRole('button', { name: 'Create link', exact: true }).click();
    assert.equal(created, 2, 'Invalid calendar dates do not create shares');
    await page.getByLabel('Expiry date').fill('2099-12-31');
    permissionFailure = true;
    await page.getByRole('button', { name: 'Create link', exact: true }).click();
    await link.waitFor();
    await page.getByText('The server could not apply your download preference. Check the share in your server settings.', { exact: true }).waitFor();
    assert.equal(created, 3);
    assert.deepEqual(errors, []);
    console.log('PASS: server links preserved, downloads on/off, clipboard/fallback, sheet reset, custom date, permission failure');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
