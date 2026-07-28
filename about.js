(() => {
  "use strict";
  const menu = document.querySelector("#siteNav");
  const menuToggle = document.querySelector("#menuToggle");
  const header = document.querySelector("#siteHeader");
  const closeMenu = () => { menu.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); };

  menuToggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  menu.querySelectorAll(".nav-dropdown").forEach(dropdown => dropdown.addEventListener("toggle", () => {
    if (dropdown.open) menu.querySelectorAll(".nav-dropdown").forEach(item => { if (item !== dropdown) item.removeAttribute("open"); });
  }));
  menu.querySelectorAll(".nav-dropdown").forEach(dropdown => {
    dropdown.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) dropdown.open = true; });
    dropdown.addEventListener("mouseleave", () => { if (matchMedia("(hover: hover)").matches) dropdown.removeAttribute("open"); });
  });
  menu.querySelectorAll(".nav-dropdown > summary").forEach(summary => summary.addEventListener("click", () => setTimeout(() => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 0)));
  addEventListener("scroll", () => header.classList.toggle("is-scrolled", scrollY > 12), { passive: true });

  const values = document.querySelector(".values-detail");
  if (values && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    values.classList.add("values-motion-ready");
    const valuesObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          valuesObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });
    valuesObserver.observe(values);
  }

  const agmFeature = document.querySelector(".news-article-callout:has(.news-video-link)");
  if (agmFeature && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    agmFeature.classList.add("agm-motion-ready");
    const agmObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          agmObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.28 });
    agmObserver.observe(agmFeature);
  }

  const agmGallery = document.querySelector(".agm-gallery");
  if (agmGallery) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      agmGallery.classList.add("agm-gallery-motion-ready");
      const galleryObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          agmGallery.classList.add("is-visible");
          galleryObserver.disconnect();
        }
      }, { threshold: 0.08 });
      galleryObserver.observe(agmGallery);
    }

    const viewer = document.querySelector("[data-gallery-viewer]");
    const viewerImage = viewer.querySelector("[data-gallery-image]");
    const viewerCaption = viewer.querySelector("[data-gallery-caption]");
    agmGallery.querySelectorAll("[data-gallery-src]").forEach(item => item.addEventListener("click", () => {
      viewerImage.src = item.dataset.gallerySrc;
      viewerImage.alt = item.querySelector("img").alt;
      viewerCaption.textContent = item.dataset.galleryCaption;
      viewer.showModal();
    }));
    viewer.querySelector("[data-gallery-close]").addEventListener("click", () => viewer.close());
    viewer.addEventListener("click", event => {
      const bounds = viewer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    });
  }

  document.querySelector("#year").textContent = new Date().getFullYear();
})();
