(() => {
  "use strict";
  document.querySelectorAll(".navigation > .nav-dropdown").forEach(item => {
    const label = item.querySelector(":scope > summary")?.textContent.trim();
    if (label?.startsWith("Benefits")) item.remove();
  });
  let chat = document.querySelector("[data-help-chat]");
  if (!chat) {
    document.body.insertAdjacentHTML("beforeend", `<section class="help-chat" data-help-chat aria-label="SETSPF virtual assistant"><button class="help-chat__launcher" type="button" data-chat-toggle aria-expanded="false" aria-controls="setspfChatPanel"><span class="help-chat__launcher-icon" aria-hidden="true">?</span>Chat with us</button><div class="help-chat__panel" id="setspfChatPanel" data-chat-panel hidden><div class="help-chat__head"><div><span class="help-chat__eyebrow">SETSPF help</span><strong>Ask about your Fund</strong></div><button class="help-chat__close" type="button" data-chat-close aria-label="Close chat">×</button></div><div class="help-chat__messages" data-chat-messages aria-live="polite"><p class="help-chat__message">Hello. I answer from the SETSPF Trust Deed and Rules, Fund member presentations and official RBA guidance only. What would you like to understand?</p></div><div class="help-chat__suggestions"><button type="button" data-chat-prompt="How do contributions and AVCs work?">Contributions &amp; AVCs</button><button type="button" data-chat-prompt="What happens when I leave employment?">Leaving employment</button><button type="button" data-chat-prompt="What are my rights as a member?">My member rights</button></div><form class="help-chat__form" data-chat-form><label class="visually-hidden" for="setspfChatInput">Ask a question</label><input id="setspfChatInput" data-chat-input type="text" autocomplete="off" maxlength="280" placeholder="Ask about your provident fund"><button type="submit">Send</button></form><p class="help-chat__notice">Source-based general guidance only. Do not share personal, account, medical or password information.</p></div></section>`);
    chat = document.querySelector("[data-help-chat]");
  }

  const panel = chat.querySelector("[data-chat-panel]");
  const toggle = chat.querySelector("[data-chat-toggle]");
  const close = chat.querySelector("[data-chat-close]");
  const form = chat.querySelector("[data-chat-form]");
  const input = chat.querySelector("[data-chat-input]");
  const messages = chat.querySelector("[data-chat-messages]");

  const setOpen = open => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) window.setTimeout(() => input.focus(), 0);
  };

  const addMessage = (text, type) => {
    const message = document.createElement("p");
    message.className = `help-chat__message${type === "user" ? " help-chat__message--user" : ""}`;
    message.textContent = text;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  };

  const sourced = (answer, source) => `${answer}\n\nSource: ${source}`;
  const outsideApprovedSources = "I could not find a reliable answer to that in the approved sources. Please email mmuchugu@strathmore.edu for guidance based on your records. Do not share personal information in this chat.";

  const replyFor = question => {
    const text = question.toLowerCase();
    if (/contribution|employee|employer|salary|nssf/.test(text) && !/avc|additional voluntary/.test(text)) {
      return sourced("The member contributes 10% of basic salary and the employer contributes 10% of basic salary. Both figures include NSSF Tier II contributions. Contributions are credited to the member’s account and vest immediately.", "SETSPF Trust Deed and Rules (2021), Rules 6 and 9; Members Presentation 2026, slide 6.");
    }
    if (/avc|additional voluntary|extra contribution|tax relief/.test(text)) {
      return sourced("You may add Additional Voluntary Contributions to strengthen your retirement savings. AVCs are recorded separately and vest immediately. Under the Trust Deed and Rules, the amount and payment interval are agreed with the Trustees; a member may reduce or stop AVCs by giving one month’s written notice. Current RBA guidance states that tax-free contributions to a registered scheme are limited to KES 30,000 per month (KES 360,000 per year), subject to applicable tax law.", "SETSPF Trust Deed and Rules (2021), Rule 6(b); Members Presentation 2026, slide 6; RBA Saving and Membership guidance.");
    }
    if (/grow|growth|interest|investment return|compound|performance|fund value/.test(text)) {
      return sourced("Your retirement savings grow through member contributions, employer contributions and investment returns. Interest on each member’s accumulated credit is calculated at a rate and frequency determined by the Trustees. For the year ended 31 December 2025, the Fund presentation reported a value of KES 2.98 billion and a net investment return of KES 473 million; past performance does not guarantee future returns.", "SETSPF Trust Deed and Rules (2021), Rule 8; Annual General Meeting 2026 presentation, slides 5–6.");
    }
    if (/leave|leaving|resign|withdraw|switch job|change job|cessation|defer|transfer/.test(text)) {
      return sourced("When employment ends before retirement, RBA guidance provides for partial payment, transfer or deferment, while the SETSPF Trust Deed and Rules sets out the Scheme-specific treatment of the member and sponsor portions. The exact amount depends on the circumstances of leaving service and current law, so do not assume a withdrawal percentage without confirmation from the Fund. Ill-health and permanent emigration have separate provisions.", "SETSPF Trust Deed and Rules (2021), Rules 9 and 11; Members Presentation 2026, slide 12; RBA Members’ Rights and Saving and Membership guidance.");
    }
    if (/retire|retirement|ill health|ill-health|emigration/.test(text)) {
      return sourced("The Fund presentation identifies benefits for retirement, ill-health retirement and qualifying emigration. The Trust Deed and Rules also provides for normal, early, late and ill-health retirement, subject to its conditions and applicable law. Your individual eligibility and payment options should be confirmed by the Fund.", "SETSPF Trust Deed and Rules (2021), Rule 9; Members Presentation 2026, slide 12.");
    }
    if (/death|beneficiar|nomination|dependant|dependent|estate|surviv/.test(text)) {
      return sourced("Keep your beneficiary nomination and dependant declarations current. The Fund presentation states that provident fund benefits do not form part of a deceased member’s estate. Under the Trust Deed and Rules, the Trustees consider the member’s nominations and supporting evidence when distributing death benefits, but retain the discretion required by the Rules and law. Do not enter beneficiary details in this chat.", "SETSPF Trust Deed and Rules (2021), Rule 10; Annual General Meeting 2026 presentation, slide 8; Members Presentation 2026, slide 19.");
    }
    if (/right|responsibil|agm|document|complaint|statement/.test(text)) {
      return sourced("RBA says members have rights to fair treatment, annual benefit statements, relevant Scheme documents, AGM information, immediate vesting, and benefit transfer or deferment options when exiting. Members should review statements, keep beneficiary nominations current, attend member meetings and report anomalies. Scheme-specific rights remain subject to the Trust Deed and Rules and applicable law.", "RBA Members’ Rights and Saving and Membership guidance; SETSPF Trust Deed and Rules (2021), Rule 5.");
    }
    if (/irr|income replacement|projection/.test(text)) {
      return sourced("The Income Replacement Ratio compares expected retirement income with income before retirement and helps show whether projected savings may support your desired lifestyle. The Fund’s presentations use a planning target of about 70–80%, with 75% as the Scheme benchmark. Possible ways to improve the projection include AVCs, preserving benefits and, where suitable, retiring later. A projection is not a guaranteed benefit.", "SETSPF member education presentation, slides 7 and 19; Annual General Meeting 2026 presentation, slide 8; RBA Saving and Membership guidance.");
    }
    if (/portal|zamara|login|sign in|sms|23763/.test(text)) {
      return sourced("Member benefit statements can be accessed through selfservice.zamaragroup.com, the Zamara app or Safaricom SMS short code 23763. Never share your password, member number or account details in this chat.", "Annual General Meeting 2026 presentation, slide 8.");
    }
    if (/claim|form|submit|contact|email|help|support/.test(text)) {
      return sourced("For a form, claim or question that depends on your records, email mmuchugu@strathmore.edu. Send completed Fund forms through the approved process, but do not post personal, medical or account information in this chat.", "Annual General Meeting 2026 presentation, slide 8.");
    }
    if (/what is (a )?provident|provident fund|defined contribution|how.*fund work/.test(text)) {
      return sourced("A provident fund is a retirement arrangement that ordinarily pays benefits as a lump sum at retirement. SETSPF operates on a defined-contribution basis: the member’s benefit is built from contributions made by or for the member plus investment returns, subject to the Scheme rules.", "RBA Registration of Retirement Benefits Schemes FAQ; SETSPF Trust Deed and Rules (2021).");
    }
    return outsideApprovedSources;
  };

  const ask = question => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    addMessage(cleanQuestion, "user");
    input.value = "";
    window.setTimeout(() => addMessage(replyFor(cleanQuestion), "assistant"), 180);
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) setOpen(false); });
  form.addEventListener("submit", event => { event.preventDefault(); ask(input.value); });
  chat.querySelectorAll("[data-chat-prompt]").forEach(button => button.addEventListener("click", () => ask(button.dataset.chatPrompt)));
})();
