import md5 from 'blueimp-md5';
import * as SQLite from '../../node_modules/expo-sqlite/build/SQLiteDatabase';
export * from '../../node_modules/expo-sqlite/build/index';
// The browser VFS allows only 64-character paths. Hash the complete native
// directory/name to retain stable per-profile isolation in a short filename.
const key=(name:string,dir?:string)=>name===':memory:'?name:md5((dir||'')+'|'+name)+'.db';
export function openDatabaseAsync(name:string,options?:SQLite.SQLiteOpenOptions,dir?:string){return SQLite.openDatabaseAsync(key(name,dir),options);}
export function openDatabaseSync(name:string,options?:SQLite.SQLiteOpenOptions,dir?:string){return SQLite.openDatabaseSync(key(name,dir),options);}
export function deleteDatabaseAsync(name:string,dir?:string){return SQLite.deleteDatabaseAsync(key(name,dir));}
export function deleteDatabaseSync(name:string,dir?:string){return SQLite.deleteDatabaseSync(key(name,dir));}
