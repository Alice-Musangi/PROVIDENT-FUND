(() => {
  const search = document.querySelector('#downloadSearch');
  const tabs = [...document.querySelectorAll('.downloads-tabs button')];
  const cards = [...document.querySelectorAll('.download-card')];
  const empty = document.querySelector('#downloadsEmpty');
  let activeCategory = 'all';

  const updateDocuments = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visibleCount = 0;
    cards.forEach((card) => {
      const visible = (activeCategory === 'all' || card.dataset.category === activeCategory) && (!query || card.textContent.toLowerCase().includes(query));
      card.hidden = !visible;
      card.classList.remove('is-entering');
      if (visible) {
        visibleCount += 1;
        requestAnimationFrame(() => card.classList.add('is-entering'));
      }
    });
    if (empty) empty.hidden = visibleCount !== 0;
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    activeCategory = tab.dataset.filter;
    tabs.forEach((button) => {
      const selected = button === tab;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    updateDocuments();
  }));

  const applyHashFilter = () => {
    const category = location.hash.slice(1);
    if (!['forms', 'strategy', 'reports'].includes(category)) return;
    tabs.find((tab) => tab.dataset.filter === category)?.click();
    document.querySelector('#downloads-library')?.scrollIntoView({ block: 'start' });
  };

  search?.addEventListener('input', updateDocuments);
  document.querySelectorAll('[data-download-filter]').forEach((link) => link.addEventListener('click', () => {
    tabs.find((tab) => tab.dataset.filter === link.dataset.downloadFilter)?.click();
    link.closest('details')?.removeAttribute('open');
  }));
  window.addEventListener('hashchange', applyHashFilter);
  applyHashFilter();
})();
