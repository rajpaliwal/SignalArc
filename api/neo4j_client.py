import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI")
PASSWORD = os.getenv("NEO4J_PASSWORD")


def get_driver():
    driver = GraphDatabase.driver(URI, auth=("neo4j", PASSWORD))

    try:
        driver.verify_connectivity()
        print("Connected to Neo4j")
    except Exception as e:
        print(f"Failed to connect to Neo4j: {e}")
        raise
    return driver