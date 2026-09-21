# Data Processing Agreement (DPA)

**Processor:** Sangerto LTD, CRN: 17456264, 71-75, Shelton Street, Covent Garden, London, WC2H 9JQ, UNITED KINGDOM (“Genora”).
**Controller:** the customer using Genora to process personal data on documented instructions (“Customer”).
**Contact:** support@genora.art

**Version:** 3.0

---

## How this schedule attaches to the service

This DPA is the controller–processor schedule for Customer Data handled through Genora. It sits alongside the Terms of Use, Privacy Policy and the annexes below. It starts when the Customer first uses Genora for that processing or when the parties sign a separate counterpart. On personal-data questions, this DPA prevails over the Terms; mandatory standard contractual clauses prevail where they conflict.

## 1. Vocabulary

“Data Protection Law” means the rules applying to the processing, including the UK GDPR and Data Protection Act 2018, EU GDPR Regulation 2016/679, Swiss law, CCPA/CPRA and other binding privacy rules.

“Customer Data” is personal data Genora handles for the Customer. “Data Subject” is the person identified by it. “Security Incident” is a confirmed compromise causing accidental or unlawful loss, destruction, alteration, disclosure or access. “Sub-processor” is a supplier processing Customer Data for Genora.

“SCC” means the European Commission standard contractual clauses in Decision 2021/914 and, for UK restricted transfers, the ICO International Data Transfer Addendum.

## 2. Roles

For Customer Data used to deliver the configured service, the Customer decides the purpose and essential means and is controller; Genora is processor. Genora is an independent controller for its own account, authentication, billing, security, abuse-prevention, sanctions, legal and accounting records as explained in the Privacy Policy. The parties are not joint controllers unless a written instrument says so.

## 3. Customer’s checks before sending data

The Customer confirms that it:

1. has a lawful basis and has given Data Subjects the required notice;
2. is entitled to instruct Genora and its providers, including for a cross-border transfer;
3. follows minimisation and sends only what the task needs;
4. does not send health, biometric, genetic, criminal-conviction, children’s, payment-card or government-identifier data unless the parties first agree written safeguards;
5. gives instructions that comply with Data Protection Law; and
6. does not use Genora for a use case prohibited by the Acceptable Use Policy.

The Customer configures users, administrators, history, memory, files, model/provider choice and retention. It is responsible for the people and data it brings to Genora. Genora cannot reliably inspect a prompt in advance for every protected category.

## 4. Genora’s permitted processing

Genora processes Customer Data only to follow the Customer’s documented instructions. The Terms, this DPA, account settings, user actions and support instructions together form those instructions. Genora may process data as its own controller only for the functions in section 2 and does not use Customer Data to train its own models.

If law requires another operation, Genora will tell the Customer before doing it unless the law forbids notice. If an instruction appears unlawful, Genora may ask for clarification or pause the affected operation.

## 5. Confidential personnel access

People and contractors receive access only when their task requires it. They are bound by confidentiality that survives their work for Genora and are instructed about the DPA.

## 6. Security

Genora maintains risk-appropriate technical and organisational controls, including TLS, password hashing, bounded sessions, least-privilege access, separated application/database/admin contours, rate limits, traffic filtering, secret isolation, logging minimisation, version-controlled changes and backups. Annex 2 gives the current detail. The Customer protects its own devices, users and credentials.

## 7. Sub-processors

The Customer generally authorises the suppliers listed on the Sub-processors page and Annex 3. Genora requires appropriate confidentiality, purpose, security and deletion commitments from a sub-processor and remains responsible for its DPA obligations to the extent the law and section 12 allow.

Genora will publish a material change where practical before it begins. A Customer with this DPA may object with reasons within 30 days; the parties will look for an alternative, after which the Customer may stop the affected feature or terminate the affected service. Emergency replacement for continuity, legal compliance or security may happen first with later notice.

## 8. International transfers

The active development database is hosted on a HOSTKEY VPS in Helsinki, Finland (EU). A selected AI provider or supporting supplier may process Customer Data in the United States, Singapore or mainland China. European hosting is not a promise that an AI-provider copy stays in Europe.

Before a restricted transfer, the parties identify adequacy or an appropriate mechanism. Where suitable this may be the EU SCC and the UK Addendum, completed with the required modules, annexes and transfer assessment. Genora applies minimisation, encrypted transport, access restriction and contractual safeguards, but cannot guarantee immunity from lawful access in a recipient country.

On a reasonable compliance request Genora will identify the relevant current recipient, location and safeguard, subject to security and confidentiality limits.

## 9. Help with Data Subject requests

