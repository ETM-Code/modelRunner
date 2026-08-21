# Codex Dashboard Check - final.html

Date: 2026-05-25  
Reviewed files: `dashboard/final.html`, `research/44-codex-round3.md`, plus Play 24/31 and their critics where needed.

## Bottom line

The dashboard is fundamentally sound in strategic direction. It correctly captures the Round 3 decision: execute a merged Play 24 + Play 31, with support/customer-ops as the wedge and Claude/CSB workflows as expansion only after trust and data access exist.

It is not yet clean enough to ship as a "final committed play" because several details are materially wrong or overstated:

- The calendar is wrong. Today is Monday 2026-05-25; May 26 is Tuesday, not Monday.
- The 12-month table contradicts the synthesis by showing `$80K MRR / ~$960K ARR` at month 12, while the Round 3 synthesis says the honest base case is `$500K-$800K ARR run-rate by month 12` and `$1M run-rate in months 14-20`.
- The sources card mislabels some claims, especially Intercom Fin, Google Postmaster, and Gorgias AI pricing.
- The dashboard understates the main structural risk: the wedge can get squeezed from both sides by self-serve platform improvements and managed-service competitors like Crescendo/Tidio/Gorgias partners.
- The 14-day kickoff is mostly executable but too compressed for one solo operator unless the first two weeks are explicitly a quality-test sprint, not a full sales machine.

## Accuracy check

- `§01 - Why this won`: "Every steelmanned play had its $1M-Y1 claim downgraded" is directionally true, but the next sentence, "honest realistic range across all plays is $275-500K cash Y1," is too broad. The Round 3 ranking itself lists several higher Y1 honest run-rate/cash estimates, including the selected merged play at `$500K-$800K ARR`, Play 10 at `$400K-$700K`, and Play 25 / Play 17 at `$600K-$720K`. Change this to: "Most $1M-in-year-1 claims were downgraded; the selected play's base case is $500K-$800K ARR run-rate by month 12."

- `§01 - Why support is the wedge`: "ROI in a week" overstates the synthesis. Round 3 says the buyer understands ROI quickly and that early before/after indicators can appear early. It does not prove full ROI inside seven days. Use "leading indicators in a week; measurable before/after by 30-60 days."

- `§01 - Why Claude workflows are the expansion`: The dashboard says ARPA expands to `$10K+/mo over 6-12 months`. This is plausible, but it should be framed as the upside path, not a normal account progression. The Round 3 synthesis says Play 31 is the expansion surface, but it also says Play 31 was killed as a standalone wedge because CSB is too diffuse and the partner-directory story is weak.

- `§02 - The offer`: Pricing mostly matches the Round 3 recommendation: `$2.5K` paid audit, `$7.5K` setup, `$2.5K/mo` base retainer, `$5K-$7.5K/mo` high-volume tier. Tier 3 is a reasonable addition, but "Claude for Small Business workflow library" should not imply the client is buying a scarce CSB setup. The critic found CSB is a low-friction toggle/no-extra-charge feature; the paid value is custom workflows, MCP bridges, risk controls, and ongoing tuning.

- `§03 - Monday May 26`: Wrong date. If the plan starts today, it should say `Mon May 25 -> Sun Jun 7`. If the plan starts tomorrow, it should say `Tue May 26 -> Mon Jun 8`. Every weekday label in the kickoff sequence is currently shifted.

- `§03`: "Subject lines that work (2026 verified)" is too strong. The source material supports deliverability caution and avoiding deceptive `Re:`/`Fwd:` threads, but "anything with AI in subject = auto-skipped" and "`quick chat?` auto-filtered" are not verified facts. Reframe as internal copy guidance: "avoid these in cold outreach."

- `§04`: Kill/confirm thresholds accurately reflect Round 3: 30 Loom audits, 6 meaningful replies, 3 qualified calls, 1 paid audit/setup; paid access within 7 days; under 40 founder hours without bespoke integration before value.

- `§05 - 12-month build`: This is the largest internal contradiction. The table shows month 12 at `8 Tier 1 + 6 Tier 2 + 3 Tier 3 = $80K MRR = ~$960K ARR`. That is arithmetically correct using the dashboard's own tier averages, but it contradicts the synthesis, which says `$1M run-rate in months 14-20`, not month 12. Either relabel the table as an aggressive stretch case, or change month 12 to roughly `$42K-$67K MRR` and move `$80K MRR` to months 14-18.

- `§05`: The section title says "Solo -> 3-person team," while the month 12 row says "4-person." Fix the team count. The Round 3 synthesis only requires one delivery hire by month 6-8; extra hires may be needed, but then the model should budget them.

- `§05`: "Month 6 ... receive Partner Network decision (free, ~60 days from application)" conflicts with `§03`, which says apply on day 1. A 60-day decision from May 25/26 lands in late July, not month 6. Also, the Play 31 critic says the directory should be treated as a credibility badge, not a lead source. Keep it parallel, but stop anchoring the operating timeline around it.

