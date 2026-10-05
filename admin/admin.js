(() => {
  let csrf = "", user = null, items = [];
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const api = async (path, options={}) => {
    options.headers={"Content-Type":"application/json",...(csrf?{"X-CSRF-Token":csrf}:{}),...(options.headers||{})};
    const response=await fetch(path,options); const data=await response.json();
    if(!response.ok) throw new Error(data.error||"Something went wrong"); return data;
  };
  const showView = name => {
    ["content","editor","audit"].forEach(view => $(`#${view}View`).hidden=view!==name);
    document.querySelectorAll("[data-view]").forEach(button=>button.classList.toggle("is-active",button.dataset.view===name));
    $("#viewTitle").textContent={content:"Content",editor:"Create new",audit:"Activity log"}[name];
    if(name==="audit") loadAudit();
  };
  const render = () => {
    const query=$("#contentSearch").value.toLowerCase(), type=$("#contentFilter").value;
    const visible=items.filter(item=>(type==="all"||item.type===type)&&(!query||`${item.title} ${item.summary}`.toLowerCase().includes(query)));
    $("#contentList").innerHTML=visible.length?visible.map(item=>`<article class="content-row"><div><h3>${escapeHtml(item.title)}</h3><small>${escapeHtml(item.type)} · ${escapeHtml(item.author_name)}</small></div><span class="badge">${escapeHtml(item.status)}</span><small>${new Date(item.updated_at*1000).toLocaleDateString()}</small><div class="row-actions">${user.role==="trustee"&&item.status==="review"?`<button data-status="approved" data-id="${item.id}">Approve</button>`:""}${user.role==="admin"&&item.status!=="published"?`<button data-status="published" data-id="${item.id}">Publish</button>`:""}</div></article>`).join(""):'<p class="empty">No content matches this view.</p>';
  };
  const loadContent=async()=>{items=(await api("/api/content")).items;render()};
  const enter = async () => {
    const data=await api("/api/auth/me"); user=data.user;csrf=data.csrf;
    $("#loginView").hidden=true;$("#workspace").hidden=false;$("#accountName").textContent=user.name;$("#accountRole").textContent=user.role;
    document.querySelectorAll("[data-admin-only]").forEach(el=>el.hidden=user.role!=="admin");
    if(user.role==="trustee") $("#statusField").hidden=true;
    await loadContent();
  };
  $("#loginForm").addEventListener("submit",async event=>{event.preventDefault();$("#loginMessage").textContent="";try{await api("/api/auth/login",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await enter()}catch(error){$("#loginMessage").textContent=error.message}});
  document.addEventListener("click",async event=>{
    const view=event.target.closest("[data-view]")?.dataset.view;if(view){showView(view);return}
    if(event.target.closest("[data-open-editor]")){showView("editor");return}
    const statusButton=event.target.closest("[data-status]");if(statusButton){try{await api(`/api/content/${statusButton.dataset.id}/status`,{method:"POST",body:JSON.stringify({status:statusButton.dataset.status})});await loadContent()}catch(error){alert(error.message)}}
  });
  $("#editorForm").addEventListener("submit",async event=>{event.preventDefault();const payload=Object.fromEntries(new FormData(event.currentTarget));try{await api("/api/content",{method:"POST",body:JSON.stringify(payload)});event.currentTarget.reset();await loadContent();showView("content")}catch(error){$("#editorMessage").textContent=error.message}});
  $("#logoutButton").addEventListener("click",async()=>{await api("/api/auth/logout",{method:"POST",body:"{}"});location.reload()});
  $("#contentSearch").addEventListener("input",render);$("#contentFilter").addEventListener("change",render);
  async function loadAudit(){const data=await api("/api/audit");$("#auditList").innerHTML=data.items.length?data.items.map(item=>`<article class="content-row"><div><h3>${escapeHtml(item.action.replaceAll("_"," "))}</h3><small>${escapeHtml(item.actor_name||"System")} · ${escapeHtml(item.entity_type)} ${item.entity_id||""}</small></div><small>${new Date(item.created_at*1000).toLocaleString()}</small><span></span><span class="audit-detail">${escapeHtml(item.detail)}</span></article>`).join(""):'<p class="empty">No activity recorded yet.</p>'}
  enter().catch(error => {
    $("#loginMessage").textContent = error.message || "Unable to load the content manager.";
  });
})();
