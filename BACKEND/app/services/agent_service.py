import re
from typing import Optional


# -------------------------------------------------------------------
# BISENSE AGENT
#
# This is the first orchestration layer.
#
# It does NOT call Gemini.
# It deterministically identifies the user's intent and decides which
# BISense workflow should handle the request.
#
# This keeps the agent reliable and avoids spending Gemini quota on
# simple routing decisions.
# -------------------------------------------------------------------


INTENT_STANDARD = "standard"
INTENT_CERTIFICATION = "certification"
INTENT_COMPLIANCE = "compliance"
INTENT_LABORATORY = "laboratory"
INTENT_PRODUCT = "product"
INTENT_COMPARISON = "comparison"
INTENT_CONSUMER = "consumer"
INTENT_GENERAL_BIS = "general_bis"
INTENT_STARTUP = "startup"
INTENT_UNKNOWN = "general"


def normalize(text: str) -> str:
    return " ".join(
        str(text or "")
        .lower()
        .strip()
        .split()
    )


def contains_any(
    text: str,
    keywords: list[str],
) -> bool:
    return any(
        keyword in text
        for keyword in keywords
    )


def extract_standard_numbers(
    text: str,
) -> list[str]:
    """
    Extract references such as:
    IS 456
    IS 456:2000
    IS 10500
    """

    matches = re.findall(
        r"\bis\s+(\d+)(?::(\d{4}))?\b",
        text,
        flags=re.IGNORECASE,
    )

    results = []

    for number, year in matches:
        value = f"IS {number}"

        if year:
            value = f"{value}:{year}"

        if value not in results:
            results.append(value)

    return results


def detect_intent(
    message: str,
) -> str:
    text = normalize(message)

    # ---------------------------------------------------------------
    # STANDARD / IS NUMBER
    # ---------------------------------------------------------------

    if extract_standard_numbers(text):
        return INTENT_STANDARD

    standard_keywords = [
        "indian standard",
        "indian standards",
        "standard number",
        "which standard",
        "applicable standard",
        "relevant standard",
        "standard applies",
        "standard for",
        "scope of standard",
        "explain standard",
        "about the standard",
    ]

    if contains_any(text, standard_keywords):
        return INTENT_STANDARD

    # ---------------------------------------------------------------
    # COMPARISON
    # ---------------------------------------------------------------

    comparison_keywords = [
        "compare",
        "comparison",
        "difference between",
        "differences between",
        "versus",
        " vs ",
        "which is better",
        "which one should",
    ]

    if contains_any(
        f" {text} ",
        comparison_keywords,
    ):
        return INTENT_COMPARISON

    # ---------------------------------------------------------------
    # LABORATORY / TESTING
    # ---------------------------------------------------------------

    laboratory_keywords = [
        "laboratory",
        "laboratories",
        "lab for",
        "testing lab",
        "testing laboratory",
        "where can i test",
        "where to test",
        "test my product",
        "testing facility",
        "recognised lab",
        "recognized lab",
    ]

    if contains_any(text, laboratory_keywords):
        return INTENT_LABORATORY

    # ---------------------------------------------------------------
    # COMPLIANCE
    # ---------------------------------------------------------------

    compliance_keywords = [
        "compliance",
        "compliant",
        "compliance checklist",
        "compliance report",
        "compliance requirements",
        "requirements for manufacturer",
        "manufacturer requirements",
        "what should a manufacturer",
        "what do i need to comply",
        "readiness",
        "compliance readiness",
    ]

    if contains_any(text, compliance_keywords):
        return INTENT_COMPLIANCE

    # ---------------------------------------------------------------
    # CERTIFICATION / QCO
    # ---------------------------------------------------------------

    certification_keywords = [
        "bis certification",
        "bis certified",
        "bis certificate",
        "bis licence",
        "bis license",
        "certification",
        "certify",
        "certification mark",
        "standard mark",
        "isi mark",
        "qco",
        "qcos",
        "quality control order",
        "compulsory certification",
        "mandatory certification",
        "is bis compulsory",
        "is bis mandatory",
    ]

    if contains_any(text, certification_keywords):
        return INTENT_CERTIFICATION

    # ---------------------------------------------------------------
    # PRODUCT / IMAGE / PRODUCT APPLICABILITY
    # ---------------------------------------------------------------

    product_keywords = [
        "product",
        "product image",
        "image of",
        "this product",
        "my product",
        "product category",
        "which standard applies to my",
        "standard for my product",
        "applicable to my product",
    ]

    if contains_any(text, product_keywords):
        return INTENT_PRODUCT

    # ---------------------------------------------------------------
    # CONSUMER
    # ---------------------------------------------------------------

    consumer_keywords = [
        "consumer",
        "buy",
        "buying",
        "purchased",
        "product safety",
        "fake bis",
        "fake mark",
        "genuine bis",
        "verify bis mark",
        "verify licence",
        "verify license",
        "hallmark",
        "huid",
        "complaint",
        "consumer complaint",
    ]

    if contains_any(text, consumer_keywords):
        return INTENT_CONSUMER

    # ---------------------------------------------------------------
    # STARTUP / MSME / PRODUCT LAUNCH
    # ---------------------------------------------------------------

    startup_keywords = [
        "startup",
        "start-up",
        "startup idea",
        "new business",
        "new company",
        "business idea",
        "launch my product",
        "launch a product",
        "product launch",
        "msme",
        "small business",
        "manufacturing business",
        "manufacturing startup",
        "business compliance",
    ]

    if contains_any(text, startup_keywords):
        return INTENT_STARTUP

    # ---------------------------------------------------------------
    # GENERAL BIS
    # ---------------------------------------------------------------

    general_bis_keywords = [
        "what is bis",
        "what does bis do",
        "bureau of indian standards",
        "what is isi",
        "what is standard mark",
        "what is qco",
        "how does bis work",
    ]

    if contains_any(text, general_bis_keywords):
        return INTENT_GENERAL_BIS

    return INTENT_UNKNOWN


