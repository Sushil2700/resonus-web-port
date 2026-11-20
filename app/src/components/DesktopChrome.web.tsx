import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Icon from './Icon';
import { usePlayerStore, currentSong } from '@/store/player';
import { useSettings } from '@/store/settings';
import { songCoverUrl } from '@/api/data';
import { useTheme } from '@/theme';
import { useT } from '@/i18n';
import { webUnmuteVolume } from '@/lib/webVolume';
import { gainToSlider, sliderToGain } from '@/lib/volumeCurve';
import './desktop.css';
export function useDesktop() { return useWindowDimensions().width >= 1000; }
const tabs = {index:['Home','home','/'],search:['Search','search','/search'],library:['Your library','library','/library'],explore:['Explore','albums','/explore'],options:['Settings','settings','/options']} as const;
const time = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function DesktopChrome() {
 const router=useRouter(), path=usePathname(), p=usePlayerStore(), song=currentSong(p), c=useTheme(), t=useT();
 const bottomTabs=useSettings(s=>s.bottomTabs);
 const art=song?songCoverUrl(song,160):undefined;
 const button=(label:string,icon:any,action:()=>void,active=false,disabled=false)=><button title={t(label)} aria-label={t(label)} aria-pressed={active} disabled={disabled} onClick={action} style={{color:active?c.accent:c.textSecondary}}><Icon name={icon} size={20} color={active?c.accent:c.textSecondary}/></button>;
 return <div className="desktop-chrome" style={{'--surface':c.background,'--text':c.text,'--muted':c.textSecondary,'--accent':c.accent} as React.CSSProperties}>
 <aside className="desktop-sidebar"><div className="desktop-brand"><img src="/icon.png" alt=""/>Resonus</div><nav aria-label="Main navigation">{bottomTabs.filter(x=>x.enabled).map(({key})=>{const [label,icon,href]=tabs[key];return <button key={key} className={path===href?'selected':''} onClick={()=>router.navigate(href)}><Icon name={icon} size={20} color={path===href?c.text:c.textSecondary}/><span>{t(label)}</span></button>})}</nav><div className="desktop-library-links">{[['Favorites','/favorites'],['Play history','/history'],['Radio','/radio'],['Podcasts','/podcasts']].map(([label,href])=><button key={href} onClick={()=>router.navigate(href)}>{t(label)}</button>)}</div></aside>
 <footer className="desktop-player" aria-label="Music player"><button className="desktop-track" disabled={!song} onClick={()=>router.navigate('/player')}>{song&&(art?<img src={art} alt=""/>:<span className="desktop-cover-placeholder"><Icon name="musical-notes" size={24} color={c.textSecondary}/></span>)}<span><strong>{song?.title??t('Nothing playing')}</strong><small>{song?.artist??''}</small></span></button><div className="desktop-transport"><div className="desktop-controls">{button('Shuffle','shuffle',p.toggleShuffle,p.shuffle,!song)}{button('Previous','play-skip-back',p.previous,false,!song)}{button(p.isPlaying?'Pause':'Play',p.isPlaying?'pause':'play',p.toggle,p.isPlaying,!song)}{button('Next','play-skip-forward',p.next,false,!song)}{button('Repeat','repeat',p.cycleRepeat,p.repeat!=='off',!song)}</div><div className="desktop-seek"><span>{time(p.positionSec)}</span><input aria-label={t('Playback position')} type="range" min="0" max={p.durationSec||1} step="0.1" value={Math.min(p.positionSec,p.durationSec||1)} disabled={!song} onChange={e=>p.seekTo(Number(e.target.value))}/><span>{time(p.durationSec)}</span></div></div><div className="desktop-extra">{button('Lyrics','musical-notes',()=>router.navigate('/lyrics'),false,!song)}{button('Queue','list',()=>router.navigate('/queue'),false,!song)}{button('Volume',p.volume?'volume-high':'volume-mute',()=>p.setVolume(p.volume?0:webUnmuteVolume()))}<input aria-label={t('Volume')} type="range" min="0" max="1" step="0.01" value={gainToSlider(p.volume)} onChange={e=>p.setVolume(sliderToGain(Number(e.target.value)))}/></div></footer></div>
}
