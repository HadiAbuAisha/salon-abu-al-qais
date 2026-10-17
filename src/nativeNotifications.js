import { Capacitor } from '@capacitor/core';

let ready = false;

export function isNativeApp(){ return Capacitor.isNativePlatform(); }

export async function initNativeNotifications(){
  if(!isNativeApp()) return false;
  try{
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if(perm.display !== 'granted') return false;
    await LocalNotifications.createChannel({
      id:'salon-alerts',
      name:'إشعارات صالون أبو القيس',
      description:'تنبيهات الحجوزات والدور',
      importance:5,
      visibility:1,
      vibration:true,
      lights:true,
      sound:'default'
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
      channelId:'salon-alerts',
      sound:'default',
      ongoing:false,
      autoCancel:true,
      extra:{url:'/'}
    }]});
    return true;
  }catch{return false;}
}
