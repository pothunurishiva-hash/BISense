from app.database.connection import Base, engine
from app.database.models import Standard


def reset_database():
    # Importing Standard registers the table with Base.metadata.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("BISense database reset successfully.")


if __name__ == "__main__":
    reset_database()