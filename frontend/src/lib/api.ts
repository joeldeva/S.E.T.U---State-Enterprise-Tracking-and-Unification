export interface MatchCandidate {
  _id: string;
  record_a: string;
  record_b: string;
  departments?: string[];
  confidence: number;
  decision_zone: "auto_link" | "review" | "human_review" | "keep_separate";
  explanation: string;
}

export interface MatchingRunResponse {
  status: string;
  mode: string;
  hosted_llm_used: boolean;
  collections_updated: Record<string, number>;
  counts: {
    auto_link: number;
    review: number;
    keep_separate: number;
  };
  summary: Record<string, number>;
  match_candidates: MatchCandidate[];
  review_queue: unknown[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function runEntityResolution(): Promise<MatchingRunResponse> {
  return apiFetch<MatchingRunResponse>("/api/matching/run", {
    method: "POST",
  });
}

export function fetchMatchCandidates(): Promise<MatchCandidate[]> {
  return apiFetch<MatchCandidate[]>("/api/match-candidates");
}
