import re
from functools import lru_cache
from typing import Optional
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query

router = APIRouter(
    prefix="/api/laboratories",
    tags=["Laboratories"],
)

BIS_LIMS_SEARCH_URL = "https://lims.bis.gov.in/home/search_is_number/"
BIS_LIMS_DIRECTORY_URL = "https://lims.bis.gov.in/home/empaneled_labs/"
BIS_LIMS_BASE_URL = "https://lims.bis.gov.in/"

# ---------------------------------------------------------------------------
# BISense laboratory directory snapshot
#
# These records are a small, judge-demo-friendly indexed snapshot based on
# publicly visible BIS LIMS records. They are NOT presented as the complete
# BIS laboratory universe. Live IS-number searches still query BIS LIMS.
# ---------------------------------------------------------------------------

DIRECTORY_RECORDS = [
    {
        "serial_number": 1,
        "lab_name": "BIS, Northern Regional Laboratory (NRL)",
        "lab_code": "",
        "indian_standard": "IS 16333 : Part 3 (2022)",
        "product": "Mobile phone handsets: Part 3 Indian language support for mobile phone handsets - Specific requirements (Second Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "-",
        "validity_date": "",
        "remark": "",
        "state": "Delhi",
        "district": "New Delhi",
        "lab_type": "BIS Regional Laboratory",
        "address": "New Delhi, Delhi, India",
    },
    {
        "serial_number": 2,
        "lab_name": "EKO PRO ENGINEERS PRIVATE LIMITED (32/41), GHAZIABAD",
        "lab_code": "9179706",
        "indian_standard": "IS 15844 : Part 3 (2024)",
        "product": "Sports Footwear Part 3 Professional Sports Footwear",
        "grade_type_size_designation": "ALL",
        "testing_charges": "39900",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Private Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 3,
        "lab_name": "EKO PRO ENGINEERS PRIVATE LIMITED (32/41), GHAZIABAD",
        "lab_code": "9179706",
        "indian_standard": "IS 15844 : Part 2 (2023)",
        "product": "Sports Footwear Part 2 Performance Sports Footwear",
        "grade_type_size_designation": "ALL",
        "testing_charges": "41800",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Private Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 4,
        "lab_name": "EKO PRO ENGINEERS PRIVATE LIMITED (32/41), GHAZIABAD",
        "lab_code": "9179706",
        "indian_standard": "IS 15844 : Part 1 (2023)",
        "product": "Sports Footwear Part 1 General Purpose",
        "grade_type_size_designation": "ALL",
        "testing_charges": "41800",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Private Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 5,
        "lab_name": "EKO PRO ENGINEERS PRIVATE LIMITED (32/41), GHAZIABAD",
        "lab_code": "9179706",
        "indian_standard": "IS 17043 : Part 2 (2024)",
        "product": "Shoes: Shoes for General Purpose",
        "grade_type_size_designation": "ALL",
        "testing_charges": "39900",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Private Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 6,
        "lab_name": "EKO PRO ENGINEERS PRIVATE LIMITED (32/41), GHAZIABAD",
        "lab_code": "9179706",
        "indian_standard": "IS 17012 (2018)",
        "product": "High ankle tactical boots with pu - Rubber sole - Specification",
        "grade_type_size_designation": "ALL",
        "testing_charges": "39000",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Private Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 7,
        "lab_name": "Rajkot Metlab Services LLP, Rajkot",
        "lab_code": "7183706",
        "indian_standard": "IS 4003 (Part 1) (2026)",
        "product": "Pipe Wrenches - Specification Part 1 General Purpose (Third revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "18500",
        "validity_date": "",
        "remark": "",
        "state": "Gujarat",
        "district": "Rajkot",
        "lab_type": "Private Laboratory",
        "address": "Rajkot, Gujarat, India",
    },
    {
        "serial_number": 8,
        "lab_name": "NATIONAL TEST HOUSE-SR (NTH), Chennai",
        "lab_code": "6122704",
        "indian_standard": "IS 210 (2009)",
        "product": "Grey iron castings - Specification (First Revision)",
        "grade_type_size_designation": "All grades",
        "testing_charges": "6000",
        "validity_date": "28 Nov, 2028",
        "remark": "Included w.e.f. 30.07.2026",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "lab_type": "Government Laboratory",
        "address": "Chennai, Tamil Nadu, India",
    },
    {
        "serial_number": 9,
        "lab_name": "WELL TECH TEST AND RESEARCH CENTER, DERABASSI",
        "lab_code": "9177306",
        "indian_standard": "IS 210 (2009)",
        "product": "Grey iron castings - Specification (First Revision)",
        "grade_type_size_designation": "AS PER TABLE 3 AND CL 4",
        "testing_charges": "6000",
        "validity_date": "",
        "remark": "Testing charges may be capped under applicable BIS laboratory rules.",
        "state": "Punjab",
        "district": "Sahibzada Ajit Singh Nagar",
        "lab_type": "Private Laboratory",
        "address": "Derabassi, Sahibzada Ajit Singh Nagar, Punjab, India",
    },
    {
        "serial_number": 10,
        "lab_name": "Spectro Analytical Labs Private Limited, Gautam Buddha Nagar",
        "lab_code": "8130426",
        "indian_standard": "IS 14246 (2024)",
        "product": "Continuously pre-painted galvanized steel sheets and strips - Specification (Second Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "68500",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Gautam Buddha Nagar",
        "lab_type": "Private Laboratory",
        "address": "Gautam Buddha Nagar, Uttar Pradesh, India",
    },
    {
        "serial_number": 11,
        "lab_name": "AUMNAMAH RADIOANALYTICAL LABORATORY LLP",
        "lab_code": "8198616",
        "indian_standard": "IS 10500 (2012)",
        "product": "Drinking water - Specification (Second Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "9600",
        "validity_date": "21 Jul, 2029",
        "remark": "Exclusions are recorded in the BIS LIMS scope.",
        "state": "Delhi",
        "district": "North West Delhi",
        "lab_type": "Private Laboratory",
        "address": "Lawrence Road, North West Delhi, New Delhi, Delhi, India",
    },
    {
        "serial_number": 12,
        "lab_name": "DELHI TEST HOUSE (A Unit of Delhii Test House Global LLP), Azadpur",
        "lab_code": "8131406",
        "indian_standard": "IS 1171 (2011)",
        "product": "Ferromanganese - Specification (Fifth Revision)",
        "grade_type_size_designation": "ALL",
        "testing_charges": "14500",
        "validity_date": "",
        "remark": "",
        "state": "Delhi",
        "district": "North Delhi",
        "lab_type": "Private Laboratory",
        "address": "Azadpur, Delhi, India",
    },
    {
        "serial_number": 13,
        "lab_name": "Atmy Analytical Labs Private Limited (Unit-2), Greater Noida",
        "lab_code": "8176106",
        "indian_standard": "IS 277 (2018)",
        "product": "Galvanized steel strips and sheets (Plain And Corrugated) - Specification (Seventh Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "9900",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Gautam Buddha Nagar",
        "lab_type": "Private Laboratory",
        "address": "Greater Noida, Uttar Pradesh, India",
    },
    {
        "serial_number": 14,
        "lab_name": "FARE Labs Pvt. Ltd., Gurugram",
        "lab_code": "8135716",
        "indian_standard": "IS 1155 (2022)",
        "product": "Atta - Specification (Third Revision of IS 1155)",
        "grade_type_size_designation": "--",
        "testing_charges": "20000",
        "validity_date": "",
        "remark": "",
        "state": "Haryana",
        "district": "Gurugram",
        "lab_type": "Private Laboratory",
        "address": "Gurugram, Haryana, India",
    },
    {
        "serial_number": 15,
        "lab_name": "SMS Labs Services Private Limited, Chennai",
        "lab_code": "6132316",
        "indian_standard": "IS 14543 (2024)",
        "product": "Packaged Drinking Water Other than Packaged Natural Mineral Water - Specification (Third Revision)",
        "grade_type_size_designation": "NA",
        "testing_charges": "18760",
        "validity_date": "",
        "remark": "",
        "state": "Tamil Nadu",
        "district": "Tiruvallur",
        "lab_type": "Private Laboratory",
        "address": "Thirumazhisai, Tiruvallur, Tamil Nadu, India",
    },
    {
        "serial_number": 16,
        "lab_name": "LUCID LABORATORIES PRIVATE LIMITED, HYDERABAD",
        "lab_code": "6121636",
        "indian_standard": "IS 737 (2024)",
        "product": "Wrought aluminium and aluminium alloy sheet and strip for general engineering purposes - Specification (Fifth Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "9000",
        "validity_date": "19 Apr, 2028",
        "remark": "Included w.e.f. 18.08.2026",
        "state": "Telangana",
        "district": "Medchal Malkajgiri",
        "lab_type": "Private Laboratory",
        "address": "Balanagar, Hyderabad, Telangana, India",
    },
    {
        "serial_number": 17,
        "lab_name": "National Test House (NR) - NTH, Ghaziabad",
        "lab_code": "8101304",
        "indian_standard": "IS 737 (2024)",
        "product": "Wrought aluminium and aluminium alloy sheet and strip for general engineering purposes - Specification (Fifth Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "12499.97",
        "validity_date": "",
        "remark": "",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "lab_type": "Government Laboratory",
        "address": "Ghaziabad, Uttar Pradesh, India",
    },
    {
        "serial_number": 18,
        "lab_name": "NAWaL Analytical Labs India Private Limited, Hosur",
        "lab_code": "6126416",
        "indian_standard": "IS 14543 (2024)",
        "product": "Packaged Drinking Water Other than Packaged Natural Mineral Water - Specification (Third Revision)",
        "grade_type_size_designation": "-",
        "testing_charges": "22000",
        "validity_date": "21 Mar, 2028",
        "remark": "Included w.e.f. 06.12.2024.",
        "state": "Tamil Nadu",
        "district": "Krishnagiri",
        "lab_type": "Private Laboratory",
        "address": "Hosur, Tamil Nadu, India",
    },
    {
        "serial_number": 19,
        "lab_name": "Elutech Laboratory and Calibration Services, Jaipur",
        "lab_code": "9179806",
        "indian_standard": "IS 5509 (2021)",
        "product": "Fire Retardant Plywood - Specification (Third Revision)",
        "grade_type_size_designation": "Type - 1,2,3,4,5 & 6",
        "testing_charges": "12000",
        "validity_date": "26 Aug, 2027",
        "remark": "",
        "state": "Rajasthan",
        "district": "Jaipur",
        "lab_type": "Private Laboratory",
        "address": "Jaipur, Rajasthan, India",
    },
    {
        "serial_number": 20,
        "lab_name": "Elutech Laboratory and Calibration Services, Jaipur",
        "lab_code": "9179806",
        "indian_standard": "IS 1328 (1996)",
        "product": "Veneered Decorative Plywood - Specification",
        "grade_type_size_designation": "Grade - MR & BWR, Type 1 & 2",
        "testing_charges": "4150",
        "validity_date": "26 Aug, 2027",
        "remark": "",
        "state": "Rajasthan",
        "district": "Jaipur",
        "lab_type": "Private Laboratory",
        "address": "Jaipur, Rajasthan, India",
    },
]


