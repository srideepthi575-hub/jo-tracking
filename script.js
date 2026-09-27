/* =====================================================================
   JOB RADAR — application logic
   =====================================================================

   HONESTY NOTE (read this before wiring up real data):
   A static HTML/CSS/JS bundle running in a browser cannot legally or
   technically pull live listings from LinkedIn, Indeed, Glassdoor, etc.
   Those require authorized APIs / licensed feeds, server-side keys,
   and in most cases a backend (their terms forbid client-side scraping,
   and CORS blocks direct browser fetches anyway). A hourly scheduler
   also has to live on a server (cron / GitHub Actions / a worker) —
   client-side JS stops running the moment the tab closes.

   So this file is built as the REAL architecture minus the network
   calls: every job below is clearly labeled DEMO DATA, the match
   score is computed for real from actual extracted skills (never
   randomized), and there's a `JobSourceAdapter` interface at the top
   so you can drop in real fetch calls later without touching anything
   downstream (matching, dashboard, learning plan, etc. all "just work"
   once adapters return real jobs in the same shape).
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SOURCE ADAPTERS
   Each adapter fetches jobs from one platform and normalizes them to
   the shared Job schema. Wire a real one by implementing `fetchJobs()`
   to call your authorized API/feed from a backend endpoint (never put
   API keys in this file — call your own server, which holds the key
   in an environment variable).
   --------------------------------------------------------------------- */
class JobSourceAdapter {
  constructor(name) { this.name = name; this.status = "not_connected"; }
  // Replace with: const res = await fetch('/api/sources/' + this.name); return res.json();
  async fetchJobs() { return []; }
}

const SOURCE_ADAPTERS = [
  new JobSourceAdapter("LinkedIn Jobs"),
  new JobSourceAdapter("Indeed"),
  new JobSourceAdapter("Glassdoor"),
  new JobSourceAdapter("Naukri"),
  new JobSourceAdapter("Internshala"),
  new JobSourceAdapter("Company Career Pages"),
];

// Every adapter above is `not_connected` — that's the truth in this
// demo. This function stands in for the fetch-verify-normalize-dedupe
// pipeline the spec describes, so the downstream code (rendering,
// matching, filters) is already shaped for real data.
async function runSourcePipeline() {
  let allJobs = [];
  let anyConnected = false;
  for (const adapter of SOURCE_ADAPTERS) {
    try {
      const jobs = await adapter.fetchJobs();
      if (jobs.length) anyConnected = true;
      allJobs = allJobs.concat(jobs);
    } catch (e) {
      adapter.status = "error";
      console.warn(`Source "${adapter.name}" failed — continuing with remaining sources.`, e);
    }
  }
  if (!anyConnected) return DEMO_JOBS; // fallback, clearly tagged isDemo:true below
  return dedupeJobs(allJobs);
}

function dedupeJobs(jobs) {
  const seen = new Map();
  for (const job of jobs) {
    const key = [normalizeSkill(job.title), job.company, job.location, job.sourceUrl || job.id]
      .join("|").toLowerCase();
    if (!seen.has(key)) seen.set(key, job);
  }
  return [...seen.values()];
}


/* ---------------------------------------------------------------------
   2. SKILL NORMALIZATION
   --------------------------------------------------------------------- */
const SKILL_ALIASES = {
  "js": "JavaScript", "javascript": "JavaScript",
  "reactjs": "React", "react.js": "React", "react": "React",
  "nodejs": "Node.js", "node": "Node.js", "node.js": "Node.js",
  "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
  "next": "Next.js", "nextjs": "Next.js", "next.js": "Next.js",
  "ts": "TypeScript", "typescript": "TypeScript",
  "py": "Python", "python": "Python",
  "html5": "HTML", "html": "HTML",
  "css3": "CSS", "css": "CSS",
  "aws": "AWS", "amazon web services": "AWS",
  "mongo": "MongoDB", "mongodb": "MongoDB",
  "git": "Git", "github": "GitHub",
  "sql": "SQL", "mysql": "MySQL",
  "c++": "C++", "cpp": "C++",
  "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
  "figma": "Figma", "docker": "Docker", "kubernetes": "Kubernetes",
  "k8s": "Kubernetes", "firebase": "Firebase", "graphql": "GraphQL",
  "django": "Django", "flask": "Flask", "express": "Express.js",
  "expressjs": "Express.js", "vue": "Vue.js", "vuejs": "Vue.js",
  "angular": "Angular", "redux": "Redux", "rest api": "REST APIs",
  "restapi": "REST APIs", "pandas": "Pandas", "numpy": "NumPy",
  "tensorflow": "TensorFlow", "pytorch": "PyTorch",
  "machine learning": "Machine Learning", "ml": "Machine Learning",
  "excel": "Excel", "power bi": "Power BI", "tableau": "Tableau",
};

