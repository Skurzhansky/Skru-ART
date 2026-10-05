#!/usr/bin/env python3
"""Backup database script."""

import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./house_designer.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")


def backup_sqlite(db_path: str) -> str:
    """Backup SQLite database."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    shutil.copy2(db_path, backup_path)
    return backup_path


def backup_postgres(url: str) -> str:
    """Backup PostgreSQL database using pg_dump."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_{timestamp}.sql"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    # Parse PostgreSQL URL
    # postgresql://user:pass@host:port/dbname
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "")
        auth, rest = url.split("@")
        user, password = auth.split(":")
        host_port_db = rest.split("/")
        host_port = host_port_db[0]
        dbname = host_port_db[1] if len(host_port_db) > 1 else "postgres"
        host, port = host_port.split(":") if ":" in host_port else (host_port, "5432")

        env = os.environ.copy()
        env["PGPASSWORD"] = password

        cmd = [
            "pg_dump",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", dbname,
            "-f", backup_path,
        ]
        subprocess.run(cmd, env=env, check=True)
        return backup_path
    else:
        raise ValueError("Unsupported DATABASE_URL format")


def main():
    print(f"DATABASE_URL: {DATABASE_URL[:50]}...")

    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        if not os.path.exists(db_path):
            print(f"Database file not found: {db_path}")
            return
        backup_path = backup_sqlite(db_path)
        print(f"SQLite backup created: {backup_path}")
        print(f"Size: {os.path.getsize(backup_path)} bytes")
    elif DATABASE_URL.startswith("postgresql"):
        backup_path = backup_postgres(DATABASE_URL)
        print(f"PostgreSQL backup created: {backup_path}")
        print(f"Size: {os.path.getsize(backup_path)} bytes")
    else:
        print("Unsupported database type")


if __name__ == "__main__":
    main()
