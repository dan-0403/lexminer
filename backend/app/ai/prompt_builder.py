class PromptBuilder:
    """
    Build concise, grounded prompts for LexMiner.
    """

    # =====================================================
    # SUMMARY
    # =====================================================

    @staticmethod
    def build_summary_prompt(
        case_title: str,
        case_text: str,
    ) -> str:

        return f"""
Prepare a professional legal case brief for the
Philippine Supreme Court decision below.

CASE TITLE:
{case_title}

SOURCE MATERIAL:
{case_text}

RULES:
- Use only the supplied source material.
- Do not add outside legal knowledge.
- Do not invent facts or legal conclusions.
- Do not repeat information.
- If a detail is unsupported, state:
  Information not available in the retrieved case content.
- Preserve important names, dates, facts, issues,
  reasoning, and disposition exactly as supported.
- Write for a legal research system.
- Be concise but complete.
- Do not include markdown headings beginning with ##.
- Do not include source citations.
- Do not discuss semantic search or embeddings.

RETURN EXACTLY THESE SECTIONS:

CASE OVERVIEW
One concise paragraph explaining what the case is about.

FACTS
3–6 concise bullet points containing only material facts.

PROCEDURAL HISTORY
2–4 concise bullet points explaining how the case
reached the Supreme Court.

LEGAL ISSUES
List the principal legal questions decided by the Court.

COURT'S RULING
Explain the Supreme Court's answer to the issues and
the main reasoning supporting it.

LEGAL DOCTRINE
State the legal principle or doctrine expressly applied
or established by the Court.

DISPOSITION
State the final disposition exactly as supported by
the source material.
""".strip()

    # =====================================================
    # EXPLANATION
    # =====================================================

    @staticmethod
    def build_case_explanation_prompt(
        case_title: str,
        case_text: str,
    ) -> str:

        return f"""
Explain the following Philippine Supreme Court decision
for a legal research user.

CASE TITLE:
{case_title}

SOURCE MATERIAL:
{case_text}

RULES:
- Use only the supplied source material.
- Do not use outside legal knowledge.
- Do not invent facts, parties, dates, laws, doctrines,
  evidence, arguments, procedures, or rulings.
- Do not discuss semantic search, similarity,
  embeddings, retrieval, concepts, or scenarios.
- Do not repeat the same information.
- Explain the case itself.
- Use clear, professional legal language.
- Keep the explanation concise.
- If information is unsupported, state:
  Information not available in the retrieved case content.
- Do not include source citations.
- Do not use ## markdown headings.

RETURN EXACTLY THESE SECTIONS:

WHAT HAPPENED
Briefly explain the events that caused the dispute.

HOW THE CASE DEVELOPED
Explain the important procedural development leading
to the Supreme Court.

WHAT THE COURT HAD TO DECIDE
State the principal legal issue or issues.

HOW THE SUPREME COURT ANALYZED THE CASE
Explain the Court's reasoning by connecting the material
facts to the legal rules or principles expressly stated
in the source material.

WHY THE COURT REACHED ITS DECISION
Explain the main reasons supporting the conclusion.

FINAL DECISION
State the Supreme Court's final ruling and disposition.
""".strip()


    # =====================================================
    # MATCH EXPLANATION PROMPT
    # =====================================================

    @staticmethod
    def build_match_explanation_prompt(
        case_title: str,
        case_number: str | None,
        query: str,
        expanded_query: str | None,
        matched_intents: list[str],
        matched_issues: list[str],
        matched_concepts: list[str],
        matched_scenarios: list[str],
        matched_passages: str,
    ) -> str:
        """
        Build a grounded explanation of why a retrieved
        Supreme Court case matches the user's search.

        The model must rely only on the supplied query,
        structured search information, and matched
        decision passages.
        """

        intent_text = (
            ", ".join(matched_intents)
            if matched_intents
            else "None identified"
        )

        issue_text = (
            ", ".join(matched_issues)
            if matched_issues
            else "None identified"
        )

        concept_text = (
            ", ".join(matched_concepts)
            if matched_concepts
            else "None identified"
        )

        scenario_text = (
            ", ".join(matched_scenarios)
            if matched_scenarios
            else "None identified"
        )

        expanded_query_text = (
            expanded_query.strip()
            if expanded_query
            and expanded_query.strip()
            else query
        )

        return f"""
You are LexMiner's Match Explanation module for
Philippine Supreme Court decisions.

Your task is to explain WHY the selected Supreme Court
decision was retrieved as relevant to the user's search.

This is NOT a general case summary.

This is NOT a legal opinion.

This is NOT a prediction of the outcome of any legal matter.

You must use ONLY the information provided below.

Do NOT use outside legal knowledge.

Do NOT invent facts, legal rules, events, parties,
procedural history, or reasoning that are not supported
by the supplied passages.

========================================================
CASE
========================================================

Case Title:
{case_title}

Case Number:
{case_number or "Not available"}

========================================================
USER SEARCH
========================================================

Original Search Query:
{query}

Expanded Search Query:
{expanded_query_text}

========================================================
LEXMINER QUERY UNDERSTANDING
========================================================

Matched Intents:
{intent_text}

Matched Legal Issues:
{issue_text}

Matched Legal Concepts:
{concept_text}

Matched Scenarios:
{scenario_text}

========================================================
RETRIEVED CASE PASSAGES
========================================================

{matched_passages}

========================================================
TASK
========================================================

Explain why these retrieved passages are relevant to
the user's original search query.

Your explanation should:

1. Identify the main connection between the user's
   search query and the supplied case passages.

2. Explain the factual or legal issue reflected in
   the retrieved passages that relates to the query.

3. Explain which concepts, issues, scenarios, or
   circumstances in the passages correspond to the
   search.

4. Explain why the specific retrieved passages are
   useful for researching the user's concern.

5. Clearly distinguish between information explicitly
   supported by the passages and information that is
   not available.

If the retrieved passages do not provide enough evidence
to establish a meaningful connection, say so clearly.

Do not judge whether the case is legally identical to
the user's situation.

Do not claim that the case establishes a rule unless
that rule is explicitly supported by the supplied
passages.

========================================================
OUTPUT FORMAT
========================================================

MATCH OVERVIEW

Write a concise explanation of the overall connection
between the search query and the retrieved decision
passages.

RELEVANT CONNECTIONS

Explain the specific factual, legal, conceptual, or
scenario-level connections supported by the passages.

WHY THESE PASSAGES MATTER

Explain what information in the retrieved passages makes
them useful to the user's research query.

LIMITATIONS

State any important information that is not available
from the retrieved passages.

Use objective legal language.

Do not include citations, markdown tables, JSON, or
discussion of the AI system.
""".strip()