from api.neo4j_client import get_driver

driver = get_driver()

# query = """
# MERGE (p:Product {code: $code})
# SET p.name = $name

# MERGE (d:Document {id: $doc_id})
# SET d.title = $doc_title

# MERGE (p)-[:HAS_DOCUMENT]->(d)

# RETURN p, d
# """

# query = """
# MATCH (p:Product {code: $code})-[:HAS_DOCUMENT]->(d:Document)
# RETURN p, d
# """

# query = """
# MATCH (p:Product {code: $code})--(n)
# RETURN p, n
# """

query = """
MATCH (p)-[r]->(n)
RETURN p, type(r) AS r, n
"""

# query = """
# MERGE (p: Product {code: $code})
# SET p.name = $name

# MERGE (d: Document {id: $doc_id})

# MERGE (p)-[:HAS_DOCUMENT]->(d)
# RETURN p, d
# """

query = """
MATCH (p)
RETURN p
"""

# query = """
# MATCH (p: Product)
# RETURN COLLECT({
#     code: p.code,
#     name: p.name
# }) as p
# """

# query = """
# MATCH (p:Product)-[:HAS_DOCUMENT]->(d:Document)

# WITH d, COLLECT({code: p.code, name: p.name}) AS pd

# RETURN {
#     doc: d.title,
#     products: pd
# } as result, COUNT(d) as p
# """

# query = """
# MERGE (t: Team {id: $team_id})
# SET t.name = $team_name

# MERGE (d: Document {id: $doc_id})

# MERGE (d)-[:OWNED_BY]->(t)

# return d, t
# """

# query = """
# MATCH (p:Product {code: "MC-Air"}),
#       (d:Team {id: "1"})

# MATCH path = shortestPath((p)-[*]-(d))

# RETURN path
# """

with driver.session() as session:
    result = session.run(query)

    for record in result:
        print(record)

    # result = session.run(query, code="Iphone", name="Iphone 13 Pro Max", doc_id="doc-123")
    # for r in result:
    #     print(r["p"], r["d"])

    # for record in result:
    #     print(record["p"]._properties["name"], "-", record["r"], "->", record["n"]._properties["title"])

 