function normalizeSkill(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return SKILL_ALIASES[key] || (raw ? raw.trim() : raw);
}

function normalizeSkillList(list) {
  const out = [];
  for (const s of list || []) {
    const n = normalizeSkill(s);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

// Dictionary used to pull skills out of free-text resume paste.
const KNOWN_SKILLS = Object.values(SKILL_ALIASES)
  .concat(["Java", "C", "C#", "Go", "Rust", "PHP", "Swift", "Kotlin",
    "Linux", "Agile", "Scrum", "CI/CD", "Jenkins", "Terraform", "Azure",
    "GCP", "Data Analysis", "Communication", "Problem Solving",
    "Team Leadership", "Project Management"])
  .filter((v, i, arr) => arr.indexOf(v) === i);


/* ---------------------------------------------------------------------
   3. DEMO DATA — clearly labeled, fictional companies only.
   This is what "No live source connected" falls back to. Nothing here
   should ever be presented as a real, applyable listing.
   --------------------------------------------------------------------- */
const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();
const daysAgo = (d) => new Date(now - d * 86400 * 1000).toISOString();

const DEMO_JOBS = [
  {
    id: "demo-001", isDemo: true, title: "Frontend Developer", company: "Nova Analytics",
    location: "Bangalore", country: "India", workMode: "Hybrid", jobType: "Full Time",
    experience: "2-4 Years", experienceLevel: "experienced", salary: "₹10 LPA - ₹18 LPA",
    postedAt: hoursAgo(3), requiredSkills: ["React", "Next.js", "TypeScript"],
    preferredSkills: ["Tailwind CSS", "GraphQL"], education: "B.Tech / BCA or equivalent",
    industry: "Analytics SaaS", companySize: "201-500", benefits: ["Health insurance", "Remote stipend"],
    companyRating: 4.1, applicants: 62, source: "Demo Dataset", sourceUrl: "#",
    description: "Own the frontend for our analytics dashboard product. Work closely with design and backend to ship fast, accessible UI."
  },
  {
    id: "demo-002", isDemo: true, title: "Python Developer", company: "Rivergate Systems",
    location: "Chennai", country: "India", workMode: "Onsite", jobType: "Full Time",
    experience: "0-2 Years", experienceLevel: "fresher", salary: "₹5 LPA - ₹8 LPA",
    postedAt: hoursAgo(20), requiredSkills: ["Python", "SQL", "Django"],
    preferredSkills: ["Docker", "AWS"], education: "B.E / B.Tech",
    industry: "FinTech", companySize: "51-200", benefits: ["Provident fund", "Lunch provided"],
    companyRating: 3.9, applicants: 140, source: "Demo Dataset", sourceUrl: "#",
    description: "Build and maintain backend services for our payments platform. Good ownership over API design."
  },
  {
    id: "demo-003", isDemo: true, title: "React Developer", company: "Kettlebell Labs",
    location: "Remote", country: "India", workMode: "Remote", jobType: "Full Time",
    experience: "1-3 Years", experienceLevel: "experienced", salary: "₹8 LPA - ₹14 LPA",
    postedAt: hoursAgo(6), requiredSkills: ["React", "JavaScript", "Redux"],
    preferredSkills: ["Node.js", "MongoDB"], education: "Any graduate with strong portfolio",
    industry: "EdTech", companySize: "11-50", benefits: ["Flexible hours", "Learning budget"],
    companyRating: 4.4, applicants: 38, source: "Demo Dataset", sourceUrl: "#",
    description: "Small product team shipping a learning platform used by 200k+ students. You'll own features end to end."
  },
  {
    id: "demo-004", isDemo: true, title: "Data Analyst", company: "Meridian Retail Co.",
    location: "Coimbatore", country: "India", workMode: "Onsite", jobType: "Full Time",
    experience: "0-1 Years", experienceLevel: "fresher", salary: "₹4.5 LPA - ₹6.5 LPA",
    postedAt: daysAgo(2), requiredSkills: ["SQL", "Excel", "Data Analysis"],
    preferredSkills: ["Power BI", "Python"], education: "B.Com / B.Sc / B.Tech",
    industry: "Retail", companySize: "501-1000", benefits: ["Health insurance"],
    companyRating: 3.7, applicants: 210, source: "Demo Dataset", sourceUrl: "#",
    description: "Turn store-level sales data into reports leadership actually uses. Heavy SQL and dashboarding work."
  },
  {
    id: "demo-005", isDemo: true, title: "Backend Developer (Node.js)", company: "Ferrous Cloud",
    location: "Hyderabad", country: "India", workMode: "Hybrid", jobType: "Full Time",
    experience: "2-5 Years", experienceLevel: "experienced", salary: "₹12 LPA - ₹20 LPA",
    postedAt: hoursAgo(30), requiredSkills: ["Node.js", "Express.js", "MongoDB", "AWS"],
    preferredSkills: ["Docker", "Kubernetes"], education: "B.Tech",
    industry: "Cloud Infrastructure", companySize: "201-500", benefits: ["ESOPs", "Health insurance", "Gym"],
    companyRating: 4.0, applicants: 55, source: "Demo Dataset", sourceUrl: "#",
    description: "Design and scale APIs behind our infra product. On-call rotation shared across a small team."
  },
  {
    id: "demo-006", isDemo: true, title: "UI/UX Designer", company: "Studio Almanac",
    location: "Remote", country: "India", workMode: "Remote", jobType: "Contract",
    experience: "1-3 Years", experienceLevel: "experienced", salary: "₹6 LPA - ₹10 LPA (pro-rated)",
    postedAt: daysAgo(4), requiredSkills: ["Figma", "Communication"],
    preferredSkills: ["HTML", "CSS"], education: "Design portfolio required, degree optional",
    industry: "Design Agency", companySize: "1-10", benefits: ["Flexible hours"],
    companyRating: 4.3, applicants: 21, source: "Demo Dataset", sourceUrl: "#",
    description: "3-month contract designing product screens for two client startups. Portfolio matters more than resume."
  },
  {
    id: "demo-007", isDemo: true, title: "Machine Learning Engineer Intern", company: "Solace AI",
    location: "Bangalore", country: "India", workMode: "Hybrid", jobType: "Internship",
    experience: "0 Years", experienceLevel: "fresher", salary: "₹25,000/month stipend",
    postedAt: hoursAgo(10), requiredSkills: ["Python", "Machine Learning"],
    preferredSkills: ["TensorFlow", "PyTorch", "Pandas"], education: "Pursuing B.Tech/M.Tech/MSc",
    industry: "Artificial Intelligence", companySize: "11-50", benefits: ["Certificate", "PPO potential"],
    companyRating: 4.2, applicants: 302, source: "Demo Dataset", sourceUrl: "#",
    description: "6-month internship on the applied ML team, working on model evaluation pipelines."
  },
  {
    id: "demo-008", isDemo: true, title: "Software Engineer", company: "Northlane Systems",
    location: "Pune", country: "India", workMode: "Onsite", jobType: "Full Time",
    experience: "3-6 Years", experienceLevel: "experienced", salary: "₹18 LPA - ₹28 LPA",
    postedAt: daysAgo(1), requiredSkills: ["Java", "SQL", "Git"],
    preferredSkills: ["Kubernetes", "AWS", "CI/CD"], education: "B.Tech / M.Tech",
    industry: "Enterprise Software", companySize: "1000+", benefits: ["Health insurance", "ESOPs", "Relocation support"],
    companyRating: 4.0, applicants: 47, source: "Demo Dataset", sourceUrl: "#",
    description: "Core platform team maintaining services used across the company's product suite."
  },
];
// normalize demo skills once at load
DEMO_JOBS.forEach(j => {
  j.requiredSkills = normalizeSkillList(j.requiredSkills);
  j.preferredSkills = normalizeSkillList(j.preferredSkills);
  j.discoveredAt = j.postedAt;
  j.lastVerifiedAt = new Date().toISOString();
  j.verificationStatus = "Demo — not a live listing";
});


/* ---------------------------------------------------------------------
   4. STATE
   --------------------------------------------------------------------- */
const state = {
  jobs: [],
  userSkills: JSON.parse(localStorage.getItem("jr_userSkills") || "[]"),
  savedIds: new Set(JSON.parse(localStorage.getItem("jr_saved") || "[]")),
  viewedIds: new Set(JSON.parse(localStorage.getItem("jr_viewed") || "[]")),
  filters: { posted: "any", modes: [], types: [], exp: [], sort: "relevance" },
  query: "", location: "",
};

function persist() {
  localStorage.setItem("jr_userSkills", JSON.stringify(state.userSkills));
  localStorage.setItem("jr_saved", JSON.stringify([...state.savedIds]));
  localStorage.setItem("jr_viewed", JSON.stringify([...state.viewedIds]));
}


/* ---------------------------------------------------------------------
   5. MATCH ENGINE — computed from real extracted skills, never random.
   --------------------------------------------------------------------- */
function calculateMatch(userSkills, job) {
  const norm = normalizeSkillList(userSkills);
  const required = job.requiredSkills || [];
  const preferred = job.preferredSkills || [];

  const matchedRequired = required.filter(s => norm.includes(s));
  const missingRequired = required.filter(s => !norm.includes(s));
  const matchedPreferred = preferred.filter(s => norm.includes(s));
  const missingPreferred = preferred.filter(s => !norm.includes(s));

  // Required skills carry the bulk of the score; preferred skills add a
  // smaller bonus. If a job lists no required skills, fall back evenly.
  let score;
  if (required.length === 0 && preferred.length === 0) {
    score = 0;
  } else if (required.length === 0) {
    score = Math.round((matchedPreferred.length / preferred.length) * 100);
  } else {
    const requiredScore = (matchedRequired.length / required.length) * 80;
    const preferredScore = preferred.length
      ? (matchedPreferred.length / preferred.length) * 20
      : 0;
    score = Math.round(requiredScore + preferredScore);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedRequired, missingRequired, matchedPreferred, missingPreferred,
    requiredTotal: required.length, requiredMatchedCount: matchedRequired.length,
  };
}

function matchTier(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}


/* ---------------------------------------------------------------------
   6. LEARNING ROADMAP — built only from actual missing skills.
   --------------------------------------------------------------------- */
const SKILL_LEARNING_INFO = {
  "React": { path: ["Core JSX & components", "Hooks (useState/useEffect)", "Routing with React Router", "Small CRUD project"], project: "Build a task tracker with React + a public API." },
  "Node.js": { path: ["JS runtime & modules", "Express basics", "REST API design", "Connecting a database"], project: "Build a REST API for a notes app." },
  "MongoDB": { path: ["Documents & collections", "CRUD with a driver/ODM", "Indexing basics"], project: "Model and query data for a small app." },
  "AWS": { path: ["Core services overview (EC2, S3, IAM)", "Deploying a simple app", "Basic monitoring"], project: "Deploy a full-stack project on AWS free tier." },
  "TypeScript": { path: ["Types & interfaces", "Generics basics", "Migrating a JS file to TS"], project: "Convert an existing JS project to TypeScript." },
  "SQL": { path: ["SELECT/JOIN fundamentals", "Aggregations & GROUP BY", "Writing a small schema"], project: "Write queries against a sample sales dataset." },
  "Docker": { path: ["Images vs containers", "Writing a Dockerfile", "docker-compose basics"], project: "Containerize an existing app." },
  "Machine Learning": { path: ["Core concepts & terminology", "A first model with scikit-learn", "Evaluating a model"], project: "Train a classifier on a public dataset." },
};

function defaultLearningInfo(skill) {
  return {
    path: [`${skill} fundamentals`, `Hands-on practice with ${skill}`, `Small project using ${skill}`],
    project: `Build a small project that uses ${skill}.`,
  };
}

function buildLearningPlan(missingSkillsRanked) {
  // Only the top skills get a full week-by-week plan — keep it usable.
  const top = missingSkillsRanked.slice(0, 4);
  return top.map((entry, i) => {
    const info = SKILL_LEARNING_INFO[entry.skill] || defaultLearningInfo(entry.skill);
    return { week: i + 1, skill: entry.skill, count: entry.count, ...info };
  });
}


/* ---------------------------------------------------------------------
   7. RESUME / SKILL EXTRACTION — dictionary match over pasted text.
   For real PDF/DOCX parsing you'd run pdf.js or mammoth.js server-side
   (or client-side via a CDN script) and feed the extracted text here.
   --------------------------------------------------------------------- */
function extractSkillsFromText(text) {
  if (!text) return [];
  // If it reads like a comma list, treat it as one directly.
  if (text.includes(",") && text.split(/\s+/).length < 40) {
    return normalizeSkillList(text.split(","));
  }
  const lower = text.toLowerCase();
  const found = [];
  for (const skill of KNOWN_SKILLS) {
    const pattern = new RegExp(`(^|[^a-z0-9])${skill.toLowerCase().replace(/[.+]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (pattern.test(lower) && !found.includes(skill)) found.push(skill);
  }
  return found;
}


/* ---------------------------------------------------------------------
   8. RENDERING
   --------------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function jobCardHTML(job) {
  const m = calculateMatch(state.userSkills, job);
  const tier = matchTier(m.score);
  const saved = state.savedIds.has(job.id);
  return `
    <div class="job-card" data-id="${job.id}">
      <div class="job-card-top">
        <div>
          <div class="job-title">${job.title} ${job.isDemo ? '<span class="demo-tag">DEMO DATA</span>' : ""}</div>
          <div class="job-company">${job.company} · ${job.location}</div>
        </div>
        <div class="match-badge">
          <span class="pct ${tier}">${m.score}%</span>
          <span class="lbl">match</span>
        </div>
      </div>
      <div class="job-meta">
        <span>${job.workMode}</span>
        <span>${job.jobType}</span>
        <span>${job.experience}</span>
        <span>${job.salary}</span>
        <span>Posted ${timeAgo(job.postedAt)}</span>
        <span>${saved ? "★ Saved" : ""}</span>
      </div>
      <div class="skill-chip-row">
        ${m.matchedRequired.map(s => `<span class="chip matched">${s}</span>`).join("")}
        ${m.missingRequired.map(s => `<span class="chip missing">${s}</span>`).join("")}
      </div>
    </div>`;
}

function renderJobList(container, jobs) {
  container.innerHTML = jobs.length
    ? jobs.map(jobCardHTML).join("")
    : `<div class="empty-state">No current matching jobs found. Try a broader search or fewer filters.</div>`;
  $$(".job-card", container).forEach(card => {
    card.addEventListener("click", () => openJobModal(card.dataset.id));
  });
}

function computeRanked(jobs, sort) {
  const withMatch = jobs.map(j => ({ job: j, match: calculateMatch(state.userSkills, j) }));
  switch (sort) {
    case "match": withMatch.sort((a, b) => b.match.score - a.match.score); break;
    case "salary": withMatch.sort((a, b) => (extractSalaryNum(b.job.salary) - extractSalaryNum(a.job.salary))); break;
    case "date": withMatch.sort((a, b) => new Date(b.job.postedAt) - new Date(a.job.postedAt)); break;
    default: withMatch.sort((a, b) => b.match.score - a.match.score);
  }
  return withMatch.map(x => x.job);
}
function extractSalaryNum(s) {
  const nums = String(s).match(/[\d.]+/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
}

function passesFilters(job) {
  const f = state.filters;
  if (f.posted !== "any") {
    const days = (Date.now() - new Date(job.postedAt)) / 86400000;
    if (days > Number(f.posted)) return false;
  }
  if (f.modes.length && !f.modes.includes(job.workMode)) return false;
  if (f.types.length && !f.types.includes(job.jobType)) return false;
  if (f.exp.length && !f.exp.includes(job.experienceLevel)) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    const hay = `${job.title} ${job.company} ${job.requiredSkills.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (state.location) {
    if (!job.location.toLowerCase().includes(state.location.toLowerCase())) return false;
  }
  return true;
}

function runSearch() {
  const filtered = state.jobs.filter(passesFilters);
  const ranked = computeRanked(filtered, state.filters.sort);
  $("#resultsMeta").textContent = `${ranked.length} job${ranked.length === 1 ? "" : "s"} found · Last checked ${new Date().toLocaleTimeString()}`;
  $("#searchSummary").textContent = state.query || state.location
    ? `Results for "${state.query || "any role"}"${state.location ? " in " + state.location : ""}.`
    : "Showing all jobs in the connected dataset.";
  renderJobList($("#searchResults"), ranked);
}

function renderDashboard() {
  const ranked = computeRanked(state.jobs, "match");
  const highMatch = ranked.filter(j => calculateMatch(state.userSkills, j).score >= 70);
  const remote = state.jobs.filter(j => j.workMode === "Remote");
  const internships = state.jobs.filter(j => j.jobType === "Internship");
  const today = state.jobs.filter(j => (Date.now() - new Date(j.postedAt)) / 86400000 < 1);

  $("#statGrid").innerHTML = [
    ["Total active jobs", state.jobs.length],
    ["Added today", today.length],
    ["High match (70%+)", highMatch.length],
    ["Remote jobs", remote.length],
    ["Internships", internships.length],
    ["Saved jobs", state.savedIds.size],
  ].map(([label, num]) => `<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`).join("");

  renderJobList($("#recentJobs"), ranked.slice(0, 4));

  const gap = aggregateMissingSkills();
  $("#topMissingSkills").innerHTML = gap.length
    ? gap.slice(0, 8).map(g => `<span class="chip missing">${g.skill} · ${g.count}</span>`).join("")
    : `<div class="empty-state">Add your skills under Resume &amp; Skill Match to see gaps.</div>`;
}

function aggregateMissingSkills() {
  const pool = state.jobs.filter(j => state.viewedIds.has(j.id) || state.savedIds.has(j.id));
  const source = pool.length ? pool : state.jobs; // if nothing viewed yet, use the whole dataset
  const counts = {};
  source.forEach(job => {
    const m = calculateMatch(state.userSkills, job);
    m.missingRequired.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  });
  return Object.entries(counts).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count);
}

function renderRecommended() {
  const ranked = computeRanked(state.jobs, "match");
  renderJobList($("#recommendedJobs"), ranked);
}

function renderSaved() {
  const saved = state.jobs.filter(j => state.savedIds.has(j.id));
  renderJobList($("#savedJobs"), saved);
}

function renderExtractedSkills() {
  const el = $("#extractedSkills");
  if (!state.userSkills.length) {
    el.className = "chip-list empty-state";
    el.innerHTML = "No skills extracted yet.";
    return;
  }
  el.className = "chip-list";
  el.innerHTML = state.userSkills.map(s => `<span class="chip matched">${s}</span>`).join("");
}

function renderLearningPlan() {
  const gap = aggregateMissingSkills();
  const el = $("#learningPlanContent");
  if (!gap.length) {
    el.innerHTML = `<div class="empty-state">No skill gaps to plan around yet — view or save a few jobs, or add your skills first.</div>`;
    return;
  }
  const plan = buildLearningPlan(gap);
  el.innerHTML = plan.map(w => `
    <div class="week-block">
      <h4>Week ${w.week} — ${w.skill} <span class="priority-tag ${w.count > 1 ? "priority-high" : "priority-med"}">${w.count > 1 ? "High priority" : "Relevant"}</span></h4>
      <div class="fineprint" style="margin-top:-4px;margin-bottom:8px;">Required by ${w.count} job${w.count === 1 ? "" : "s"} you've viewed or saved.</div>
      <ol style="margin:0;padding-left:18px;color:var(--text-dim);font-size:13.5px;">
        ${w.path.map(p => `<li>${p}</li>`).join("")}
      </ol>
      <div class="fineprint">Practice project: ${w.project}</div>
    </div>
  `).join("");
}

function renderMarket() {
  const skillCounts = {}, companyCounts = {};
  state.jobs.forEach(j => {
    (j.requiredSkills || []).forEach(s => skillCounts[s] = (skillCounts[s] || 0) + 1);
    companyCounts[j.company] = (companyCounts[j.company] || 0) + 1;
  });
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topCompanies = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...topSkills.map(s => s[1]));

  $("#marketSubhead").textContent = state.jobs[0] && state.jobs[0].isDemo
    ? "Computed from the current demo dataset only — connect real sources for live market data."
    : `Computed from ${state.jobs.length} currently tracked jobs.`;

  $("#marketSkills").innerHTML = topSkills.map(([skill, count]) => `
    <div class="bar-row">
      <div class="bar-row-top"><span>${skill}</span><span>${count}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
    </div>`).join("");

  $("#marketCompanies").innerHTML = topCompanies.map(([company, count]) => `
    <div class="bar-row">
      <div class="bar-row-top"><span>${company}${state.jobs.find(j=>j.company===company)?.isDemo ? ' <span class="demo-tag">DEMO</span>' : ''}</span><span>${count} role${count===1?"":"s"}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
    </div>`).join("");
}


/* ---------------------------------------------------------------------
   9. JOB DETAIL MODAL + rule-based "Ask AI" (no external LLM call —
   answers are generated deterministically from the real job + profile
   data, never invented). Wire a real model by POSTing job+profile to
   your backend, which calls the Anthropic API with your key server-side.
   --------------------------------------------------------------------- */
function openJobModal(id) {
  const job = state.jobs.find(j => j.id === id);
  if (!job) return;
  state.viewedIds.add(id); persist();

  const m = calculateMatch(state.userSkills, job);
  const tier = matchTier(m.score);
  const saved = state.savedIds.has(id);

  $("#jobModal").innerHTML = `
    <button class="modal-close" id="closeModal">✕</button>
    <div class="job-title" style="font-size:20px;">${job.title} ${job.isDemo ? '<span class="demo-tag">DEMO DATA</span>' : ""}</div>
    <div class="job-company">${job.company} · ${job.location}, ${job.country}</div>
    <div class="job-meta" style="margin-top:12px;">
      <span>${job.workMode}</span><span>${job.jobType}</span><span>${job.experience}</span>
      <span>${job.salary}</span><span>Posted ${timeAgo(job.postedAt)}</span><span>Source: ${job.source}</span>
    </div>

    <div class="modal-section">
      <h4>AI match — ${m.score}%</h4>
      <div class="skill-chip-row">
        ${m.matchedRequired.map(s => `<span class="chip matched">${s}</span>`).join("")}
        ${m.missingRequired.map(s => `<span class="chip missing">${s}</span>`).join("")}
        ${m.matchedPreferred.map(s => `<span class="chip matched">${s} (preferred)</span>`).join("")}
      </div>
      <p class="fineprint">${m.requiredMatchedCount}/${m.requiredTotal} required skills matched. This score reflects the required/preferred skills listed in the description against your extracted profile — it isn't a guarantee of getting the role.</p>
    </div>

    <div class="modal-section">
      <h4>About the role</h4>
      <p style="font-size:13.5px;color:var(--text-dim);">${job.description}</p>
    </div>

    <div class="modal-section">
      <h4>Ask about this job</h4>
      <div class="ask-ai-box">
        <button data-q="score">Why is my match this percentage?</button>
        <button data-q="missing">What am I missing?</button>
        <button data-q="first">What should I learn first?</button>
        <button data-q="plan">Create a 30-day plan</button>
      </div>
      <div id="aiAnswer"></div>
    </div>

    <div class="modal-section">
      <button class="btn-secondary" id="saveJobBtn">${saved ? "★ Saved" : "☆ Save job"}</button>
      <a href="${job.sourceUrl}" class="apply-link" target="_blank" rel="noopener">${job.isDemo ? "No live application link (demo)" : "View original job"}</a>
    </div>
  `;

  $("#closeModal").onclick = closeJobModal;
  $("#saveJobBtn").onclick = () => {
    if (state.savedIds.has(id)) state.savedIds.delete(id); else state.savedIds.add(id);
    persist();
    openJobModal(id); // re-render
    renderAll();
  };
  $$(".ask-ai-box button", $("#jobModal")).forEach(btn => {
    btn.onclick = () => { $("#aiAnswer").innerHTML = `<div class="ai-answer">${answerAboutJob(btn.dataset.q, job, m)}</div>`; };
  });

  $("#jobModalBackdrop").classList.remove("hidden");
}
function closeJobModal() { $("#jobModalBackdrop").classList.add("hidden"); }

function answerAboutJob(kind, job, m) {
  switch (kind) {
    case "score":
      return `Your match is ${m.score}% because you have ${m.requiredMatchedCount} of the ${m.requiredTotal} required skills (${m.matchedRequired.join(", ") || "none"}), plus ${m.matchedPreferred.length} preferred skill${m.matchedPreferred.length === 1 ? "" : "s"}. Required skills are weighted more heavily than preferred ones.`;
    case "missing":
      return m.missingRequired.length
        ? `You're missing: ${m.missingRequired.join(", ")}. These are listed as required in the job description, so closing these gaps first will move your match score the most.`
        : `You have every required skill listed for this role. ${m.missingPreferred.length ? "Preferred (nice-to-have) skills you don't have yet: " + m.missingPreferred.join(", ") + "." : ""}`;
    case "first":
      return m.missingRequired.length
        ? `Start with "${m.missingRequired[0]}" — it's required here${m.missingRequired.length > 1 ? `, and appears alongside ${m.missingRequired.length - 1} other missing skill(s)` : ""}. Check the Learning Plan tab for a structured path.`
        : `You already cover the required skills — if you want to go further, look at the preferred skills: ${m.missingPreferred.join(", ") || "none listed"}.`;
    case "plan": {
      const skill = m.missingRequired[0] || m.missingPreferred[0];
      if (!skill) return `No skill gaps to plan for on this job — you meet the listed requirements.`;
      const info = SKILL_LEARNING_INFO[skill] || defaultLearningInfo(skill);
      return `30-day plan for ${skill}: Week 1 — ${info.path[0]}. Week 2 — ${info.path[1] || "continued practice"}. Week 3 — ${info.path[2] || "apply it in a small task"}. Week 4 — ${info.project}`;
    }
    default: return "";
  }
}


/* ---------------------------------------------------------------------
   10. VIEW SWITCHING + WIRING
   --------------------------------------------------------------------- */
function renderAll() {
  renderDashboard();
  runSearch();
  renderRecommended();
  renderSaved();
  renderLearningPlan();
  renderMarket();
}

function setView(view) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  $(`#view-${view}`)?.classList.remove("hidden");
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
}

function wire() {
  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  $$("[data-view].link-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));

  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = $("#searchQuery").value.trim();
    state.location = $("#searchLocation").value.trim();
    setView("search");
    runSearch();
  });

  $("#filterPosted").addEventListener("change", e => { state.filters.posted = e.target.value; runSearch(); });
  $("#sortBy").addEventListener("change", e => { state.filters.sort = e.target.value; runSearch(); });
  $$(".f-mode").forEach(cb => cb.addEventListener("change", () => {
    state.filters.modes = $$(".f-mode").filter(c => c.checked).map(c => c.value); runSearch();
  }));
  $$(".f-type").forEach(cb => cb.addEventListener("change", () => {
    state.filters.types = $$(".f-type").filter(c => c.checked).map(c => c.value); runSearch();
  }));
  $$(".f-exp").forEach(cb => cb.addEventListener("change", () => {
    state.filters.exp = $$(".f-exp").filter(c => c.checked).map(c => c.value); runSearch();
  }));

  $("#jobModalBackdrop").addEventListener("click", (e) => { if (e.target.id === "jobModalBackdrop") closeJobModal(); });

  $("#analyzeResumeBtn").addEventListener("click", () => {
    const text = $("#resumeInput").value;
    const skills = extractSkillsFromText(text);
    state.userSkills = skills;
    persist();
    renderExtractedSkills();
    renderAll();
  });

  $("#resumeFileBtn").addEventListener("click", () => $("#resumeFile").click());
  $("#resumeFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $("#resumeInput").value = reader.result; };
    reader.readAsText(file);
  });

  $("#themeToggle").addEventListener("click", () => {
    const html = document.documentElement;
    const next = html.dataset.theme === "dark" ? "light" : "dark";
    html.dataset.theme = next;
    localStorage.setItem("jr_theme", next);
  });
  const savedTheme = localStorage.getItem("jr_theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
}


/* ---------------------------------------------------------------------
   11. "HOURLY" REFRESH — in a real deployment this loop runs server-side
   (cron / GitHub Actions / a queue worker) and pushes fresh data to the
   frontend. Client-side setInterval only simulates the re-verification
   step here, and stops the moment this tab closes — it is NOT a
   substitute for a real scheduler.
   --------------------------------------------------------------------- */
function refreshTimestamp() {
  $("#lastUpdatedLabel").textContent = `Last updated ${new Date().toLocaleTimeString()}`;
}
function markSourceStatus() {
  const connected = SOURCE_ADAPTERS.filter(a => a.status === "connected").length;
  $("#sourceCount").textContent = connected;
  $("#syncDot").classList.toggle("live", connected > 0);
  $("#sourceBanner").innerHTML = connected > 0
    ? `Connected to ${connected} live source${connected === 1 ? "" : "s"}.`
    : `No live job sources are connected in this build — showing <strong>demo dataset</strong> (clearly tagged on every card) so the UI and matching engine are fully testable. Wire a real adapter in <code>script.js</code> (see <code>JobSourceAdapter</code>) to go live.`;
}


/* ---------------------------------------------------------------------
   12. BOOT
   --------------------------------------------------------------------- */
(async function init() {
  wire();
  markSourceStatus();
  state.jobs = await runSourcePipeline();
  renderExtractedSkills();
  refreshTimestamp();
  renderAll();
  setInterval(refreshTimestamp, 3600 * 1000); // cosmetic only — see note above
})();
