```javascript
/* =====================================================================
   JOB RADAR — REAL JOB DATA VERSION
   Source: Himalayas Remote Jobs API
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. SOURCE ADAPTER — HIMALAYAS
   --------------------------------------------------------------------- */

class JobSourceAdapter {
  constructor(name) {
    this.name = name;
    this.status = "not_connected";
  }

  async fetchJobs() {
    const response = await fetch("/api/jobs");

    if (!response.ok) {
      throw new Error(`Job API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.jobs)) {
      throw new Error("Invalid job API response");
    }

    this.status = "connected";

    return data.jobs.map(normalizeRealJob);
  }
}

const SOURCE_ADAPTERS = [
  new JobSourceAdapter("Himalayas")
];


/* ---------------------------------------------------------------------
   2. SKILL NORMALIZATION
   --------------------------------------------------------------------- */

const SKILL_ALIASES = {
  "js": "JavaScript",
  "javascript": "JavaScript",
  "reactjs": "React",
  "react.js": "React",
  "react": "React",
  "nodejs": "Node.js",
  "node": "Node.js",
  "node.js": "Node.js",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "next": "Next.js",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "py": "Python",
  "python": "Python",
  "html5": "HTML",
  "html": "HTML",
  "css3": "CSS",
  "css": "CSS",
  "aws": "AWS",
  "amazon web services": "AWS",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "git": "Git",
  "github": "GitHub",
  "sql": "SQL",
  "mysql": "MySQL",
  "c++": "C++",
  "cpp": "C++",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "figma": "Figma",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "firebase": "Firebase",
  "graphql": "GraphQL",
  "django": "Django",
  "flask": "Flask",
  "express": "Express.js",
  "expressjs": "Express.js",
  "vue": "Vue.js",
  "vuejs": "Vue.js",
  "angular": "Angular",
  "redux": "Redux",
  "rest api": "REST APIs",
  "restapi": "REST APIs",
  "pandas": "Pandas",
  "numpy": "NumPy",
  "tensorflow": "TensorFlow",
  "pytorch": "PyTorch",
  "machine learning": "Machine Learning",
  "ml": "Machine Learning",
  "excel": "Excel",
  "power bi": "Power BI",
  "tableau": "Tableau",
  "java": "Java",
  "c": "C",
  "c#": "C#",
  "go": "Go",
  "rust": "Rust",
  "php": "PHP",
  "swift": "Swift",
  "kotlin": "Kotlin",
  "linux": "Linux",
  "agile": "Agile",
  "scrum": "Scrum",
  "ci/cd": "CI/CD",
  "jenkins": "Jenkins",
  "terraform": "Terraform",
  "azure": "Azure",
  "gcp": "GCP",
  "data analysis": "Data Analysis",
  "communication": "Communication",
  "problem solving": "Problem Solving",
  "team leadership": "Team Leadership",
  "project management": "Project Management"
};

function normalizeSkill(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return SKILL_ALIASES[key] || (raw ? raw.trim() : raw);
}

function normalizeSkillList(list) {
  const out = [];

  for (const skill of list || []) {
    const normalized = normalizeSkill(skill);

    if (normalized && !out.includes(normalized)) {
      out.push(normalized);
    }
  }

  return out;
}

const KNOWN_SKILLS = Object.values(SKILL_ALIASES)
  .filter((v, i, arr) => arr.indexOf(v) === i);


/* ---------------------------------------------------------------------
   3. EXTRACT SKILLS
   --------------------------------------------------------------------- */

function extractSkillsFromText(text) {
  if (!text) return [];

  const lower = text.toLowerCase();
  const found = [];

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    );

    if (pattern.test(lower) && !found.includes(skill)) {
      found.push(skill);
    }
  }

  return normalizeSkillList(found);
}


/* ---------------------------------------------------------------------
   4. HIMALAYAS → JOB RADAR FORMAT
   --------------------------------------------------------------------- */

