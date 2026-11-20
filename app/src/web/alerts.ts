import { Alert } from 'react-native';
// React Native's web Alert is a no-op. Keep the app's existing confirmation
// buttons and callbacks, including destructive and cancel choices.
Alert.alert=(title,message,buttons,options)=>{
 const dialog=document.createElement('dialog');dialog.style.cssText='background:#232325;color:#ededed;border:1px solid #444;border-radius:12px;padding:24px;max-width:420px;font:16px system-ui';
 const heading=document.createElement('h2');heading.textContent=title;heading.style.cssText='font-size:20px;font-weight:500;margin:0 0 16px';dialog.append(heading);
 if(message){const p=document.createElement('p');p.textContent=message;p.style.cssText='font-size:14px;line-height:1.5;white-space:pre-wrap';dialog.append(p)}
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;justify-content:flex-end;margin-top:24px';dialog.append(actions);
 for(const action of buttons?.length?buttons:[{text:'OK'}]){const b=document.createElement('button');b.textContent=action.text||'OK';b.style.cssText='padding:8px 12px;border:1px solid #666;border-radius:6px;background:#333;color:#eee;cursor:pointer';b.onclick=()=>{dialog.close();dialog.remove();action.onPress?.()};actions.append(b)}
 dialog.oncancel=e=>{if(options?.cancelable===false){e.preventDefault();return;}buttons?.find(b=>b.style==='cancel')?.onPress?.();options?.onDismiss?.();dialog.remove()};document.body.append(dialog);dialog.showModal();
};
