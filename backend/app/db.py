"""
Singleton manager for the Neo4j/CognoDB driver connection.

The module-level `db` instance is imported by main.py and used throughout
the application. FastAPI's lifespan handler calls db.connect() on startup
and db.close() on shutdown — the driver is never created per-request.
"""

import os
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from dotenv import load_dotenv

load_dotenv()


class Neo4jConnection:
    """Singleton wrapper around the Neo4j driver."""

    def __init__(self):
        self.driver = None
        self._uri = os.getenv("COGNODB_URI")
        self._user = os.getenv("COGNODB_USER")
        self._password = os.getenv("COGNODB_PASSWORD")

    def connect(self):
        """
        Initialize the database driver. Called during FastAPI startup
        or on-demand if credentials were added after launch.
        """
        load_dotenv(override=True)
        self._uri = os.getenv("COGNODB_URI")
        self._user = os.getenv("COGNODB_USER")
        self._password = os.getenv("COGNODB_PASSWORD")

        missing = []
        if not self._uri:
            missing.append("COGNODB_URI")
        if not self._user:
            missing.append("COGNODB_USER")
        if not self._password:
            missing.append("COGNODB_PASSWORD")

        if missing:
            print(f"[!] WARNING: Missing database environment variables: {', '.join(missing)}")
            print("   The API will start, but database endpoints will return 503.")
            print("   Set these variables in your .env file. See .env.example.")
            return

        try:
            self.driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password),
                max_connection_lifetime=180,  # Refresh stale sockets every 3 minutes
                max_connection_pool_size=50,
                connection_acquisition_timeout=30.0,
                connection_timeout=15.0,
            )
            self.driver.verify_connectivity()
            print(f"[OK] Connected to CognoDB at {self._uri}")
        except Exception as e:
            print(f"[!] WARNING: Could not connect to CognoDB at {self._uri}")
            print(f"   Details: {e}")
            print("   The API will start, but database endpoints will return 503.")
            self.driver = None

    def verify_connectivity(self):
        """Check if the database is reachable, reconnecting if socket is defunct."""
        if self.driver is None:
            self.connect()
        if self.driver is None:
            raise ConnectionError("No database driver initialized")
        try:
            self.driver.verify_connectivity()
        except Exception:
            # Reconnect on broken/defunct socket
            self.connect()
            if self.driver:
                self.driver.verify_connectivity()

    def close(self):
        """Close the driver connection. Called during FastAPI shutdown."""
        if self.driver:
            self.driver.close()
            print("[OK] CognoDB connection closed")


# Singleton instance — imported by main.py and queries.py
db = Neo4jConnection()
