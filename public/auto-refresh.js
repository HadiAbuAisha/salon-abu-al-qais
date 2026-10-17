(() => {
  let reloadScheduled = false;
  const MUTATION_TABLES = ['salon_services','salon_visits','salon_customers','salon_appointments','app_profiles'];

  const scheduleReload = (delay = 700) => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    setTimeout(() => window.location.reload(), delay);
  };

  const isTrackedMutation = (input, init = {}) => {
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['POST','PATCH','PUT','DELETE'].includes(method)) return false;
    const url = String(input instanceof Request ? input.url : input || '');
    return MUTATION_TABLES.some(t => url.includes(`/rest/v1/${t}`));
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const tracked = isTrackedMutation(args[0], args[1] || {});
    const response = await originalFetch(...args);
    if (tracked && response.ok && navigator.onLine !== false) scheduleReload(700);
    return response;
  };

  const successWords = [
    'تمت إضافة', 'تم إضافة', 'تم حفظ', 'تم تسجيل', 'تم تعديل', 'تم حذف',
    'تم تحديث', 'تم إرسال', 'تم تأكيد', 'تم إنشاء', 'تمت مزامنة'
  ];
  const shouldReload = (text) => {
    const t = (text || '').trim();
    return !!t && t.includes('✅') && successWords.some(w => t.includes(w));
  };
  const scan = () => {
    document.querySelectorAll('.notice.successNotice, .notice').forEach(el => {
      if (shouldReload(el.textContent)) scheduleReload(850);
    });
  };

  const observer = new MutationObserver(scan);
  window.addEventListener('DOMContentLoaded', () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
