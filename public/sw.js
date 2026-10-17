const CACHE='salon-abu-al-qais-v4';
const CORE=['/','/index.html','/barber-logo.svg','/manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(req).then(cached=>cached||caches.match('/index.html')))
  );
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{data={body:event.data?.text()||''};}
  const title=data.title||'صالون أبو القيس';
  const options={
    body:data.body||'لديك إشعار جديد من الصالون',
    icon:'/barber-logo.svg',badge:'/barber-logo.svg',
    tag:data.tag||`salon-${Date.now()}`,
    renotify:true,silent:false,
    vibrate:[650,140,650,140,1200,180,850,160,650],
    requireInteraction:true,timestamp:Date.now(),
    data:{url:data.url||'/'},
    actions:[{action:'open',title:'فتح التطبيق'}]
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    for(const client of windows){if('focus'in client){client.focus();if('navigate'in client)return client.navigate(target);return client;}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
