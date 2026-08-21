# Codex Second Opinion on the 9 AI Frontier Plays

Prepared 2026-05-24 as an independent second-opinion review of files `10-play` through `18-play` in `/Users/eoghancollins/claudeHome/ai-frontier-2026/research/`.

## Executive View

Your revised ranking is directionally right on early revenue, but slightly too binary on “drop SaaS.” The correct distinction is not services versus SaaS. It is **cash wedge now versus product endpoint later**. The SaaS briefings as written are too slow for a sub-$20K bootstrap path, but some of those ideas have service-first variants that preserve the $1M+ upside while generating cash in weeks. In particular, Capstan should not be dropped as “MCP SaaS”; it should be reframed as **MCP/security implementation and audit work with an OSS/product option**.

My top three from the evaluated nine are:

1. **AI Engineer on Retainer**, but stripped of YC/Thiel dependency and sold as “agent ops + reviewed PR throughput” to funded AI startups with painful shipping bottlenecks.
2. **Sherlock OSINT/M&A Diligence**, because the market, ticket size, and workflow are better verified than most of the list, though it has credibility and liability risk.
3. **Capstan MCP Security/Gateway**, not as pure SaaS, but as paid MCP security audits and gateway deployments that can later become the product.

If forced to execute one play as a solo Irish technical founder under these constraints, I would execute **AI Engineer on Retainer** for the first 60 days, with a hard pivot test into Capstan if the market says “we need safer agents/MCPs” more than “we need you to ship features.”

## Verification Summary: What Held Up

The strongest parts of the AI-engineer case verify well. Cursor’s own documentation confirms asynchronous background agents running in isolated Ubuntu machines with GitHub handoff and remote execution (`https://docs.cursor.com/en/background-agents`). Cursor’s blog says more than 30% of its internal merged PRs are now created by autonomous cloud agents (`https://cursor.com/blog/agent-computer-use`) and later frames the figure as “more than one-third” (`https://cursor.com/blog/third-era`). Cursor’s Composer 2.5 pricing is also primary-verified at $0.50/M input and $2.50/M output for Standard (`https://cursor.com/changelog/composer-2-5`). OpenAI’s Codex positioning also holds: Codex is described as a cloud coding agent that works on many tasks in parallel, each in its own sandbox (`https://openai.com/index/introducing-codex/`), and the newer Codex app is explicitly a multi-agent command center (`https://openai.com/index/introducing-the-codex-app/`).

The healthcare vertical-SaaS claims also have real anchors. US Oral Surgery Management publishes the “approximately 7,500 oral surgeons” and “94% operate independently” claim (`https://www.usosm.com/`). AAOMS confirms the 2026 Seattle meeting and 35-plus practice-management sessions (`https://aaoms.org/2026-annual-meeting/`). Open Dental’s official order page confirms the $179/month first-year and $129/month after 12 months pricing (`https://www.opendental.com/site/order.html`). Anthropic’s BAA page supports the broad claim that HIPAA-ready commercial services exist, but with an important caveat: the BAA does **not** cover every feature, and API PHI usage requires an administrator-signed BAA plus sales activation (`https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers`).

The M&A diligence market is one of the best-verified plays. BizBuySell reports 9,586 small-business transactions and $7.95B enterprise value in 2025 (`https://www.bizbuysell.com/blog/2025-year-in-review/`). Stanford confirms the 2024 Search Fund Study exists and covers funds formed through 2023 (`https://www.gsb.stanford.edu/faculty-research/case-studies/2024-search-fund-study`), and the PDF-mirrored table gives the $14.4M median 2022-2023 purchase price (`https://novastone-ca.com/wp-content/uploads/2025/06/2024_Stanford_Search_Fund_Study.pdf`). Rapid Diligence’s own site confirms the 3-4 week QoE turnaround, though I did not find the $8,900 price on the home page during this pass (`https://rapiddiligence.com/`). This market exists, pays for diligence, and has an obvious price gap below Big-4 work.