def extract_product_hints(
    message: str,
) -> list[str]:
    """
    Extract simple product/category hints.

    This does not attempt to perform full NLP.
    It gives later workflows useful keywords.
    """

    text = normalize(message)

    product_keywords = [
        "pipe",
        "pipes",
        "pvc",
        "fitting",
        "fittings",
        "cable",
        "cables",
        "wire",
        "wires",
        "cement",
        "concrete",
        "steel",
        "lamp",
        "led",
        "lighting",
        "appliance",
        "water purifier",
        "purifier",
        "pressure cooker",
        "switch",
        "switchgear",
        "motor",
        "transformer",
    ]

    return [
        keyword
        for keyword in product_keywords
        if keyword in text
    ]


def build_agent_plan(
    message: str,
) -> dict:
    """
    Convert a user query into an explainable BISense workflow plan.
    """

    clean_message = str(
        message or ""
    ).strip()

    intent = detect_intent(
        clean_message
    )

    standard_numbers = extract_standard_numbers(
        clean_message
    )

    product_hints = extract_product_hints(
        clean_message
    )

    plan = {
        "intent": intent,
        "standard_numbers": standard_numbers,
        "product_hints": product_hints,
        "workflow": "",
        "actions": [],
    }

    # ---------------------------------------------------------------
    # WORKFLOW DEFINITIONS
    # ---------------------------------------------------------------

    if intent == INTENT_STANDARD:
        plan["workflow"] = "standard_intelligence"

        plan["actions"] = [
            "identify_standard",
            "retrieve_standard_metadata",
            "retrieve_document_evidence",
            "generate_explanation",
        ]

    elif intent == INTENT_COMPARISON:
        plan["workflow"] = "standard_comparison"

        plan["actions"] = [
            "identify_standards",
            "retrieve_both_standards",
            "compare_scope",
            "compare_status",
            "compare_certification",
            "compare_qco",
            "generate_comparison",
        ]

    elif intent == INTENT_CERTIFICATION:
        plan["workflow"] = "certification_intelligence"

        plan["actions"] = [
            "identify_product_or_standard",
            "check_certification_information",
            "check_qco_information",
            "identify_applicable_scheme",
            "generate_verification_guidance",
        ]

    elif intent == INTENT_COMPLIANCE:
        plan["workflow"] = "compliance_copilot"

        plan["actions"] = [
            "identify_product_or_standard",
            "retrieve_applicable_information",
            "identify_compliance_gaps",
            "generate_checklist",
            "generate_next_actions",
        ]

    elif intent == INTENT_LABORATORY:
        plan["workflow"] = "laboratory_intelligence"

        plan["actions"] = [
            "identify_standard_or_product",
            "identify_testing_requirements",
            "find_relevant_laboratories",
            "return_official_lab_information",
        ]

    elif intent == INTENT_PRODUCT:
        plan["workflow"] = "product_intelligence"

        plan["actions"] = [
            "identify_product",
            "identify_category",
            "find_relevant_standards",
            "check_certification_information",
            "recommend_next_step",
        ]

    elif intent == INTENT_CONSUMER:
        plan["workflow"] = "consumer_assistance"

        plan["actions"] = [
            "identify_consumer_question",
            "retrieve_relevant_bis_information",
            "provide_verification_guidance",
            "provide_official_source",
        ]

    elif intent == INTENT_STARTUP:
        plan["workflow"] = "bis_launch_advisor"

        plan["actions"] = [
            "identify_product_or_business_context",
            "find_relevant_standards",
            "check_certification_information",
            "check_qco_information",
            "identify_testing_needs",
            "identify_compliance_gaps",
            "generate_launch_readiness_guidance",
        ]

    elif intent == INTENT_GENERAL_BIS:
        plan["workflow"] = "general_bis_information"

        plan["actions"] = [
            "retrieve_verified_bis_information",
            "generate_explanation",
            "provide_official_source",
        ]

    else:
        plan["workflow"] = "general_bis_assistance"

        plan["actions"] = [
            "understand_user_question",
            "retrieve_relevant_bis_information",
            "generate_answer",
            "provide_source_when_available",
        ]

    return plan


def get_agent_summary(
    plan: dict,
) -> str:
    """
    Human-readable description for logs/debugging.
    """

    intent = plan.get(
        "intent",
        INTENT_UNKNOWN,
    )

    workflow = plan.get(
        "workflow",
        "general_bis_assistance",
    )

    return (
        f"Intent: {intent} | "
        f"Workflow: {workflow}"
    )