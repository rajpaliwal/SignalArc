"""The Neo4j-side data model and sync logic.

`nodes.py` defines the graph schema (neomodel classes — the equivalent of
`app/models.py` on the Postgres side). `sync.py` mirrors Postgres rows
into that schema, idempotently.
"""
