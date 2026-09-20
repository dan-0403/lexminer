import re

from app.ai.legal_scenarios import LEGAL_SCENARIOS


class ScenarioMatcher:

    """
    Detects legal scenarios based on
    facts described by the user.

    Returns:
    {
        "expanded_query": "...",
        "matched_scenarios": [
            "QUALIFIED_THEFT",
            "ROBBERY"
        ]
    }
    """

    MIN_MATCH_SCORE = 2

    @classmethod
    def match(
        cls,
        query: str,
    ) -> dict:

        query = query.strip()

        query_lower = query.lower()

        expanded_terms = [query]

        matched_scenarios = []

        for scenario_name, scenario_data in LEGAL_SCENARIOS.items():

            score = 0

            keywords = scenario_data.get(
                "keywords",
                []
            )

            concepts = scenario_data.get(
                "concepts",
                []
            )

            for keyword in keywords:

                pattern = (
                    rf"\b{re.escape(keyword.lower())}\b"
                )

                if re.search(
                    pattern,
                    query_lower,
                ):
                    score += 1

            if score >= cls.MIN_MATCH_SCORE:

                matched_scenarios.append(
                    scenario_name
                )

                expanded_terms.extend(
                    concepts
                )

        # Remove duplicates while preserving order
        expanded_terms = list(
            dict.fromkeys(expanded_terms)
        )

        return {

            "expanded_query": " ".join(
                expanded_terms
            ),

            "matched_scenarios":
            matched_scenarios,

        }