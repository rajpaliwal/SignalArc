import type { Story } from "./types";

// Static, hand-authored "world graph" fixtures standing in for the
// discovery -> clustering -> extraction pipeline described in the blueprint.
// Dates are relative to a fixed anchor so the demo reads sensibly regardless
// of when it's opened.

const now = new Date("2026-08-08T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

export const TOPIC_TAXONOMY: { label: string; group: string }[] = [
  { label: "AI Policy", group: "Interests" },
  { label: "Artificial Intelligence", group: "Interests" },
  { label: "Technology Regulation", group: "Interests" },
  { label: "Startups", group: "Interests" },
  { label: "Climate & Energy", group: "Interests" },
  { label: "Economy & Markets", group: "Interests" },
  { label: "Science", group: "Interests" },
  { label: "Cricket", group: "Sports" },
  { label: "Football", group: "Sports" },
  { label: "Tennis", group: "Sports" },
  { label: "Formula 1", group: "Sports" },
  { label: "Olympics", group: "Sports" },
  { label: "Bollywood", group: "Movies & Entertainment" },
  { label: "Hollywood", group: "Movies & Entertainment" },
  { label: "Streaming & TV", group: "Movies & Entertainment" },
  { label: "Music", group: "Movies & Entertainment" },
  { label: "Indian Politics", group: "Political interests" },
  { label: "UK Politics", group: "Political interests" },
  { label: "US Politics", group: "Political interests" },
  { label: "Global Affairs", group: "Political interests" },
  { label: "Elections", group: "Political interests" },
];

export const HOBBY_OPTIONS = [
  "Reading",
  "Photography",
  "Cooking",
  "Hiking",
  "Gaming",
  "Running",
  "Chess",
  "Travel",
];

export const STORIES: Story[] = [
  {
    id: "india-ai-governance-framework",
    title: "India's AI Governance Framework moves to Cabinet",
    summary:
      "India's proposed AI governance framework has cleared inter-ministerial consultation and is headed to Cabinet, with a tiered, risk-based approach similar to the EU AI Act but lighter on high-risk enforcement.",
    currentState:
      "The framework has cleared consultation and awaits Cabinet approval. Industry groups are pushing for a compliance grace period; consumer-rights groups want stronger audit requirements.",
    state: "active",
    topics: ["AI Policy", "Artificial Intelligence", "Technology Regulation", "Indian Politics"],
    places: ["India", "New Delhi"],
    people: ["Ashwini Vaishnaw", "Rajeev Chandrasekhar"],
    organisations: ["MeitY", "NASSCOM", "IndiaAI Mission"],
    updatedAt: hoursAgo(2),
    firstSeenAt: daysAgo(19),
    baseImportance: 0.86,
    baseNovelty: 0.55,
    sources: [
      { id: "s1", name: "MeitY press release", url: "https://example.gov.in/meity/ai-framework", isPrimary: true, publishedAt: hoursAgo(3) },
      { id: "s2", name: "Economic Times", url: "https://example.com/et/ai-framework-cabinet", isPrimary: false, publishedAt: hoursAgo(2) },
      { id: "s3", name: "The Hindu", url: "https://example.com/hindu/ai-framework-analysis", isPrimary: false, publishedAt: hoursAgo(5) },
      { id: "s4", name: "NASSCOM statement", url: "https://example.com/nasscom/ai-framework-response", isPrimary: true, publishedAt: hoursAgo(8) },
    ],
    timeline: [
      {
        id: "t1",
        date: daysAgo(19),
        title: "Draft framework opened for public consultation",
        description: "MeitY published a draft risk-tiered AI governance framework for a 30-day public comment window.",
        status: "observed",
        sourceIds: ["s1"],
      },
      {
        id: "t2",
        date: daysAgo(6),
        title: "Consultation closes with 4,200+ submissions",
        description: "Industry bodies including NASSCOM and several civil-society groups filed formal comments; the bulk concerned audit thresholds for 'high-impact' systems.",
        status: "reported",
        sourceIds: ["s3"],
      },
      {
        id: "t3",
        date: hoursAgo(8),
        title: "NASSCOM requests 18-month compliance runway",
        description: "NASSCOM publicly asked for a phased compliance timeline for mid-sized AI vendors, citing capacity constraints.",
        status: "reported",
        sourceIds: ["s4"],
      },
      {
        id: "t4",
        date: hoursAgo(2),
        title: "Framework forwarded to Cabinet for approval",
        description: "MeitY confirmed the framework has completed inter-ministerial review and is listed for an upcoming Cabinet meeting.",
        status: "observed",
        sourceIds: ["s1", "s2"],
        isLatest: true,
      },
    ],
    decisions: [
      {
        id: "d1",
        decisionMaker: "MeitY",
        text: "Adopt a tiered, risk-based compliance model rather than blanket pre-approval for all AI systems.",
        effectiveDate: daysAgo(19),
        scope: "National — applies to AI systems deployed in India above defined risk thresholds",
      },
    ],
    claims: [
      {
        id: "c1",
        text: "The framework will require independent audits only for 'high-impact' systems (finance, health, elections, critical infrastructure).",
        claimant: "MeitY draft text",
        status: "observed",
        sourceIds: ["s1"],
      },
      {
        id: "c2",
        text: "Compliance costs could disproportionately affect startups without a longer grace period.",
        claimant: "NASSCOM",
        status: "reported",
        sourceIds: ["s4"],
      },
    ],
    outcomes: [],
    disputed: [
      {
        id: "disp1",
        topic: "Whether the grace period should be 6 or 18 months",
        positions: [
          { claim: "6 months is enough given the framework has been public since the draft stage.", sourceIds: ["s3"] },
          { claim: "18 months is needed for mid-sized vendors to build audit tooling.", sourceIds: ["s4"] },
        ],
      },
    ],
    unknowns: ["Exact Cabinet meeting date has not been confirmed.", "Penalty structure for non-compliance is not yet public."],
    corrections: [],
    analysis: {
      summary:
        "This is now a timing question, not a policy-direction question — the tiered, risk-based approach is settled. What's contested is compliance runway and audit scope for mid-sized firms.",
      keyDrivers: [
        "Government wants to avoid an EU AI Act-style compliance shock to India's IT services sector.",
        "NASSCOM's lobbying position has shifted from opposing regulation to negotiating timelines.",
        "Election-adjacent AI use (deepfakes, synthetic media) is pushing urgency on the high-risk tier specifically.",
      ],
      risks: [
        "If Cabinet slips past the current legislative session, implementation could stretch into next year.",
        "A short compliance window could push smaller AI vendors toward non-compliance rather than adaptation.",
      ],
      outlook:
        "Cabinet approval is likely within the current session based on the pace of inter-ministerial review; the compliance-window fight will likely be settled in subordinate rules rather than the primary framework.",
    },
    whatIfSeeds: [
      {
        question: "What if Cabinet rejects the 18-month grace period NASSCOM is asking for?",
        assumptions: ["Framework passes largely as drafted", "Grace period is set at 6 months instead"],
        scenario:
          "Expect a wave of compliance-readiness announcements from larger AI vendors within weeks, and continued lobbying from mid-sized firms for a phased-by-company-size carve-out rather than a blanket extension.",
        confidence: "medium",
      },
      {
        question: "What if the framework stalls before this Cabinet session?",
        assumptions: ["No major political disruption", "MeitY leadership remains stable"],
        scenario:
          "A slip is more likely to be procedural (agenda bandwidth) than substantive at this stage — re-listing for the next session is the most probable outcome, with limited change to the underlying text.",
        confidence: "low",
      },
    ],
  },
  {
    id: "uk-skilled-worker-visa-tech",
    title: "UK tightens skilled worker visa rules for tech roles",
    summary:
      "The Home Office has raised the salary threshold and narrowed the shortage-occupation list for tech roles under the Skilled Worker route, with immediate effect for new applications.",
    currentState:
      "New applications are already subject to the higher threshold. Existing visa holders are unaffected until renewal. Industry groups are seeking a transition carve-out for renewals.",
    state: "breaking",
    topics: ["UK Politics", "Technology Regulation", "Elections"],
    places: ["United Kingdom", "London"],
    people: ["James Cleverly", "Yvette Cooper"],
    organisations: ["Home Office", "TechUK", "Migration Advisory Committee"],
    updatedAt: hoursAgo(1),
    firstSeenAt: daysAgo(3),
    baseImportance: 0.78,
    baseNovelty: 0.82,
    sources: [
      { id: "s1", name: "Home Office statement of changes", url: "https://example.gov.uk/homeoffice/visa-changes", isPrimary: true, publishedAt: hoursAgo(1) },
      { id: "s2", name: "Financial Times", url: "https://example.com/ft/uk-tech-visa-threshold", isPrimary: false, publishedAt: hoursAgo(1) },
      { id: "s3", name: "TechUK response", url: "https://example.com/techuk/visa-statement", isPrimary: true, publishedAt: hoursAgo(0.5) },
    ],
    timeline: [
      {
        id: "t1",
        date: daysAgo(3),
        title: "Migration Advisory Committee recommends threshold review",
        description: "MAC's quarterly report flagged the shortage-occupation list as 'due for narrowing' in software and data roles.",
        status: "reported",
        sourceIds: ["s2"],
      },
      {
        id: "t2",
        date: hoursAgo(1),
        title: "Home Office publishes statement of changes",
        description: "New minimum salary threshold set at £41,700 for tech-classified roles (up from £38,700); several data-analyst SOC codes removed from the shortage list.",
        status: "observed",
        sourceIds: ["s1"],
        isLatest: true,
      },
    ],
    decisions: [
      {
        id: "d1",
        decisionMaker: "Home Office",
        text: "Raise minimum salary threshold for tech-classified Skilled Worker visas and remove select SOC codes from the shortage-occupation list.",
        effectiveDate: hoursAgo(1),
        scope: "New applications only; existing visa holders unaffected until renewal",
      },
    ],
    claims: [
      {
        id: "c1",
        text: "The changes will reduce new tech-sector Skilled Worker approvals by an estimated 15-20% in the first year.",
        claimant: "Financial Times analysis",
        status: "reported",
        sourceIds: ["s2"],
      },
      {
        id: "c2",
        text: "TechUK says the change risks pushing mid-level engineering hiring toward remote-only arrangements.",
        claimant: "TechUK",
        status: "reported",
        sourceIds: ["s3"],
      },
    ],
    outcomes: [],
    disputed: [
      {
        id: "disp1",
        topic: "Whether renewals should be grandfathered under the old threshold",
        positions: [
          { claim: "Renewals should follow the same rules as new applicants to avoid a two-tier system.", sourceIds: ["s1"] },
          { claim: "Renewals should be grandfathered for at least one cycle to avoid disrupting existing teams.", sourceIds: ["s3"] },
        ],
      },
    ],
    unknowns: ["Whether the Migration Advisory Committee will revisit the shortage list again before year-end."],
    corrections: [],
    analysis: {
      summary:
        "A near-term hiring-cost story for London tech employers more than a headline immigration story — the threshold change is targeted, not a broad Skilled Worker route overhaul.",
      keyDrivers: [
        "Net migration figures remain a politically sensitive metric ahead of the next electoral cycle.",
        "MAC's shortage-list review specifically flagged data and software roles as no longer 'shortage' occupations.",
      ],
      risks: [
        "Employers mid-way through active recruitment for tech roles may need to revise offers already made.",
        "A renewal carve-out, if granted, would need Parliamentary time that isn't currently scheduled.",
      ],
      outlook:
        "Expect a formal TechUK/MAC consultation on the renewal question within the quarter; the salary threshold itself is unlikely to be reversed in the near term.",
    },
    whatIfSeeds: [
      {
        question: "What if renewals are not grandfathered?",
        assumptions: ["No new Parliamentary carve-out is introduced"],
        scenario:
          "Expect a measurable uptick in relocation or remote-restructuring announcements from mid-sized tech employers as existing visa holders approach renewal windows, concentrated in data and platform engineering roles.",
        confidence: "medium",
      },
    ],
  },
  {
    id: "uk-india-fta-implementation",
    title: "UK-India Free Trade Agreement enters implementation phase",
    summary:
      "The UK-India FTA, signed earlier this year, has moved into its implementation phase with the first tariff-reduction schedule taking effect and a joint working group established for services and digital trade.",
    currentState:
      "Tariff reductions on the first tranche of goods are in effect. The services and digital-trade chapter — most relevant to tech workers and firms — is still being worked out by a joint committee.",
    state: "slow",
    topics: ["UK Politics", "Indian Politics", "Economy & Markets", "Global Affairs"],
    places: ["United Kingdom", "India"],
    people: ["Piyush Goyal", "Jonathan Reynolds"],
    organisations: ["UK Department for Business and Trade", "Indian Ministry of Commerce"],
    updatedAt: daysAgo(2),
    firstSeenAt: daysAgo(210),
    baseImportance: 0.7,
    baseNovelty: 0.3,
    sources: [
      { id: "s1", name: "UK Dept for Business and Trade bulletin", url: "https://example.gov.uk/dbt/fta-implementation", isPrimary: true, publishedAt: daysAgo(2) },
      { id: "s2", name: "Mint", url: "https://example.com/mint/uk-india-fta-services", isPrimary: false, publishedAt: daysAgo(2) },
      { id: "s3", name: "Reuters", url: "https://example.com/reuters/uk-india-fta-tariffs", isPrimary: false, publishedAt: daysAgo(3) },
    ],
    timeline: [
      {
        id: "t1",
        date: daysAgo(210),
        title: "FTA signed after three years of negotiation",
        description: "Agreement covers goods tariffs, services access, and a framework chapter on digital trade.",
        status: "observed",
        sourceIds: ["s3"],
      },
      {
        id: "t2",
        date: daysAgo(45),
        title: "Ratification completed in both Parliaments",
        description: "Final procedural approvals cleared, setting the implementation date.",
        status: "observed",
        sourceIds: ["s3"],
      },
      {
        id: "t3",
        date: daysAgo(2),
        title: "First tariff-reduction tranche takes effect",
        description: "Reduced tariffs apply to an initial list of goods categories; services and digital-trade chapter implementation is ongoing via joint working group.",
        status: "observed",
        sourceIds: ["s1", "s2"],
        isLatest: true,
      },
    ],
    decisions: [
      {
        id: "d1",
        decisionMaker: "Joint UK-India Trade Committee",
        text: "Phase tariff reductions across three tranches over 18 months rather than a single implementation date.",
        effectiveDate: daysAgo(2),
        scope: "Goods trade; services chapter on a separate implementation track",
      },
    ],
    claims: [
      {
        id: "c1",
        text: "The services chapter could ease short-term intra-company transfer rules for tech professionals, but detailed rules aren't finalised.",
        claimant: "Mint",
        status: "reported",
        sourceIds: ["s2"],
      },
    ],
    outcomes: [
      {
        id: "o1",
        text: "Bilateral goods trade in the first tranche categories rose modestly in early data.",
        metric: "+4.2% quarter-on-quarter (initial estimate)",
        observedAt: daysAgo(2),
        attributionStatus: "reported",
      },
    ],
    disputed: [],
    unknowns: ["No confirmed date yet for when the services and digital-trade chapter rules will be finalised."],
    corrections: [],
    analysis: {
      summary:
        "Slow-moving but structurally significant — the goods side is now routine implementation; the services/digital-trade chapter is the part worth watching if you work in tech and split time between the UK and India.",
      keyDrivers: [
        "Both governments have political incentive to show early wins from a multi-year negotiation.",
        "Services chapter complexity (professional recognition, data flows) makes it the slowest-moving piece by design.",
      ],
      risks: [
        "Momentum could stall if the joint committee's working-level talks lose priority against other trade files.",
      ],
      outlook:
        "Expect incremental, low-drama updates on goods tariffs for the next two tranches, with the services chapter being the more consequential — and slower — thread to follow.",
    },
    whatIfSeeds: [
      {
        question: "What if the services chapter isn't finalised within the 18-month tariff window?",
        assumptions: ["Goods implementation proceeds on schedule"],
        scenario:
          "A delay wouldn't unwind the goods tariff schedule, but it would likely draw criticism from industry bodies on both sides who see professional-services mobility as the FTA's main draw for the tech sector.",
        confidence: "low",
      },
    ],
  },
  {
    id: "bcci-icc-wtc-format-dispute",
    title: "BCCI and ICC clash over World Test Championship format",
    summary:
      "BCCI has formally objected to ICC's proposed two-tier World Test Championship structure, arguing it would reduce fixtures against lower-ranked boards and hurt those boards' revenue.",
    currentState:
      "ICC's working group is due to reconsider the two-tier proposal after BCCI, along with two other boards, indicated they would not support it in its current form.",
    state: "active",
    topics: ["Cricket", "Indian Politics"],
    places: ["India", "Dubai"],
    people: ["Jay Shah", "Mark Nicholas"],
    organisations: ["BCCI", "ICC", "Cricket West Indies"],
    updatedAt: hoursAgo(14),
    firstSeenAt: daysAgo(11),
    baseImportance: 0.55,
    baseNovelty: 0.6,
    sources: [
      { id: "s1", name: "ESPNcricinfo", url: "https://example.com/espncricinfo/wtc-two-tier", isPrimary: false, publishedAt: hoursAgo(14) },
      { id: "s2", name: "ICC working group note (leaked)", url: "https://example.com/icc/wtc-workinggroup", isPrimary: true, publishedAt: daysAgo(1) },
      { id: "s3", name: "The Cricketer", url: "https://example.com/thecricketer/bcci-objection", isPrimary: false, publishedAt: hoursAgo(20) },
    ],
    timeline: [
      {
        id: "t1",
        date: daysAgo(11),
        title: "ICC working group proposes two-tier WTC structure",
        description: "Draft proposal would split the nine full-member Test nations into two divisions with promotion/relegation.",
        status: "reported",
        sourceIds: ["s2"],
      },
      {
        id: "t2",
        date: daysAgo(1),
        title: "BCCI submits formal objection",
        description: "BCCI's letter to ICC cites reduced fixture guarantees for second-tier boards as the core concern, not competitive format itself.",
        status: "reported",
        sourceIds: ["s3"],
      },
      {
        id: "t3",
        date: hoursAgo(14),
        title: "Cricket West Indies signals alignment with BCCI's position",
        description: "A second full member board publicly echoed concerns about revenue guarantees for lower-tier nations.",
        status: "reported",
        sourceIds: ["s1"],
        isLatest: true,
      },
    ],
    decisions: [],
    claims: [
      {
        id: "c1",
        text: "A two-tier system would cut guaranteed fixtures for second-tier boards by roughly a third.",
        claimant: "ICC working group note",
        status: "disputed",
        sourceIds: ["s2", "s1"],
      },
    ],
    outcomes: [],
    disputed: [
      {
        id: "disp1",
        topic: "Whether the two-tier structure is primarily a competitive-integrity reform or a revenue-redistribution issue",
        positions: [
          { claim: "ICC frames it as improving context and stakes for Test cricket.", sourceIds: ["s2"] },
          { claim: "BCCI and CWI frame it as a fixture-guarantee and revenue issue for smaller boards.", sourceIds: ["s3", "s1"] },
        ],
      },
    ],
    unknowns: ["No confirmed date for when the ICC working group will formally respond to the objections."],
    corrections: [],
    analysis: {
      summary:
        "A governance and revenue dispute dressed up as a format debate — the actual sticking point is fixture and broadcast-revenue guarantees for boards outside the 'big three'.",
      keyDrivers: [
        "BCCI's broadcast revenue leverage gives it effective veto power over structural ICC changes.",
        "Smaller boards depend heavily on guaranteed fixtures against India for revenue.",
      ],
      risks: [
        "Prolonged deadlock could push the WTC's next cycle format decision past the current planning window.",
      ],
      outlook:
        "A watered-down version with softer relegation/promotion stakes and protected minimum fixtures is the more likely landing point than either the original proposal or full withdrawal.",
    },
    whatIfSeeds: [
      {
        question: "What if BCCI's objection forces ICC to withdraw the two-tier proposal entirely?",
        assumptions: ["No compromise fixture-guarantee text is offered"],
        scenario:
          "Expect the current single-table WTC format to continue for at least one more cycle while a revised proposal — likely with protected minimum fixtures for all full members — is drafted.",
        confidence: "medium",
      },
    ],
  },
  {
    id: "bengaluru-gcc-ai-hub",
    title: "Bengaluru emerges as a global capability centre hub for AI labs",
    summary:
      "Several multinational AI labs have expanded Bengaluru-based Global Capability Centres this quarter, shifting from support functions toward core model-evaluation and applied-research work.",
    currentState:
      "Hiring is up across GCCs for applied-research and evaluation roles specifically, distinct from the broader GCC hiring trend which remains support-function-heavy.",
    state: "dormant",
    topics: ["Artificial Intelligence", "Startups", "Indian Politics"],
    places: ["India", "Bengaluru"],
    people: [],
    organisations: ["Karnataka Digital Economy Mission"],
    updatedAt: daysAgo(9),
    firstSeenAt: daysAgo(40),
    baseImportance: 0.42,
    baseNovelty: 0.35,
    sources: [
      { id: "s1", name: "Karnataka Digital Economy Mission report", url: "https://example.com/kdem/gcc-report", isPrimary: true, publishedAt: daysAgo(9) },
      { id: "s2", name: "YourStory", url: "https://example.com/yourstory/bengaluru-ai-gcc", isPrimary: false, publishedAt: daysAgo(9) },
    ],
    timeline: [
      {
        id: "t1",
        date: daysAgo(40),
        title: "Quarterly GCC hiring data shows applied-research uptick",
        description: "State-level economic mission data showed a shift in GCC job postings toward applied-research and evaluation titles.",
        status: "reported",
        sourceIds: ["s2"],
      },
      {
        id: "t2",
        date: daysAgo(9),
        title: "KDEM report confirms trend across full quarter",
        description: "Full-quarter data confirms the shift is sustained rather than a one-off hiring spike.",
        status: "observed",
        sourceIds: ["s1"],
        isLatest: true,
      },
    ],
    decisions: [],
    claims: [],
    outcomes: [
      {
        id: "o1",
        text: "Applied-research and evaluation job postings from AI-lab GCCs rose over the quarter.",
        metric: "+22% quarter-on-quarter",
        observedAt: daysAgo(9),
        attributionStatus: "observed",
      },
    ],
    disputed: [],
    unknowns: ["Whether this reflects a durable shift in where core research happens, or quarter-specific hiring noise."],
    corrections: [],
    analysis: {
      summary:
        "Worth tracking as a slow-burn structural story rather than a single event — the interesting question is whether 'applied research' roles stay concentrated in a few labs or spread across the GCC ecosystem.",
      keyDrivers: [
        "Cost and talent-density advantages of Bengaluru relative to home-country hiring for applied-research roles.",
        "State-level policy support through KDEM specifically targeting AI-lab GCC expansion.",
      ],
      risks: ["A single quarter of data is a thin base for a structural claim."],
      outlook:
        "Next quarter's KDEM report is the natural checkpoint for whether this is a trend or noise.",
    },
    whatIfSeeds: [],
  },
];

export function getStoryById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}
