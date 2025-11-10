require('dotenv').config();

module.exports = {
  mongodb: {
    uri: process.env.MONGO_URI,
    dbName: process.env.DB_NAME,
    collections: {
      nodes: process.env.NODES_COLLECTION,
      edges: process.env.EDGES_COLLECTION
    }
  },
  server: {
    mongodb_port: process.env.MONGODB_PORT || 5000,
    neo4j_port: process.env.NEO4J_PORT || 8000
  }
};
