const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.stack)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await page.addInitScript(()=>{
 window.__volumeTestAudio=[];
 window.Audio=new Proxy(window.Audio,{construct(target,args){const audio=Reflect.construct(target,args);window.__volumeTestAudio.push(audio);return audio;}});
});
const song={id:'test-song',title:'Browser playback test',artist:'Test artist',artistId:'test-artist',album:'Test album',albumId:'test-album',duration:10,contentType:'audio/wav',suffix:'wav',isDir:false};const album={id:'test-album',name:'Test album',artist:'Test artist',artistId:'test-artist',songCount:1,duration:10};
await page.route('https://test.invalid/**',async route=>{const url=new URL(route.request().url()),endpoint=url.pathname.split('/').pop().replace('.view','');if(endpoint==='stream'||endpoint==='download'){const b=Buffer.alloc(44+44100*2*10);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return route.fulfill({contentType:'audio/wav',body:b});}const data={status:'ok',version:'1.16.1',type:'subsonic',openSubsonic:true,musicFolders:{musicFolder:[{id:1,name:'Music'}]},albumList2:{album:[album]},albumList:{album:[album]},album:{...album,song:[song]},artists:{index:[{name:'T',artist:[{id:'test-artist',name:'Test artist',albumCount:1}]}]},artist:{id:'test-artist',name:'Test artist',album:[album]},starred2:{song:[],album:[],artist:[]},genres:{genre:[]},playlists:{playlist:[]},randomSongs:{song:[song]},searchResult3:{song:[song],album:[album],artist:[]},internetRadioStations:{internetRadioStation:[]},playQueue:{entry:[]},scanStatus:{scanning:false,count:1},lyricsList:{structuredLyrics:[]}};await route.fulfill({json:{'subsonic-response':data},headers:{'access-control-allow-origin':'*'}})});
await page.goto(process.env.RESONUS_TEST_URL || 'http://127.0.0.1:8080');await page.getByText('Add profile',{exact:true}).click();await page.getByText('OpenSubsonic',{exact:true}).click();await page.getByPlaceholder('https://my-music-server.com').fill('https://test.invalid');await page.getByPlaceholder('Username',{exact:true}).fill('web-test');await page.getByPlaceholder('Password',{exact:true}).fill('test-only');await page.getByText('Sign in',{exact:true}).click();await page.waitForTimeout(6000);await page.locator('.desktop-sidebar').waitFor({timeout:15000});assert.equal(await page.getByRole('slider',{name:'Volume',exact:true}).inputValue(),'0.77');await page.getByText('Browser playback test',{exact:true}).first().click();await page.waitForTimeout(3000);console.log('AUDIO',await page.locator('audio').evaluateAll(es=>es.map(e=>({paused:e.paused,time:e.currentTime,src:e.currentSrc,error:e.error?.message}))));assert.ok(Number(await page.getByRole('slider',{name:'Playback position',exact:true}).inputValue())>0,'Audio position advances');assert.equal(await page.evaluate(()=>window.__volumeTestAudio.find(a=>!a.paused)?.volume),0.2,'Existing 0.2 gain is preserved despite the new slider position');const volume=page.getByRole('slider',{name:'Volume',exact:true});
await volume.focus();await volume.press('Home');for(let i=0;i<50;i++)await volume.press('ArrowRight');
assert.equal(await volume.inputValue(),'0.5');
const expectedGain=(Math.sqrt(1000)-1)/999;
assert.ok(Math.abs(await page.evaluate(()=>window.__volumeTestAudio.find(a=>!a.paused)?.volume)-expectedGain)<1e-8,'Halfway slider applies logarithmic gain to the actual audio');
await page.getByRole('button',{name:'Pause',exact:true}).click();
await page.waitForFunction(()=>window.__volumeTestAudio.every(a=>a.paused));
await page.getByRole('button',{name:'Volume',exact:true}).click();
assert.equal(await volume.inputValue(),'0');
await page.reload();
await page.locator('.desktop-sidebar').waitFor();
assert.equal(await volume.inputValue(),'0','Mute survives reload');
await page.getByRole('button',{name:'Volume',exact:true}).click();
assert.equal(await volume.inputValue(),'0.5','Unmute restores the previous level');
await page.reload();
await page.locator('.desktop-sidebar').waitFor();
assert.equal(await volume.inputValue(),'0.5','Chosen volume survives reload');
assert.ok(Math.abs(await page.evaluate(()=>Number(localStorage.getItem('resonus.webVolume')))-expectedGain)<1e-8,'Gain stays unchanged through mute and reload');console.log('URL',page.url());console.log('ERRORS',errors);await browser.close();assert.equal(errors.length,0)})().catch(e=>{console.error(e);process.exit(1)})
