(() => {
  let reloadScheduled = false;
  const successWords = [
    'تمت إضافة', 'تم إضافة', 'تم حفظ', 'تم تسجيل', 'تم تعديل', 'تم حذف',
    'تم تحديث', 'تم إرسال', 'تم تأكيد', 'تم إنشاء', 'تمت مزامنة'
  ];
  const shouldReload = (text) => {
    const t = (text || '').trim();
    if (!t) return false;
    return t.includes('✅') && successWords.some(w => t.includes(w));
  };
  const schedule = (text) => {
    if (reloadScheduled || !shouldReload(text)) return;
    reloadScheduled = true;
    setTimeout(() => window.location.reload(), 900);
  };
  const scan = () => document.querySelectorAll('.notice.successNotice, .notice').forEach(el => schedule(el.textContent));
  const observer = new MutationObserver(scan);
  window.addEventListener('DOMContentLoaded', () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