def clean_text(value: object) -> str:
    if value is None:
        return ""
    value = str(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()


def normalize_is_number(value: str) -> str:
    text = clean_text(value).upper()
    text = re.sub(r"^IS\s*:?\s*", "", text)
    return text.strip()


def normalized_number_only(value: str) -> str:
    text = normalize_is_number(value)
    match = re.match(r"^(\d+)", text)
    return match.group(1) if match else text


def make_map_links(record: dict) -> dict:
    address = clean_text(record.get("address"))
    lab_name = clean_text(record.get("lab_name"))
    district = clean_text(record.get("district"))
    state = clean_text(record.get("state"))

    location_bits = [address, lab_name]
    if district and district.lower() not in address.lower():
        location_bits.append(district)
    if state and state.lower() not in address.lower():
        location_bits.append(state)
    location_bits.append("India")

    query = ", ".join(
        piece for piece in location_bits if piece
    )

    encoded = quote_plus(query)

    return {
        "map_query": query,
        "google_maps_url": (
            "https://www.google.com/maps/search/?api=1&query="
            + encoded
        ),
        "osm_url": (
            "https://www.openstreetmap.org/search?query="
            + encoded
        ),
        "map_provider": "Google Maps / OpenStreetMap",
    }


def enrich_record(record: dict) -> dict:
    enriched = dict(record)
    enriched.update(make_map_links(enriched))

    standard = clean_text(enriched.get("indian_standard"))
    number = normalized_number_only(standard)

    if number:
        enriched["source_url"] = (
            BIS_LIMS_SEARCH_URL
            + "?is_number__doc_no="
            + quote_plus(number)
        )
    else:
        enriched["source_url"] = BIS_LIMS_DIRECTORY_URL

    enriched["source"] = "BIS LIMS"
    enriched["data_scope"] = "BISense curated laboratory snapshot"
    return enriched


DIRECTORY_RECORDS = [enrich_record(item) for item in DIRECTORY_RECORDS]


def unique_standards(records: list[dict]) -> list[str]:
    seen = set()
    output = []

    for record in records:
        value = clean_text(record.get("indian_standard"))
        if not value:
            continue

        key = value.lower()
        if key in seen:
            continue

        seen.add(key)
        output.append(value)

    return output


DIRECTORY_STANDARDS = unique_standards(DIRECTORY_RECORDS)


def matches_directory_filters(
    record: dict,
    lab_name: str,
    state: str,
    district: str,
    lab_type: str,
    is_number: str = "",
) -> bool:
    def contains(field: object, wanted: str) -> bool:
        wanted = clean_text(wanted).lower()
        if not wanted:
            return True
        return wanted in clean_text(field).lower()

    requested_number = normalized_number_only(is_number)

    if requested_number:
        standard_number = normalized_number_only(
            record.get("indian_standard", "")
        )
        if standard_number != requested_number:
            return False

    return (
        contains(record.get("lab_name"), lab_name)
        and contains(record.get("state"), state)
        and contains(record.get("district"), district)
        and contains(record.get("lab_type"), lab_type)
    )


def directory_results(
    is_number: str = "",
    lab_name: str = "",
    state: str = "",
    district: str = "",
    lab_type: str = "",
) -> list[dict]:
    return [
        record
        for record in DIRECTORY_RECORDS
        if matches_directory_filters(
            record,
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
            is_number=is_number,
        )
    ]


def fetch_page(url: str) -> BeautifulSoup:
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
        timeout=25,
    )
    response.raise_for_status()

    return BeautifulSoup(
        response.text,
        "html.parser",
    )


