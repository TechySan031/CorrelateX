import {
  Stock,
  Correlation,
  NetworkResponse,
  ShortestPathResponse,
  ClusterItem,
  AiSummaryResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorBody = await response.json();
        if (errorBody && errorBody.detail) {
          errorMessage = typeof errorBody.detail === "string" 
            ? errorBody.detail 
            : JSON.stringify(errorBody.detail);
        }
      } catch {
        // Fallback to status text if json parsing fails
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        `Unable to reach backend at ${API_BASE_URL}. Ensure the FastAPI server is running.`
      );
    }
    throw error;
  }
}

export async function fetchHealth(): Promise<{ status: string; database: string }> {
  return fetchJson<{ status: string; database: string }>("/health");
}

export async function fetchStocks(): Promise<Stock[]> {
  return fetchJson<Stock[]>("/stocks");
}

export async function fetchCorrelations(
  ticker: string,
  minStrength: number = 0.5
): Promise<Correlation[]> {
  const params = new URLSearchParams({
    min_strength: minStrength.toString(),
  });
  return fetchJson<Correlation[]>(`/stocks/${ticker}/correlations?${params}`);
}

export async function fetchNetwork(
  ticker: string,
  hops: number = 2,
  minStrength: number = 0.5
): Promise<NetworkResponse> {
  const params = new URLSearchParams({
    hops: hops.toString(),
    min_strength: minStrength.toString(),
  });
  return fetchJson<NetworkResponse>(`/stocks/${ticker}/network?${params}`);
}

export async function fetchShortestPath(
  fromTicker: string,
  toTicker: string
): Promise<ShortestPathResponse> {
  const params = new URLSearchParams({
    from_ticker: fromTicker,
    to_ticker: toTicker,
  });
  return fetchJson<ShortestPathResponse>(`/path?${params}`);
}

export async function fetchClusters(
  minStrength: number = 0.5
): Promise<ClusterItem[]> {
  const params = new URLSearchParams({
    min_strength: minStrength.toString(),
  });
  return fetchJson<ClusterItem[]>(`/clusters?${params}`);
}

export async function fetchAiSummary(
  ticker: string
): Promise<AiSummaryResponse> {
  return fetchJson<AiSummaryResponse>(`/stocks/${ticker}/ai-summary`);
}
