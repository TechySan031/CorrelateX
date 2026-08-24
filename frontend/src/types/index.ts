export interface Stock {
  ticker: string;
  sector: string;
}

export interface Correlation {
  ticker: string;
  sector: string;
  strength: number;
}

export interface NetworkNodeData {
  ticker: string;
  sector: string;
  hops: number;
}

export interface NetworkEdgeData {
  source: string;
  target: string;
  strength: number;
}

export interface NetworkResponse {
  center: Stock;
  nodes: NetworkNodeData[];
  edges: NetworkEdgeData[];
}

export interface GraphNode {
  id: string;
  ticker: string;
  sector: string;
  hops: number;
  isCenter: boolean;
  color: string;
  val: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface PathEdge {
  source: string;
  target: string;
  strength: number;
}

export interface ShortestPathResponse {
  path: Stock[];
  edges: PathEdge[];
  total_hops: number;
}

export interface ClusterCorrelation {
  pair: [string, string];
  strength: number;
}

export interface ClusterItem {
  stocks: Stock[];
  correlations: ClusterCorrelation[];
  avg_strength: number;
}

export interface AiSummaryResponse {
  ticker: string;
  summary: string;
}

export type SectorName =
  | "Technology"
  | "Finance"
  | "Energy"
  | "Healthcare"
  | "Consumer"
  | "Unknown";
