import re
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag
from fastapi import APIRouter, Query

router = APIRouter(
    prefix="/api/laboratories",
    tags=["Laboratories"],
)

BIS_LIMS_SEARCH_URL = (
    "https://lims.bis.gov.in/home/search_is_number/"
)


def normalize_is_number(value: str) -> str:
    value = str(value or "").strip().upper()

    value = re.sub(
        r"^IS\s*:?\s*",
        "",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value.strip()


def clean_text(value: object) -> str:
    if value is None:
        return ""

    text = str(value)

    text = text.replace(
        "\xa0",
        " ",
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def fetch_page(
    url: str,
) -> BeautifulSoup:

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    return BeautifulSoup(
        response.text,
        "html.parser",
    )


def remove_unwanted_content(
    soup: BeautifulSoup,
) -> None:

    for tag in soup.find_all(
        [
            "script",
            "style",
            "noscript",
            "svg",
        ]
    ):
        tag.decompose()

    for tag in list(
        soup.find_all(True)
    ):
        try:
            attrs = tag.attrs or {}

            tag_id = str(
                attrs.get(
                    "id",
                    "",
                )
            ).lower()

            classes = attrs.get(
                "class",
                [],
            )

            if isinstance(
                classes,
                list,
            ):
                class_text = " ".join(
                    str(item)
                    for item in classes
                ).lower()
            else:
                class_text = str(
                    classes
                ).lower()

            style = str(
                attrs.get(
                    "style",
                    "",
                )
            ).replace(
                " ",
                "",
            ).lower()

            if "modal" in tag_id:
                tag.decompose()
                continue

            if "modal" in class_text:
                tag.decompose()
                continue

            if "display:none" in style:
                tag.decompose()
                continue

            if "visibility:hidden" in style:
                tag.decompose()
                continue

        except Exception:
            continue


def extract_candidate_rows(
    soup: BeautifulSoup,
) -> list[str]:

    candidates = []

    for row in soup.find_all("tr"):

        try:
            text = clean_text(
                row.get_text(
                    " ",
                    strip=True,
                )
            )

            if not text:
                continue

            # Real rows contain an IS number.
            if not re.search(
                r"\bIS\s+\d+",
                text,
                re.IGNORECASE,
            ):
                continue

            lowered = text.lower()

            # Ignore the testing-charge popup rows.
            blocked = [
                "clause no.",
                "effective date",
                "exclusion testing charges",
                "testing charges (excl. of taxes)",
            ]

            if any(
                marker in lowered
                for marker in blocked
            ):
                continue

            # Real laboratory rows start with S.No.
            if not re.match(
                r"^\s*\d+\s+",
                text,
            ):
                continue

            candidates.append(
                text
            )

        except Exception:
            continue

    return candidates


def parse_result_row(
    row_text: str,
    searched_number: str,
) -> Optional[dict]:

    text = clean_text(
        row_text
    )

    if not text:
        return None

    # --------------------------------------------------
    # SERIAL NUMBER
    # --------------------------------------------------

    serial_match = re.match(
        r"^\s*(\d+)\s+(.*)$",
        text,
    )

    if not serial_match:
        return None

    serial_number = serial_match.group(1)

    remainder = serial_match.group(2).strip()

    # --------------------------------------------------
    # FULL IS NUMBER
    #
    # IMPORTANT:
    # Keep the edition year.
    #
    # IS 209 (2024)
    # IS 209 (1992)
    # --------------------------------------------------

    standard_match = re.search(
        r"\b(IS\s+\d+\s*(?:\(\d{4}\))?)",
        remainder,
        re.IGNORECASE,
    )

    if not standard_match:
        return None

    indian_standard = clean_text(
        standard_match.group(1)
    )

    before_standard = remainder[
        :standard_match.start()
    ].strip()

    after_standard = remainder[
        standard_match.end():
    ].strip()

    # --------------------------------------------------
    # OSL CODE
    # --------------------------------------------------

    osl_match = re.search(
        r"\b\d{7}\b",
        before_standard,
    )

    if osl_match:

        lab_code = osl_match.group(0)

        lab_name = before_standard[
            :osl_match.start()
        ].strip()

    else:

        none_match = re.search(
            r"\bNone\b",
            before_standard,
            re.IGNORECASE,
        )

        if none_match:

            lab_code = ""

            lab_name = before_standard[
                :none_match.start()
            ].strip()

        else:

            lab_code = ""

            lab_name = before_standard.strip()

    lab_name = clean_text(
        lab_name
    )

    if not lab_name:
        return None

    # --------------------------------------------------
    # REMOVE "VIEW BREAKUP"
    # --------------------------------------------------

    breakup_match = re.search(
        r"\bView\s+breakup\b",
        after_standard,
        re.IGNORECASE,
    )

    if breakup_match:

        main_part = after_standard[
            :breakup_match.start()
        ].strip()

        tail = after_standard[
            breakup_match.end():
        ].strip()

    else:

        main_part = after_standard

        tail = ""

    # --------------------------------------------------
    # KNOWN BIS PRODUCT NAMES
    # --------------------------------------------------

    known_products = [
        (
            "Refined Zinc - Specification "
            "(Fifth Revision)"
        ),
        (
            "Zinc ingot - Specification "
            "(Fourth Revision)"
        ),
    ]

    product = ""
    grade = ""

    selected_product_match = None

    for known_product in known_products:

        match = re.search(
            re.escape(known_product),
            main_part,
            re.IGNORECASE,
        )

        if match:

            selected_product_match = match

            product = clean_text(
                match.group(0)
            )

            break

    if selected_product_match:

        # Text between the standard and product
        # is not needed.

        before_charge_text = main_part[
            selected_product_match.end():
        ].strip()

    else:

        before_charge_text = main_part

    # --------------------------------------------------
    # TESTING CHARGE
    # --------------------------------------------------

    charge_match = re.search(
        r"(?<!\d)"
        r"(?:Rs\.\s*)?"
        r"\d[\d,]*(?:\.\d+)?"
        r"(?:/-)?"
        r"(?!\d)",
        before_charge_text,
        re.IGNORECASE,
    )

    testing_charges = ""

    if charge_match:

        testing_charges = clean_text(
            charge_match.group(0)
        )

        grade = before_charge_text[
            :charge_match.start()
        ].strip()

        remaining_after_charge = (
            before_charge_text[
                charge_match.end():
            ].strip()
        )

    else:

        grade = before_charge_text.strip()

        remaining_after_charge = ""

    # --------------------------------------------------
    # CLEAN GRADE
    # --------------------------------------------------

    grade = clean_text(
        grade
    )

    if grade in {
        "-",
        "None",
    }:
        grade = ""

    # Some BIS rows have "-" separators before
    # the actual grade.
    grade = re.sub(
        r"^(?:-\s*)+",
        "",
        grade,
    ).strip()

    # --------------------------------------------------
    # COMBINE REMAINING TEXT
    # --------------------------------------------------

    tail_parts = []

    if remaining_after_charge:
        tail_parts.append(
            remaining_after_charge
        )

    if tail:
        tail_parts.append(
            tail
        )

    tail_text = clean_text(
        " ".join(tail_parts)
    )

    # --------------------------------------------------
    # VALIDITY DATE
    # --------------------------------------------------

    validity_date = ""

    date_patterns = [
        r"\b\d{1,2}\s+[A-Za-z]{3},\s*\d{4}\b",
        r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b",
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b",
    ]

    date_match = None

    for pattern in date_patterns:

        candidate = re.search(
            pattern,
            tail_text,
            re.IGNORECASE,
        )

        if candidate:

            date_match = candidate

            break

    if date_match:

        validity_date = clean_text(
            date_match.group(0)
        )

        remark = clean_text(
            tail_text[
                date_match.end():
            ]
        )

    else:

        remark = tail_text

    # --------------------------------------------------
    # CLEAN REMARK
    # --------------------------------------------------

    remark = clean_text(
        remark
    )

    # Remove placeholder dashes.
    remark = re.sub(
        r"^(?:-\s*)+",
        "",
        remark,
    )

    remark = re.sub(
        r"(?:\s*-\s*)+$",
        "",
        remark,
    )

    remark = clean_text(
        remark
    )

    # --------------------------------------------------
    # NORMALIZE EMPTY VALUES
    # --------------------------------------------------

    if testing_charges in {
        "-",
        "None",
    }:
        testing_charges = ""

    if validity_date in {
        "-",
        "None",
    }:
        validity_date = ""

    if remark == "-":
        remark = ""

    # --------------------------------------------------
    # RESULT
    # --------------------------------------------------

    return {
        "serial_number": serial_number,
        "lab_name": lab_name,
        "lab_code": lab_code,
        "indian_standard": indian_standard,
        "product": product,
        "grade_type_size_designation": grade,
        "testing_charges": testing_charges,
        "validity_date": validity_date,
        "remark": remark,
        "source": "BIS LIMS",
        "source_url": (
            BIS_LIMS_SEARCH_URL
            + "?is_number__doc_no="
            + searched_number
        ),
        "search_type": "is_number",
        "is_number": f"IS {searched_number}",
    }


def extract_is_number_results(
    is_number: str,
) -> list[dict]:

    number = normalize_is_number(
        is_number
    )

    if not number:
        return []

    url = (
        BIS_LIMS_SEARCH_URL
        + "?is_number__doc_no="
        + number
    )

    soup = fetch_page(
        url
    )

    remove_unwanted_content(
        soup
    )

    candidate_rows = extract_candidate_rows(
        soup
    )

    results = []

    for row_text in candidate_rows:

        try:

            result = parse_result_row(
                row_text,
                number,
            )

            if result is None:
                continue

            # Make sure the requested IS number
            # matches the result.
            if not re.search(
                rf"\bIS\s+{re.escape(number)}\b",
                result["indian_standard"],
                re.IGNORECASE,
            ):
                continue

            results.append(
                result
            )

        except Exception:
            continue

    # --------------------------------------------------
    # DEDUPLICATION
    #
    # Edition is included, so:
    #
    # IS 209 (2024)
    # IS 209 (1992)
    #
    # remain separate.
    # --------------------------------------------------

    unique_results = []

    seen = set()

    for result in results:

        key = (
            result["lab_name"]
            .strip()
            .lower(),

            result["lab_code"]
            .strip()
            .lower(),

            result["indian_standard"]
            .strip()
            .lower(),

            result["product"]
            .strip()
            .lower(),

            result["testing_charges"]
            .strip()
            .lower(),
        )

        if key in seen:
            continue

        seen.add(key)

        unique_results.append(
            result
        )

    return unique_results


@router.get("/search")
def search_laboratories(
    is_number: str = Query(default=""),
    lab_name: str = Query(default=""),
    state: str = Query(default=""),
    district: str = Query(default=""),
    lab_type: str = Query(default=""),
):

    normalized = normalize_is_number(
        is_number
    )

    try:

        if normalized:

            results = extract_is_number_results(
                normalized
            )

            source_url = (
                BIS_LIMS_SEARCH_URL
                + "?is_number__doc_no="
                + normalized
            )

            return {
                "count": len(results),
                "source": "BIS LIMS",
                "source_url": source_url,
                "search_type": "is_number",
                "is_number": f"IS {normalized}",
                "lab_type": lab_type,
                "results": results,
            }

        return {
            "count": 0,
            "source": "BIS LIMS",
            "source_url": (
                "https://lims.bis.gov.in/"
            ),
            "search_type": "directory",
            "is_number": "",
            "lab_type": lab_type,
            "results": [],
        }

    except requests.RequestException as exc:

        return {
            "count": 0,
            "source": "BIS LIMS",
            "source_url": (
                BIS_LIMS_SEARCH_URL
                + "?is_number__doc_no="
                + normalized
            ),
            "search_type": "is_number",
            "is_number": (
                f"IS {normalized}"
                if normalized
                else ""
            ),
            "lab_type": lab_type,
            "results": [],
            "error": (
                "BIS LIMS request failed: "
                + str(exc)
            ),
        }

    except Exception as exc:

        return {
            "count": 0,
            "source": "BIS LIMS",
            "source_url": (
                BIS_LIMS_SEARCH_URL
                + "?is_number__doc_no="
                + normalized
            ),
            "search_type": "is_number",
            "is_number": (
                f"IS {normalized}"
                if normalized
                else ""
            ),
            "lab_type": lab_type,
            "results": [],
            "error": (
                "Laboratory extraction failed: "
                + str(exc)
            ),
        }