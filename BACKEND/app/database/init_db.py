from app.database.connection import Base, engine
from app.database.models import BISDocument, BISDocumentChunk, Standard


def initialize_database():
    # Importing the models registers all tables with SQLAlchemy.
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    initialize_database()
    print("BISense database initialized successfully.")