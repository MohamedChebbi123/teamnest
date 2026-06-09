import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.connection import SessionLocal
from utils.vector_db_handler import reindex_all_tasks

def main():
    db = SessionLocal()
    try:
        count = reindex_all_tasks(db)
        print(f"Re-indexed {count} tasks into Pinecone with team_name")
    finally:
        db.close()

if __name__ == "__main__":
    main()
