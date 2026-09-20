import re

from app.ai.legal_dictionary import LEGAL_DICTIONARY


class QueryExpander:

    """
    Expands a user's search query with
    related legal concepts and synonyms.
    """

    @classmethod
    def expand(
        cls,
        query: str,
    ) -> str:

        query = query.strip()

        query_lower = query.lower()

        expanded = [query]

        for phrase, synonyms in LEGAL_DICTIONARY.items():

            pattern = rf"\b{re.escape(phrase.lower())}\b"

            if re.search(
                pattern,
                query_lower,
            ):

                expanded.extend(synonyms)

        # Remove duplicates while preserving order
        expanded = list(dict.fromkeys(expanded))

        return " ".join(expanded)