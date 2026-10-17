import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Save, Scissors, Trash2, WalletCards, X } from 'lucide-react';
import { dayKey } from './DailyLedger.jsx';
import { isOffline, queueWrite } from './offline.js';

const money = (n) => `${Number(n || 0).toFixed(0)} ₪`;
const fmt = (v) => v ? new Date(v).toLocaleString('ar-PS', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Gaza' }) : '';

export function EditableServicesPanel({ supabase, services, refresh, setNotice }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  function startEdit(s){setEditing(s.id);setName(s.name||'');setPrice(String(Number(s.price||0)));}
  function cancelEdit(){setEditing(null);setName('');setPrice('');}

  async function add(e){
    e.preventDefault();const f=new FormData(e.currentTarget);const payload={name:String(f.get('name')||'').trim(),price:Number(f.get('price')||0),duration_minutes:30};
    if(isOffline()){queueWrite({action:'insert',table:'salon_services',payload});e.currentTarget.reset();setNotice('تم حفظ الخدمة بدون إنترنت وسيتم رفعها تلقائيًا عند عودة الشبكة.');return;}
    const {error}=await supabase.from('salon_services').insert(payload);if(error)return setNotice(error.message);e.currentTarget.reset();await refresh();setNotice('تمت إضافة الخدمة بنجاح.');
  }
  async function save(id){
    if(!name.trim())return setNotice('اسم الخدمة مطلوب.');const payload={name:name.trim(),price:Number(price||0)};
    if(isOffline()){queueWrite({action:'update',table:'salon_services',id,payload});cancelEdit();setNotice('تم حفظ تعديل الخدمة بدون إنترنت وسيتم تطبيقه تلقائيًا لاحقًا.');return;}
    const{error}=await supabase.from('salon_services').update(payload).eq('id',id);if(error)return setNotice(error.message);cancelEdit();await refresh();setNotice('تم تعديل الخدمة والسعر بنجاح.');
  }
  async function remove(s){
    if(!window.confirm(`حذف خدمة «${s.name}»؟ لن يتم حذف السجلات القديمة المرتبطة باسمها.`))return;
    if(isOffline()){queueWrite({action:'delete',table:'salon_services',id:s.id});setNotice('تم حفظ طلب حذف الخدمة وسيتم تنفيذه عند عودة الإنترنت.');return;}
    const{error}=await supabase.from('salon_services').delete().eq('id',s.id);if(error)return setNotice(error.message);await refresh();setNotice('تم حذف الخدمة بنجاح.');
  }

  return <section className="card servicesCard manageCard"><div className="sectionHeading"><div><small>تحكم كامل بالأسعار</small><h2>الخدمات</h2></div><Scissors/></div><form className="gridForm compact" onSubmit={add}><input name="name" placeholder="اسم الخدمة" required/><input name="price" type="number" min="0" step="0.01" placeholder="السعر" required/><button className="primary"><Plus size={18}/> إضافة خدمة</button></form><div className="managementList">{services.map(s=><article className="manageRow" key={s.id}>{editing===s.id?<><div className="editFields serviceEditFields"><input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الخدمة"/><input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="السعر"/></div><div className="rowButtons"><button className="smallAction saveAction" onClick={()=>save(s.id)}><Save size={15}/> حفظ</button><button className="smallAction" onClick={cancelEdit}><X size={15}/> إلغاء</button></div></>:<><div className="manageInfo"><strong>{s.name}</strong><span>{money(s.price)}</span></div><div className="rowButtons"><button className="smallAction" onClick={()=>startEdit(s)}><Edit3 size={15}/> تعديل</button><button className="smallAction deleteAction" onClick={()=>remove(s)}><Trash2 size={15}/> حذف</button></div></>}</article>)}</div></section>;
}

export function EditableVisits({ supabase, items, customers, services, refresh, setNotice }) {
  const [filter,setFilter]=useState(dayKey());const [editing,setEditing]=useState(null);const[draft,setDraft]=useState({});
  const shown=useMemo(()=>!filter?items:items.filter(v=>v.visit_day===filter),[items,filter]);
  const totals=useMemo(()=>shown.reduce((a,v)=>{a.total+=Number(v.total_amount||0);a.paid+=Number(v.paid_amount||0);return a;},{total:0,paid:0}),[shown]);

  async function add(e){
    e.preventDefault();const f=new FormData(e.currentTarget);const customer=customers.find(c=>String(c.id)===String(f.get('customer')));const selectedDay=String(f.get('visit_day')||dayKey());const total=Number(f.get('total')||0),paid=Number(f.get('paid')||0);if(paid>total)return setNotice('المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    const payload={customer_id:customer?.id||null,customer_name:customer?.name||String(f.get('name')||'').trim(),phone:customer?.phone||String(f.get('phone')||'').trim(),service_name:String(f.get('service')||'').trim(),total_amount:total,paid_amount:paid,notes:String(f.get('notes')||'').trim(),visit_day:selectedDay};
    if(isOffline()){queueWrite({action:'insert',table:'salon_visits',payload});e.currentTarget.reset();setFilter(selectedDay);setNotice('تم حفظ الحساب بدون إنترنت وسيتم رفعه تلقائيًا عند عودة الشبكة.');return;}
    const{error}=await supabase.from('salon_visits').insert(payload);if(error)return setNotice(error.message);e.currentTarget.reset();await refresh();setFilter(selectedDay);setNotice('تم حفظ الحساب في السجل بنجاح.');
  }
  function startEdit(v){setEditing(v.id);setDraft({customer_name:v.customer_name||'',phone:v.phone||'',service_name:v.service_name||'',total_amount:String(Number(v.total_amount||0)),paid_amount:String(Number(v.paid_amount||0)),notes:v.notes||'',visit_day:v.visit_day||dayKey()});}
  function field(k,v){setDraft(d=>({...d,[k]:v}));}function cancelEdit(){setEditing(null);setDraft({});}
  async function save(v){
    const total=Number(draft.total_amount||0),paid=Number(draft.paid_amount||0);if(!draft.customer_name?.trim()||!draft.service_name?.trim())return setNotice('اسم الزبون والخدمة مطلوبان.');if(paid>total)return setNotice('المدفوع لا يمكن أن يكون أكبر من الإجمالي.');
    const payload={customer_name:draft.customer_name.trim(),phone:draft.phone?.trim()||null,service_name:draft.service_name.trim(),total_amount:total,paid_amount:paid,notes:draft.notes?.trim()||null,visit_day:draft.visit_day};
    if(isOffline()){queueWrite({action:'update',table:'salon_visits',id:v.id,payload});cancelEdit();setNotice('تم حفظ تعديل الحساب بدون إنترنت وسيتم تطبيقه تلقائيًا لاحقًا.');return;}
    const{error}=await supabase.from('salon_visits').update(payload).eq('id',v.id);if(error)return setNotice(error.message);cancelEdit();await refresh();setNotice('تم تعديل الحساب وتحديث النتائج بنجاح.');
  }
  async function remove(v){
    if(!window.confirm(`حذف حساب ${v.customer_name} بتاريخ ${v.visit_day||''}؟ لا يمكن التراجع عن الحذف.`))return;
    if(isOffline()){queueWrite({action:'delete',table:'salon_visits',id:v.id});setNotice('تم حفظ طلب حذف الحساب وسيتم تنفيذه عند عودة الإنترنت.');return;}
    const{error}=await supabase.from('salon_visits').delete().eq('id',v.id);if(error)return setNotice(error.message);await refresh();setNotice('تم حذف الحساب من السجل وتحديث النتائج بنجاح.');
  }

  return <section className="card accountsManager"><div className="sectionHeading"><div><small>تعديل وحذف + سجل كل الأيام</small><h2>الحسابات والسجل القديم</h2></div><WalletCards/></div><div className="historyToolbar"><div><span>عرض السجل:</span><input type="date" value={filter} onChange={e=>setFilter(e.target.value)}/></div><div className="toolbarButtons"><button onClick={()=>setFilter(dayKey())}>اليوم</button><button onClick={()=>setFilter('')}>كل الأيام</button></div></div><div className="historyTotals"><span>الإجمالي <b>{money(totals.total)}</b></span><span>المدفوع <b>{money(totals.paid)}</b></span><span>المتبقي <b>{money(totals.total-totals.paid)}</b></span><span>عدد السجلات <b>{shown.length}</b></span></div><form className="gridForm accountAddForm" onSubmit={add}><select name="customer"><option value="">زبون غير مسجل</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><input name="name" placeholder="اسم الزبون إذا غير مسجل"/><input name="phone" inputMode="tel" placeholder="رقم الجوال"/><select name="service" required><option value="">نوع الخدمة</option>{services.map(s=><option key={s.id} value={s.name}>{s.name} — {money(s.price)}</option>)}</select><input name="total" type="number" min="0" step="0.01" placeholder="الإجمالي" required/><input name="paid" type="number" min="0" step="0.01" placeholder="المدفوع" required/><input name="visit_day" type="date" defaultValue={dayKey()} required/><input name="notes" placeholder="ملاحظات"/><button className="primary wideField"><Plus size={18}/> تسجيل حساب</button></form><div className="managementList accountRows">{shown.length===0&&<div className="emptyAccount">لا توجد حسابات في هذا التاريخ.</div>}{shown.map(v=><article className="manageRow accountManageRow" key={v.id}>{editing===v.id?<><div className="editFields accountEditGrid"><input value={draft.customer_name||''} onChange={e=>field('customer_name',e.target.value)} placeholder="اسم الزبون"/><input value={draft.phone||''} onChange={e=>field('phone',e.target.value)} placeholder="رقم الجوال"/><select value={draft.service_name||''} onChange={e=>field('service_name',e.target.value)}><option value="">الخدمة</option>{services.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select><input value={draft.total_amount||''} onChange={e=>field('total_amount',e.target.value)} type="number" min="0" step="0.01" placeholder="الإجمالي"/><input value={draft.paid_amount||''} onChange={e=>field('paid_amount',e.target.value)} type="number" min="0" step="0.01" placeholder="المدفوع"/><input value={draft.visit_day||''} onChange={e=>field('visit_day',e.target.value)} type="date"/><input value={draft.notes||''} onChange={e=>field('notes',e.target.value)} className="wideField" placeholder="الملاحظة"/><div className="editRemainder wideField">المتبقي بعد التعديل: <strong>{money(Math.max(0,Number(draft.total_amount||0)-Number(draft.paid_amount||0)))}</strong></div></div><div className="rowButtons"><button className="smallAction saveAction" onClick={()=>save(v)}><Save size={15}/> حفظ التعديل</button><button className="smallAction" onClick={cancelEdit}><X size={15}/> إلغاء</button></div></>:<><div className="accountSummary"><div className="accountPerson"><strong>{v.customer_name}</strong><span>{v.service_name}{v.phone?` • ${v.phone}`:''}</span><small>{v.visit_day||''} • {fmt(v.visited_at)}{v.notes?` • ${v.notes}`:''}</small></div><div className="accountMoney"><b>{money(v.total_amount)}</b><span>دفع {money(v.paid_amount)}</span><strong className={Number(v.total_amount)-Number(v.paid_amount)>0?'hasDebt':'paidOff'}>{Number(v.total_amount)-Number(v.paid_amount)>0?`عليه ${money(Number(v.total_amount)-Number(v.paid_amount))}`:'خالص ✓'}</strong></div></div><div className="rowButtons"><button className="smallAction" onClick={()=>startEdit(v)}><Edit3 size={15}/> تعديل</button><button className="smallAction deleteAction" onClick={()=>remove(v)}><Trash2 size={15}/> حذف</button></div></>}</article>)}</div></section>;
}
