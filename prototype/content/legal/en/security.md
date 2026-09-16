# Genora.art Security Policy

**Operator:** ELVARON LIMITED, Registration No. 79402144, 14/F, China Building, 29 Queen's Road Central, Central, Hong Kong.
**Security contact:** support@genora.art (email subject: “Security”)

**Version:** 2.0
**Effective date:** from the date of publication on the website.

---

## 1. Status of the document and reservation

1.1. This document describes the Company’s approach to the security of the Service and is published for transparency toward users and corporate customers.

1.2. This document **is not** a warranty of the absence of incidents, a service-level agreement, a certificate of compliance with any standard, or a representation as to result. It does not create obligations going beyond the Terms of Use and mandatory rules of law.

1.3. Protective measures evolve: specific technical solutions may change provided that a no-lesser level of protection is maintained. Statements about measures relate to the date of the version.

1.4. No internet service can provide absolute security. The Company’s liability is limited in accordance with §17 of the Terms of Use.

---

## 2. Shared-responsibility model

| Area | Company responsible | User responsible |
|---------|-------------------|------------------------|
| Service infrastructure, servers, network, configuration | yes | no |
| Application and gateway code | yes | no |
| Access management of Company employees | yes | no |
| Strength and safekeeping of the password, access to the mailbox | no | yes |
| Protection of the device, browser, absence of malware | no | yes |
| Composition of data sent to the Service, lawfulness of their transmission | no | yes |
| Corporate-account settings, composition of users | no | yes (administrator) |
| Security practices of AI Providers and payment systems | no (only supplier selection and contractual requirements) | taken into account when selecting a Model |

---

## 3. Protection of data in transit and at rest

3.1. All user traffic is transmitted over a protected TLS channel with valid certificates; access over an unprotected protocol is redirected to a protected one.

3.2. Passwords are not stored in plaintext: the bcrypt algorithm with a cost factor of 12 is applied. Recovery of the original password is impossible, including for Company employees.

3.3. Session tokens are stored as irreversible hashes; the session cookie is issued with the `httpOnly`, `Secure`, and `SameSite=Lax` attributes.

3.4. Data are placed in managed infrastructure with segregation of network contours: the public web layer, the application layer, the database, and the administrative contour are separated; the database is not published to the open network.

3.5. Access to the production environment is granted on the principle of least privilege, only to authorized persons and systems, using access keys instead of passwords.

3.6. Backups are performed regularly; access to them is restricted; restoration is verified within operational procedures.

---

## 4. Authentication and account protection

4.1. Registration requires verification of the email address; the verification token is valid for a limited time (24 hours).

4.2. Session lifetime is limited: 12 hours by default or 30 days upon express selection of an extended session. The session is bound to technical characteristics of the request and may be terminated upon detection of an anomaly.

4.3. Rate-limiting of registration and login attempts by email address and network address is applied; successive failed attempts result in a temporary block.

4.4. Administrative access is isolated in a separate contour with additional measures: separate accounts, restriction by network addresses, an additional confirmation code, a limited validity period for invitations, logging of actions.

4.5. User obligation: use a unique strong password, do not reuse it in other services, protect access to the mailbox, end sessions on others’ devices, and immediately report suspicious activity.

---

## 5. Processing of requests to models

5.1. The contents of a request are transmitted only to those systems that are necessary for its fulfillment: the internal gateway and the AI Provider of the selected Model.

5.2. The Company seeks to minimize the composition of technical logs: they record metadata necessary for diagnosis, tariffication, and protection, and not the full text of conversations.

5.3. Practices of storage, logging, and training on data on the AI Provider’s side are determined by its terms and are outside the Company’s control. The list of providers is disclosed in the “Sub-processors” document.

5.4. The User may reduce the volume of data transferred: not attach files, de-identify requests, disable history and memory retention, and select a provider with a jurisdiction acceptable to the User.

---

## 6. Abuse prevention

The following are applied: validation of input data and limitation of attachment sizes; limits on the frequency and parallelism of requests at the network-proxy and application levels; a check of the minimum Balance remainder before execution of a request; filtering of suspicious traffic; blocking of automated attacks; restriction of operations upon signs of payment fraud.

---

## 7. Change and vulnerability management

7.1. Code changes undergo version control and deployment through an automated build-and-delivery process; deployment to the production environment is limited to authorized systems.

7.2. Dependencies and base images are updated taking into account information about known vulnerabilities; critical fixes are prioritized.

7.3. Infrastructure configuration is described as code, which makes it possible to reproduce and verify the state of the environment.

7.4. Secrets and access keys are stored in environment variables of the production environment and are not included in the repository; rotation is performed upon suspicion of compromise and upon personnel changes.

---

## 8. Incident response

8.1. Upon detection of an incident, the Company: contains and limits spread; preserves evidence; eliminates the cause; restores normal operation; conducts a review and implements preventive measures.

8.2. In the event of an incident entailing a risk to the rights and freedoms of natural persons, affected persons and competent authorities are notified to the extent and within the time limits established by applicable law; for the GDPR — without undue delay and, as a rule, within 72 hours from the moment the incident became known.

8.3. Notification of corporate customers of incidents affecting their data is carried out in accordance with the DPA.

8.4. Notification of an incident is not an admission of fault or liability.

---

## 9. Vulnerability reporting (responsible disclosure)

9.1. Send to **support@genora.art** with the subject “Security”: a description of the vulnerability, steps to reproduce, an assessment of impact, affected addresses, and, where possible, a proposal for remediation.

9.2. Rules of good-faith research: do not obtain access to other users’ data and do not alter them; use only your own test accounts; do not impair the availability of the Service; do not apply social engineering against employees and partners; do not publish information about the vulnerability until it is remediated or until expiry of a reasonable period agreed with the Company.

9.3. The Company acknowledges receipt of a report within a reasonable time and informs of the outcome of review. A monetary-reward program is not in effect as of the date of this version; payments, if introduced, will be announced separately.

9.4. Compliance with §9.2 means that the Company will not initiate against a good-faith researcher claims related solely to the fact of the research itself, to the extent permitted by law.

---

## 10. Testing and audit

10.1. Automated scanning, load testing, and penetration testing are permitted **only after written coordination** of scope, time, and methodology with the Company.

10.2. Corporate customers may request documentary confirmation of security measures: a description of measures, questionnaire responses, available reports. On-site review is possible upon a reasoned request in the manner provided by the DPA, with confidentiality preserved and without risk to other customers.

---

## 11. Personnel and contractors

Access of employees and contractors to production data is granted as needed, is documented by confidentiality obligations, and is terminated upon completion of the task or cooperation. Actions in the administrative contour are logged.

---

## 12. Known limitations

For transparency, the Company states the following limitations as of the date of this version: encryption of data at rest is being implemented in stages and may not cover all categories of data; two-factor authentication for user accounts is under development; independent certification against external standards has not been obtained; individual features are provided in Preview Mode without warranties of data integrity. Statement of the limitations does not create obligations as to the time limits for their elimination.

---

## 13. Contacts

**support@genora.art**
ELVARON LIMITED, Registration No. 79402144, 14/F, China Building, 29 Queen's Road Central, Central, Hong Kong.
