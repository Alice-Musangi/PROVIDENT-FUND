# SETSPF Website and CMS Security Audit

**Assessment date:** 5 September 2026  
**Assessment type:** Source-code, configuration, content, privacy, and internal-control review  
**Overall conclusion:** **Critical risk / not approved for internet production use**

## Executive conclusion

The public-only HTML site has a relatively small technical attack surface, and the CMS contains several sound building blocks. The combined site and backend, however, must not be exposed to the internet in its current form.

The most serious defect is that the CMS inherits from Python's `SimpleHTTPRequestHandler` and maps the entire repository directory to public URLs. The runtime database is stored under that same directory. An anonymous client can therefore request the SQLite database, Git internals, source code, ignored local files, and potentially environment or editor artifacts. A safe isolated test returned HTTP 200 for both `/data/cms.sqlite3` and `/.git/config`. The working directory also contains ignored Edge debug profiles with History, Cookies, Login Data, Local State, and Web Data databases; these would fall inside the same web root.

The second major concern is the handling of member information outside the CMS. The Downloads Centre tells members to email completed forms. Those forms request ID/passport numbers, KRA PINs, bank-account details, health documentation, dates of birth, family/beneficiary details, signatures, and copies of identity documents. Ordinary email is not an appropriate default intake channel for this combination of sensitive identity, financial, family, and health data.

The repository's own setup documentation correctly says that MFA/SSO, rate limiting, encrypted storage, backups, restricted staff access, and production security testing are still required. Those are release prerequisites, not optional later enhancements.

### Risk by deployment scenario

| Scenario | Assessment |
|---|---|
| Current Python CMS exposed through a public reverse proxy | **Critical - do not deploy** |
| Current CMS used only on a trusted developer machine via `127.0.0.1` | **Development-only**; still exposes every file under the repository to local HTTP clients |
| Static public pages on a hardened managed host, without the CMS | **Moderate**; the sensitive email workflow, privacy notice, document governance, and host-level headers still need remediation |

## Scope and method

Reviewed:

- `cms_server.py`, the SQLite schema, all API routes, authentication, authorization, sessions, CSRF, request parsing, headers, logging, and static-file behavior.
- The admin interface and all 12 JavaScript files and 12 HTML pages in the current working tree.
- Public forms, reports, images, external resources, privacy wording, and document-submission instructions.
- Repository hygiene, ignored local artifacts, current-tree and `HEAD` secret patterns, deployment documentation, and available build/configuration files.
- Nine public PDFs totaling 751,693,711 bytes. The files were checked for encryption, embedded files, JavaScript, automatic actions, forms/widgets, links, metadata, and obvious filled-in personal data.
- Image metadata for GPS and creator/device information.
- Safe dynamic tests against a temporary, isolated database.

