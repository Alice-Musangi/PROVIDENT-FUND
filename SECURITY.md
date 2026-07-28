# Member portal security baseline

The public website must never collect member numbers, statements, passwords, or any other account information. The current enquiry form is a front-end demonstration only.

Before a member portal is launched, implement the following server-side controls:

- Enforce HTTPS and HSTS. Send security response headers, including Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and clickjacking protection.
- Use a trusted identity provider or a hardened authentication service. Require multi-factor authentication, block breached passwords, and rate-limit login, password-reset, and account-recovery attempts.
- Store passwords with Argon2id or the identity provider's approved method; never store, log, email, or expose passwords.
- Keep session identifiers server-side where possible. Set authentication cookies with `Secure`, `HttpOnly`, and an appropriate `SameSite` value; rotate sessions after sign-in and privilege changes, and provide a reliable logout.
- Enforce role-based access control on every server endpoint. Authorisation must be checked on the server, not hidden in the browser interface.
- Validate and authorise every request server-side. Protect state-changing requests from CSRF, apply rate limits at edge and application layers, and keep tamper-evident security audit logs.
- Encrypt sensitive member data at rest, restrict staff access by role, define retention periods, and test backups and recovery.
- Conduct a threat model, penetration test, accessibility review, and dependency/security-header scan before launch and after material changes.

The current CSP meta tag is a useful static-site baseline. For production, configure the CSP and all other headers at the web server or CDN; response headers are stronger and apply to every response.
