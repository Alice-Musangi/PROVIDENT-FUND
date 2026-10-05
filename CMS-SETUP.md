# SETSPF Content Manager

This CMS manages public content only. Do not use it for member records, benefit claims, IDs, statements, or confidential documents.

The server only exposes an allowlisted set of public web assets. Keep the repository,
database, editor profiles, logs and runtime files outside any separate production
web server's document root.

## First local launch (PowerShell)

```powershell
$env:SETSPF_ADMIN_EMAIL="admin@example.org"
$env:SETSPF_ADMIN_PASSWORD="replace-with-a-long-unique-password"
$env:SETSPF_HTTPS="0"
py cms_server.py
```

Open `http://127.0.0.1:8080/admin/`. The first launch creates the initial Administrator account. Remove the environment values after setup.

## Start from Visual Studio Code

1. Open **Run and Debug** (`Ctrl+Shift+D`).
2. Choose **Start SETSPF CMS**.
3. Press the green Run button or `F5`.
4. Enter the Administrator email and a password of at least 12 characters when prompted.

The admin page opens in the normal system browser after the server starts. This avoids attaching the Visual Studio Code JavaScript debugger to Edge.

## Roles

- Administrator: creates drafts, sends items for review, publishes content, archives content, and reviews the activity log.
- Trustee: creates content for review and approves reviewed content. Trustees cannot publish directly or manage accounts.

## Production requirements

- Place the service behind HTTPS and set `SETSPF_HTTPS=1`.
- Do not expose the development server directly to the internet.
- Add managed MFA/SSO before real staff use.
- Add server-side rate limiting at the reverse proxy or edge.
- Store the database on encrypted, backed-up persistent storage.
- Restrict `/admin/` and CMS APIs to authorized staff networks or an identity-aware proxy where possible.
- Complete security testing before launch.