- `§06 - Stack`: "Gorgias AI $24-300/mo per agent" is wrong. Gorgias's own May 2026 AI Agent pricing says it is priced per resolved interaction, not per seat or per message; most plans are `$0.90` per resolved interaction, Starter begins at `$1`, and plans include interaction allotments from 90 to 2,500+ ([Gorgias](https://www.gorgias.com/blog/ai-agent-pricing)). Replace the pricing row.

- `§07 - Pivot paths`: The triggers are directionally reasonable, but missing a nearer pivot: if the support wedge gets replies but pricing/access stalls, first narrow to high-volume Gorgias/Zendesk Shopify brands and pursue Gorgias/Intercom partner credibility before jumping to Brokr or AI Engineer.

- `§08`: The ranking reflects Round 3 accurately. The issue is consistency: this section's Y1 numbers prove that the earlier "honest range across all plays is $275-500K" claim is wrong.

## Completeness check - what is missing from the synthesis/critics

- **Crescendo is missing.** The Play 24 critic identifies Crescendo as the head-on managed-service competitor: roughly `$2,900/mo` fixed managed services plus per-resolution pricing, with onboarding, QA, training, CX insights, and ongoing maintenance. The dashboard mentions Sierra/Decagon, but they are less relevant to this ICP than Crescendo.

- **Tidio Lyro / bottom-of-ICP self-serve risk is missing.** The critic says the bottom of the Shopify ICP can compare this offer to cheap self-serve products that claim high deflection with fast setup. This is why the Round 3 ICP moved toward Shopify `$5M-$25M GMV`, not `$1M-$5M` stores.

- **Fin/Gorgias self-management risk is underplayed.** Fin 3 Procedures, Simulations, and AI-assisted procedure drafting reduce the operator's implementation delta. The dashboard says "mature tooling rails" but should say those same rails are also commoditization risk.

- **Partner ecosystem competition is missing.** Gorgias, Intercom, and Anthropic all have partner ecosystems or service partners. The operator is not first; the wedge is founder-led specificity, not empty market.

- **No explicit "no fake tickets" rule.** Final.html mostly uses public help-center audits, which is better than Play 24's original fake-test-ticket mechanic. Still, the dashboard should explicitly say: do not submit fake tickets; use public KB/reviews and clearly label assumptions. That was a key critic correction.

- **Security/data-access pack is missing.** Since a kill criterion requires paid access within 7 days, the kickoff needs a basic access checklist, DPA/security note, data handling policy, and permission-scoped onboarding flow. Otherwise the trust/access gate is under-built.

- **Delivery SOP and case-study permission are under-specified.** The Day 60 milestones mention SOPs, but the 14-day kickoff should create the first reusable audit template, before/after report template, MSA/SOW, case-study consent clause, and client access checklist before the first close.

## Source verification

