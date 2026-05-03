# Vendor Data Flow Analyzer

![Vendor Data Flow Analyzer](public/Screenshot%202026-05-03%20at%208.38.22%20AM.png)

An AI-powered research and accountability tool that maps how student data flows through edtech vendors — giving procurement officers, researchers, and advocates the investigative infrastructure to hold vendors accountable before, during, and after procurement decisions.

---

## The Problem

Schools are among the most data-rich environments in the modern economy, yet among the least resourced when it comes to evaluating what happens to that data. Every edtech vendor arrives with a privacy policy, a data processing agreement (DPA), and a subprocessor list. These documents are intentionally technical, often hundreds of pages long, and written by legal teams whose job is to protect the vendor — not the student.

The person on the other side of that transaction is often a single district administrator, a technology coordinator, or a principal who has an afternoon to evaluate a tool before a contract renewal deadline. They are evaluating dozens of vendors simultaneously, under budget pressure, without legal support, and without visibility into what the vendor's own vendors are doing with the data.

This asymmetry has consequences:

- **Children's personal data** — including academic records, behavioral data, learning profiles, and in some cases biometric data — flows into commercial data pipelines that were never disclosed to parents or schools.
- **FERPA and COPPA obligations** are passed downstream through subprocessor chains that schools have no visibility into and did not contract with directly.
- **AI and machine learning tools** embedded in edtech products routinely process student-generated content — essays, assessments, interaction logs — in ways that are never disclosed in privacy policies.
- **Acquisitions and ownership changes** silently transfer student data to new corporate parents, sometimes private equity firms, without any notice to the districts that originally agreed to the terms.
- **Vendor accountability** is nearly impossible when a school does not know who it should be asking, what it should be asking, or what a reasonable answer looks like.

This tool exists to close part of that gap.

---

## What It Does

Enter a vendor or app name — for example, ClassDojo, Seesaw, Duolingo, or Remind. The AI agent conducts a multi-step investigation of public disclosures, static analysis databases, app store privacy labels, and technology detection sources, then returns a structured report in 1–2 minutes.

### Report Contents

