import os
from dotenv import load_dotenv

load_dotenv()


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {'1', 'true', 'yes', 'y', 'on'}

class Config:
    neo4j = {
        'uri': os.getenv('NEO4J_URI'),
        'username': os.getenv('NEO4J_USERNAME'),
        'password': os.getenv('NEO4J_PASSWORD'),
        'dbname': os.getenv('NEO4J_DBNAME', 'neo4j'),
        'port': int(os.getenv('NEO4J_PORT', 8000)),
        'allow_self_signed': _as_bool(os.getenv('NEO4J_ALLOW_SELF_SIGNED'), False)
    }
    mongodb = {
        'uri': os.getenv('MONGO_URI'),
        'db_name': os.getenv('DB_NAME', 'network_traffic'),
        'collections': {
            'nodes': os.getenv('NODES_COLLECTION', 'nodes'),
            'edges': os.getenv('EDGES_COLLECTION', 'edges')
        }
    }
    server = {
        'neo4j_port': int(os.getenv('NEO4J_PORT', 8000)),
        'mongodb_port': int(os.getenv('MONGODB_PORT', 5000))
    }

config = Config()
