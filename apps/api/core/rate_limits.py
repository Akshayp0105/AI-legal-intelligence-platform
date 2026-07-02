"""Rate limit configurations for API endpoints."""

# Default rate limits per endpoint group
RATE_LIMITS = {
    # AI-intensive endpoints - stricter limits
    "analysis": "30/minute",
    "analysis_stream": "30/minute",
    "precedents_search": "20/minute",
    "precedents_analyze": "10/minute",
    "arguments_generate": "15/minute",
    "gaps_analyze": "15/minute",
    "analytics_predict": "20/minute",
    "drafting_generate": "5/minute",
    "drafting_improve": "10/minute",
    "drafting_translate": "10/minute",

    # Data-heavy endpoints
    "documents_upload": "10/minute",
    "knowledge_search": "30/minute",

    # Read-only endpoints - relaxed limits
    "cases_list": "60/minute",
    "cases_messages": "60/minute",
    "analytics_dashboard": "30/minute",

    # Feedback
    "feedback_submit": "20/minute",
}

# Burst limits for authenticated users
AUTHENTICATED_MULTIPLIER = 2  # Authenticated users get 2x the rate limit


def get_rate_limit(endpoint_key: str, authenticated: bool = False) -> str:
    """Get the rate limit for an endpoint key.

    Returns the base rate limit, or the doubled limit for authenticated users
    when AUTHENTICATED_MULTIPLIER is applied.
    """
    base_limit = RATE_LIMITS.get(endpoint_key, "60/minute")
    if authenticated:
        # Parse and multiply
        parts = base_limit.split("/")
        if len(parts) == 2:
            count = int(parts[0]) * AUTHENTICATED_MULTIPLIER
            return f"{count}/{parts[1]}"
    return base_limit