Insurance extraction also has a credible pain surface. Patra’s own page confirms Quote Compare AI supports 12 commercial lines representing about 85% of commercial premium volume and is available in self-service, AI-only, and full-service modes (`https://www.patracorp.com/insurance-outsourcing-services/insurance-quote-comparison/`). Patra also announced SaaS subscription plans starting at $99/month with a 14-day trial (`https://www.patracorp.com/resources/press-releases/patras-ai-platform-benefits-all-insurance-groups/`). The Big “I” Agency Universe Study exists on the official Independent Agent site (`https://www.independentagent.com/research/agencyuniversestudy/agency-universe.aspx`), and AgencyEquity’s summary supports the “51.6% under $500K revenue” claim (`https://www.agencyequity.com/agency-management/the-average-size-of-independent-agencies-is-growing`).

Voice AI has real category validation. Vapi’s own Series B post says it raised $50M, has handled more than a billion calls, and that Ring went to 100% inbound on Vapi in two weeks (`https://vapi.ai/blog/series-b`). TechCrunch independently reports the same Ring/Vapi story and $500M valuation (`https://techcrunch.com/2026/05/12/vapi-hits-500m-valuation-as-amazon-ring-chose-its-ai-platform-over-40-rivals/`). Retell’s pricing page verifies pay-as-you-go voice-agent pricing (`https://www.retellai.com/pricing`), and Retell’s HIPAA post claims pay-as-you-go HIPAA availability with a BAA (`https://www.retellai.com/blog/hipaa-compliant-voice-ai-without-enterprise-contract`). Becker’s confirms the Future of Dentistry Roundtable and the 90-plus DSO speaker claim (`https://conferences.beckershospitalreview.com/Dentistry-2026`).

Creative-market infrastructure also partly checks out. Google officially announced Gemini Omni Flash for video creation/editing across Gemini, Google Flow, and YouTube Shorts (`https://blog.google/innovation-and-ai/technology/ai/google-io-2026-all-our-announcements/` and `https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates/`). OpenAI’s docs list `gpt-image-1.5` as the current state-of-the-art GPT Image API model, not “GPT Image 2” (`https://platform.openai.com/docs/guides/image-generation`). Admiral’s AI UGC price card verifies €4,000/month for 20 video ads and €21,500/month for 80 (`https://admiral.media/ai-ugc-agency/`). Darkroom’s own writing confirms $10K-$15K/month agency retainer bands and 20-40 static assets/month for scaled DTC creative (`https://www.darkroomagency.com/observatory/in-house-vs-agency-creative-dtc-2026`). Cannes Lions confirms AI Craft was added to Film Craft for 2026 (`https://www.canneslions.com/awards/lions/film-craft/what-you-need-to-know`), and SAG-AFTRA’s AI resources confirm AI rights remain a live legal/commercial issue (`https://www.sagaftra.org/contracts-industry-resources/member-resources/artificial-intelligence`).

## Claims That Do Not Hold Up Cleanly

The YC W26 claims are not primary-sourced enough to be load-bearing. I found many secondary pages repeating “14 companies hit $1M ARR,” including ByteIota and AgentMarketCap, and one source says “according to Garry Tan,” but YC’s own public Demo Day and blog pages did not verify the full bundle of 199 companies, 88% AI-first, 56 autonomous-agent companies, and 14 pre-demo-day $1M ARR companies (`https://www.ycombinator.com/demoday/`, `https://www.ycombinator.com/blog`, `https://www.ycombinator.com/companies/industry/artificial-intelligence`). Treat the YC claims as useful color, not market proof.

Several model claims are stretched. The briefs repeatedly reference “Claude Opus 4.7” with 1M context and $5/$25 pricing. Anthropic’s official pricing page surfaced Claude Opus 4.1/4-era pricing in search, and I did not find an official Opus 4.7 source during this verification (`https://docs.anthropic.com/en/docs/about-claude/pricing`). Given your AGENTS.md current-model list says Anthropic current versions are `claude-opus-4-6`, `claude-sonnet-4-6`, and `claude-haiku-4-6`, I would mark Opus 4.7-specific unit economics as unverified or wrong.

The creative briefs also use “GPT Image 2” as if it is the API model. OpenAI’s primary docs list `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`, while OpenAI has a consumer-facing “ChatGPT Images 2.0” launch (`https://openai.com/index/introducing-chatgpt-images-2-0/`). That matters because pricing and API behavior should be modeled from `gpt-image-1.5`, not a presumed `gpt-image-2` API.

