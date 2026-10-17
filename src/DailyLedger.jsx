import React, { useState } from 'react';
import { Plus, Scissors } from 'lucide-react';
import { isOffline, queueWrite } from './offline.js';

const money = (n) => `${Number(n || 0).toFixed(0)} ₪`;
const autoRefresh = () => setTimeout(() => window.location.reload(), 850);

export function dayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Gaza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export default function DailyLedger({ supabase, services, currentUserId, refresh, setNotice }) {
  const [serviceName, setServiceName] = useState('');
  const [total, setTotal] = useState('');
  const [paid, setPaid] = useState('');
  const [busy, setBusy] = useState(false);
  const remainder = Math.max(0, Number(total || 0) - Number(paid || 0));

  function chooseService(value) {
    setServiceName(value);
    const service = services.find(s => s.name === value);
    if (service) setTotal(String(Number(service.price || 0)));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const notes = String(f.get('notes') || '').trim();
    const totalAmount = Number(total || 0);
    const paidAmount = Number(paid || 0);
    if (!name || !serviceName) { setNotice('أدخل اسم الزبون ونوع الخدمة.'); return; }
    if (paidAmount > totalAmount) { setNotice('المدفوع لا يمكن أن يكون أكبر من الإجمالي.'); return; }

    const payload = { customer_name:name, phone, service_name:serviceName, total_amount:totalAmount, paid_amount:paidAmount, notes, visit_day:dayKey(), visited_at:new Date().toISOString(), created_by:currentUserId };
    if(isOffline()){
      queueWrite({action:'insert',table:'salon_visits',payload});
      if(phone) queueWrite({action:'insert',table:'salon_customers',payload:{name,phone,notes}});
      e.currentTarget.reset();setServiceName('');setTotal('');setPaid('');
      setNotice('✅ تم حفظ الحلاقة بدون إنترنت وستتم مزامنتها تلقائيًا عند عودة الشبكة.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.from('salon_visits').insert(payload);
    if (error) { setBusy(false); setNotice(error.message); return; }
    if (phone) {
      const { data: existing } = await supabase.from('salon_customers').select('id').eq('phone', phone).limit(1);
      if (!existing?.length) await supabase.from('salon_customers').insert({ name, phone, notes });
    }
    e.currentTarget.reset();setServiceName('');setTotal('');setPaid('');
    setNotice('✅ تم حفظ الحلاقة بنجاح — يتم تحديث الصفحة تلقائيًا...');
    autoRefresh();
  }

  return <section className="card quickLedger"><div className="sectionHeading"><div><small>سجل اليوم • {dayKey()}</small><h2>سجّل حلاقة جديدة</h2></div><Scissors/></div><form className="gridForm quickVisitGrid" onSubmit={submit}><input name="name" placeholder="اسم الزبون" required/><select value={serviceName} onChange={e => chooseService(e.target.value)} required><option value="">نوع الخدمة</option>{services.map(s => <option key={s.id} value={s.name}>{s.name} — {money(s.price)}</option>)}</select><input name="phone" inputMode="tel" placeholder="رقم الجوال"/><input value={total} onChange={e => setTotal(e.target.value)} type="number" min="0" step="0.01" placeholder="إجمالي الحساب" required/><input value={paid} onChange={e => setPaid(e.target.value)} type="number" min="0" step="0.01" placeholder="كم دفع؟" required/><div className="remainingBox"><span>المتبقي عليه</span><strong>{money(remainder)}</strong></div><input name="notes" className="wideField" placeholder="ملاحظة اختيارية"/><button className="primary wideField" disabled={busy}><Plus size={18}/> {busy?'جارِ الحفظ...':'حفظ الحلاقة في سجل اليوم'}</button></form></section>;
}
