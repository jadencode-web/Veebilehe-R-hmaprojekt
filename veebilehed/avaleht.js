/* Avalehe kokkuvõte. Loeb sama salvestatud nädalaplaani, mida kasutab app.js.
   Ei muuda nädalaplaani andmeid ega nõua nädalaplaani HTML-elemente. */
(() => {
  const element = document.getElementById('avalehe-valitud');
  const progress = document.getElementById('avalehe-progress');
  const progressLine = document.getElementById('avalehe-progress-joon');
  const weekLabel = document.getElementById('avalehe-nadal');
  if (!element || !progress || !progressLine || !weekLabel) return;

  try {
    const saved = JSON.parse(localStorage.getItem('toiduplaneerija-nadalaplaan-v1') || '{}');
    if (!saved || !saved.week || !/^\d{4}-\d{2}-\d{2}$/.test(saved.week)) return;
    const [year, month, day] = saved.week.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    if (Number.isNaN(start.getTime())) return;
    const plans = saved.plans && typeof saved.plans === 'object' ? saved.plans : {};
    const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const dayKey = dateKey(current);
      for (const meal of ['hommik', 'lõuna', 'õhtu']) {
        if (typeof plans[`${dayKey}|${meal}`] === 'string' && plans[`${dayKey}|${meal}`]) count++;
      }
    }
    element.textContent = `${count} / 21`;
    progress.setAttribute('aria-valuenow', String(count));
    progressLine.style.width = `${count / 21 * 100}%`;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const monthLabel = end.toLocaleDateString('et-EE', {month: 'long'});
    weekLabel.textContent = `${start.getDate()}.–${end.getDate()}. ${monthLabel} · salvestatud nädal`;
  } catch (error) {
    /* Kui brauser piirab localStorage'it, kuvatakse neutraalne 0/21 vaade. */
  }
})();