The Premium Commercial brief’s “Veo 3.1” claims are weak. Google officially announced Gemini Omni in May 2026 and had earlier announced Veo 3 access, but I did not find a primary Google source for “Veo 3.1 ranks first on MovieGenBench and VBench” in this pass (`https://blog.google/products/gemini/photo-to-video/`, `https://blog.google/innovation-and-ai/technology/ai/google-io-2026-all-our-announcements/`). The premium studio thesis can survive without that, but the exact benchmark claims should not be repeated.

For Capstan, the security-crisis direction checks out, but not every source is primary. NVD verifies the Windsurf MCP zero-click RCE record (`https://nvd.nist.gov/vuln/detail/CVE-2026-30615`). The MCP roadmap and Streamable HTTP direction are official (`https://modelcontextprotocol.io/development/roadmap`, `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports`, `https://blog.modelcontextprotocol.io/tags/release/`). The “200,000 servers” claim comes through OX/VentureBeat-type reporting rather than Anthropic itself (`https://venturebeat.com/security/mcp-stdio-flaw-200000-ai-agent-servers-exposed-ox-security-audit`). Strong enough to justify a security-service wedge; not strong enough to build the whole business on a single “Anthropic refused to fix it” line.

## Methodology Challenge

Your early-revenue criterion is right. With under $20K, you cannot wait 9-18 months for a neat SaaS curve. But the current ranking risks overcorrecting by demoting every product play instead of asking whether it has a **paid manual/service wedge**.

A better scoring model:

1. **First-dollar path:** can money arrive in 14-30 days?
2. **Recurring conversion:** can first-dollar work turn into monthly revenue rather than one-off projects?
3. **Operator proof:** can you credibly sell it without invented credentials?
4. **Fulfillment risk at 50-60 hours/week:** can you deliver without hidden 70-hour weeks?
5. **Option value:** does the work create a compounding asset, not just invoices?

On this scoring, dropping QuoteStack and Capstan as pure SaaS is correct. Dropping their service-first variants is not. “I will build an insurance extraction SaaS and wait for self-serve trials” is too slow. “Send us your 10 ugliest quote packets and we will produce carrier comparisons this week for $1,500-$3,000” is a legitimate cash wedge. Same for Capstan: “$10K MCP exposure audit and gateway deployment” is much more bootstrap-compatible than $199/month dev-tool SaaS.

## My Ranking of the Nine

**1. AI Engineer on Retainer.** Best immediate fit and best path to recurring revenue. The primary sources verify the capability shift: Cursor, Codex, and Composer pricing have made supervised agent orchestration a real labor substitute. The brief’s biggest weakness is over-reliance on YC/Thiel and overpromising “40 PRs/month.” The stronger offer is narrower: two-week paid agent-ops audit, then a retainer for reviewed PR throughput, CI hardening, backlog decomposition, and agent-runbook maintenance. Sell to founders already using Cursor/Claude/Codex but drowning in review debt.

**2. Sherlock.** I like this more after verification. The buyer market is real, the ticket size is high, and the output format is well matched to AI-assisted research. It is not ARR in the strict SaaS sense, but retainers can be real recurring revenue. The reasons I do not put it first: credibility is thinner, liability is sharper, and the work can become analyst QA rather than build+sales. But as a cash business, it is under-rated.

**3. Capstan, service-first.** As pure SaaS, it is too slow. As MCP security audit/deployment, it might be the hidden gem. The MCP security surface is real enough, procurement anxiety is rising, and you have actual daily agent/MCP context. Package it as: audit existing MCP/agent tool use, write policy, deploy gateway/shim/logging, produce a SOC 2 evidence pack. Charge $7.5K-$20K per engagement. Productize later.

**4. DTC Creative for Home Goods.** Fast first dollar, but less founder-specific than the briefing claims. The market pricing anchors are real. The moat is weak, churn risk is high, and it depends on public creative taste you have not yet proven. It belongs in the top half because it can get paid quickly, but I would not choose it over AI Engineer or Sherlock.

**5. QuoteStack.** Good market, good pain, bad initial motion if built as SaaS. Patra validates demand and also validates competition. A managed-service quote-comparison wedge could work; a self-serve vertical SaaS build is too slow for the stated cash constraint.

**6. Eltrus to OMS SaaS.** The existing deployment is a real asset, but the revised reality matters: Eltrus is a small custom CRUD database for one surgical practice, not a productized SaaS or AI platform. Healthcare software migration, HIPAA paperwork, support, and trust make this slower than the briefing admits. Keep it as a long option, not the immediate $1M ARR path.

