# Genora.art Security Policy

**Operator:** Sangerto LTD, CRN: 17456264, 71-75, Shelton Street, Covent Garden, London, WC2H 9JQ, UNITED KINGDOM.
**Security contact:** support@genora.art

**Version:** 3.0
**Effective date:** from the date of publication on the website.

---

## 1. What this statement describes

This document records the practical safeguards used for Genora accounts, requests, files, billing records and administration. It describes the current security posture, not a guarantee that an internet service can never be attacked or suffer an outage. The Privacy Policy explains the legal purposes and retention rules.

## 2. Security is a shared task

Genora protects the application and its infrastructure. You must protect your email account, password, devices, API or session credentials, uploaded material and the people who receive your outputs. Report suspected compromise quickly; delay can make containment impossible.

## 3. Current technical measures

- TLS protects traffic between browsers, the application and service connections.
- Passwords are stored as bcrypt hashes, never as readable passwords.
- Session values are limited in lifetime and stored as hashes; secure cookies use `httpOnly`, `Secure` and `SameSite` controls.
- The public web layer, application, database and administrative contour are separated; the database is not intended to be publicly reachable.
- Input size, attachment size, request frequency and parallel work are bounded.
- Access follows least privilege; production and administration use restricted credentials and a separate route.
- Security events, failed logins, rate-limit triggers and administrative actions are monitored with minimisation of conversation text in logs.
- Dependencies, base images and infrastructure configuration are versioned and updated with priority for critical fixes.
- Secrets are kept outside the repository and rotated when compromise is suspected or access changes.

## 4. Account and administrator protection

Use a unique password and do not share credentials. Genora may throttle registration and login, revoke sessions, require email verification and block suspicious activity. Administrative access is separate from the client application and is invitation-controlled; an administrative account is not a public registration path.

Two-factor authentication for ordinary user accounts is being developed. Until it is available, use a protected mailbox and device. Never send a password or one-time code to support.

## 5. Handling of model requests

Genora routes a request only to the selected model provider, or to the provider selected by the enabled automatic mode. The request may leave the European hosting location; the Privacy Policy and Sub-processors list identify the transfer warning and provider categories. Choose a model only after checking whether its destination is acceptable for the data you intend to send.

## 6. Abuse and availability controls

Rate limits, attachment limits, prompt/output controls, traffic filtering, account checks and model-provider restrictions help prevent spam, scraping, credential attacks and excessive load. These controls can reject a request or suspend access. Security testing of Genora requires written permission; probing or load testing without it is prohibited.

## 7. Changes and vulnerability handling

Changes are reviewed through version control, automated checks and a controlled build/deployment process. A critical issue may require an urgent release or temporary feature restriction. Technical measures may improve over time, but Genora will not intentionally reduce the protection promised by an executed DPA.

## 8. Incident response

When a confirmed incident is found, Genora works to contain it, preserve relevant evidence, remove the cause, restore service and assess affected data. If Customer Data is affected, the DPA applies. Where the UK GDPR or EU GDPR requires a notification, Genora follows the applicable timing and content rules, including assistance to a controller and notification to affected people where required.

## 9. Responsible disclosure

Send a suspected vulnerability privately to **support@genora.art**. Include the affected URL or component, reproduction steps, impact, timestamps, a safe test account if needed and a way to contact you. Do not access another person’s data, alter or delete data, exfiltrate secrets, interrupt service or disclose the issue publicly before Genora has had a reasonable opportunity to respond.

## 10. Testing and assurance

Genora may use internal checks, dependency scanning, logging reviews and provider assurance information. No independent certification against an external security standard is claimed by this policy. A customer that needs contractual evidence can request the material available under the DPA.

## 11. People and access lifecycle

Employees and contractors receive only the access needed for their duties, are bound by confidentiality, and lose access when the task or relationship ends. Administrative actions are restricted and recorded.

## 12. Known limitations

Encryption at rest is being introduced in stages; two-factor authentication for ordinary accounts is not yet generally available; some functionality is labelled Preview; and third-party providers control their own security, retention and lawful-access decisions. These limits matter when selecting data for a request.

## 13. Contact

Security reports and urgent suspected compromise: **support@genora.art**

Sangerto LTD, CRN: 17456264, 71-75, Shelton Street, Covent Garden, London, WC2H 9JQ, UNITED KINGDOM.
