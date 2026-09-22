import { OpportunityView } from "./types";

export type Profile = { email: string; name: string; role: string; skills: string[]; location: string; remoteOnly: boolean; experienceLevel: string; opportunityTypes: string[] };

const opportunities: OpportunityView[] = [
  { id: "ai-research-fellowship", title: "AI Research Fellowship", organization: "Example Lab", category: "fellowship", deadline: "2026-10-20", deadlineTs: new Date("2026-10-20").getTime(), location: "Remote", remote: true, matchScore: 94, matchReasons: ["Matches your Python and AI interests", "Open to early-career builders"], url: "https://example.com", savedStatus: null },
  { id: "frontend-internship", title: "Frontend Engineering Internship", organization: "Launchpad Studio", category: "internship", deadline: "2026-10-12", deadlineTs: new Date("2026-10-12").getTime(), location: "Remote", remote: true, matchScore: 91, matchReasons: ["Your React and TypeScript skills are a strong fit", "Remote-friendly team"], url: "https://example.com", savedStatus: null },
  { id: "open-source-grant", title: "Open Source Impact Grant", organization: "Build Better Fund", category: "grant", deadline: "2026-11-05", deadlineTs: new Date("2026-11-05").getTime(), location: "Global", remote: true, matchScore: 86, matchReasons: ["Supports developer-led projects", "Available to applicants in Nigeria"], url: "https://example.com", savedStatus: null },
  { id: "global-hackathon", title: "Global Builders Hackathon", organization: "Futurestack", category: "hackathon", deadline: "2026-10-08", deadlineTs: new Date("2026-10-08").getTime(), location: "Lagos, Nigeria", remote: false, matchScore: 82, matchReasons: ["Fits your frontend development background", "A practical project-based opportunity"], url: "https://example.com", savedStatus: null },
  { id: "developer-scholarship", title: "Emerging Developer Scholarship", organization: "NextGen Foundation", category: "scholarship", deadline: null, deadlineTs: null, location: "Global", remote: true, matchScore: 77, matchReasons: ["Designed for students and junior developers", "Covers technical learning pathways"], url: "https://example.com", savedStatus: null },
  { id: "product-program", title: "Product Builder Program", organization: "Makers Collective", category: "program", deadline: "2026-11-18", deadlineTs: new Date("2026-11-18").getTime(), location: "Remote", remote: true, matchScore: 74, matchReasons: ["Builds on your product and engineering experience", "Mentorship and practical project support"], url: "https://example.com", savedStatus: null },
];

const PROFILE_KEY = "opportunity-radar-profile";
const STATUS_KEY = "opportunity-radar-statuses";

export function getProfile(): Profile | null { if (typeof window === "undefined") return null; const value = localStorage.getItem(PROFILE_KEY); return value ? JSON.parse(value) : null; }
export function saveProfile(profile: Profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); localStorage.setItem("or_email", profile.email); }
function getStatuses(): Record<string, string> { if (typeof window === "undefined") return {}; const value = localStorage.getItem(STATUS_KEY); return value ? JSON.parse(value) : {}; }
export function getOpportunities(): OpportunityView[] { const statuses = getStatuses(); return opportunities.map((opportunity) => ({ ...opportunity, savedStatus: statuses[opportunity.id] ?? null })); }
export function getOpportunity(id: string) { return getOpportunities().find((opportunity) => opportunity.id === id) ?? null; }
export function setOpportunityStatus(id: string, status: string) { const statuses = getStatuses(); statuses[id] = status; localStorage.setItem(STATUS_KEY, JSON.stringify(statuses)); }
