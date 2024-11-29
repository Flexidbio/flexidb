// src/lib/config/mongodb.config.ts

export interface MongoReplicaSetConfig {
  replicas: number;
  internal_port: number;    // Port inside containers
  replica_set_name: string;
  initialization_timeout: number;
  startup_options: string[];
}

export interface MongoNodeConfig {
  internal_port: number;    // Port inside container
  external_port: number;    // Port on host machine
  node_name: string;
  is_primary?: boolean;
}
// Helper to generate replica set initialization command

export const MONGODB_REPLICA_CONFIG: MongoReplicaSetConfig = {
  replicas: 3,
  internal_port: 27017,
  replica_set_name: "rs0",
  initialization_timeout: 120000,
  startup_options: [
    "--bind_ip_all",
    "--replSet",
    "rs0",
    "--oplogSize",
    "128",
    "--wiredTigerCacheSizeGB",
    "1",
    // Disable authentication for initial setup
    "--noauth"
  ]
};

  
// Helper function to generate replica set connection string
export function generateMongoReplicaSetConnString(
  nodes: MongoNodeConfig[],
  credentials: { username: string; password: string },
  database: string = "admin"
): string {
  // Use external ports for connection string since that's what's accessible from outside
  const hosts = nodes
    .map(node => `localhost:${node.external_port}`)
    .join(',');
    
  return `mongodb://${credentials.username}:${credentials.password}@${hosts}/${database}?replicaSet=${MONGODB_REPLICA_CONFIG.replica_set_name}&authSource=admin`;
}

// Helper function to generate configuration for each replica set member
export function generateReplicaSetMembers(
  baseExternalPort: number,
  replicaCount: number
): MongoNodeConfig[] {
  return Array.from({ length: replicaCount }, (_, i) => ({
    internal_port: MONGODB_REPLICA_CONFIG.internal_port,
    external_port: baseExternalPort + i,  // Each member gets unique external port
    node_name: `mongo${i}`,
    is_primary: i === 0  // First node is initially primary
  }));
}


// Helper to generate better replica set configuration
export function generateReplicaSetInitCommand(members: MongoNodeConfig[]): string {
  const rsConfig = {
    _id: MONGODB_REPLICA_CONFIG.replica_set_name,
    members: members.map((member, index) => ({
      _id: index,
      host: `${member.node_name}:${member.internal_port}`,
      priority: member.is_primary ? 1 : 0.5,
      // Add voting configuration
      votes: 1,
      // Add tags for better management
      tags: {
        role: member.is_primary ? 'primary' : 'secondary',
        dc: 'local'
      }
    }))
  };
  
  // Return a more robust initialization command
  return `
    try {
      rs.initiate(${JSON.stringify(rsConfig, null, 2)});
      // Wait for initialization
      sleep(2000);
      // Check status
      rs.status();
    } catch (error) {
      print('Error during initialization:', error);
      throw error;
    }
  `;
}
export const MONGODB_CONFIG = {
  image: "mongo:latest",
  internal_port: MONGODB_REPLICA_CONFIG.internal_port,
  required_env_vars: [
    "MONGO_INITDB_ROOT_USERNAME",
    "MONGO_INITDB_ROOT_PASSWORD"
  ],
  optional_env_vars: [
    "MONGO_INITDB_DATABASE"
  ],
  cmd: ["--replSet", MONGODB_REPLICA_CONFIG.replica_set_name],
  replica_set: MONGODB_REPLICA_CONFIG
};