function normalizeRealJob(job) {

  const fullText = [
    job.title || "",
    job.excerpt || "",
    job.description || "",
    ...(job.categories || []),
    ...(job.parentCategories || [])
  ].join(" ");

  const detectedSkills = extractSkillsFromText(fullText);

  const locationNames = Array.isArray(job.locationRestrictions)
    ? job.locationRestrictions
        .map(item => item.name || "")
        .filter(Boolean)
    : [];

  const location =
    locationNames.length > 0
      ? locationNames.join(", ")
      : "Remote / Worldwide";

  let workMode = "Remote";

  let jobType = "Full Time";

  switch (job.employmentType) {
    case "Intern":
      jobType = "Internship";
      break;

    case "Part Time":
      jobType = "Part Time";
      break;

    case "Contractor":
    case "Temporary":
      jobType = "Contract";
      break;

    default:
      jobType = "Full Time";
  }

  let experienceLevel = "experienced";

  const seniorityText = Array.isArray(job.seniority)
    ? job.seniority.join(" ").toLowerCase()
    : String(job.seniority || "").toLowerCase();

  if (
    seniorityText.includes("entry") ||
    seniorityText.includes("junior") ||
    seniorityText.includes("intern")
  ) {
    experienceLevel = "fresher";
  }

  let experience =
    Array.isArray(job.seniority) && job.seniority.length
      ? job.seniority.join(", ")
      : "Not specified";

  let salary = "Not disclosed";

  if (job.minSalary && job.maxSalary) {
    salary =
      `${job.currency || ""} ` +
      `${Number(job.minSalary).toLocaleString()} - ` +
      `${Number(job.maxSalary).toLocaleString()} ` +
      `${job.salaryPeriod || ""}`;
  } else if (job.minSalary) {
    salary =
      `${job.currency || ""} ` +
      `${Number(job.minSalary).toLocaleString()}+`;
  }

  let postedAt;

  if (job.pubDate) {
    const dateValue =
      typeof job.pubDate === "number"
        ? job.pubDate
        : Date.parse(job.pubDate);

    postedAt = new Date(dateValue).toISOString();
  } else {
    postedAt = new Date().toISOString();
  }

  return {
    id: `himalayas-${job.guid || crypto.randomUUID()}`,

    isDemo: false,

    title: job.title || "Untitled Job",

    company: job.companyName || "Unknown Company",

    location,

    country:
      locationNames.length === 1
        ? locationNames[0]
        : "Remote",

    workMode,

    jobType,

    experience,

    experienceLevel,

    salary,

    postedAt,

    requiredSkills: detectedSkills,

    preferredSkills: [],

    education: "Not specified",

    industry:
      Array.isArray(job.parentCategories) &&
      job.parentCategories.length
        ? job.parentCategories.join(", ")
        : "Technology",

    companySize: "Not specified",

    benefits: [],

    companyRating: null,

    applicants: null,

    source: "Himalayas",

    sourceUrl:
      job.applicationLink ||
      "https://himalayas.app",

    description:
      job.description ||
      job.excerpt ||
      "No description available.",

    discoveredAt: new Date().toISOString(),

    lastVerifiedAt: new Date().toISOString(),

    verificationStatus: "Live source"
  };
}


/* ---------------------------------------------------------------------
   5. REAL JOB PIPELINE
   --------------------------------------------------------------------- */

async function runSourcePipeline() {

  let allJobs = [];

  for (const adapter of SOURCE_ADAPTERS) {

    try {

      const jobs = await adapter.fetchJobs();

      allJobs = allJobs.concat(jobs);

    } catch (error) {

      adapter.status = "error";

      console.error(
        `Source "${adapter.name}" failed:`,
        error
      );
    }
  }

  return dedupeJobs(allJobs);
}


/* ---------------------------------------------------------------------
   6. DUPLICATE DETECTION
   --------------------------------------------------------------------- */

function dedupeJobs(jobs) {

  const seen = new Map();

  for (const job of jobs) {

    const key = [
      job.title,
      job.company,
      job.location,
      job.sourceUrl || job.id
    ]
      .join("|")
      .toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, job);
    }
  }

  return [...seen.values()];
}


/* ---------------------------------------------------------------------
   7. STATE
   --------------------------------------------------------------------- */

const state = {

  jobs: [],

  userSkills:
    JSON.parse(
      localStorage.getItem("jr_userSkills") || "[]"
    ),

  savedIds:
    new Set(
      JSON.parse(
        localStorage.getItem("jr_saved") || "[]"
      )
    ),

  viewedIds:
    new Set(
      JSON.parse(
        localStorage.getItem("jr_viewed") || "[]"
      )
    ),

  filters: {
    posted: "any",
    modes: [],
    types: [],
    exp: [],
    sort: "relevance"
  },

  query: "",

  location: ""
};


