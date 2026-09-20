import re
from datetime import datetime

from app.enums import CaseType


class MetadataExtractor:
    """
    Extracts legal metadata from
    Philippine Supreme Court decisions.
    """

    @staticmethod
    def extract(text: str):

        return {

            "title":
            MetadataExtractor.extract_title(text),

            "case_type":
            MetadataExtractor.extract_case_type(text),

            "case_number":
            MetadataExtractor.extract_case_number(text),

            "division":
            MetadataExtractor.extract_division(text),

            "decision_date":
            MetadataExtractor.extract_date(text),

            "ponencia":
            MetadataExtractor.extract_ponencia(text),

        }

    # ==========================================================
    # CASE TYPE
    # ==========================================================

    @staticmethod
    def extract_case_type(text: str):

        upper = text.upper()

        patterns = {

            CaseType.GR: r"\bG\.R\.\s*NO\.",

            CaseType.AC: r"\bA\.C\.\s*NO\.",

            CaseType.AM: r"\bA\.M\.\s*NO\.",

            CaseType.BM: r"\bB\.M\.\s*NO\.|\bBAR\s+MATTER",

            CaseType.PET: r"\bP\.E\.T\.",

            CaseType.JIB: r"\bJIB\b",

            CaseType.UDK: r"\bUDK\b",

        }

        for case_type, pattern in patterns.items():

            if re.search(pattern, upper):

                return case_type

        if re.search(r"^\s*IN\s+RE[:\s]", upper, re.MULTILINE):

            return CaseType.IN_RE

        if re.search(r"^\s*RE[:\s]", upper, re.MULTILINE):

            return CaseType.RE

        if re.search(r"^\s*LETTER\b", upper, re.MULTILINE):

            return CaseType.LETTER

        return CaseType.OTHER

    # ==========================================================
    # CASE NUMBER
    # ==========================================================

    @staticmethod
    def extract_case_number(text: str):

        patterns = [

            r"G\.R\.\s*No\.\s*[\w\-\[\]\s]+",

            r"A\.C\.\s*No\.\s*[\w\-\[\]\s]+",

            r"A\.M\.\s*No\.\s*[\w\-\[\]\s]+",

            r"B\.M\.\s*No\.\s*[\w\-\[\]\s]+",

            r"JIB\s*FPI\s*No\.\s*[\w\-]+",

            r"UDK\s*No\.\s*[\w\-]+",

        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
                re.IGNORECASE,
            )

            if match:

                return match.group(0).strip()

        return None

    # ==========================================================
    # DIVISION
    # ==========================================================

    @staticmethod
    def extract_division(text):

        divisions = [

            "EN BANC",

            "FIRST DIVISION",

            "SECOND DIVISION",

            "THIRD DIVISION",

            "FOURTH DIVISION",

            "FIFTH DIVISION",

        ]

        upper = text.upper()

        for division in divisions:

            if division in upper:

                return division

        return None

    # ==========================================================
    # DECISION DATE
    # ==========================================================

    @staticmethod
    def extract_date(text):

        months = (
            "January|February|March|April|May|June|"
            "July|August|September|October|November|December"
        )

        pattern = rf"({months})\s+\d{{1,2}},\s+\d{{4}}"

        match = re.search(pattern, text)

        if match:

            return datetime.strptime(
                match.group(0),
                "%B %d, %Y"
            ).date()

        return None

    # ==========================================================
    # TITLE
    # ==========================================================

    @staticmethod
    def extract_title(text: str):

        lines = [

            line.strip()

            for line in text.splitlines()

            if line.strip()

        ]

        skip_patterns = [

            r"petitioner",

            r"respondent",

            r"complainant",

            r"accused",

            r"plaintiff",

            r"defendant",

            r"appellant",

            r"appellee",

            r"judge",

            r"justice",

            r"decision",

            r"resolution",

        ]

        def is_party_name(line):

            lower = line.lower()

            if any(
                re.search(pattern, lower)
                for pattern in skip_patterns
            ):
                return False

            return len(line) >= 3

        # Regular vs. cases

        for index, line in enumerate(lines):

            if re.search(
                r"\b(versus|vs\.?|v\.?)\b",
                line,
                re.IGNORECASE,
            ):

                plaintiff = None
                defendant = None

                for i in range(index - 1, -1, -1):

                    if is_party_name(lines[i]):

                        plaintiff = lines[i].rstrip(",")

                        break

                for i in range(index + 1, len(lines)):

                    if is_party_name(lines[i]):

                        defendant = lines[i].rstrip(",")

                        break

                if plaintiff and defendant:

                    return f"{plaintiff} vs. {defendant}"

        # Special case formats

        special_patterns = [

            r"^\s*IN\s+RE[:\s].*$",

            r"^\s*RE[:\s].*$",

            r"^\s*ADMINISTRATIVE\s+MATTER.*$",

            r"^\s*BAR\s+MATTER.*$",

            r"^\s*(LETTER|COMPLAINT|PETITION).*$",

        ]

        for pattern in special_patterns:

            for line in lines:

                if re.match(
                    pattern,
                    line,
                    re.IGNORECASE,
                ):

                    return line.rstrip(",")

        return None

    # ==========================================================
    # PONENCIA
    # ==========================================================

    @staticmethod
    def extract_ponencia(text):

        match = re.search(

            r"([A-ZÑ\-]+),\s*J\.",

            text,

        )

        if match:

            return match.group(1).title()

        return None