**Risk summary** — A risk-level assessment (Elevated / Standard / Low Concern) and four headline metrics:
- Number of direct subprocessors (vendors the app shares data with)
- Estimated downstream vendors (the transitive chain — subprocessors' subprocessors)
- Number of trackers detected via Exodus Privacy static analysis
- Number of discrepancies between declared and detected data practices

**Data flow diagram** — An auto-generated visual map of the full data ecosystem: which third-party services receive student data, organized by layer (upstream infrastructure, analytics, advertising SDKs, authentication, LMS integrations, rostering services, student information systems, and state education data pipelines).

**Company ownership** — Who actually owns the vendor: parent company, acquisition history, private equity involvement. This is often the most important finding for long-term data governance.

**Subprocessor table** — Every identified vendor with data access: purpose, data types handled, country of operation, and whether they were disclosed by the vendor or independently detected.

**Discrepancies flagged** — Side-by-side comparison of what the vendor declares in their documents versus what static analysis and independent sources detect. High / medium / low severity. This is the section that changes procurement conversations.

**Tracker detection** — Results from Exodus Privacy's static Android APK analysis, showing embedded tracking SDKs inside the app's compiled code.

**Vendor questions** — 5–8 specific, pointed questions generated from the actual gaps in the vendor's disclosures. These are tied to findings, not boilerplate, so a procurement officer walks into the pitch meeting with concrete items the vendor must address.

**Human-in-the-loop checklist** — An honest accounting of what this tool cannot do: dynamic traffic capture, legal interpretation of DPA clauses, evaluation of contractual adequacy under FERPA/COPPA for a specific district's context.

**Citations** — Every major finding links to a source URL the agent actually visited: the privacy policy page, App Store privacy label, Play Store Data Safety section, Exodus Privacy result, BuiltWith technology detection, engineering blog, or acquisition announcement.

---

## Significance as a Research and Accountability Tool

### EdTech Accountability

The edtech industry operates in a trust gap: schools trust that vendors are complying with their stated data practices, and vendors trust that schools are not looking closely enough to notice when they aren't. This tool makes looking closely cheap enough that it can happen routinely, not just when a breach or a lawsuit forces the issue.

By surfacing the subprocessor chain — the full network of vendors that handle student data downstream of the primary vendor — this tool makes visible a part of the edtech data economy that has been effectively invisible. When a school contracts with a learning management system, it may be unknowingly contracting with dozens of analytics providers, an AI model training pipeline, and a cloud infrastructure stack that collectively have more access to student data than the vendor itself.

### Children's Privacy and Human Rights

Children's data is categorically more sensitive than adult data. Children cannot consent on their own behalf. Their data, once collected, can follow them for decades — through college admissions, employment screening, credit decisions, and insurance underwriting systems that may incorporate behavioral and academic profiles from childhood. The legal frameworks that exist — COPPA, FERPA, state student privacy laws — impose obligations, but enforcement is reactive and resource-constrained.

This tool operationalizes preventive scrutiny. By detecting undisclosed trackers, identifying AI/ML tools processing student-generated content, and flagging ownership changes that may have altered original data commitments, it gives advocates, parents, researchers, and policy makers the raw material to identify compliance failures before they become harms.

The downstream data flow mapping — from an edtech app through rostering services, LMS integrations, student information systems, and state education data warehouses — is particularly significant from a human rights perspective. It makes the surveillance infrastructure of education visible, in a form that is legible to non-technical stakeholders.

### AI Governance

The deployment of AI and machine learning tools inside edtech products is one of the most significant and least disclosed developments in the sector. AI-powered grading, adaptive learning, behavioral monitoring, and content generation tools process student work, capture interaction patterns, and in some cases use that data to train or fine-tune models. Privacy policies written before the current generation of AI tools rarely adequately disclose these uses.

This tool specifically investigates AI and ML tool use as part of its research plan: searching for OpenAI, Anthropic, Google Gemini, and other model provider integrations; looking for disclosures in engineering blogs, job listings, and technical documentation; and flagging any AI vendor found in the subprocessor chain that was not disclosed in the privacy policy. It generates targeted questions around model training data use and data residency for any AI tool detected.

### Procurement Officers and Institutional Decision-Making

The primary practical audience for this tool is the person who has to make a procurement decision. That person often has no technical background in data systems, no legal support, and no time. This tool gives them:

- A dossier on the vendor, ready before the pitch meeting
- Specific questions the vendor must answer, derived from actual gaps
- A visual map of the data ecosystem they are authorizing
- A flag when the vendor's parent company has changed since the original contract
- An honest list of what still requires human verification before signing

This changes the negotiating dynamic. A vendor that knows the school has already identified three undisclosed subprocessors and an unverified AI tool integration is in a different conversation than one that expects the school to accept the privacy policy summary at face value.

For school boards, district technology directors, and state procurement offices, this tool can be integrated into vendor evaluation workflows as a standard pre-screening step — substantially raising the floor of scrutiny without proportionally raising the cost.

### Research and Policy

For researchers studying the edtech data economy, this tool provides a repeatable, documented methodology for mapping vendor data practices. The citation system records every source visited during an analysis, creating an auditable research trail. The structured output format enables comparison across vendors, districts, and time.

For policy makers, the tool surfaces patterns that are difficult to see in individual vendor evaluations but become visible at scale: which analytics providers appear across most edtech tools, which AI services are embedded without disclosure, which acquisition events have transferred large volumes of student data to new corporate owners.

---

## How It Works

The system is an AI agent (Google Gemini 2.5 Flash) with four tools:

| Tool | What it does |
|---|---|
| `search_web` | Brave Search API — finds privacy policy URLs, DPAs, subprocessor lists, acquisition news |
| `fetch_page` | Fetches and strips HTML from any URL — reads the actual documents |
| `lookup_exodus` | Queries the Exodus Privacy API for detected trackers in the Android APK |
| `lookup_appstore` | Queries the iTunes Search API for App Store metadata and declared privacy labels |

The agent runs a structured 30-step research protocol across six phases:

1. **Official disclosure documents** — privacy policy, DPA, subprocessor list, App Store privacy label, Play Store Data Safety section
2. **Infrastructure** — cloud hosting, CDN, security certifications
3. **Analytics, tracking, and AI/ML tools** — embedded SDKs, error monitoring, generative AI integrations
4. **Communication and video tools** — support platforms, email providers, video hosting
5. **Downstream integrations** — rostering services (Clever, ClassLink), LMS connections (Google Classroom, Canvas), student information system integrations (PowerSchool, Infinite Campus)
6. **Company ownership** — parent company, acquisition history, private equity involvement

The agent makes 20–40 tool calls per analysis, cross-references declared versus detected third parties, and generates a structured JSON report rendered in the UI with the diagram, tables, and question list.

### What the agent cannot do

- **Dynamic traffic analysis**: Observing what data the app actually transmits during a live session requires a physical test device, a logged-in student account, and tools like TrackerControl or mitmproxy. The agent can prepare a test plan, but cannot perform the capture.
- **Legal interpretation**: The tool flags DPA clauses that deviate from common templates. Whether a deviation is legally adequate under FERPA/COPPA for your district's specific context requires counsel.
- **Vendor intent**: The tool reports what is and isn't disclosed. It does not adjudicate whether undisclosed practices are intentional or negligent.
- **Real-time data**: Analysis reflects public disclosures as of the analysis date. Vendors can update their documents at any time.

---

## Setup

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com)
- A [Brave Search API key](https://brave.com/search/api/) — free tier (2,000 queries/month) is sufficient for most use

### Installation

```bash
git clone https://github.com/royapakzad/vendor-data-flow.git
cd vendor-data-flow
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```
GEMINI_API_KEY=...
BRAVE_SEARCH_API_KEY=BSA...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploying to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/royapakzad/vendor-data-flow)

