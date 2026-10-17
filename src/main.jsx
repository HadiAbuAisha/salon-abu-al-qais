import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Users, Scissors, WalletCards, LogOut, Plus, CheckCircle2, Clock3 } from 'lucide-react';
import './styles.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const money = (n) => `${Number(n || 0).toFixed(0)} ₪`;
const fmt = (v) => v ? new Date(v).toLocaleString('ar-PS', { dateStyle: 'medium', timeStyle: 'short' }) : '';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('home');
  const [data, setData] = useState({ services: [], appointments: [], customers: [], visits: [], users: [] });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setLoading(false); return; }
    loadProfile();
  }, [session?.user?.id]);

  async function loadProfile() {
    setLoading(true);
    const { data: p, error } = await supabase.from('app_profiles').select('*').eq('id', session.user.id).single();
    if (error) setNotice(error.message);
    setProfile(p || null);
    setLoading(false);
  }

  async function refreshAll() {
    if (!profile) return;
    const [servicesR, apptsR] = await Promise.all([
      supabase.from('salon_services').select('*').order('id'),
      supabase.from('salon_appointments').select('*').order('starts_at', { ascending: true })
    ]);
    const next = { ...data, services: servicesR.data || [], appointments: apptsR.data || [] };
    if (profile.role === 'admin') {
      const [customersR, visitsR, usersR] = await Promise.all([
        supabase.from('salon_customers').select('*').order('created_at', { ascending: false }),
        supabase.from('salon_visits').select('*').order('visited_at', { ascending: false }),
        supabase.from('app_profiles').select('*').order('created_at', { ascending: true })
      ]);
      next.customers = customersR.data || [];
      next.visits = visitsR.data || [];
      next.users = usersR.data || [];
    }
    setData(next);
  }

  useEffect(() => { refreshAll(); }, [profile?.id, profile?.role]);

  if (loading) return <div className="center">جارِ التحميل...</div>;
  if (!session) return <Auth notice={notice} setNotice={setNotice} />;
  if (!profile) return <div className="center">تعذر تحميل الملف الشخصي. أعد تسجيل الدخول.</div>;

  const admin = profile.role === 'admin';
  const totalSales = data.visits.reduce((s, v) => s + Number(v.total_amount || 0), 0);
  const paid = data.visits.reduce((s, v) => s + Number(v.paid_amount || 0), 0);
  const debt = totalSales - paid;
  const pending = data.appointments.filter(a => ['pending','scheduled'].includes(a.status)).length;

  async function logout() { await supabase.auth.signOut(); }

  return <div className="app" dir="rtl">
    <header className="topbar">
      <div><strong>صالون أبو القيس</strong><span>{admin ? 'لوحة الإدارة' : 'حساب الزبون'}</span></div>
      <button className="ghost" onClick={logout}><LogOut size={18}/> خروج</button>
    </header>

    <main className="shell">
      {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
      <nav className="tabs">
        <Tab icon={<Scissors size={18}/>} active={tab==='home'} onClick={()=>setTab('home')}>الرئيسية</Tab>
        <Tab icon={<CalendarDays size={18}/>} active={tab==='appointments'} onClick={()=>setTab('appointments')}>المواعيد</Tab>
        {admin && <><Tab icon={<Users size={18}/>} active={tab==='customers'} onClick={()=>setTab('customers')}>الزبائن</Tab><Tab icon={<WalletCards size={18}/>} active={tab==='visits'} onClick={()=>setTab('visits')}>الزيارات والديون</Tab><Tab icon={<Users size={18}/>} active={tab==='users'} onClick={()=>setTab('users')}>المستخدمون</Tab></>}
      </nav>

      {tab==='home' && <section>
        <div className="hero"><div><span>أهلاً بك</span><h1>{profile.display_name || profile.email}</h1><p>{admin ? 'إدارة الحجوزات والحسابات والزبائن من مكان واحد.' : 'احجز موعدك واختر الخدمة والوقت المناسب.'}</p></div><Scissors size={62}/></div>
        <div className="stats">
          <Stat label="المواعيد الحالية" value={pending} />
          {admin && <><Stat label="إجمالي المبيعات" value={money(totalSales)} /><Stat label="المدفوع" value={money(paid)} /><Stat label="الديون" value={money(debt)} /></>}
        </div>
        {!admin && <BookingForm services={data.services} user={session.user} profile={profile} onDone={()=>{setNotice('تم إرسال طلب الحجز'); refreshAll();}} setNotice={setNotice}/>} 
        {admin && <ServicesPanel services={data.services} refresh={refreshAll} setNotice={setNotice}/>} 
      </section>}

      {tab==='appointments' && <Appointments admin={admin} items={data.appointments} refresh={refreshAll} setNotice={setNotice}/>} 
      {admin && tab==='customers' && <Customers items={data.customers} refresh={refreshAll} setNotice={setNotice}/>} 
      {admin && tab==='visits' && <Visits items={data.visits} customers={data.customers} refresh={refreshAll} setNotice={setNotice}/>} 
      {admin && tab==='users' && <UsersPanel items={data.users} currentUserId={session.user.id} refresh={refreshAll} setNotice={setNotice}/>} 
    </main>
  </div>;
}

