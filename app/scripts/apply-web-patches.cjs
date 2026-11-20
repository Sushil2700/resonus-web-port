const {execFileSync}=require('node:child_process');
const {readdirSync,readFileSync,writeFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
for(const file of readdirSync('patches').filter(x=>x.endsWith('.patch'))){
 const dir='node_modules/'+file.replace('.patch','');
 const marker=dir+'/.resonus-patch';
 const hash=createHash('sha256').update(readFileSync('patches/'+file)).digest('hex');
 if(existsSync(marker)&&readFileSync(marker,'utf8')===hash)continue;
 execFileSync('patch',['-p1','--forward','--batch','-i',resolve('patches',file)],{cwd:dir,stdio:'inherit'});
 writeFileSync(marker,hash);
}
// The native patch adds queue skip options/events, but expo-audio's web
// controller only understands seeking. Forward track actions to the same
// queue listeners, keeping ownership and cleanup in the existing controller.
// Patch both source and the compiled entry Metro consumes.
for(const relativeFile of ['src/MediaSessionController.web.ts','build/MediaSessionController.web.js']){
const mediaSessionFile='node_modules/expo-audio/'+relativeFile;
let mediaSessionSource=readFileSync(mediaSessionFile,'utf8');
if(!mediaSessionSource.includes("player.emit('remoteNext')")){
 const replacements=[
  ...(relativeFile.endsWith('.ts') ? [['interface MediaSessionPlayer {', "interface MediaSessionPlayer {\n  emit(event: 'remoteNext' | 'remotePrevious'): void;"]] : []),
  ["this._setHandler('nexttrack', seekForward);", ''],
  ["this._setHandler('nexttrack', null);", ''],
  ["this._setHandler('previoustrack', seekBackward);", ''],
  ["this._setHandler('previoustrack', null);", ''],
  ['const seekForward =', `this._setHandler('nexttrack', this.options?.showSkipNext === true
      ? () => player.emit('remoteNext') : null);
    this._setHandler('previoustrack', this.options?.showSkipPrevious === true
      ? () => player.emit('remotePrevious') : null);

    const seekForward =`],
 ];
 for(const [before,after] of replacements){
  if(!mediaSessionSource.includes(before))throw Error('Audio web media session patch needs review');
  mediaSessionSource=mediaSessionSource.replace(before,after);
 }
 writeFileSync(mediaSessionFile,mediaSessionSource);
}
}
// Resonus opens separate catalogs for profiles, downloads, podcasts and cache.
// The upstream web VFS has only six slots; grow it before opening another DB.
const fs=require('node:fs');const worker='node_modules/expo-sqlite/web/worker.ts';
let source=fs.readFileSync(worker,'utf8');
const needle='    pointer = await sqlite3.open_v2(databasePath, flags, vfsName);';
if(!source.includes('_vfs.getCapacity() - _vfs.getSize() < 8')){if(!source.includes(needle))throw Error('SQLite worker patch needs review');source=source.replace(needle,'    if (_vfs && databasePath !== ":memory:" && _vfs.getCapacity() - _vfs.getSize() < 8) await _vfs.addCapacity(16);\n'+needle);fs.writeFileSync(worker,source);}

// OPFS initialization and SQLite calls must not interleave across messages.
source=fs.readFileSync(worker,'utf8');
if(!source.includes('let webMessageQueue')){source=source.replace('self.onmessage = async (event: MessageEvent<SQLiteWorkerMessage>) => {','const handleWebMessage = async (event: MessageEvent<SQLiteWorkerMessage>) => {');source+='\nlet webMessageQueue = Promise.resolve();\nself.onmessage = (event: MessageEvent<SQLiteWorkerMessage>) => { webMessageQueue = webMessageQueue.then(() => handleWebMessage(event)); };\n';fs.writeFileSync(worker,source);}
