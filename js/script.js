(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const header = $("#siteHeader");
  const menuButton = $("#menuButton");
  const mainNav = $("#mainNav");
  const searchDialog = $("#searchDialog");
  const siteSearch = $("#siteSearch");
  const searchResults = $("#searchResults");
  const toast = $("#toast");
  const backToTop = $("#backToTop");

  const pages = [
    { title: "About the Fund", href: "#about", summary: "Our purpose, history and values." },
    { title: "Member support", href: "#services", summary: "Practical routes to resources, support and guidance." },
    { title: "Fund snapshot", href: "#snapshot", summary: "Key 2026 newsletter figures and milestones." },
    { title: "Governance", href: "#governance", summary: "Trustee oversight, the secretariat and professional partners." },
    { title: "Resource centre", href: "#resources", summary: "Newsletters, strategy and retirement education." },
    { title: "Fund performance", href: "#dashboard", summary: "Illustrative Fund value, returns and investment allocation." },
    { title: "Benefits and services", href: "#benefits", summary: "Retirement guidance, contributions, claims and common questions." },
    { title: "News and notices", href: "#news", summary: "AGM notices, Fund updates and member education." },
    { title: "Member requests", href: "#forms", summary: "Download forms and prepare a local request." },
    { title: "Book a conversation", href: "#booking", summary: "Choose a time to discuss your Fund question." },
    { title: "Contact", href: "#contact", summary: "Official Secretariat Office contact details." }
  ];

  const resourceMessages = {
    newsletter: "The newsletter covers member education, Fund milestones and the year ahead. Attach the approved PDF here when it is ready.",
    strategy: "The Strategic Plan focuses on investment, member engagement, governance, operations and risk management.",
    clinic: "The #TukoFomNaIRR clinics help members interpret statements, returns and future projections."
  };

  function setMenu(isOpen) {
    mainNav.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
  }

  menuButton.addEventListener("click", () => setMenu(!mainNav.classList.contains("is-open")));
  $$("a", mainNav).forEach(link => link.addEventListener("click", () => setMenu(false)));

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    backToTop.classList.toggle("is-visible", window.scrollY > 600);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  const revealElements = $$('[data-reveal], [data-reveal-children]');

  if ("IntersectionObserver" in window) {
    const sections = $$('main section[id]');
    const navItems = $$("a", mainNav);
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navItems.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-25% 0px -65%" });
    sections.forEach(section => sectionObserver.observe(section));

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: "0px 0px -32px" });
    revealElements.forEach(element => revealObserver.observe(element));

    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const target = Number(element.dataset.count);
        const prefix = element.dataset.prefix || "";
        const suffix = element.dataset.suffix || "";
        const start = performance.now();
        const duration = 1050;

        const update = now => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = `${prefix}${Math.round(target * eased).toLocaleString()}${suffix}`;
          if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        counterObserver.unobserve(element);
      });
    }, { threshold: .45 });
    $$('[data-count]').forEach(element => counterObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add("is-revealed"));
  }

  function renderResults(query = "") {
    const value = query.trim().toLowerCase();
    const results = pages.filter(page => !value || `${page.title} ${page.summary}`.toLowerCase().includes(value));
    searchResults.innerHTML = results.length
      ? results.map(page => `<a href="${page.href}"><strong>${page.title}</strong><small>${page.summary}</small></a>`).join("")
      : "<p>No results found.</p>";
  }

  function openSearch() {
    searchDialog.showModal();
    siteSearch.value = "";
    renderResults();
    setTimeout(() => siteSearch.focus(), 50);
  }
  $("#searchButton").addEventListener("click", openSearch);
  $("#closeSearch").addEventListener("click", () => searchDialog.close());
  siteSearch.addEventListener("input", event => renderResults(event.target.value));
  searchResults.addEventListener("click", event => {
    if (event.target.closest("a")) searchDialog.close();
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!searchDialog.open) openSearch();
    }
  });

  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4400);
  }

  $$('[data-resource]').forEach(button => button.addEventListener("click", () => showToast(resourceMessages[button.dataset.resource])));

  const chartRanges = {
    "1Y": { value: "KES 3.0B", change: "+12.4% this year", points: "0,165 70,143 140,151 210,110 280,121 350,83 420,96 490,42 560,25", area: "M0 165 L70 143 L140 151 L210 110 L280 121 L350 83 L420 96 L490 42 L560 25 L560 205 L0 205 Z" },
    "3Y": { value: "KES 2.4B", change: "+38.7% over three years", points: "0,173 70,160 140,132 210,143 280,103 350,111 420,71 490,54 560,25", area: "M0 173 L70 160 L140 132 L210 143 L280 103 L350 111 L420 71 L490 54 L560 25 L560 205 L0 205 Z" },
    "5Y": { value: "KES 1.8B", change: "+66.2% over five years", points: "0,180 70,171 140,151 210,127 280,140 350,96 420,80 490,51 560,25", area: "M0 180 L70 171 L140 151 L210 127 L280 140 L350 96 L420 80 L490 51 L560 25 L560 205 L0 205 Z" }
  };
  const chartLine = $("#chartLine");
  const chartArea = $("#chartArea");
  const chartValue = $("#chartValue");
  const chartChange = $("#chartChange");
  $$('[data-chart-range]').forEach(button => button.addEventListener("click", () => {
    const range = chartRanges[button.dataset.chartRange];
    $$('[data-chart-range]').forEach(item => item.classList.toggle("is-selected", item === button));
    chartLine.setAttribute("points", range.points);
    chartArea.setAttribute("d", range.area);
    chartValue.textContent = range.value;
    chartChange.textContent = range.change;
  }));

  const newsItems = [
    { category: "notice", label: "AGM notice", date: "14 May 2026", title: "Annual General Meeting: save the date", summary: "Official participation guidance and documents will be shared through approved channels." },
    { category: "education", label: "Member education", date: "02 May 2026", title: "A clearer way to read your statement", summary: "Five useful prompts for your next retirement education conversation." },
    { category: "fund", label: "Fund update", date: "21 April 2026", title: "Building confidence through member communication", summary: "An update on the Fund's member-engagement priorities for the year ahead." },
    { category: "education", label: "Member education", date: "08 April 2026", title: "Understanding IRR and long-term projections", summary: "Join the discussion at the next #TukoFomNaIRR learning clinic." },
    { category: "fund", label: "Fund update", date: "27 March 2026", title: "Strategic plan progress update", summary: "A practical summary of key investment, governance and service milestones." },
    { category: "notice", label: "AGM notice", date: "12 March 2026", title: "Member notice: annual report availability", summary: "The latest approved report is available from the Secretariat on request." }
  ];
  const newsGrid = $("#newsGrid");
  const newsPagination = $("#newsPagination");
  const newsSearch = $("#newsSearch");
  let activeNewsFilter = "all";
  let activeNewsPage = 1;
  const newsPerPage = 3;

  function renderNews() {
    const query = newsSearch.value.trim().toLowerCase();
    const filteredItems = newsItems.filter(item => (activeNewsFilter === "all" || item.category === activeNewsFilter) && `${item.title} ${item.summary} ${item.label}`.toLowerCase().includes(query));
    const pageCount = Math.max(1, Math.ceil(filteredItems.length / newsPerPage));
    activeNewsPage = Math.min(activeNewsPage, pageCount);
    const visibleItems = filteredItems.slice((activeNewsPage - 1) * newsPerPage, activeNewsPage * newsPerPage);
    newsGrid.innerHTML = visibleItems.length ? visibleItems.map(item => `<article class="news-card"><div class="news-card__art">${item.label}</div><div class="news-card__content"><p class="news-card__meta">${item.date} · ${item.label}</p><h3>${item.title}</h3><p>${item.summary}</p><button type="button" data-news-title="${item.title}">Read more <span aria-hidden="true">→</span></button></div></article>`).join("") : "<p class=\"news-empty\">No news items match that search. Try another word or category.</p>";
    newsPagination.innerHTML = Array.from({ length: pageCount }, (_, index) => `<button type="button" class="${activeNewsPage === index + 1 ? "is-selected" : ""}" data-news-page="${index + 1}" aria-label="News page ${index + 1}">${index + 1}</button>`).join("");
  }

  $$('[data-news-filter]').forEach(button => button.addEventListener("click", () => {
    activeNewsFilter = button.dataset.newsFilter;
    activeNewsPage = 1;
    $$('[data-news-filter]').forEach(item => item.classList.toggle("is-selected", item === button));
    renderNews();
  }));
  newsSearch.addEventListener("input", () => { activeNewsPage = 1; renderNews(); });
  newsPagination.addEventListener("click", event => {
    const page = event.target.closest("[data-news-page]");
    if (!page) return;
    activeNewsPage = Number(page.dataset.newsPage);
    renderNews();
  });
  newsGrid.addEventListener("click", event => {
    const article = event.target.closest("[data-news-title]");
    if (article) showToast(`“${article.dataset.newsTitle}” is an illustrative preview. Official updates are issued by the Secretariat.`);
  });
  renderNews();

  $$('[data-profile]').forEach(button => button.addEventListener("click", () => showToast("This is a placeholder profile. Approved trustee biographies will be published here.")));
  $$('[data-news-title]').forEach(button => button.addEventListener("click", () => showToast(`“${button.dataset.newsTitle}” is an illustrative preview. Official updates are issued by the Secretariat.`)));

  const requestForm = $("#requestForm");
  const supportingFile = $("#supportingFile");
  const dropZone = $("#dropZone");
  const uploadStatus = $("#uploadStatus");
  const uploadFileName = $("#uploadFileName");
  const uploadProgress = $("#uploadProgress");
  const uploadMessage = $("#uploadMessage");
  const requestFeedback = $("#requestFeedback");
  const acceptedFileTypes = ["application/pdf", "image/png", "image/jpeg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  function clearFile() {
    supportingFile.value = "";
    uploadStatus.hidden = true;
    uploadProgress.style.width = "0";
    requestFeedback.textContent = "";
  }

  function selectFile(file) {
    if (!file) return;
    if (!acceptedFileTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      clearFile();
      requestFeedback.textContent = "Choose a PDF, JPG, PNG, DOC or DOCX file no larger than 5 MB.";
      return;
    }
    uploadStatus.hidden = false;
    uploadFileName.textContent = file.name;
    uploadMessage.textContent = "Validated locally — no upload has taken place.";
    requestFeedback.textContent = "";
    requestAnimationFrame(() => { uploadProgress.style.width = "100%"; });
  }

  $("#chooseFile").addEventListener("click", () => supportingFile.click());
  supportingFile.addEventListener("change", () => selectFile(supportingFile.files[0]));
  $("#removeFile").addEventListener("click", clearFile);
  ["dragenter", "dragover"].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
  dropZone.addEventListener("drop", event => selectFile(event.dataTransfer.files[0]));
  requestForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!requestForm.checkValidity()) { requestForm.reportValidity(); return; }
    showToast("Request preview prepared locally. Contact the Secretariat for the approved submission process.");
    requestForm.reset();
    clearFile();
    requestFeedback.textContent = "Your local request preview is ready. No details or files have been sent or stored.";
  });

  const bookingForm = $("#bookingForm");
  const bookingDate = $("#bookingDate");
  const bookingTime = $("#bookingTime");
  const confirmationDialog = $("#confirmationDialog");
  const confirmationMessage = $("#confirmationMessage");
  bookingDate.min = new Date().toISOString().slice(0, 10);
  $$('[data-time]').forEach(button => button.addEventListener("click", () => {
    $$('[data-time]').forEach(item => item.classList.toggle("is-selected", item === button));
    bookingTime.value = button.dataset.time;
  }));
  function closeConfirmation() { confirmationDialog.close(); }
  $("#closeConfirmation").addEventListener("click", closeConfirmation);
  $("#confirmationDone").addEventListener("click", closeConfirmation);
  bookingForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!bookingForm.checkValidity()) { bookingForm.reportValidity(); return; }
    const formData = new FormData(bookingForm);
    confirmationMessage.textContent = `${formData.get("bookingService")} is selected for ${formData.get("bookingDate")} at ${formData.get("bookingTime")}. This is a local preview: no appointment or personal information has been sent.`;
    if (typeof confirmationDialog.showModal === "function") confirmationDialog.showModal();
    else showToast("Appointment preview ready locally. No appointment has been sent.");
    bookingForm.reset();
    $$('[data-time]').forEach(button => button.classList.remove("is-selected"));
  });

  const chatPanel = $("#chatPanel");
  const chatToggle = $("#chatToggle");
  const chatMessages = $("#chatMessages");
  const chatInput = $("#chatInput");
  const chatAnswers = [
    { terms: ["form", "document", "upload"], answer: "You can download an illustrative form or prepare a local request in the Member requests section. For approved documents, please contact the Secretariat." },
    { terms: ["book", "appointment", "meeting"], answer: "Use Book a conversation to choose a preferred service, date and time. This site currently creates a local preview only." },
    { terms: ["agm", "annual general"], answer: "The News & notices section contains the AGM save-the-date preview. Official notices are issued through approved Fund communication channels." },
    { terms: ["retire", "benefit", "withdraw"], answer: "The Benefits & services section gives a starting point. The Secretariat can explain the approved process for your specific circumstances." },
    { terms: ["contact", "email", "phone"], answer: "You can reach the Secretariat at trustees@strathmore.edu or +254 703 034 000." }
  ];
  function addChatMessage(message, type) {
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message chat-message--${type}`;
    messageElement.textContent = message;
    chatMessages.append(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function answerChat(question) {
    const cleanedQuestion = question.trim();
    if (!cleanedQuestion) return;
    addChatMessage(cleanedQuestion, "user");
    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    chatMessages.append(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const match = chatAnswers.find(item => item.terms.some(term => cleanedQuestion.toLowerCase().includes(term)));
    setTimeout(() => {
      typing.remove();
      addChatMessage(match ? match.answer : "I can help you find information about benefits, forms, appointments, AGM notices or the Secretariat's contacts.", "assistant");
    }, 550);
  }
  chatToggle.addEventListener("click", () => {
    const isOpening = chatPanel.hidden;
    chatPanel.hidden = !isOpening;
    chatToggle.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) chatInput.focus();
  });
  $("#minimiseChat").addEventListener("click", () => chatToggle.click());
  $("#chatForm").addEventListener("submit", event => { event.preventDefault(); answerChat(chatInput.value); chatInput.value = ""; });
  $$('[data-chat-question]').forEach(button => button.addEventListener("click", () => answerChat(button.dataset.chatQuestion)));
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  $("#contactForm").addEventListener("submit", event => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Thank you. Your enquiry has been recorded for this demonstration.");
  });

  $("#currentYear").textContent = new Date().getFullYear();
})();
