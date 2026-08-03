(() => {
  "use strict";
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const toast = $("#toast");
  let toastTimer;
  const showToast = message => { toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200); };

  const header = $("#siteHeader"), menu = $("#siteNav"), menuToggle = $("#menuToggle"), backTop = $("#backTop");
  const updateChrome = () => { header.classList.toggle("is-scrolled", scrollY > 12); backTop.classList.toggle("is-visible", scrollY > 600); };
  addEventListener("scroll", updateChrome, { passive: true }); updateChrome();
  menuToggle.addEventListener("click", () => { const active = menu.classList.toggle("is-open"); menuToggle.setAttribute("aria-expanded", active); });
  const closeNavigation = () => { menu.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); };
  $$("a", menu).forEach(a => a.addEventListener("click", closeNavigation));
  $$(".nav-dropdown", menu).forEach(dropdown => {
    dropdown.addEventListener("toggle", () => { if (dropdown.open) $$(".nav-dropdown", menu).forEach(item => { if (item !== dropdown) item.removeAttribute("open"); }); });
    dropdown.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) dropdown.open = true; });
    dropdown.addEventListener("mouseleave", () => { if (matchMedia("(hover: hover)").matches) dropdown.removeAttribute("open"); });
    $$("button", dropdown).forEach(button => button.addEventListener("click", closeNavigation));
  });
  $$(".nav-dropdown > summary", menu).forEach(summary => summary.addEventListener("click", () => setTimeout(() => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 0)));
  backTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

  const heroSlides = $$('[data-hero-slide]');
  const heroSlideButtons = $$('[data-hero-slide-button]');
  let activeHeroSlide = 0;
  const setHeroSlide = index => {
    activeHeroSlide = index;
    heroSlides.forEach((slide, position) => slide.classList.toggle("is-active", position === index));
    heroSlideButtons.forEach((button, position) => {
      const selected = position === index;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };
  heroSlideButtons.forEach(button => button.addEventListener("click", () => setHeroSlide(Number(button.dataset.heroSlideButton))));
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && heroSlides.length > 1) {
    setInterval(() => setHeroSlide((activeHeroSlide + 1) % heroSlides.length), 6500);
  }

  const observer = "IntersectionObserver" in window && new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); } }), { threshold: .12, rootMargin: "0px 0px -30px" });
  $$('[data-reveal], [data-reveal-children]').forEach(el => observer ? observer.observe(el) : el.classList.add("is-revealed"));
  const countObserver = "IntersectionObserver" in window && new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; const el = entry.target, end = Number(el.dataset.count), prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "", start = performance.now(); const tick = now => { const p = Math.min((now - start) / 1200, 1), value = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = `${prefix}${value.toLocaleString()}${suffix}`; if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); countObserver.unobserve(el); }), { threshold: .55 });
  $$('[data-count]').forEach(el => countObserver ? countObserver.observe(el) : el.textContent = `${el.dataset.prefix || ""}${el.dataset.count}${el.dataset.suffix || ""}`);

  const dialogs = { searchDialog: $("#searchDialog"), portalDialog: $("#portalDialog") };
  $("#openSearch").addEventListener("click", () => { dialogs.searchDialog.showModal(); setTimeout(() => $("#globalSearch").focus(), 50); });
  $$('[data-close-dialog]').forEach(button => button.addEventListener("click", () => dialogs[button.dataset.closeDialog].close()));
  $$("[data-open-portal]").forEach(button => button.addEventListener("click", () => dialogs.portalDialog.showModal()));
  [dialogs.searchDialog, dialogs.portalDialog].forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }));

  const pages = [
    ["About the Fund", "#about", "Our mission, vision and approach to retirement stewardship."], ["Retirement benefits", "#benefits", "Support for retirement, withdrawal, death, disability and survivor benefits."], ["Member portal", "#members", "Secure access to statements, contribution history, claims and notifications."], ["Downloads centre", "downloads.html", "Member guides, claim forms, reports and Fund policies."], ["News and notices", "#news", "Member education, AGM notices and Fund updates."], ["Frequently asked questions", "#faqs", "Answers about statements, claims, nominations and benefits."], ["Contact support", "#contact", "Reach the Secretariat Office at Strathmore University."]
  ];
  const globalResults = $("#globalResults"), globalSearch = $("#globalSearch");
  const renderGlobal = q => { const value = q.trim().toLowerCase(), matches = pages.filter(item => !value || item.join(" ").toLowerCase().includes(value)); globalResults.innerHTML = matches.length ? matches.map(([title, href, summary]) => `<a class="global-result" href="${href}"><strong>${title}</strong><small>${summary}</small></a>`).join("") : '<p class="empty-state">No matching information. Try a different search term.</p>'; };
  globalSearch.addEventListener("input", e => renderGlobal(e.target.value)); globalResults.addEventListener("click", e => { if (e.target.closest("a")) dialogs.searchDialog.close(); }); renderGlobal("");

  const news = [
    { type:"fund", category:"Fund update", date:"13 March 2026", title:"Strategy 2025-2030 launched", summary:"The Fund launched its five-year plan around investment, communication and engagement, audit risk and compliance, governance, and service excellence.", article:"news-strategy-launch.html", imageClass:"news-card__art--strategy" },
    { type:"education", category:"Member education", date:"6-8 April 2026", title:"#TukoFonnaIRR: personalised retirement guidance", summary:"More than 100 members received one-to-one retirement advisory support, including a guided review of statements, contributions, IRR and AVCs.", article:"news-irr-clinic.html", imageClass:"news-card__art--irr" },
    { type:"notice", category:"AGM update", date:"22 May 2026", title:"Plan to retire in grace, not in grief", summary:"Professor Gilbert Kokwaro challenged members to approach retirement as a lifelong journey shaped by financial education, honest conversations, meaningful relationships and intentional planning.", article:"news-agm-2026.html", imageClass:"news-card__art--agm" },
    { type:"education", category:"Member education", date:"Issue 1, 2026", title:"Understanding projections and long-term planning", summary:"Retirement clinics and member forums help members explore their savings outlook and prepare informed questions." },
    { type:"fund", category:"Fund update", date:"30 July 2026", title:"Fund reaches 1,132 active members", summary:"The Fund reported a value of over KES 3 billion while serving 1,132 active members across the SERT community." },
    { type:"notice", category:"Notice", date:"Issue 1, 2026", title:"Keep your beneficiary nomination current", summary:"Contact the Secretariat for the current approved process and form for updating your nomination details." }
  ];
  let newsFilter = "all", newsPage = 1; const newsGrid = $("#newsGrid"), newsPagination = $("#newsPagination"), perPage = 3;
  const renderNews = () => { const displayed = news.filter(item => newsFilter === "all" || item.type === newsFilter), pageCount = Math.max(1, Math.ceil(displayed.length / perPage)); newsPage = Math.min(newsPage, pageCount); const items = displayed.slice((newsPage - 1) * perPage, newsPage * perPage); newsGrid.innerHTML = items.map(item => { const action = item.article ? `<a class="news-card__link" href="${item.article}">Read more <span aria-hidden="true">→</span></a>` : `<button type="button" data-notice="${item.title}">Read more <span>→</span></button>`; return `<article class="news-card"><div class="news-card__art ${item.imageClass || ""}">${item.category}</div><div class="news-card__body"><p class="news-card__meta">${item.date} · ${item.category}</p><h3>${item.title}</h3><p>${item.summary}</p>${action}</div></article>`; }).join(""); newsPagination.innerHTML = Array.from({ length:pageCount }, (_, i) => `<button type="button" class="${newsPage === i + 1 ? "is-active" : ""}" data-news-page="${i + 1}" aria-label="News page ${i + 1}">${i + 1}</button>`).join(""); };
  $$("[data-news-filter]").forEach(button => button.addEventListener("click", () => { newsFilter = button.dataset.newsFilter; newsPage = 1; $$("[data-news-filter]").forEach(item => item.classList.toggle("is-active", item === button)); renderNews(); })); newsPagination.addEventListener("click", event => { const button = event.target.closest("[data-news-page]"); if (button) { newsPage = Number(button.dataset.newsPage); renderNews(); } }); renderNews();

  const faqs = [
    ["How can I understand my benefit statement?", "Book a member consultation or attend a retirement education clinic. The Secretariat can explain the information shown in your statement and guide you to approved resources."],
    ["How do I make a benefit or withdrawal request?", "Begin with the relevant checklist in the Downloads Centre and contact the Secretariat to confirm eligibility, documentation and the approved submission process."],
    ["How do I update my beneficiary nomination?", "Contact the Secretariat for the current nomination process and approved form. Keeping your nomination information current is an important part of retirement planning."],
    ["Where can I find Fund reports and policies?", "The Downloads Centre includes the Fund’s public strategy material and key guides. Contact the Secretariat if you require an official copy of a governance document."]
  ];
  const faqList = $("#faqList"), faqSearch = $("#faqSearch"); const renderFaqs = () => { const q = faqSearch.value.trim().toLowerCase(), items = faqs.filter(item => !q || item.join(" ").toLowerCase().includes(q)); faqList.innerHTML = items.length ? items.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("") : '<p class="empty-state">No answers match that search.</p>'; }; faqSearch.addEventListener("input", renderFaqs); renderFaqs();

  document.addEventListener("click", event => { const notice = event.target.closest("[data-notice]"); if (notice) showToast(`“${notice.dataset.notice}” is an illustrative preview. Official notices are issued by the Secretariat.`); const portalMessage = event.target.closest("[data-portal-toast]"); if (portalMessage) showToast(portalMessage.dataset.portalToast); });
  $("#contactForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    const data = new FormData(form);
    const subject = `SETSPF enquiry: ${data.get("subject")}`;
    const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`;
    window.location.href = `mailto:trustees@strathmore.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  $("#year").textContent = new Date().getFullYear();
})();