function persist() {

  localStorage.setItem(
    "jr_userSkills",
    JSON.stringify(state.userSkills)
  );

  localStorage.setItem(
    "jr_saved",
    JSON.stringify([...state.savedIds])
  );

  localStorage.setItem(
    "jr_viewed",
    JSON.stringify([...state.viewedIds])
  );
}


/* ---------------------------------------------------------------------
   8. MATCH ENGINE
   --------------------------------------------------------------------- */

function calculateMatch(userSkills, job) {

  const normalizedUserSkills =
    normalizeSkillList(userSkills);

  const required =
    normalizeSkillList(job.requiredSkills || []);

  const preferred =
    normalizeSkillList(job.preferredSkills || []);

  const matchedRequired =
    required.filter(
      skill => normalizedUserSkills.includes(skill)
    );

  const missingRequired =
    required.filter(
      skill => !normalizedUserSkills.includes(skill)
    );

  const matchedPreferred =
    preferred.filter(
      skill => normalizedUserSkills.includes(skill)
    );

  const missingPreferred =
    preferred.filter(
      skill => !normalizedUserSkills.includes(skill)
    );

  let score = 0;

  if (
    required.length === 0 &&
    preferred.length === 0
  ) {

    score = 0;

  } else if (required.length === 0) {

    score =
      Math.round(
        (matchedPreferred.length / preferred.length) * 100
      );

  } else {

    const requiredScore =
      (matchedRequired.length / required.length) * 80;

    const preferredScore =
      preferred.length
        ? (matchedPreferred.length / preferred.length) * 20
        : 0;

    score =
      Math.round(
        requiredScore + preferredScore
      );
  }

  return {

    score: Math.max(
      0,
      Math.min(100, score)
    ),

    matchedRequired,

    missingRequired,

    matchedPreferred,

    missingPreferred,

    requiredTotal: required.length,

    requiredMatchedCount:
      matchedRequired.length
  };
}


function matchTier(score) {

  if (score >= 70) return "high";

  if (score >= 40) return "mid";

  return "low";
}


/* ---------------------------------------------------------------------
   9. LEARNING PLAN
   --------------------------------------------------------------------- */

const SKILL_LEARNING_INFO = {

  "React": {
    path: [
      "Core JSX & components",
      "Hooks (useState/useEffect)",
      "Routing with React Router",
      "Small CRUD project"
    ],
    project:
      "Build a task tracker with React + a public API."
  },

  "Node.js": {
    path: [
      "JS runtime & modules",
      "Express basics",
      "REST API design",
      "Connecting a database"
    ],
    project:
      "Build a REST API for a notes app."
  },

  "MongoDB": {
    path: [
      "Documents & collections",
      "CRUD with a driver/ODM",
      "Indexing basics"
    ],
    project:
      "Model and query data for a small app."
  },

  "AWS": {
    path: [
      "Core services overview",
      "Deploying a simple app",
      "Basic monitoring"
    ],
    project:
      "Deploy a full-stack project on AWS."
  },

  "TypeScript": {
    path: [
      "Types & interfaces",
      "Generics basics",
      "Migrating JS to TS"
    ],
    project:
      "Convert an existing JS project to TypeScript."
  },

  "SQL": {
    path: [
      "SELECT/JOIN fundamentals",
      "Aggregations & GROUP BY",
      "Writing a small schema"
    ],
    project:
      "Write queries against a sales dataset."
  },

  "Docker": {
    path: [
      "Images vs containers",
      "Writing a Dockerfile",
      "docker-compose basics"
    ],
    project:
      "Containerize an existing app."
  },

  "Machine Learning": {
    path: [
      "Core concepts",
      "First model with scikit-learn",
      "Model evaluation"
    ],
    project:
      "Train a classifier on a public dataset."
  }
};


function defaultLearningInfo(skill) {

  return {

    path: [
      `${skill} fundamentals`,
      `Hands-on practice with ${skill}`,
      `Small project using ${skill}`
    ],

    project:
      `Build a small project that uses ${skill}.`
  };
}


function buildLearningPlan(missingSkillsRanked) {

  const top =
    missingSkillsRanked.slice(0, 4);

  return top.map((entry, index) => {

    const info =
      SKILL_LEARNING_INFO[entry.skill] ||
      defaultLearningInfo(entry.skill);

    return {

      week: index + 1,

      skill: entry.skill,

      count: entry.count,

      ...info
    };
  });
}


/* ---------------------------------------------------------------------
   10. RENDERING
   --------------------------------------------------------------------- */

const $ =
  (selector, root = document) =>
    root.querySelector(selector);

