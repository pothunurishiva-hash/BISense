import json
from pathlib import Path

from app.database.connection import SessionLocal
from app.database.init_db import initialize_database
from app.database.models import Standard


DATA_FILE = Path(__file__).resolve().parents[2] / "standards_data_120.json"


def seed_database():
    initialize_database()

    with DATA_FILE.open("r", encoding="utf-8") as file:
        standards_data = json.load(file)

    db = SessionLocal()

    try:
        added = 0
        updated = 0

        for data in standards_data:
            existing = (
                db.query(Standard)
                .filter(Standard.number == data["number"])
                .first()
            )

            if existing:
                existing.title = data["title"]
                existing.category = data["category"]
                existing.scope = data.get("scope")
                existing.status = data.get("status", "Listed")
                existing.edition_year = data.get("edition_year")
                existing.certification_scheme = data.get("certification_scheme")
                existing.certification_status = data.get("certification_status")
                existing.qco_information = data.get("qco_information")
                existing.source_name = data.get(
                    "source_name",
                    "BIS Standards Portal",
                )
                existing.source_url = data.get(
                    "source_url",
                    "https://standards.bis.gov.in/",
                )
                updated += 1
            else:
                db.add(
                    Standard(
                        number=data["number"],
                        title=data["title"],
                        category=data["category"],
                        scope=data.get("scope"),
                        status=data.get("status", "Listed"),
                        edition_year=data.get("edition_year"),
                        certification_scheme=data.get("certification_scheme"),
                        certification_status=data.get("certification_status"),
                        qco_information=data.get("qco_information"),
                        source_name=data.get(
                            "source_name",
                            "BIS Standards Portal",
                        ),
                        source_url=data.get(
                            "source_url",
                            "https://standards.bis.gov.in/",
                        ),
                    )
                )
                added += 1

        db.commit()

        total = db.query(Standard).count()

        print("======================================")
        print("BISense database seeding completed.")
        print(f"New standards added         : {added}")
        print(f"Existing standards updated : {updated}")
        print(f"Total standards in database : {total}")
        print("======================================")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