function Tab({children, icon, active, onClick}) { return <button className={active?'tab active':'tab'} onClick={onClick}>{icon}{children}</button>; }
function Stat({label,value}) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }

function Auth({notice,setNotice}) {
  const [mode,setMode]=useState('login'); const [busy,setBusy]=useState(false);
  async function submit(e){ e.preventDefault(); setBusy(true); const f=new FormData(e.currentTarget); const email=f.get('email'); const password=f.get('password'); const name=f.get('name');
    const res = mode==='login' ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
    setBusy(false); if(res.error) setNotice(res.error.message); else if(mode==='register' && !res.data.session) setNotice('تم إنشاء الحساب. افتح بريدك لتأكيد الحساب ثم سجّل الدخول.');
  }
  return <div className="authPage" dir="rtl"><section className="authBrand"><div className="mark">✂</div><h1>صالون أبو القيس</h1><p>حجز وإدارة احترافية للصالون</p></section><section className="authCard"><h2>{mode==='login'?'تسجيل الدخول':'إنشاء حساب'}</h2>{notice&&<div className="notice">{notice}</div>}<div className="switcher"><button className={mode==='login'?'on':''} onClick={()=>setMode('login')}>دخول</button><button className={mode==='register'?'on':''} onClick={()=>setMode('register')}>حساب جديد</button></div><form onSubmit={submit}>{mode==='register'&&<input name="name" placeholder="الاسم" required/>}<input name="email" type="email" placeholder="البريد الإلكتروني" required/><input name="password" type="password" minLength="6" placeholder="كلمة المرور" required/><button className="primary" disabled={busy}>{busy?'جارِ التنفيذ...':mode==='login'?'دخول':'إنشاء الحساب'}</button></form><small>أول حساب يتم إنشاؤه يصبح مدير الصالون تلقائيًا.</small></section></div>;
}

function BookingForm({services,user,profile,onDone,setNotice}){
  async function submit(e){e.preventDefault(); const f=new FormData(e.currentTarget); const {error}=await supabase.from('salon_appointments').insert({user_id:user.id,customer_name:profile.display_name||user.email,phone:f.get('phone'),service_name:f.get('service'),starts_at:new Date(f.get('starts')).toISOString(),notes:f.get('notes')}); if(error)setNotice(error.message); else {e.currentTarget.reset();onDone();}}
  return <section className="card"><h2>احجز موعدًا جديدًا</h2><form className="gridForm" onSubmit={submit}><input name="phone" placeholder="رقم الجوال"/><select name="service" required><option value="">اختر الخدمة</option>{services.map(s=><option key={s.id} value={s.name}>{s.name} — {money(s.price)}</option>)}</select><input name="starts" type="datetime-local" required/><input name="notes" placeholder="ملاحظة اختيارية"/><button className="primary"><Plus size={18}/> إرسال الحجز</button></form></section>;
}

function Appointments({admin,items,refresh,setNotice}){
  async function status(id,status){const {error}=await supabase.from('salon_appointments').update({status}).eq('id',id); if(error)setNotice(error.message); else refresh();}
  return <section className="card"><h2>المواعيد</h2><div className="list">{items.length===0&&<Empty/>}{items.map(a=><article className="row" key={a.id}><div><strong>{a.customer_name}</strong><span>{a.service_name}</span><small>{fmt(a.starts_at)} {a.phone?`• ${a.phone}`:''}</small></div><span className={'status '+a.status}>{a.status}</span>{admin&&<div className="actions"><button onClick={()=>status(a.id,'scheduled')}>تأكيد</button><button onClick={()=>status(a.id,'completed')}>مكتمل</button><button onClick={()=>status(a.id,'cancelled')}>إلغاء</button></div>}</article>)}</div></section>;
}