const $$ =
  (selector, root = document) =>
    [...root.querySelectorAll(selector)];


function timeAgo(iso) {

  if (!iso) return "Recently";

  const date =
    new Date(iso);

  if (isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs =
    Date.now() - date.getTime();

  const h =
    Math.floor(diffMs / 3600000);

  if (h < 1) return "Just now";

  if (h < 24) {

    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }

  const d =
    Math.floor(h / 24);

  return `${d} day${d === 1 ? "" : "s"} ago`;
}


function jobCardHTML(job) {

  const match =
    calculateMatch(
      state.userSkills,
      job
    );

  const tier =
    matchTier(match.score);

  const saved =
    state.savedIds.has(job.id);

  return `
    <div class="job-card" data-id="${job.id}">

      <div class="job-card-top">

        <div>

          <div class="job-title">
            ${job.title}
          </div>

          <div class="job-company">
            ${job.company} · ${job.location}
          </div>

        </div>

        <div class="match-badge">

          <span class="pct ${tier}">
            ${match.score}%
          </span>

          <span class="lbl">
            match
          </span>

        </div>

      </div>

      <div class="job-meta">

        <span>${job.workMode}</span>

        <span>${job.jobType}</span>

        <span>${job.experience}</span>

        <span>${job.salary}</span>

        <span>
          Posted ${timeAgo(job.postedAt)}
        </span>

        <span>
          ${saved ? "★ Saved" : ""}
        </span>

      </div>

      <div class="skill-chip-row">

        ${
          match.matchedRequired
            .map(
              skill =>
                `<span class="chip matched">${skill}</span>`
            )
            .join("")
        }

        ${
          match.missingRequired
            .map(
              skill =>
                `<span class="chip missing">${skill}</span>`
            )
            .join("")
        }

      </div>

      <div class="fineprint" style="margin-top:8px;">
        Source: Himalayas
      </div>

    </div>
  `;
}


function renderJobList(
  container,
  jobs
) {

  container.innerHTML =
    jobs.length
      ? jobs.map(jobCardHTML).join("")
      : `
        <div class="empty-state">
          No current matching jobs found.
          Try a broader search or fewer filters.
        </div>
      `;

  $$(".job-card", container)
    .forEach(card => {

      card.addEventListener(
        "click",
        () =>
          openJobModal(
            card.dataset.id
          )
      );

    });
}


function computeRanked(
  jobs,
  sort
) {

  const withMatch =
    jobs.map(job => ({
      job,
      match:
        calculateMatch(
          state.userSkills,
          job
        )
    }));

  switch (sort) {

    case "match":

      withMatch.sort(
        (a, b) =>
          b.match.score -
          a.match.score
      );

      break;

    case "salary":

      withMatch.sort(
        (a, b) =>
          extractSalaryNum(b.job.salary) -
          extractSalaryNum(a.job.salary)
      );

      break;

    case "date":

      withMatch.sort(
        (a, b) =>
          new Date(b.job.postedAt) -
          new Date(a.job.postedAt)
      );

      break;

    default:

      withMatch.sort(
        (a, b) =>
          b.match.score -
          a.match.score
      );
  }

  return withMatch.map(
    item => item.job
  );
}


function extractSalaryNum(salary) {

  const nums =
    String(salary)
      .match(/[\d.]+/g);

  return nums
    ? Math.max(
        ...nums.map(Number)
      )
    : 0;
}


/* ---------------------------------------------------------------------
   11. FILTERS
   --------------------------------------------------------------------- */

function passesFilters(job) {

  const f =
    state.filters;

  if (f.posted !== "any") {

    const days =
      (Date.now() -
        new Date(job.postedAt)) /
      86400000;

    if (
      days >
      Number(f.posted)
    ) {
      return false;
    }
  }

  if (
    f.modes.length &&
    !f.modes.includes(
      job.workMode
    )
  ) {
    return false;
  }

  if (
    f.types.length &&
    !f.types.includes(
      job.jobType
    )
  ) {
    return false;
  }

  if (
    f.exp.length &&
    !f.exp.includes(
      job.experienceLevel
    )
  ) {
    return false;
  }

  if (state.query) {

    const q =
      state.query.toLowerCase();

    const hay = `
      ${job.title}
      ${job.company}
      ${job.description}
      ${(job.requiredSkills || []).join(" ")}
    `.toLowerCase();

    if (!hay.includes(q)) {
      return false;
    }
  }

  if (state.location) {

    const location =
      String(job.location || "")
        .toLowerCase();

    if (
      !location.includes(
        state.location.toLowerCase()
      )
    ) {
      return false;
    }
  }

  return true;
}


function runSearch() {

  const filtered =
    state.jobs.filter(
      passesFilters
    );

  const ranked =
    computeRanked(
      filtered,
      state.filters.sort
    );

  $("#resultsMeta").textContent =
    `${ranked.length} job${ranked.length === 1 ? "" : "s"} found · Last checked ${new Date().toLocaleTimeString()}`;

  $("#searchSummary").textContent =
    state.query ||
    state.location
      ? `Results for "${state.query || "any role"}"${state.location ? " in " + state.location : ""}.`
      : "Showing all real jobs from the connected dataset.";

  renderJobList(
    $("#searchResults"),
    ranked
  );
}


/* ---------------------------------------------------------------------
   12. DASHBOARD
   --------------------------------------------------------------------- */

function renderDashboard() {

  const ranked =
    computeRanked(
      state.jobs,
      "match"
    );

  const highMatch =
    ranked.filter(
      job =>
        calculateMatch(
          state.userSkills,
          job
        ).score >= 70
    );

  const remote =
    state.jobs.filter(
      job =>
        job.workMode === "Remote"
    );

  const internships =
    state.jobs.filter(
      job =>
        job.jobType === "Internship"
    );

  const today =
    state.jobs.filter(
      job =>
        (Date.now() -
          new Date(job.postedAt)) /
          86400000 <
        1
    );

  $("#statGrid").innerHTML = [

    [
      "Total active jobs",
      state.jobs.length
    ],

    [
      "Added today",
      today.length
    ],

    [
      "High match (70%+)",
      highMatch.length
    ],

    [
      "Remote jobs",
      remote.length
    ],

    [
      "Internships",
      internships.length
    ],

    [
      "Saved jobs",
      state.savedIds.size
    ]

  ]
    .map(
      ([label, number]) =>
        `
        <div class="stat-card">
          <div class="num">
            ${number}
          </div>
          <div class="label">
            ${label}
          </div>
        </div>
        `
    )
    .join("");

  renderJobList(
    $("#recentJobs"),
    ranked.slice(0, 4)
  );

  const gaps =
    aggregateMissingSkills();

  $("#topMissingSkills").innerHTML =
    gaps.length
      ? gaps
          .slice(0, 8)
          .map(
            item =>
              `<span class="chip missing">${item.skill} · ${item.count}</span>`
          )
          .join("")
      : `
        <div class="empty-state">
          Add your skills under Resume & Skill Match to see gaps.
        </div>
      `;
}


function aggregateMissingSkills() {

  const pool =
    state.jobs.filter(
      job =>
        state.viewedIds.has(job.id) ||
        state.savedIds.has(job.id)
    );

  const source =
    pool.length
      ? pool
      : state.jobs;

  const counts = {};

  source.forEach(job => {

    const match =
      calculateMatch(
        state.userSkills,
        job
      );

    match.missingRequired
      .forEach(skill => {

        counts[skill] =
          (counts[skill] || 0) + 1;

      });
  });

  return Object.entries(counts)
    .map(
      ([skill, count]) => ({
        skill,
        count
      })
    )
    .sort(
      (a, b) =>
        b.count - a.count
    );
}


/* ---------------------------------------------------------------------
   13. RECOMMENDED / SAVED
   --------------------------------------------------------------------- */

function renderRecommended() {

  const ranked =
    computeRanked(
      state.jobs,
      "match"
    );

  renderJobList(
    $("#recommendedJobs"),
    ranked
  );
}


function renderSaved() {

  const saved =
    state.jobs.filter(
      job =>
        state.savedIds.has(job.id)
    );

  renderJobList(
    $("#savedJobs"),
    saved
  );
}


/* ---------------------------------------------------------------------
   14. RESUME SKILLS
   --------------------------------------------------------------------- */

function renderExtractedSkills() {

  const element =
    $("#extractedSkills");

  if (!state.userSkills.length) {

    element.className =
      "chip-list empty-state";

    element.innerHTML =
      "No skills extracted yet.";

    return;
  }

  element.className =
    "chip-list";

  element.innerHTML =
    state.userSkills
      .map(
        skill =>
          `<span class="chip matched">${skill}</span>`
      )
      .join("");
}


/* ---------------------------------------------------------------------
   15. LEARNING PLAN
   --------------------------------------------------------------------- */

function renderLearningPlan() {

  const gaps =
    aggregateMissingSkills();

  const element =
    $("#learningPlanContent");

  if (!gaps.length) {

    element.innerHTML = `
      <div class="empty-state">
        No skill gaps to plan around yet.
        View or save a few jobs, or add your skills first.
      </div>
    `;

    return;
  }

  const plan =
    buildLearningPlan(gaps);

  element.innerHTML =
    plan
      .map(
        week => `
          <div class="week-block">

            <h4>
              Week ${week.week}
              —
              ${week.skill}

              <span
                class="priority-tag ${
                  week.count > 1
                    ? "priority-high"
                    : "priority-med"
                }"
              >
                ${
                  week.count > 1
                    ? "High priority"
                    : "Relevant"
                }
              </span>

            </h4>

            <div
              class="fineprint"
              style="margin-top:-4px;margin-bottom:8px;"
            >
              Required by ${week.count}
              job${week.count === 1 ? "" : "s"}
              you've viewed or saved.
            </div>

            <ol
              style="
                margin:0;
                padding-left:18px;
                color:var(--text-dim);
                font-size:13.5px;
              "
            >

              ${week.path
                .map(
                  item =>
                    `<li>${item}</li>`
                )
                .join("")}

            </ol>

            <div class="fineprint">
              Practice project:
              ${week.project}
            </div>

          </div>
        `
      )
      .join("");
}


/* ---------------------------------------------------------------------
   16. MARKET INTELLIGENCE
   --------------------------------------------------------------------- */

function renderMarket() {

  const skillCounts = {};

  const companyCounts = {};

  state.jobs.forEach(job => {

    (job.requiredSkills || [])
      .forEach(skill => {

        skillCounts[skill] =
          (skillCounts[skill] || 0) + 1;

      });

    companyCounts[job.company] =
      (companyCounts[job.company] || 0) + 1;
  });

  const topSkills =
    Object.entries(skillCounts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 8);

  const topCompanies =
    Object.entries(companyCounts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 8);

  const max =
    Math.max(
      1,
      ...topSkills.map(
        item => item[1]
      )
    );

  $("#marketSubhead").textContent =
    `Computed from ${state.jobs.length} real jobs sourced from Himalayas.`;

  $("#marketSkills").innerHTML =
    topSkills
      .map(
        ([skill, count]) =>
          `
          <div class="bar-row">

            <div class="bar-row-top">
              <span>${skill}</span>
              <span>${count}</span>
            </div>

            <div class="bar-track">

              <div
                class="bar-fill"
                style="
                  width:${(count / max) * 100}%
                "
              ></div>

            </div>

          </div>
          `
      )
      .join("");

  $("#marketCompanies").innerHTML =
    topCompanies
      .map(
        ([company, count]) =>
          `
          <div class="bar-row">

            <div class="bar-row-top">

              <span>
                ${company}
              </span>

              <span>
                ${count}
                role${count === 1 ? "" : "s"}
              </span>

            </div>

            <div class="bar-track">

              <div
                class="bar-fill"
                style="
                  width:${(count / max) * 100}%
                "
              ></div>

            </div>

          </div>
          `
      )
      .join("");
}


/* ---------------------------------------------------------------------
   17. JOB MODAL
   --------------------------------------------------------------------- */

function openJobModal(id) {

  const job =
    state.jobs.find(
      item => item.id === id
    );

  if (!job) return;

  state.viewedIds.add(id);

  persist();

  const match =
    calculateMatch(
      state.userSkills,
      job
    );

  const saved =
    state.savedIds.has(id);

  $("#jobModal").innerHTML = `

    <button
      class="modal-close"
      id="closeModal"
    >
      ✕
    </button>

    <div
      class="job-title"
      style="font-size:20px;"
    >
      ${job.title}
    </div>

    <div class="job-company">
      ${job.company} ·
      ${job.location}
    </div>

    <div
      class="job-meta"
      style="margin-top:12px;"
    >

      <span>${job.workMode}</span>

      <span>${job.jobType}</span>

      <span>${job.experience}</span>

      <span>${job.salary}</span>

      <span>
        Posted ${timeAgo(job.postedAt)}
      </span>

      <span>
        Source: Himalayas
      </span>

    </div>


    <div class="modal-section">

      <h4>
        AI match — ${match.score}%
      </h4>

      <div class="skill-chip-row">

        ${match.matchedRequired
          .map(
            skill =>
              `<span class="chip matched">${skill}</span>`
          )
          .join("")}

        ${match.missingRequired
          .map(
            skill =>
              `<span class="chip missing">${skill}</span>`
          )
          .join("")}

      </div>

      <p class="fineprint">

        ${match.requiredMatchedCount}
        /
        ${match.requiredTotal}
        required skills matched.

        This score compares your extracted
        skills with the skills detected from
        the job description.

      </p>

    </div>


    <div class="modal-section">

      <h4>
        About the role
      </h4>

      <div
        style="
          font-size:13.5px;
          color:var(--text-dim);
        "
      >
        ${job.description}
      </div>

    </div>


    <div class="modal-section">

      <h4>
        Ask about this job
      </h4>

      <div class="ask-ai-box">

        <button data-q="score">
          Why is my match this percentage?
        </button>

        <button data-q="missing">
          What am I missing?
        </button>

        <button data-q="first">
          What should I learn first?
        </button>

        <button data-q="plan">
          Create a 30-day plan
        </button>

      </div>

      <div id="aiAnswer"></div>

    </div>


    <div class="modal-section">

      <button
        class="btn-secondary"
        id="saveJobBtn"
      >
        ${
          saved
            ? "★ Saved"
            : "☆ Save job"
        }
      </button>

      <a
        href="${job.sourceUrl}"
        class="apply-link"
        target="_blank"
        rel="noopener"
      >
        View original job
      </a>

    </div>

    <div class="fineprint" style="margin-top:12px;">
      Job data source: Himalayas
    </div>
  `;


  $("#closeModal").onclick =
    closeJobModal;


  $("#saveJobBtn").onclick =
    () => {

      if (
        state.savedIds.has(id)
      ) {
        state.savedIds.delete(id);
      } else {
        state.savedIds.add(id);
      }

      persist();

      openJobModal(id);

      renderAll();
    };


  $$(".ask-ai-box button", $("#jobModal"))
    .forEach(button => {

      button.onclick =
        () => {

          $("#aiAnswer").innerHTML =
            `
              <div class="ai-answer">
                ${
                  answerAboutJob(
                    button.dataset.q,
                    job,
                    match
                  )
                }
              </div>
            `;
        };
    });


  $("#jobModalBackdrop")
    .classList
    .remove("hidden");
}


function closeJobModal() {

  $("#jobModalBackdrop")
    .classList
    .add("hidden");
}


/* ---------------------------------------------------------------------
   18. RULE-BASED JOB ASSISTANT
   --------------------------------------------------------------------- */

function answerAboutJob(
  kind,
  job,
  match
) {

  switch (kind) {

    case "score":

      return `
        Your match is ${match.score}% because you have
        ${match.requiredMatchedCount}
        of the
        ${match.requiredTotal}
        required skills.

        Matched skills:
        ${
          match.matchedRequired.join(", ") ||
          "none"
        }.

        Required skills have more weight than
        preferred skills.
      `;


    case "missing":

      return match.missingRequired.length

        ? `
          You're missing:
          ${match.missingRequired.join(", ")}.

          These are skills detected as required
          from this job description.
        `

        : `
          You currently match all the
          required skills detected from this job.
        `;


    case "first":

      return match.missingRequired.length

        ? `
          Start with
          "${match.missingRequired[0]}".

          It is one of the missing required skills
          for this role.
        `

        : `
          You already cover the required skills
          detected for this role.
        `;


    case "plan": {

      const skill =
        match.missingRequired[0] ||
        match.missingPreferred[0];

      if (!skill) {

        return `
          No major skill gap was detected
          for this job.
        `;
      }

      const info =
        SKILL_LEARNING_INFO[skill] ||
        defaultLearningInfo(skill);

      return `
        30-day plan for ${skill}:

        Week 1 —
        ${info.path[0]}

        Week 2 —
        ${info.path[1] || "Continue practice"}

        Week 3 —
        ${info.path[2] || "Build a small project"}

        Week 4 —
        ${info.project}
      `;
    }


    default:
      return "";
  }
}


/* ---------------------------------------------------------------------
   19. VIEW SWITCHING
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

  $$(".view")
    .forEach(
      element =>
        element.classList.add("hidden")
    );

  $(`#view-${view}`)
    ?.classList
    .remove("hidden");

  $$(".nav-item")
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          button.dataset.view === view
        )
    );
}


/* ---------------------------------------------------------------------
   20. EVENT WIRING
   --------------------------------------------------------------------- */

function wire() {

  $$(".nav-item")
    .forEach(
      button =>
        button.addEventListener(
          "click",
          () =>
            setView(
              button.dataset.view
            )
        )
    );


  $$("[data-view].link-btn")
    .forEach(
      button =>
        button.addEventListener(
          "click",
          () =>
            setView(
              button.dataset.view
            )
        )
    );


  $("#searchForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        state.query =
          $("#searchQuery")
            .value
            .trim();

        state.location =
          $("#searchLocation")
            .value
            .trim();

        setView("search");

        runSearch();
      }
    );


  $("#filterPosted")
    .addEventListener(
      "change",
      event => {

        state.filters.posted =
          event.target.value;

        runSearch();
      }
    );


  $("#sortBy")
    .addEventListener(
      "change",
      event => {

        state.filters.sort =
          event.target.value;

        runSearch();
      }
    );


  $$(".f-mode")
    .forEach(
      checkbox =>
        checkbox.addEventListener(
          "change",
          () => {

            state.filters.modes =
              $$(".f-mode")
                .filter(
                  item => item.checked
                )
                .map(
                  item => item.value
                );

            runSearch();
          }
        )
    );


  $$(".f-type")
    .forEach(
      checkbox =>
        checkbox.addEventListener(
          "change",
          () => {

            state.filters.types =
              $$(".f-type")
                .filter(
                  item => item.checked
                )
                .map(
                  item => item.value
                );

            runSearch();
          }
        )
    );


  $$(".f-exp")
    .forEach(
      checkbox =>
        checkbox.addEventListener(
          "change",
          () => {

            state.filters.exp =
              $$(".f-exp")
                .filter(
                  item => item.checked
                )
                .map(
                  item => item.value
                );

            runSearch();
          }
        )
    );


  $("#jobModalBackdrop")
    .addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "jobModalBackdrop"
        ) {
          closeJobModal();
        }
      }
    );


  $("#analyzeResumeBtn")
    .addEventListener(
      "click",
      () => {

        const text =
          $("#resumeInput")
            .value;

        const skills =
          extractSkillsFromText(
            text
          );

        state.userSkills =
          skills;

        persist();

        renderExtractedSkills();

        renderAll();
      }
    );


  $("#resumeFileBtn")
    .addEventListener(
      "click",
      () =>
        $("#resumeFile").click()
    );


  $("#resumeFile")
    .addEventListener(
      "change",
      event => {

        const file =
          event.target.files[0];

        if (!file) return;

        const reader =
          new FileReader();

        reader.onload =
          () => {

            $("#resumeInput")
              .value =
              reader.result;
          };

        reader.readAsText(file);
      }
    );


  $("#themeToggle")
    .addEventListener(
      "click",
      () => {

        const html =
          document.documentElement;

        const next =
          html.dataset.theme === "dark"
            ? "light"
            : "dark";

        html.dataset.theme =
          next;

        localStorage.setItem(
          "jr_theme",
          next
        );
      }
    );


  const savedTheme =
    localStorage.getItem(
      "jr_theme"
    );

  if (savedTheme) {
    document.documentElement.dataset.theme =
      savedTheme;
  }
}


/* ---------------------------------------------------------------------
   21. SOURCE STATUS
   --------------------------------------------------------------------- */

function refreshTimestamp() {

  $("#lastUpdatedLabel").textContent =
    `Last checked ${new Date().toLocaleTimeString()}`;
}


function markSourceStatus() {

  const connected =
    SOURCE_ADAPTERS.filter(
      adapter =>
        adapter.status === "connected"
    ).length;

  $("#sourceCount").textContent =
    connected;

  $("#syncDot")
    .classList
    .toggle(
      "live",
      connected > 0
    );

  if (connected > 0) {

    $("#sourceBanner").innerHTML = `
      Connected to ${connected}
      real job source${connected === 1 ? "" : "s"}.
      <strong>Himalayas</strong> data is being displayed.
    `;

  } else {

    $("#sourceBanner").innerHTML = `
      Connecting to the real job source...
    `;
  }
}


/* ---------------------------------------------------------------------
   22. BOOT
   --------------------------------------------------------------------- */

(async function init() {

  wire();

  state.jobs =
    await runSourcePipeline();

  markSourceStatus();

  renderExtractedSkills();

  refreshTimestamp();

  renderAll();

})();
```














