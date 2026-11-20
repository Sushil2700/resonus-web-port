import { fileSizes } from '@/web/filesystem';
import type { Song } from '@/api/subsonic';
// Browser downloads use the same stored audio bytes; no server round trip.
const name=(s:Song,uri:string)=>`${s.artist?s.artist+' - ':''}${s.title}`.replace(/[\\/:*?"<>|]/g,'_')+'.'+(uri.split('.').pop()?.split('?')[0]||'mp3');
async function save(s:Song,uri:string){const r=await fetch(uri);if(!r.ok)throw Error('Downloaded file is unavailable');const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download=name(s,uri);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return a.download;}
export const exportToFolder=(song:Song,uri:string,_folder:string)=>save(song,uri);
export async function exportManyToFolder(items:{song:Song;uri:string}[],_folder:string,_subfolder:string){let saved=0,failed=0;for(const item of items)try{await save(item.song,item.uri);saved++}catch{failed++}return {saved,failed};}
export async function shareSongFile(song:Song,uri:string){await save(song,uri);return true;}
export function totalBytes(uris:string[]):number { return uris.reduce((n,u)=>n+(fileSizes.get(u)||0),0); }
export function clearExportCache():void { /* Download object URLs are released after each save. */ }
