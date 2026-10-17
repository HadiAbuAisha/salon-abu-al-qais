import { Capacitor } from '@capacitor/core';

let ready = false;
const CHANNEL_ID = 'salon-alerts-v2';
const SOUND_FILE = 'salon_alert.wav';

export function isNativeApp(){ return Capacitor.isNativePlatform(); }

export async function initNativeNotifications(){
  if(!isNativeApp()) return false;
  try{
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if(perm.display !== 'granted') return false;
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name:'إشعارات صالون أبو القيس',
      description:'تنبيهات الحجوزات والدور بصوت قوي',
      importance:5,
      visibility:1,
      vibration:true,
      lights:true,
      sound:SOUND_FILE
    });
    ready = true;
    return true;
  }catch{return false;}
}

export async function showNativeNotification(title,body){
  if(!isNativeApp()) return false;
  try{
    if(!ready) await initNativeNotifications();
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({notifications:[{
      id: Math.floor(Date.now()%2147483647),
      title: title || 'صالون أبو القيس',
      body: body || 'لديك إشعار جديد من الصالون',
      channelId: CHANNEL_ID,
      sound:SOUND_FILE,
      ongoing:false,
      autoCancel:true,
      extra:{url:'/'}
    }]});
    return true;
  }catch{return false;}
}
