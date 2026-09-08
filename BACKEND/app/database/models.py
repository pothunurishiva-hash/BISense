from sqlalchemy import Column, Integer, String, Text

from app.database.connection import Base


class Standard(Base):
    __tablename__ = "standards"

    id = Column(Integer, primary_key=True, index=True)

    number = Column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    category = Column(
        String(200),
        index=True,
    )

    scope = Column(Text)

    status = Column(
        String(100),
        default="Unknown",
    )

    edition_year = Column(
        Integer,
        nullable=True,
    )

    certification_scheme = Column(
        String(200),
        nullable=True,
    )

    certification_status = Column(
        String(200),
        nullable=True,
    )

    qco_information = Column(
        Text,
        nullable=True,
    )

    source_name = Column(
        String(300),
        nullable=True,
    )

    source_url = Column(
        Text,
        nullable=True,
    )


class BISDocument(Base):
    __tablename__ = "bis_documents"

    id = Column(Integer, primary_key=True, index=True)

    standard_number = Column(
        String(100),
        index=True,
        nullable=True,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    document_type = Column(
        String(100),
        nullable=False,
    )

    source_name = Column(
        String(300),
        nullable=False,
    )

    source_url = Column(
        Text,
        nullable=False,
    )

    local_path = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(100),
        default="available",
    )


class BISDocumentChunk(Base):
    __tablename__ = "bis_document_chunks"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer,
        index=True,
        nullable=False,
    )

    standard_number = Column(
        String(100),
        index=True,
        nullable=True,
    )

    chunk_number = Column(
        Integer,
        nullable=False,
    )

    section_title = Column(
        String(500),
        nullable=True,
    )

    content = Column(
        Text,
        nullable=False,
    )

    page_number = Column(
        Integer,
        nullable=True,
    )

    # ------------------------------------------------------------
    # RAG EMBEDDING DATA
    # ------------------------------------------------------------

    embedding = Column(
        Text,
        nullable=True,
    )

    embedding_model = Column(
        String(100),
        nullable=True,
    )