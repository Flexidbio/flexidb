import { DatabaseConfigs } from '../types';

export const DATABASE_CONFIGS: DatabaseConfigs = {
  mysql: {
    image: "mysql:latest",
    internal_port: 3306,
    required_env_vars: ["MYSQL_ROOT_PASSWORD"],
    optional_env_vars: ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
    cmd: []
  },
  postgresql: {
    image: "postgres:latest",
    internal_port: 5432,
    required_env_vars: ["POSTGRES_PASSWORD"],
    optional_env_vars: ["POSTGRES_USER", "POSTGRES_DB"],
    cmd: []
  },
  mongodb: {
    image: "mongo:latest",
    internal_port: 27017,
    required_env_vars: [
      "MONGO_INITDB_ROOT_USERNAME", 
      "MONGO_INITDB_ROOT_PASSWORD"
    ],
    optional_env_vars: [
      "MONGO_INITDB_DATABASE",
      "MONGO_REPLICA_SET_NAME",
      "MONGODB_ADVERTISED_HOSTNAME"
    ],
    cmd: ["--replSet", "rs0", "--bind_ip_all"],
    volumes: [
      {
        source: "mongodb_data",
        target: "/data/db"
      },
      {
        source: "mongodb_config",
        target: "/data/configdb"
      }
    ]
  },

  redis: {
    image: "redis:latest",
    internal_port: 6379,
    required_env_vars: ["REDIS_PASSWORD"],
    optional_env_vars: [],
    cmd: []
  },
  mariadb: {
    image: "mariadb:latest",
    internal_port: 3306,
    required_env_vars: ["MYSQL_ROOT_PASSWORD"],
    optional_env_vars: ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"],
    cmd: []
  }
};