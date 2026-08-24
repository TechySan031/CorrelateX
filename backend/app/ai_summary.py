"""
Groq AI integration for generating plain-English correlation summaries.

CRITICAL DESIGN RULE:
The AI model (llama-3.3-70b-versatile via Groq) must NEVER decide which stocks
are correlated or compute any relationship itself. The graph query runs FIRST
and produces deterministic, structured facts. Those facts are injected into the
prompt as data, and the model's only job is to narrate them in plain English.

The system prompt explicitly instructs the model to use ONLY the provided facts
and not invent additional relationships.
"""

import os
from groq import Groq


SYSTEM_PROMPT = """You are a financial data analyst summarizing stock correlation data.
You will receive STRUCTURED FACTS about a stock's correlation network — these facts
were computed from real historical price data using Pearson correlation.

YOUR RULES:
1. Use ONLY the facts provided. Do NOT invent, guess, or add any relationships,
   correlations, or data that is not explicitly present in the provided facts.
2. Write exactly 2-3 clear, plain-English sentences.
3. Focus on what the correlation network reveals: sector clustering, cross-sector
   links, and potential concentration risks.
4. Be precise with numbers — cite correlation strengths when relevant.
5. Do NOT give investment advice or make predictions."""


async def generate_ai_summary(ticker: str, network_data: dict) -> str:
    """
    Generate a plain-English summary of a stock's correlation network.

    The network_data dict comes directly from queries.get_network() — it
    contains deterministic facts from the graph database, NOT AI-generated
    content. This function only narrates those facts.

    Falls back to a factual (non-AI) summary if Groq is unavailable.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return _fallback_summary(ticker, network_data, reason="GROQ_API_KEY not configured")

    try:
        client = Groq(api_key=api_key)

        # Build structured facts from the network data
        facts = _build_facts_string(ticker, network_data)

        # Candidate models list: primary spec model first, then available alternatives
        candidate_models = [
            "llama-3.3-70b-versatile",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.6-27b",
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
        ]

        last_err = None
        for model_name in candidate_models:
            try:
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Summarize this correlation network:\n\n{facts}"},
                    ],
                    temperature=0.2,  # Low temperature for factual narration
                    max_tokens=256,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                last_err = e
                continue

        if last_err:
            raise last_err

    except Exception as e:
        return _fallback_summary(
            ticker, network_data, reason=f"{type(e).__name__}: {str(e)[:100]}"
        )


def _build_facts_string(ticker: str, network_data: dict) -> str:
    """Convert structured network data into a readable facts string for the prompt."""
    center = network_data.get("center", {})
    nodes = network_data.get("nodes", [])
    edges = network_data.get("edges", [])

    facts = f"Center stock: {ticker} ({center.get('sector', 'Unknown')} sector)\n"
    facts += f"Network size: {len(nodes)} correlated stocks, {len(edges)} connections\n"

    # Group nodes by sector
    sectors: dict[str, list[str]] = {}
    for node in nodes:
        sector = node.get("sector", "Unknown")
        sectors.setdefault(sector, []).append(f"{node['ticker']} (hop {node['hops']})")

    if sectors:
        facts += "\nCorrelated stocks by sector:\n"
        for sector, stocks in sorted(sectors.items()):
            facts += f"  {sector}: {', '.join(stocks)}\n"

    # Top 5 strongest correlations
    sorted_edges = sorted(edges, key=lambda e: e.get("strength", 0), reverse=True)[:5]
    if sorted_edges:
        facts += "\nStrongest correlations:\n"
        for edge in sorted_edges:
            facts += f"  {edge['source']} ↔ {edge['target']}: {edge['strength']:.4f}\n"

    return facts


def _fallback_summary(ticker: str, network_data: dict, reason: str) -> str:
    """Return a factual summary when the AI service is unavailable."""
    nodes = network_data.get("nodes", [])
    edges = network_data.get("edges", [])

    sectors: dict[str, int] = {}
    for node in nodes:
        sector = node.get("sector", "Unknown")
        sectors[sector] = sectors.get(sector, 0) + 1

    sector_breakdown = ", ".join(f"{count} {sector}" for sector, count in sorted(sectors.items()))

    return (
        f"AI summary unavailable ({reason}). "
        f"{ticker} has {len(nodes)} correlated stocks across its network "
        f"({sector_breakdown}) with {len(edges)} total connections."
    )