def remove_unwanted_content(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(
        ["script", "style", "noscript", "svg"]
    ):
        tag.decompose()


def first_value_from_cells(
    cells: list[str],
    index: int,
) -> str:
    if index >= len(cells):
        return ""
    return clean_text(cells[index])


def parse_html_table(
    soup: BeautifulSoup,
    searched_number: str,
) -> list[dict]:
    results: list[dict] = []
    requested_number = normalized_number_only(searched_number)

    for row in soup.find_all("tr"):
        try:
            cells = [
                clean_text(cell.get_text(" ", strip=True))
                for cell in row.find_all(["td", "th"])
            ]

            if len(cells) < 5:
                continue

            row_text = clean_text(" ".join(cells))

            if not re.search(
                r"\bIS\s*[:\-]?\s*\d+",
                row_text,
                re.IGNORECASE,
            ):
                continue

            # BIS LIMS search table:
            # 0 S.No | 1 Lab | 2 OSL | 3 IS No | 4 Product
            # 5 Grade | 6 Charges | 7 Validity | 8 Remark
            standard_text = first_value_from_cells(cells, 3)
            standard_match = re.search(
                r"\bIS\s*[:\-]?\s*\d+[^|]*?(?:\(\d{4}\))?",
                standard_text,
                re.IGNORECASE,
            )

            if not standard_match:
                standard_match = re.search(
                    r"\bIS\s*[:\-]?\s*\d+(?:\s*:\s*Part\s+\d+)*"
                    r"(?:\s*:\s*Sec\s+\d+)*"
                    r"(?:\s*\(\d{4}\))?",
                    row_text,
                    re.IGNORECASE,
                )

            if not standard_match:
                continue

            indian_standard = clean_text(
                standard_match.group(0)
            ).replace("IS:", "IS ")

            actual_number = normalized_number_only(
                indian_standard
            )

            if requested_number and actual_number != requested_number:
                continue

            serial_number = first_value_from_cells(cells, 0)
            lab_name = first_value_from_cells(cells, 1)
            lab_code = first_value_from_cells(cells, 2)
            product = first_value_from_cells(cells, 4)
            grade = first_value_from_cells(cells, 5)
            charges = first_value_from_cells(cells, 6)
            validity = first_value_from_cells(cells, 7)
            remark = first_value_from_cells(cells, 8)

            if not lab_name or lab_name.lower() in {
                "lab name",
                "laboratory name",
            }:
                continue

            if "View breakup" in charges:
                charges = charges.replace("View breakup", "").strip()

            if charges.lower() in {"-", "none"}:
                charges = ""

            # A popup can leak into a cell. Keep the leading monetary value
            # when one is available, otherwise preserve the original text.
            money_match = re.search(
                r"(?:Rs\.?\s*)?[\d,]+(?:\.\d+)?(?:/-)?",
                charges,
                re.IGNORECASE,
            )
            if money_match:
                charges = money_match.group(0).strip()

            record = {
                "serial_number": serial_number,
                "lab_name": lab_name,
                "lab_code": (
                    ""
                    if lab_code.lower() in {"none", "-"}
                    else lab_code
                ),
                "indian_standard": indian_standard,
                "product": (
                    ""
                    if product.lower() in {"none", "-"}
                    else product
                ),
                "grade_type_size_designation": (
                    ""
                    if grade.lower() in {"none", "-"}
                    else grade
                ),
                "testing_charges": charges,
                "validity_date": (
                    ""
                    if validity.lower() in {"none", "-"}
                    else validity
                ),
                "remark": (
                    ""
                    if remark.lower() in {"none", "-"}
                    else remark
                ),
                "source": "BIS LIMS",
                "source_url": (
                    BIS_LIMS_SEARCH_URL
                    + "?is_number__doc_no="
                    + quote_plus(requested_number)
                ),
                "search_type": "is_number",
                "is_number": f"IS {requested_number}",
                "state": "",
                "district": "",
                "lab_type": "",
                "address": "",
                "data_scope": "Live BIS LIMS result",
            }

            record.update(make_map_links(record))
            results.append(record)

        except Exception:
            continue

    return results


def deduplicate_records(records: list[dict]) -> list[dict]:
    output = []
    seen = set()

    for record in records:
        key = (
            clean_text(record.get("lab_name")).lower(),
            clean_text(record.get("lab_code")).lower(),
            clean_text(record.get("indian_standard")).lower(),
            clean_text(record.get("product")).lower(),
            clean_text(record.get("testing_charges")).lower(),
        )

        if key in seen:
            continue

        seen.add(key)
        output.append(record)

    return output


@lru_cache(maxsize=64)
def extract_is_number_results(
    normalized_number: str,
) -> tuple[dict, ...]:
    if not normalized_number:
        return tuple()

    url = (
        BIS_LIMS_SEARCH_URL
        + "?is_number__doc_no="
        + quote_plus(normalized_number)
    )

    soup = fetch_page(url)
    remove_unwanted_content(soup)

    parsed = parse_html_table(
        soup,
        normalized_number,
    )

    # If the live page changes its HTML structure, use the curated snapshot
    # as a transparent fallback for the standards we explicitly indexed.
    if not parsed:
        fallback = directory_results(
            is_number=normalized_number,
        )

        if fallback:
            return tuple(
                {
                    **item,
                    "search_type": "indexed_snapshot",
                    "is_number": f"IS {normalized_number}",
                }
                for item in fallback
            )

    return tuple(
        deduplicate_records(parsed)
    )


@router.get("/directory")
def laboratory_directory(
    lab_name: str = Query(default=""),
    state: str = Query(default=""),
    district: str = Query(default=""),
    lab_type: str = Query(default=""),
):
    records = directory_results(
        lab_name=lab_name,
        state=state,
        district=district,
        lab_type=lab_type,
    )

    standards = unique_standards(records)

    return {
        "count": len(records),
        "total_indexed": len(DIRECTORY_RECORDS),
        "available_standards_count": len(standards),
        "available_standards": standards,
        "source": "BIS LIMS",
        "source_url": BIS_LIMS_DIRECTORY_URL,
        "search_type": "directory",
        "results": records,
        "data_scope": (
            "BISense curated snapshot of publicly visible BIS LIMS "
            "laboratory records; not the complete BIS directory."
        ),
    }


@router.get("/map")
def laboratory_map(
    lab_name: str = Query(default=""),
    state: str = Query(default=""),
    district: str = Query(default=""),
    is_number: str = Query(default=""),
):
    records = directory_results(
        is_number=is_number,
        lab_name=lab_name,
        state=state,
        district=district,
    )

    return {
        "count": len(records),
        "source": "BIS LIMS",
        "results": [
            {
                "lab_name": item.get("lab_name"),
                "address": item.get("address"),
                "state": item.get("state"),
                "district": item.get("district"),
                "map_query": item.get("map_query"),
                "google_maps_url": item.get("google_maps_url"),
                "osm_url": item.get("osm_url"),
            }
            for item in records
        ],
    }


@router.get("/search")
def search_laboratories(
    is_number: str = Query(default=""),
    lab_name: str = Query(default=""),
    state: str = Query(default=""),
    district: str = Query(default=""),
    lab_type: str = Query(default=""),
):
    normalized = normalize_is_number(is_number)

    try:
        # ---------------------------------------------------------------
        # 1. Precise IS-number search: query BIS LIMS, with curated
        #    snapshot fallback when the requested IS is one of our
        #    indexed demo records.
        # ---------------------------------------------------------------
        if normalized:
            live_results = list(
                extract_is_number_results(normalized)
            )

            filtered_live = [
                record
                for record in live_results
                if matches_directory_filters(
                    record,
                    lab_name=lab_name,
                    state=state,
                    district=district,
                    lab_type=lab_type,
                    is_number=normalized,
                )
            ]

            return {
                "count": len(filtered_live),
                "total_indexed": len(DIRECTORY_RECORDS),
                "available_standards_count": len(DIRECTORY_STANDARDS),
                "available_standards": DIRECTORY_STANDARDS,
                "source": "BIS LIMS",
                "source_url": (
                    BIS_LIMS_SEARCH_URL
                    + "?is_number__doc_no="
                    + quote_plus(normalized_number_only(normalized))
                ),
                "search_type": "is_number",
                "is_number": f"IS {normalized}",
                "lab_type": lab_type,
                "results": filtered_live,
                "data_scope": (
                    "Live BIS LIMS result; indexed snapshot used only "
                    "when live parsing returns no matching rows."
                ),
            }

        # ---------------------------------------------------------------
        # 2. Unfiltered / directory mode: return indexed records instead
        #    of always returning {count: 0, results: []}.
        # ---------------------------------------------------------------
        records = directory_results(
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
        )

        standards = unique_standards(records)

        return {
            "count": len(records),
            "total_indexed": len(DIRECTORY_RECORDS),
            "available_standards_count": len(standards),
            "available_standards": standards,
            "source": "BIS LIMS",
            "source_url": BIS_LIMS_DIRECTORY_URL,
            "search_type": "directory",
            "is_number": "",
            "lab_type": lab_type,
            "results": records,
            "data_scope": (
                "BISense curated snapshot of publicly visible BIS LIMS "
                "laboratory records; not the complete BIS directory."
            ),
        }

    except requests.RequestException as exc:
        # For a failed live IS request, still expose our indexed records
        # where the requested standard is represented.
        fallback = directory_results(
            is_number=normalized,
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
        ) if normalized else directory_results(
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
        )

        return {
            "count": len(fallback),
            "total_indexed": len(DIRECTORY_RECORDS),
            "available_standards_count": len(DIRECTORY_STANDARDS),
            "available_standards": DIRECTORY_STANDARDS,
            "source": "BIS LIMS",
            "source_url": (
                BIS_LIMS_SEARCH_URL
                + (
                    "?is_number__doc_no="
                    + quote_plus(normalized_number_only(normalized))
                    if normalized
                    else ""
                )
            ),
            "search_type": (
                "indexed_snapshot_fallback"
                if normalized
                else "directory"
            ),
            "is_number": (
                f"IS {normalized}"
                if normalized
                else ""
            ),
            "lab_type": lab_type,
            "results": fallback,
            "error": (
                "Live BIS LIMS request failed; showing BISense's "
                "indexed laboratory snapshot for supported records. "
                + str(exc)
            ),
            "data_scope": (
                "BISense curated snapshot of publicly visible BIS LIMS "
                "laboratory records; not the complete BIS directory."
            ),
        }

    except Exception as exc:
        fallback = directory_results(
            is_number=normalized,
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
        ) if normalized else directory_results(
            lab_name=lab_name,
            state=state,
            district=district,
            lab_type=lab_type,
        )

        return {
            "count": len(fallback),
            "total_indexed": len(DIRECTORY_RECORDS),
            "available_standards_count": len(DIRECTORY_STANDARDS),
            "available_standards": DIRECTORY_STANDARDS,
            "source": "BIS LIMS",
            "source_url": BIS_LIMS_DIRECTORY_URL,
            "search_type": (
                "indexed_snapshot_fallback"
                if normalized
                else "directory"
            ),
            "is_number": (
                f"IS {normalized}"
                if normalized
                else ""
            ),
            "lab_type": lab_type,
            "results": fallback,
            "error": (
                "Laboratory extraction failed; showing BISense's "
                "indexed laboratory snapshot where available. "
                + str(exc)
            ),
            "data_scope": (
                "BISense curated snapshot of publicly visible BIS LIMS "
                "laboratory records; not the complete BIS directory."
            ),
        }