The Customer handles requests from its Data Subjects. Taking account of Genora’s role and available functionality, Genora can provide processing information, export available records, correct a record where supported, restrict a feature or delete data on the Customer’s instruction. A request sent directly to Genora is acknowledged and, where the Customer can be identified, passed to it rather than decided on its merits. Exceptional labour can be charged only after agreement.

## 10. Security Incident notice

Genora will notify the Customer without undue delay after confirming a Security Incident affecting Customer Data and, as a rule, within 72 hours of becoming aware. The first notice includes available facts about the incident, data categories/volume, likely effect, containment and a contact point; updates follow as facts are established.

The Customer remains responsible as controller for notifying a regulator or Data Subjects, with reasonable assistance from Genora. A notice is not an admission of fault. Blocked probes and events unrelated to Customer Data are not Security Incidents under this clause.

## 11. Evidence of compliance and audit

Once per year on a reasoned request, Genora can provide a security description, reasonable questionnaire answers and available assurance material. An on-site review requires 30 days’ agreement, confidentiality, an independent non-competing auditor, business-hours scheduling, no disruption and Customer-paid costs. Genora may withhold another customer’s data, security-sensitive detail or information it cannot lawfully disclose.

## 12. Liability

The Terms’ liability allocation applies unless Data Protection Law forbids it. Nothing removes Data Subject rights or SCC protections. The Customer indemnifies Genora for losses caused by its missing legal basis, unlawful instruction, prohibited data or breach of its representations in section 3.

## 13. End of processing

When the service ends, Genora deletes or returns Customer Data at the Customer’s choice within a reasonable period and no later than 90 calendar days, unless law requires retention. Backup copies disappear through their normal rotation. Genora may keep legally required, de-identified or aggregated records. On request it can confirm deletion.

## 14. Term and precedence

This DPA lasts while Genora processes Customer Data and continues for the provisions needed to delete data, protect confidentiality and resolve claims. The Terms’ notice, severability and governing-law provisions apply unless Data Protection Law or the SCC requires otherwise.

---

# Annex 1. Processing description

**Subject and purpose:** running a unified interface to third-party AI models, including requests, agents, history, memory, comparison, consumption accounting and support.

**Operations:** collection, recording, storage, transmission to the selected provider, display, user-directed change and deletion.

**Duration:** the Customer’s use plus the deletion period in section 13.

**Data Subjects:** Customer users, employees, contractors, clients and counterparties whose information the Customer places in a request.

**Data:** account identity/contact details; IP, country, User-Agent and session times; prompts, outputs, images, files and transcriptions; memory and agent settings; usage, billing and support data.

**Special categories:** not intended and excluded by section 3.4 unless separately agreed.

**Recipients:** the providers in Annex 3 and the relevant infrastructure layer.

---

# Annex 2. Current technical and organisational measures

- unique accounts, bcrypt password hashes, login/registration rate limits and expiring sessions;
- hashed session tokens and `httpOnly`, `Secure`, `SameSite=Lax` cookies;
- separation of public application, database and administration, with no intended public database access;
- attachment validation, request limits, traffic filtering and suspicious-operation blocking;
- logging of authentication, refusals, limits and administrator actions while avoiding full conversation text where possible;
- version control, automated build/deployment and prioritised dependency/base-image updates;
- secrets kept out of source control and rotated after suspected compromise or an access change;
- daily encrypted copies of the active development database in a separate HOSTKEY S3 location in the Netherlands, with a planned 30-day lifecycle, day-29 checks and local-dump removal after verification;
- need-to-know access, confidentiality duties and prompt removal of departing access;
- incident containment, restoration, review and notice under section 10.

Known limits: encryption at rest is being rolled out in stages, ordinary-account two-factor authentication is under development, no external certification is claimed and some features are Preview.

---

# Annex 3. Provider categories

| Provider | Role | Possible location |
|---|---|---|
| OpenAI, Anthropic, Google, xAI | selected GPT, Claude, Gemini or Grok model | United States and/or EEA |
| Moonshot AI, Alibaba Cloud | selected Kimi or Qwen model | mainland China and/or Singapore |
| HOSTKEY | application, database and encrypted backup hosting | Helsinki, Finland and Netherlands backup storage |
| IntegratorAI gateway | model dispatch and usage integration | disclosed on compliance request |
| traffic protection, email and payment suppliers | delivery, verification and transaction support | disclosed in the Sub-processors page or on request |

Only the selected AI provider receives the request content for that model.

---

# Annex 4. Signed counterpart

To request a signed DPA, email support@genora.art with the Customer’s legal name/address, registration number, signatory, intended use, categories of Data Subjects/data and whether EU SCC/UK Addendum modules are required.