**7. B2B Medical AI Services.** The market is huge, but the brief underestimates compliance, malpractice, EHR integration, and procurement. Abridge’s traction proves the category; it does not prove a solo Irish founder can close 20-provider specialty groups quickly. This is too heavy for the cash constraint unless the current Eltrus customer becomes a paid anchor immediately.

**8. Multi-Location Voice AI for DSOs.** Huge ACV, real category validation, but enterprise sales-cycle risk dominates. The first real production customer could take longer than your cash runway. The “one DSO = $1M ARR” math is seductive but not bootstrap-safe.

**9. Premium AI Commercial Studio.** This has interesting upside, but it is the least evidenced operator fit. Tarski may show taste, but it does not prove motion direction. The expected path includes 12 weeks of spec work before strong signal. Under $20K and early-revenue weighting, that is too speculative.

## Missing Plays

The biggest missing category is **AI sales pipeline implementation for funded AI startups**. Not generic “AI SDR.” The wedge is narrower: build the outbound machine, personalize Loom/mockup flows, install Clay/Apollo/Smartlead-style data plumbing, write the follow-up agents, and run the first 1,000-account campaign. This matches your prior side-project research validating Loom plus personalized mockup outbound. It also pairs naturally with AI Engineer on Retainer: “I can ship product and build your founder-led outbound machine.” The risk is deliverability and performance accountability, but first-dollar speed is very high.

Second missing play: **MCP/agent security audit consultancy**. This is my Capstan service-first variant and is the most important missing reframing.

Third: **AI customer-support deployment for specific B2B SaaS or e-commerce niches**. Intercom, Zendesk, Ada, and others already educate the market, so the solo wedge is implementation, not software. The risk is crowded integrator economics.

Fourth: **niche eval/prompt-risk consultancy** for companies putting agents into regulated workflows. OWASP LLM guidance, NIST AI RMF, EU AI Act obligations, and MCP security concerns create buyer fear. The issue is that many prospects will want brand-name auditors, so this works best when attached to concrete implementation.

Fifth: **AI bookkeeping/ops for e-commerce**. Pilot’s AI Accountant validates the buyer education curve, but bookkeeping is trust-heavy and crowded. I would not prioritize it unless you have a warm e-commerce network.

## Biggest Hidden Risk in AI Engineer on Retainer

The hidden risk is not tool pricing or model limits. It is **trust access to core codebases**. Seed founders may like the idea of an external agent-ops engineer, but the moment it requires repo access, Slack context, production secrets discipline, and PR review authority, the sale becomes closer to hiring a fractional founding engineer than buying a tool. That changes the conversion rate, onboarding friction, and liability. If pilots fail to convert because founders say, “This is useful, but I do not want an outsider inside our core engineering loop,” the #1 ranking changes. In that case, I would move Sherlock or Capstan-service-first above it.

## Biggest Hidden Upside

The hidden upside is **Capstan as consulting-first security infrastructure**. The original SaaS ramp is too slow, but the verified MCP security concern is exactly the kind of narrow, scary, current problem that sells $10K audits before a polished product exists. Every engagement creates gateway code, policies, registry notes, and evidence templates. That is a cleaner bridge from early cash to product value than either DTC creative or QuoteStack.

## Final Recommendation

Execute **AI Engineer on Retainer** first, but do it with sharper constraints:

- No YC/Thiel claims in the core pitch.
- No “40 PRs/month” promise until proven.
- Two-week paid pilot at $3K-$5K.
- Deliverable is a repo-specific agent operating system: `AGENTS.md`, Cursor rules, CI/test gates, backlog decomposition, reviewed PRs, and founder handoff.
- Target founders already using agents and feeling review/coordination pain.
- Track pilot-to-retainer conversion brutally by day 45.

If the first 30 qualified conversations show stronger fear around agent/MCP security than shipping throughput, pivot the same credibility into **Capstan service-first** rather than DTC creative.

**Ranked top 3:** AI Engineer on Retainer; Sherlock OSINT/M&A Diligence; Capstan MCP Security/Gateway as service-first.

**Single play I would actually execute:** AI Engineer on Retainer, with Capstan service-first as the adjacent pivot and productization path.
