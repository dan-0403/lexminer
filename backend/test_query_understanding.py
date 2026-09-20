from pprint import pprint

from app.ai.query_understanding_pipeline import (
    QueryUnderstandingPipeline,
)


QUERIES = [
    "someone harassed me",
    "my employer fired me without hearing my side",
    "someone threatened to kill me",
    "someone stole my phone",
    "my tenant will not leave my property",
    "the police searched my house without a warrant",
]


for query in QUERIES:
    print("\n")
    print("=" * 80)
    print(query)
    print("=" * 80)

    result = (
        QueryUnderstandingPipeline
        .understand(
            query
        )
    )

    pprint(
        result,
        sort_dicts=False,
    )