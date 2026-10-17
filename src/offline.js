const DATA_KEY='salon-offline-data-v1';
const QUEUE_KEY='salon-offline-queue-v1';
const PROFILE_PREFIX='salon-profile-v1-';

export function saveCachedData(data){try{localStorage.setItem(DATA_KEY,JSON.stringify(data));}catch{}}
export function loadCachedData(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null');}catch{return null}}
export function saveCachedProfile(userId,profile){try{localStorage.setItem(PROFILE_PREFIX+userId,JSON.stringify(profile));}catch{}}
export function loadCachedProfile(userId){try{return JSON.parse(localStorage.getItem(PROFILE_PREFIX+userId)||'null');}catch{return null}}
export function isOffline(){return typeof navigator!=='undefined' && navigator.onLine===false}

function readQueue(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');}catch{return[]}}
function writeQueue(q){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));}catch{}}
export function queueWrite(op){const q=readQueue();q.push({...op,_qid:crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,queued_at:new Date().toISOString()});writeQueue(q);return q.length;}
export function queueCount(){return readQueue().length}

export async function syncQueue(supabase){if(isOffline())return {synced:0,remaining:queueCount()};const q=readQueue();const left=[];let synced=0;for(const op of q){try{let query=supabase.from(op.table);let res;if(op.action==='insert')res=await query.insert(op.payload);else if(op.action==='update')res=await query.update(op.payload).eq('id',op.id);else if(op.action==='delete')res=await query.delete().eq('id',op.id);else continue;if(res.error)throw res.error;synced++;}catch{left.push(op)}}writeQueue(left);return {synced,remaining:left.length};}

export async function insertOrQueue(supabase,table,payload){if(isOffline()){queueWrite({action:'insert',table,payload});return {queued:true,error:null}}const res=await supabase.from(table).insert(payload);if(res.error && !navigator.onLine){queueWrite({action:'insert',table,payload});return {queued:true,error:null}}return {...res,queued:false};}
export async function updateOrQueue(supabase,table,id,payload){if(isOffline()){queueWrite({action:'update',table,id,payload});return {queued:true,error:null}}const res=await supabase.from(table).update(payload).eq('id',id);if(res.error && !navigator.onLine){queueWrite({action:'update',table,id,payload});return {queued:true,error:null}}return {...res,queued:false};}
export async function deleteOrQueue(supabase,table,id){if(isOffline()){queueWrite({action:'delete',table,id});return {queued:true,error:null}}const res=await supabase.from(table).delete().eq('id',id);if(res.error && !navigator.onLine){queueWrite({action:'delete',table,id});return {queued:true,error:null}}return {...res,queued:false};}