Benchmarks used include the [OWASP Application Security Verification Standard 5.0](https://owasp.org/www-project-application-security-verification-standard/), OWASP authentication/session/password-storage guidance, the [Kenya Data Protection Act](https://new.kenyalaw.org/akn/ke/act/2019/24/eng%402022-12-31), and the [ODPC self-assessment areas](https://www.odpc.go.ke/assessments/). This is a technical and internal-control assessment, not a legal opinion or a substitute for an external penetration test.

Not assessed:

- A deployed hostname, TLS certificate, DNS, CDN/WAF, reverse proxy, firewall, cloud account, operating-system hardening, production database, mailbox configuration, identity provider, backups, monitoring platform, or third-party vendor contracts. No production URL or infrastructure was supplied.
- GitHub branch protection, repository membership, signed commits, CI settings, or remote secret scanning.
- Whether every photographed person has valid and recorded publication consent.
- Full legal accuracy of benefit, tax, investment, or scheme statements.

## Finding summary

| ID | Severity | Finding | Release status |
|---|---|---|---|
| SET-001 | Critical | Entire repository, runtime database, and ignored local artifacts are web-accessible | Blocker |
| SET-002 | High | Development HTTP server and undocumented production trust boundary | Blocker |
| SET-003 | High | No MFA, effective login throttling, or adequate password-hardening policy | Blocker |
| SET-004 | High | Sensitive member forms are directed through ordinary email | Blocker |
| SET-005 | High | CMS approval workflow does not control the public website | Blocker |
| SET-006 | High | Resource-exhaustion paths and unhandled request exceptions | Blocker |
| SET-007 | High | Privacy/security governance is incomplete for pension-related data | Blocker |
| SET-008 | Medium | Unsanitized CMS body/metadata create a latent stored-XSS risk | Before integration |
| SET-009 | Medium | Session lifecycle is too weak for privileged fund publishing | Before launch |
| SET-010 | Medium | Audit records are incomplete and not tamper-evident | Before launch |
| SET-011 | Medium | Approval transitions allow self-approval and invalid workflow changes | Before launch |
| SET-012 | Medium | Security headers and CSP are inconsistent and functionally conflicting | Before launch |
| SET-013 | Medium | Database protection, retention, backup, and recovery are not implemented | Before launch |
| SET-014 | Medium | Public-document and photograph release controls are not evidenced | Before launch |
| SET-015 | Medium | Staff account lifecycle and incident recovery controls are missing | Before launch |
| SET-016 | Low | Version/detail leakage and publicly served development artifacts | Hardening |
| SET-017 | Low | Third-party browser dependencies increase privacy and supply-chain exposure | Hardening |
| SET-018 | Low | Repository health prevents a complete all-ref history scan | Engineering hygiene |

## Detailed findings

### SET-001 - Entire repository, database, and local artifacts are web-accessible

**Severity:** Critical  
**Evidence:** `cms_server.py:14-15`, `cms_server.py:72`, `cms_server.py:145-146`, `cms_server.py:211-214`

`ROOT` is the repository directory and `DB_PATH` is `ROOT/data/cms.sqlite3`. Unmatched GET requests are delegated to `SimpleHTTPRequestHandler`, while `translate_path()` permits every resolved file inside `ROOT`. The check prevents traversal outside the repository, but it does not restrict access to a public allowlist or deny dotfiles, the database, source, backups, or editor state.

The isolated runtime test confirmed:

- `GET /data/cms.sqlite3` -> HTTP 200, returning the database.
- `GET /.git/config` -> HTTP 200, returning the file.

The real working directory also contains `.vscode/edge-debug-profile*` with browser `History`, `Network/Cookies`, `Login Data`, `Local State`, `Preferences`, and `Web Data` files. They are Git-ignored but not HTTP-ignored. A future `.env`, database journal/WAL, backup, log, source map, or temporary export under the repository would also be exposed.

**Impact:** Disclosure of staff names/emails, password hashes, content drafts, CSRF tokens, audit data, repository history, remote URLs, local browser metadata, and any future secret stored under the project. Password hashes could be cracked offline. Disclosure of Git history can recover secrets that were deleted from the working tree.

**Required remediation:**

1. Stop using the repository as a web root. Create a dedicated, immutable `public/` directory containing only explicitly public assets.
2. Store the database, secrets, logs, backups, and runtime files outside that directory and outside the source checkout.
3. Replace fallback file serving with an explicit route/allowlist; deny dotfiles and unknown paths.
4. Remove browser debug profiles from the project directory. Treat them as potentially exposed if this server has ever been reachable beyond the developer machine; review access logs and rotate affected credentials/sessions where appropriate.
5. Add automated negative tests for `/.git/config`, `/.env`, `/data/cms.sqlite3`, backup suffixes, traversal encodings, symlinks/junctions, and directory listings.

### SET-002 - Development HTTP server and undocumented production trust boundary

**Severity:** High  
**Evidence:** `cms_server.py:10`, `cms_server.py:216-220`, `CMS-SETUP.md:30-37`

The application uses `ThreadingHTTPServer` from `http.server`. Python's own documentation says [`http.server` is not recommended for production and implements only basic security checks](https://docs.python.org/3/library/http.server.html). The process binds to `127.0.0.1`, which is a good local-development default, but there is no production server, proxy configuration, trusted-proxy policy, TLS enforcement, HSTS, request timeout, connection limit, health check, or graceful lifecycle configuration in the repository.

`SETSPF_HTTPS` only toggles a cookie flag. It does not establish or verify HTTPS. A mis-set variable can produce either an unusable secure cookie over HTTP or an insecure authentication cookie in production.

**Required remediation:** Deploy behind a supported hardened application server/reverse proxy or a managed platform. Define the trusted network path, force HTTPS, add HSTS after HTTPS validation, reject untrusted Host/forwarded headers at the edge, set body/header/time/connection limits, and restrict `/admin/` and `/api/` through SSO/IAP or a staff network.

### SET-003 - Authentication lacks critical defenses

**Severity:** High  
**Evidence:** `cms_server.py:26-35`, `cms_server.py:151-162`, `CMS-SETUP.md:33-34`

There is no MFA, SSO, breached-password check, per-account or per-source throttling, lockout/backoff state, CAPTCHA escalation, or failed-login audit event. A fixed 350 ms sleep is not a rate limiter; because the server creates threads, attempts can be parallelized.

Unknown accounts skip `password_valid()` while known accounts perform scrypt, producing a timing distinction that can help enumerate valid staff emails. The minimum password rule is length-only. There is no maximum length, which allows large valid-user password inputs to trigger memory-hard work across many threads.

The scrypt setting is `N=2^14, r=8, p=1`. Current [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) recommends Argon2id, or scrypt `N=2^14, r=8, p=5` at that memory tier. Current [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) calls for MFA, throttling, and logging/review of authentication failures.

**Required remediation:** Prefer the institution's managed identity provider with phishing-resistant MFA. Otherwise add account-based exponential throttling plus IP/device abuse controls, failed-attempt monitoring, a dummy hash for unknown users, breached-password screening, reasonable maximum input lengths, and a tuned Argon2id/scrypt policy with versioned rehash-on-login.

### SET-004 - Sensitive member forms are directed through ordinary email

**Severity:** High  
**Evidence:** `downloads.html:26-34`, public PDFs in `assets/documents/`

The site tells users to email completed forms to a named mailbox. The forms request combinations of:

- ID/passport number and an identity-document copy.
- KRA PIN, staff number, date of birth, address, phone, and personal email.
- Bank-account and transfer-scheme details.
- Ill-health documentation.
- Signatures, next of kin, beneficiaries, guardians, dates of birth, relationships, and contact details.

That data creates identity-theft, financial-fraud, family-privacy, mailbox-retention, forwarding, endpoint, and misdelivery risks. Email transport encryption is not end-to-end assurance and does not provide a controlled case lifecycle by itself.

**Required remediation:** Replace email intake with an authenticated, encrypted upload/case-management channel with MFA, malware scanning, access control, receipt confirmation, retention/deletion rules, and auditability. If email must temporarily remain, use a formally risk-accepted secure-mail solution and conspicuous instructions that prohibit ordinary attachments containing identity, banking, beneficiary, or health data.

### SET-005 - CMS workflow does not control the public website

**Severity:** High  
**Evidence:** `cms_server.py:127-130`, `admin/admin.js:21-35`, all public HTML/JS

The backend exposes published records at `/api/public/content`, but no public JavaScript or HTML references that endpoint. Public benefits, investment figures, news, FAQs, chatbot answers, and contact details are hard-coded in files. A repository/deployment edit can therefore change public financial or scheme information without a CMS approval or audit-log entry. Conversely, marking CMS content as `published` does not make it appear on the visible website.

**Impact:** The stated approval workflow is not an effective publication control. Content can be stale, inconsistent, or changed outside the apparent governance process.

**Required remediation:** Choose one authoritative publication path. Either integrate a safely encoded CMS feed into a tested renderer, or remove the misleading CMS and enforce review through protected pull requests and signed/traceable deployments. Require content owner, reviewer, effective date, source document, expiry/review date, and rollback/version history for benefits, tax, performance, contact, and chatbot statements.

### SET-006 - Resource exhaustion and unhandled request exceptions

**Severity:** High  
**Evidence:** `cms_server.py:92-97`, `cms_server.py:148-155`, `cms_server.py:220`, `assets/documents/setspf-newsletter-2026.pdf`

`read_json()` accepts any JSON type, accepts negative `Content-Length` values, does not require `application/json`, and has no read timeout. Route code assumes a dictionary. The isolated test sent `[]` to the login route and produced an unhandled `AttributeError` plus a disconnected client. Negative lengths and slow bodies can hold request threads. Parallel valid-user scrypt requests can consume significant memory.

The public newsletter PDF is 722,640,029 bytes (about 689 MiB). Repeated or concurrent downloads through this threaded origin create an easy bandwidth, disk-I/O, thread, and cost-exhaustion path.

**Required remediation:** Validate `Content-Type`, require a JSON object, reject missing/negative/oversized lengths, apply strict per-field limits, set socket/read/write timeouts, cap connections/workers, use global exception handling, return stable 4xx/5xx JSON, and add edge rate/size limits. Optimize the newsletter aggressively and serve large immutable assets through a CDN/object store with caching and egress controls.

### SET-007 - Privacy and security governance is incomplete

**Severity:** High  
**Evidence:** `policies-and-forms.html:6-7`, `downloads.html:34`, `SECURITY.md`

The published privacy text is only a few general paragraphs. It does not clearly document controller/DPO contacts, precise data categories and lawful bases, mandatory versus voluntary fields and consequences, recipients/processors, cross-border transfers/safeguards, retention schedules, all data-subject rights and request process, complaints to the ODPC, security/breach handling, children/dependant data, cookies/external embeds, or effective/version dates.

The site loads Google Fonts and an immediate Google Maps iframe, and can load YouTube. These requests disclose at least network/browser metadata to third parties, yet this is not addressed. The downloadable beneficiary and withdrawal forms collect data about people other than the submitting member. The forms rely broadly on consent even where contract or legal obligation may be the more appropriate lawful basis; that choice requires counsel/DPO review.

The Kenya Data Protection Act requires lawful, fair, transparent, purpose-limited and minimized processing, retention limits, safeguards, rights, and notice before collection. The [ODPC self-assessment](https://www.odpc.go.ke/assessments/) specifically asks about information flows, lawful basis, third-party transfers, retention, privacy by design, consent, breach management, and security documentation.

**Required remediation:** Complete a data inventory/flow map, records of processing, lawful-basis review, retention schedule, processor/vendor register, cross-border assessment, DPIA where required, breach-response plan, rights process, and ODPC registration assessment. Publish a DPO-reviewed layered notice before collecting information.

### SET-008 - Latent stored-XSS risk in CMS content

**Severity:** Medium  
**Evidence:** `cms_server.py:127-130`, `cms_server.py:173-181`

CMS `summary`, `body`, and arbitrary `metadata` are stored without a content schema or HTML sanitization and returned to the anonymous public endpoint. The current public site does not consume that endpoint, so no exploitable public sink was confirmed today. A future renderer using `innerHTML` would turn a malicious or compromised-author record into stored cross-site scripting.

The admin list escapes displayed CMS strings before inserting HTML, which is a positive control.

**Required remediation:** Decide whether body content is plain text or limited rich text. Enforce a server-side schema and allowlist sanitizer, encode by output context, restrict URL schemes, and add adversarial XSS tests. Do not treat CSP as the primary sanitizer.

### SET-009 - Session lifecycle is too weak for privileged publishing

**Severity:** Medium  
**Evidence:** `cms_server.py:16`, `cms_server.py:99-113`, `cms_server.py:156-169`

Positive controls include random tokens, server-side token hashes, `HttpOnly`, `SameSite=Strict`, conditional `Secure`, a CSRF token, expiry checks, and server-side logout.

Gaps include an eight-hour persistent cookie, no idle or renewal timeout, no reauthentication for account creation/publishing, no user-visible session list, no revoke-all mechanism, no session metadata/anomaly detection, and no `__Host-` cookie prefix. Expired rows are cleaned only on successful login. The current [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) recommends explicit lifecycle controls and the `__Host-` prefix for host-only secure session cookies.

**Required remediation:** Use IdP-managed sessions where possible. Otherwise use an idle timeout appropriate to privileged staff activity, a bounded absolute timeout, periodic renewal, step-up authentication for high-impact actions, revoke-all/user-disable invalidation, and a `__Host-` cookie in production.

### SET-010 - Audit records are incomplete and mutable

**Severity:** Medium  
**Evidence:** `cms_server.py:58-60`, `cms_server.py:136`, `cms_server.py:158-160`, `cms_server.py:180-207`

Only successful login, create, account-create, and status-change events are recorded. Failed logins, logout, authorization failures, reads/exports, content before/after values, session/account changes, and security/configuration events are missing. Records have no request/correlation ID or carefully minimized investigation metadata. The same local database contains both business records and the audit log; anyone with filesystem/database control can alter it. The UI only shows the latest 200 records, with no documented retention or export.

**Required remediation:** Define an event taxonomy and retention policy, record all authentication outcomes and high-impact authorization decisions without passwords/tokens/content PII, preserve before/after or immutable versions, forward logs to access-controlled append-oriented storage/SIEM, synchronize time, alert on abuse, and regularly test investigations.

### SET-011 - Approval transitions permit self-approval and invalid changes

**Severity:** Medium  
**Evidence:** `cms_server.py:170-181`, `cms_server.py:197-208`, `CMS-SETUP.md:25-28`

A trustee's new item is forced to `review`, but that same trustee can immediately set it to `approved`. Any trustee can also change any item to `review` or `approved` regardless of its current state, ownership, prior reviewer, or whether it is archived/published. Updates do not check the affected-row count, so nonexistent IDs return success and create misleading audit entries. Concurrent updates have no optimistic locking/version check.

**Required remediation:** Document the approval matrix, enforce allowed state transitions atomically, prohibit self-approval where four-eyes control is intended, require a distinct reviewer, check current version/status and row count, capture comments/evidence, and test every role/state combination.

### SET-012 - Security headers and CSP are inconsistent and conflicting

**Severity:** Medium  
**Evidence:** `cms_server.py:75-81`, CSP meta elements across public pages

The backend provides useful `nosniff`, referrer, clickjacking, permissions, and CSP headers. It does not send HSTS. Five of the 12 HTML pages have no CSP meta fallback. A static-host deployment without equivalent response headers would also lack enforceable `frame-ancestors`/clickjacking protection.

When pages are served by this backend, the header CSP omits remote `frame-src`; `default-src 'self'` therefore blocks the Google Maps and YouTube frames that page-level meta policies attempt to allow. Multiple CSP policies can only further restrict one another, so the meta tag cannot loosen the header. This conflict is evidence that the deployment path has not been end-to-end tested.

**Required remediation:** Define one centrally managed response-header policy per route, including exact frame needs, `object-src 'none'`, HSTS at the HTTPS edge, and appropriate isolation/resource policies. Test it in enforcement and report-only stages, and remove inconsistent meta policies after host headers are guaranteed.

### SET-013 - Database protection, retention, backup, and recovery are absent

**Severity:** Medium  
**Evidence:** `cms_server.py:19-24`, `CMS-SETUP.md:35`

SQLite is unencrypted and local ACL, encryption-at-rest, backup, restore, retention, secure deletion, integrity-check, and disaster-recovery behavior are not configured or tested in the repository. There is no `busy_timeout` or production concurrency strategy, so concurrent writes can produce unhandled availability errors. Expired sessions and archived/draft content have no deletion policy.

**Required remediation:** Put persistence on encrypted, access-controlled storage outside the web root; use a production-suitable database where concurrency/operations require it; define retention; automate encrypted backups; protect keys separately; and test point-in-time recovery, corruption handling, and continuity objectives.

### SET-014 - Public document and photograph release controls are not evidenced

**Severity:** Medium  
**Evidence:** `downloads.html:26-33`, `news-agm-2026.html:25`, public assets

The published meeting minutes identify attendees and disclose detailed fund allocations, provider positions, and strategy. This may be intentionally approved transparency, but the repository contains no classification/redaction checklist or release approval evidence. AGM and strategy photographs identify members/attendees; the presence of a generic media-consent form does not demonstrate consent records, purpose scope, withdrawal handling, or retention for each asset.

PDF inspection found no embedded files, JavaScript, automatic actions, interactive form widgets, encryption, or obvious completed member records. Several PDFs expose individual author names in document metadata. Image inspection found no GPS metadata; some files retain camera, creation-time, artist, software, or copyright metadata.

**Required remediation:** Apply a documented pre-publication classification, privacy, legal, accessibility, malware, metadata, and redaction review. Keep approval/consent evidence outside the public tree, strip unnecessary metadata, and define takedown/withdrawal handling.

### SET-015 - Staff account lifecycle and incident recovery are missing

**Severity:** Medium  
**Evidence:** `cms_server.py:138-144`, `cms_server.py:184-196`

The API can list and create users, including more administrators, but has no password change/reset, invitation/verification, role change, disable/delete, forced logout, credential-expiry, recovery, or break-glass process. The admin interface does not expose even the existing account-creation API. A compromised eight-hour admin session can create another administrator without reauthentication.

**Required remediation:** Delegate lifecycle to the institutional identity provider. If retained locally, add controlled invitations, verified addresses, MFA enrollment, reauthentication, least-privilege role changes, rapid disable/revoke-all, recovery with alerts, periodic access reviews, and tested joiner/mover/leaver procedures.

### SET-016 - Version/detail leakage and development artifacts

**Severity:** Low

The default response banner combines `SETSPF-CMS` with the Python runtime version. Source, `.pyc`, documentation, old/demo JavaScript, and development files are reachable because of SET-001. `script.js` contains unused demo upload/request behaviors and inconsistent messages. `admin/index.html` opens the public page with `target="_blank"` without an explicit `rel="noopener"` (modern browsers generally apply implicit protection, but it should be explicit).

**Required remediation:** Build and publish only required artifacts, suppress unnecessary version detail, remove stale/demo assets from production, and add explicit `noopener noreferrer` to external/new-tab links.

### SET-017 - Third-party browser dependencies

**Severity:** Low

Pages depend on Google-hosted fonts and embed/link Google Maps, YouTube, Zamara, and RBA services. External fonts add availability, privacy, and supply-chain dependencies; iframe/navigation destinations create vendor and user-transition risks. No malicious destination was identified from static inspection, and public new-tab external links generally use `rel="noopener"` or `noopener noreferrer`.

**Required remediation:** Self-host fonts if practical, maintain an approved-domain inventory, review third-party privacy/security and cross-border terms, use click-to-load embeds where appropriate, visually identify exits to external services, and monitor destination/domain changes.

### SET-018 - Repository health limits historical assurance

**Severity:** Low

The current tree and `HEAD` were scanned for common credential patterns and no credential-looking secret was found. The main branch contains two visible commits. A complete `git rev-list --all`/all-ref scan could not run because several local `refs/codex/turn-diffs/checkpoints/...` entries are invalid/too long on Windows; `git fsck --full` reports invalid zero object pointers. This does not establish a product vulnerability, but it impairs repeatable history scanning and some tooling.

**Required remediation:** Back up the repository, repair or remove only the invalid tool-generated refs through an approved process, then run a dedicated full-history secret scanner and enable pre-commit/CI secret detection. Do not treat `.gitignore` as a security boundary.

## Positive controls observed

- The server binds to loopback by default rather than all interfaces.
- SQL statements use parameter binding; no SQL-injection path was identified.
- Passwords are salted and memory-hard hashed rather than stored in plaintext.
- Session tokens and CSRF values use `secrets`; only session-token hashes are stored server-side.
- Authentication cookies use `HttpOnly` and `SameSite=Strict`, and production mode adds `Secure`.
- State-changing authenticated routes require a CSRF header.
- Admin/audit/user APIs enforce server-side authentication; admin-only routes check the role on the server.
- JSON API responses use `Cache-Control: no-store`.
- Existing admin DOM rendering escapes CMS/audit strings before HTML insertion.
- Public chat/search/form interactions keep user text local or put it into `textContent`; no public API transmission was found.
- The public contact mailto builder percent-encodes subject and body.
- There are no third-party JavaScript libraries or package dependencies in the repository.
- No server-side URL fetch, shell execution, unsafe deserialization, backend file upload, or SQL string interpolation was found.
- Public PDFs showed no active JavaScript, automatic action, embedded payload, or filled member record in the tested files.
- Image metadata inspection found no GPS coordinates.
- `cms_server.py` passed Python compilation.

These controls reduce several common risks, but they do not compensate for the release blockers.

## Remediation sequence

### Immediate containment - before any internet exposure

1. Do not expose `cms_server.py` through a public proxy.
2. Separate the public build from the repository and move all runtime/private data outside it.
3. Remove the Edge debug profiles from the project tree and assess whether they were ever reachable.
4. Replace the email workflow for completed member forms with secure authenticated intake.
5. Place staff access behind institutional SSO/MFA and an identity-aware proxy or restricted network.
6. Optimize/offload the 689 MiB newsletter before serving it publicly.

### Pre-production control build

1. Select a supported production application stack and define TLS, proxy, host, timeout, rate-limit, cache, and security-header configuration as code.
2. Make the CMS or protected repository workflow the single source of truth for public content.
3. Implement strict schemas, server-side rich-text sanitization, safe rendering, controlled status transitions, and four-eyes rules.
4. Implement staff lifecycle, secure sessions, reauthentication, abuse detection, tamper-resistant logging, monitoring, and alerting.
5. Implement encrypted persistence, backup/restore testing, retention/deletion, continuity, and incident-response procedures.
6. Complete the DPO/legal privacy program and vendor/data-transfer review.

### Verification gate

- Automated unit/integration tests for authentication, CSRF, every authorization and workflow transition, malformed/slow/large requests, output encoding, and sensitive-file denial.
- Static analysis, secret scanning across full history, dependency/runtime scanning, and reproducible builds.
- A staging scan of TLS, headers, cookies, methods, directory/file exposure, caching, CORS, CSP, and error behavior.
- An authenticated external penetration test covering anonymous, trustee, administrator, compromised-account, and insider scenarios.
- Backup restoration, account revocation, log investigation, privacy request, breach response, and content rollback exercises.
- Written sign-off from the system owner, security owner, DPO/privacy owner, content owner, and operations owner.

## Final release decision

**Current decision: NO-GO.** The backend should remain a local prototype until SET-001 through SET-007 are closed and independently retested. A static-only release could be considered sooner on a hardened managed host, but only after removing the sensitive ordinary-email submission path and confirming privacy, document, consent, and host-header controls.