function Customers({items,refresh,setNotice}){
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.from('salon_customers').insert({name:f.get('name'),phone:f.get('phone'),notes:f.get('notes')});if(error)setNotice(error.message);else{e.currentTarget.reset();refresh();}}
  return <section className="card"><h2>الزبائن</h2><form className="gridForm" onSubmit={submit}><input name="name" placeholder="اسم الزبون" required/><input name="phone" placeholder="رقم الهاتف"/><input name="notes" placeholder="ملاحظات"/><button className="primary"><Plus size={18}/> إضافة زبون</button></form><div className="list">{items.map(c=><article className="row" key={c.id}><div><strong>{c.name}</strong><span>{c.phone||'بدون رقم'}</span><small>{c.notes||''}</small></div></article>)}</div></section>;
}

function Visits({items,customers,refresh,setNotice}){
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);const customer=customers.find(c=>String(c.id)===String(f.get('customer')));const total=Number(f.get('total'));const paid=Number(f.get('paid'));const {error}=await supabase.from('salon_visits').insert({customer_id:customer?.id||null,customer_name:customer?.name||f.get('name'),service_name:f.get('service'),total_amount:total,paid_amount:paid,notes:f.get('notes')});if(error)setNotice(error.message);else{e.currentTarget.reset();refresh();}}
  return <section className="card"><h2>الزيارات والديون</h2><form className="gridForm" onSubmit={submit}><select name="customer"><option value="">زبون غير مسجل</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><input name="name" placeholder="اسم الزبون إذا غير مسجل"/><input name="service" placeholder="الخدمة" required/><input name="total" type="number" min="0" step="0.01" placeholder="الإجمالي" required/><input name="paid" type="number" min="0" step="0.01" placeholder="المدفوع" required/><input name="notes" placeholder="ملاحظات"/><button className="primary"><Plus size={18}/> تسجيل زيارة</button></form><div className="list">{items.map(v=><article className="row" key={v.id}><div><strong>{v.customer_name}</strong><span>{v.service_name}</span><small>{fmt(v.visited_at)}</small></div><div className="money"><b>{money(v.total_amount)}</b><small>مدفوع {money(v.paid_amount)} • دين {money(Number(v.total_amount)-Number(v.paid_amount))}</small></div></article>)}</div></section>;
}

function ServicesPanel({services,refresh,setNotice}){
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.from('salon_services').insert({name:f.get('name'),price:Number(f.get('price')),duration_minutes:Number(f.get('duration'))});if(error)setNotice(error.message);else{e.currentTarget.reset();refresh();}}
  return <section className="card"><h2>الخدمات والأسعار</h2><form className="gridForm compact" onSubmit={submit}><input name="name" placeholder="اسم الخدمة" required/><input name="price" type="number" min="0" placeholder="السعر" required/><input name="duration" type="number" min="5" value="30" onChange={()=>{}} hidden/><button className="primary"><Plus size={18}/> إضافة خدمة</button></form><div className="chips">{services.map(s=><span key={s.id}>{s.name} <b>{money(s.price)}</b></span>)}</div></section>;
}

function UsersPanel({items,currentUserId,refresh,setNotice}){
  async function toggle(u){const role=u.role==='admin'?'user':'admin';const {error}=await supabase.from('app_profiles').update({role}).eq('id',u.id);if(error)setNotice(error.message);else refresh();}
  return <section className="card"><h2>المستخدمون والصلاحيات</h2><div className="list">{items.map(u=><article className="row" key={u.id}><div><strong>{u.display_name||u.email}</strong><span>{u.email}</span></div><div className="actions"><span className={'status '+u.role}>{u.role==='admin'?'مدير':'مستخدم'}</span>{u.id!==currentUserId&&<button onClick={()=>toggle(u)}>{u.role==='admin'?'إزالة الإدارة':'جعله مديرًا'}</button>}</div></article>)}</div></section>;
}

function Empty(){return <div className="empty"><Clock3 size={28}/><span>لا توجد بيانات حتى الآن</span></div>}

createRoot(document.getElementById('root')).render(<App/>);
