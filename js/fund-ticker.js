(() => {
  "use strict";
  const header = document.querySelector("#siteHeader");
  if (!header) return;

  const page = location.pathname.split("/").pop() || "index.html";
  const section = page === "index.html" ? "home"
    : ["about.html", "trustees.html", "service-providers.html", "strategy-2025-2030.html"].includes(page) ? "fund"
    : page.startsWith("news-") ? "news"
    : ["downloads.html", "policies-and-forms.html"].includes(page) ? "resources"
    : page === "faqs.html" ? "help" : "";
  const current = name => section === name ? ' class="is-current" aria-current="page"' : "";
  const dropdownCurrent = name => section === name ? " is-current" : "";

  header.innerHTML = `
    <div class="shell unified-nav">
      <a class="unified-brand" href="index.html" aria-label="SETSPF home"><img src="assets/images/fund-logo-source.png" alt="Strathmore Educational Trust Staff Provident Fund"></a>
      <nav class="unified-navigation" id="unifiedNavigation" aria-label="Primary navigation">
        <a href="index.html"${current("home")}>Home</a>
        <details class="unified-dropdown${dropdownCurrent("fund")}"><summary>Explore the Fund <span aria-hidden="true">⌄</span></summary><div class="unified-dropdown__menu"><a href="about.html">Who we are</a><a href="strategy-2025-2030.html">Strategy 2025–2030</a><a href="trustees.html">Board of Trustees</a><a href="service-providers.html">Service providers</a></div></details>
        <a href="index.html#news"${current("news")}>News</a>
        <details class="unified-dropdown${dropdownCurrent("resources")}"><summary>Resources <span aria-hidden="true">⌄</span></summary><div class="unified-dropdown__menu"><a href="downloads.html">Downloads centre</a><a href="downloads.html#forms">Forms</a><a href="downloads.html#reports">Reports &amp; guides</a><a href="policies-and-forms.html">Policies</a></div></details>
        <a href="faqs.html"${current("help")}>Help &amp; FAQs</a>
        <a class="unified-navigation__contact" href="index.html#contact">Contact</a>
      </nav>
      <div class="unified-actions"><a class="unified-staff-login" href="admin/" aria-label="Trustee login"><span aria-hidden="true">◇</span><b>Trustee login</b></a><a class="unified-portal" href="https://selfservice.zamaragroup.com/" target="_blank" rel="noopener noreferrer">Member portal <span aria-hidden="true">↗</span></a><button class="unified-menu-button" id="unifiedMenuButton" type="button" aria-label="Open menu" aria-controls="unifiedNavigation" aria-expanded="false"><i></i><i></i><i></i></button></div>
    </div>`;

  const navigation = document.querySelector("#unifiedNavigation");
  const menuButton = document.querySelector("#unifiedMenuButton");
  const dropdowns = [...navigation.querySelectorAll("details")];
  navigation.querySelectorAll("a[href]").forEach(link => {
    const destination = link.getAttribute("href").split("#")[0];
    if (destination && destination === page && page !== "index.html") {
      link.classList.add("is-current-subpage");
      link.setAttribute("aria-current", "page");
    }
  });
  const prefetchedPages = new Set();
  const prefetchPage = link => {
    const destination = link.getAttribute("href").split("#")[0];
    if (!destination || destination === page || destination.startsWith("http") || prefetchedPages.has(destination)) return;

    prefetchedPages.add(destination);
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = destination;
    document.head.appendChild(prefetch);
  };
  const prefetchDropdown = dropdown => {
    dropdown.querySelectorAll("a[href]").forEach(prefetchPage);
  };
  navigation.querySelectorAll("a[href]").forEach(link => {
    link.addEventListener("pointerenter", () => prefetchPage(link), { once: true });
    link.addEventListener("touchstart", () => prefetchPage(link), { once: true, passive: true });
  });
  const closeMenu = () => {
    navigation.classList.remove("is-open");
    menuButton.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
    dropdowns.forEach(dropdown => dropdown.removeAttribute("open"));
  };
  menuButton.addEventListener("click", () => {
    const open = !navigation.classList.contains("is-open");
    navigation.classList.toggle("is-open", open);
    menuButton.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  navigation.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
  dropdowns.forEach(dropdown => dropdown.addEventListener("toggle", () => {
    if (dropdown.open) {
      prefetchDropdown(dropdown);
      dropdowns.filter(item => item !== dropdown).forEach(item => item.removeAttribute("open"));
    }
  }));
  document.addEventListener("click", event => { if (!event.target.closest(".unified-dropdown")) dropdowns.forEach(item => item.removeAttribute("open")); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); }, { passive: true });

  if (page === "index.html" && "IntersectionObserver" in window) {
    const trackedLinks = [...navigation.querySelectorAll('a[href^="index.html#"]')];
    const trackedSections = trackedLinks.map(link => ({
      link,
      section: document.getElementById(link.hash.slice(1))
    })).filter(item => item.section);
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navigation.querySelectorAll("a.is-current").forEach(link => link.classList.remove("is-current"));
        trackedSections.find(item => item.section === entry.target)?.link.classList.add("is-current");
      });
    }, { rootMargin: "-30% 0px -60%" });
    trackedSections.forEach(item => sectionObserver.observe(item.section));
  }

  const items = ["17.24% return rate in 2025", "1,132 Active members as at 30 July 2026", "KES 3B+ Fund value", "36 Years of service"];
  if (!document.querySelector(".fund-ticker")) {
    const group = hidden => `<div class="fund-ticker__set"${hidden ? ' aria-hidden="true"' : ''}><span class="fund-ticker__label">Fund snapshot</span>${items.map(item => `<span class="fund-ticker__item"><i aria-hidden="true"></i>${item}</span>`).join("")}</div>`;
    header.insertAdjacentHTML("afterend", `<section class="fund-ticker" aria-label="Fund performance highlights"><div class="fund-ticker__track">${group(false)}${group(true)}</div></section>`);
  }
})();
