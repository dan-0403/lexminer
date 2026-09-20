import re

from app.ai.legal_concepts import LEGAL_CONCEPTS


class LegalConceptMatcher:

    """
    Identifies legal concepts
    related to a user's query.
    """

    @staticmethod
    def match(
        query: str,
    ) -> list[str]:

        query_lower = query.lower()

        matched = []

        for concept, data in LEGAL_CONCEPTS.items():

            terms = (
                data.get("keywords", [])
                + data.get("related_terms", [])
            )

            for term in terms:

                pattern = rf"\b{re.escape(term.lower())}\b"

                if re.search(
                    pattern,
                    query_lower,
                ):

                    matched.append(concept)
                    break

        return sorted(set(matched))