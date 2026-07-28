(() => {
  "use strict";

  const header = document.querySelector("#siteHeader");
  const menuButton = document.querySelector("#menuButton");
  const mainNav = document.querySelector("#mainNav");
  const year = document.querySelector("#currentYear");

  if (header) {
    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
  }

  if (menuButton && mainNav) {
    menuButton.addEventListener("click", () => {
      const isOpen = !mainNav.classList.contains("is-open");
      mainNav.classList.toggle("is-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));
  if (window.matchMedia("(hover: hover)").matches) dropdowns.forEach((dropdown) => dropdown.removeAttribute("open"));
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) dropdown.open = true;
    });
    dropdown.addEventListener("mouseleave", () => {
      if (window.matchMedia("(hover: hover)").matches) dropdown.removeAttribute("open");
    });
  });

  const revealElements = Array.from(document.querySelectorAll("[data-page-reveal]"));

  if (revealElements.length && "IntersectionObserver" in window) {
    document.documentElement.classList.add("has-page-motion");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px" }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  if (year) year.textContent = new Date().getFullYear();
})();
