export type OpportunityView = {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string | null;
  deadlineTs: number | null;
  location: string;
  remote: boolean;
  matchScore: number;
  matchReasons: string[];
  url: string;
  savedStatus: string | null;
};

export const CATEGORIES = [
  "job",
  "internship",
  "hackathon",
  "scholarship",
  "fellowship",
  "grant",
  "program",
  "competition",
];

export function demoEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("or_email") ?? "";
}