- **Intercom Fin 67% claim:** The dashboard's linked Fin 3 article says `66%` across `6,000+` customers as of Oct 2025. The correct official source for `67%` and `7,000+ teams` is Intercom's March 12, 2026 "From resolutions to outcomes" post ([Intercom](https://www.intercom.com/blog/from-resolutions-to-outcomes-evolving-how-fin-delivers-value/)). Change the link and wording.

- **Decagon `$250M / $4.5B`:** Confirmed. BusinessWire/Decagon says `$250M` Series D and valuation tripled to `$4.5B`, with 100+ new enterprise customers in 2025 ([BusinessWire mirror](https://markets.financialcontent.com/stocks/article/bizwire-2026-1-28-decagons-valuation-triples-to-45-billion-as-it-ushers-in-the-age-of-ai-concierge)). TechCrunch also confirms the later tender at `$4.5B` and references the Series D ([TechCrunch](https://techcrunch.com/2026/03/04/decagon-completes-first-tender-offer-at-4-5b-valuation/)). Replace the Yahoo URL if it is flaky.

- **Sierra `$950M` raise:** Confirmed by TechCrunch: `$950M` led by Tiger Global and GV, post-money valuation above `$15B`, and Sierra had reported `$150M ARR` in February 2026 ([TechCrunch](https://techcrunch.com/2026/05/04/sierra-raises-950m-as-the-race-to-own-enterprise-ai-gets-serious/)). Dashboard wording is fine.

- **Anthropic CSB launch date:** Confirmed: Anthropic's official page is dated May 13, 2026 and describes 15 ready-to-run workflows plus 15 skills ([Anthropic](https://www.anthropic.com/news/claude-for-small-business)). Dashboard wording is fine.

- **Cursor Composer 2.5 pricing:** Confirmed if the dashboard needs it: official Cursor changelog says Standard is `$0.50/M input, $2.50/M output`; Fast default is `$3.00/M input, $15.00/M output` ([Cursor](https://cursor.com/changelog/composer-2-5)). The dashboard does not currently surface these numbers, so either add the actual numbers or remove the source link.

- **Google Postmaster threshold:** The dashboard label "`<0.10% spam threshold`" is incomplete. Google's sender guidelines page says keep Postmaster spam rates below `0.30%`; Google's FAQ says keep below `0.1%` and prevent ever reaching `0.3%` or higher ([Guidelines](https://support.google.com/a/answer/81126), [FAQ](https://support.google.com/a/answer/14229414)). Change to: "target <0.10%; hard danger zone >=0.30%."

- **Gorgias AI pricing range:** The dashboard is wrong. Use the Gorgias source above: per resolved interaction, not per agent.

## Logic check

The offer pricing aligns with Codex Round 3. The problem is the build table. The table's `$80K MRR` math adds up, but it belongs to the `$1M run-rate` target window, not month 12. The dashboard cannot simultaneously say:

- base case month 12 is `$500K-$800K ARR`;
- `$1M ARR` is month 14-20;
- month 12 is `$80K MRR / ~$960K ARR`.

Pick one. The synthesis supports the first two, not the third.

## Hidden structural risk

The merged play can fail by becoming a thin wrapper around other people's platforms. Support is a sharp wedge, but Fin/Gorgias/Zendesk are actively making setup easier. Claude/CSB is useful expansion, but the partner directory is not an SMB lead engine and CSB itself is a toggle, not a scarce deployment. The dashboard should say the durable business is not "AI setup"; it is customer-ops outcomes, recurring tuning, escalation design, revenue recovery, and cross-system workflow ownership.

## 14-day kickoff realism

Mostly realistic if the goal is signal, not volume. The unrealistic parts are:

- 100 hand-curated prospects with ad spend, recent launches, helpdesk, reviews, contacts, and tool stack in one day is too much unless using cached tools and accepting rough data.
- First 10 personalized Looms at 8-12 minutes total each is too low. A genuinely useful audit/prototype is more like 45-60 minutes early on.
- Smartlead warmup starts after the first manual sends. Infrastructure should be authenticated and warming before outreach, even if manual Loom DM is primary.
- The plan lacks contract, DPA/access, onboarding checklist, and baseline KPI template before asking for payment/access.

## Priority edit punch list

1. In hero and `§03`, change "Monday May 26" to either "Monday May 25" or "Tuesday May 26" because today is Monday 2026-05-25.
2. In `§05`, move `$80K MRR / ~$960K ARR` from month 12 to month 14-18, or relabel it as a stretch case, because Round 3 says month 12 base is `$500K-$800K ARR` and `$1M` is months 14-20.
3. In `§09`, replace the Intercom Fin 3 link/label with the March 12 Intercom outcomes post because that is the official source for `67%` and `7,000+`.
4. In `§06`, replace "Gorgias AI $24-300/mo per agent" with "Gorgias AI Agent: most plans `$0.90` per resolved interaction; Starter `$1`; no seat/per-message pricing" because Gorgias's own pricing page says so.
5. In `§09`, change "Google Postmaster <0.10% spam threshold" to "target <0.10%; avoid ever reaching >=0.30%" because Google's guidelines/FAQ distinguish target and hard threshold.
6. In `§01`, change "ROI in a week" to "leading indicators in a week; measurable before/after by 30-60 days" because the synthesis did not prove full ROI in seven days.
7. In `§01`, change "honest realistic range across all plays is $275-500K cash Y1" to "most $1M-in-year-1 claims were downgraded" because the ranking table itself lists higher honest Y1 outcomes.
8. In `§03`, add "no fake support tickets; use public KB/reviews and label assumptions" because the Play 24 critic flagged the fake-ticket tactic as reputational/GDPR risk.
9. In `§03`, add day-1 deliverables for MSA/SOW, DPA/access checklist, KPI baseline sheet, and case-study consent because paid access is a core kill/confirm gate.
10. In `§01` or `§06`, add a competitor-risk card naming Crescendo, Tidio Lyro, Gorgias/Intercom partners, and Fin self-service features because this is the main understated structural risk.
11. In `§05`, reconcile "Solo -> 3-person team" with the month 12 "4-person" row and budget the extra hires if the aggressive path remains.
12. In `§07`, add a near pivot: "if replies are good but access/pricing stalls, narrow to high-volume Gorgias/Zendesk Shopify brands and pursue Gorgias/Intercom partner credibility before switching plays."
13. In `§09`, replace the Yahoo Decagon URL with Decagon/BusinessWire or TechCrunch because the claim is confirmed but the current URL is brittle.
14. In `§03`, downgrade "Subject lines that work (2026 verified)" to "copy rules to test" because the exact "auto-skipped/auto-filtered" claims are not verified in the underlying research.
15. In `§05`, fix the Partner Network timing: if applying day 1, a 60-day response is month 2-3, not month 6; also keep it framed as credibility, not distribution.