Add `GEMINI_API_KEY` and `BRAVE_SEARCH_API_KEY` as environment variables in your Vercel project settings. The Vercel free tier's 60-second function timeout may be hit on longer analyses — upgrading to Pro (300s timeout) is recommended for production use.

---

## Tech Stack

- **Next.js 14** (App Router) — frontend and API routes
- **Google Gemini 2.5 Flash** — AI agent with tool use and multi-step research
- **Mermaid.js** — client-side data flow diagram rendering
- **Tailwind CSS** — styling
- **Exodus Privacy API** — Android tracker detection
- **iTunes Search API** — App Store metadata (no key required)
- **Brave Search API** — web search

---

## Limitations and Honest Notes

This tool produces findings from public disclosures and static analysis. It does not have access to a vendor's internal systems, audit logs, or contractual arrangements with their subprocessors. A vendor can update their documents at any time; this tool reads them as of the analysis date.

The subprocessor chain expansion is one level deep for most vendors — the actual downstream chain is often longer. The discrepancy flagging is probabilistic: a tracker SDK appearing in Exodus but not in the subprocessor list may have a legitimate explanation (bundled in a dependency, not a direct integration). Use discrepancy findings as a starting point for questions, not as evidence of wrongdoing.

The tool is most useful as a forcing function: it gives a procurement officer a structured dossier on a vendor before the meeting, not as a substitute for legal review, dynamic traffic analysis, or contractual due diligence.

---

## Context

Built to address the structural asymmetry between vendors who have full-time privacy and legal teams and the schools evaluating them — often a single person splitting procurement responsibilities across dozens of tools and an impossible calendar. The goal is not to replace legal counsel or technical audits, but to make the preliminary investigative work cheap enough and fast enough that it becomes a standard part of how schools evaluate the tools they bring into classrooms.

Student data deserves the same scrutiny that financial data gets in banking and medical data gets in healthcare. This tool is a step toward making that scrutiny routine.

---

## License

MIT
