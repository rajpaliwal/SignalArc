"""Pydantic request/response schemas — the API's I/O contract.

Distinct from `app/models.py` (SQLAlchemy tables, the storage shape) and
`app/graph/nodes.py` (neomodel classes, the Neo4j shape). These schemas
are what FastAPI actually validates requests against and serialises
responses from.
"""
