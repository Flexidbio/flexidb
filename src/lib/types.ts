import { Prisma } from "@prisma/client";

export interface DatabaseConfig {
    image: string;
    internal_port: number;
    required_env_vars: string[];
    optional_env_vars: string[];
    cmd: string[];
    volumes?: {
      source: string;
      target: string;
    }[];
  }
  
  export interface DatabaseConfigs {
    [key: string]: DatabaseConfig;
  }
  
  export interface ContainerInfo {
    id: string;
    name: string;
    status: string;
    ports: { [key: string]: string };
    created: string;
    state: string;
  }

  export interface DatabaseInstance {
    id: string;
    name: string;
    type: string;
    port: number;
    image: string;
    status: string;
    container_id: string | null;
    envVars: Prisma.JsonValue;
    internalPort: number;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface RegisterData {
    email: string;
    password: string;
    name?: string;
  }
  
  export interface CreateContainerInput {
    name: string;
    image: string;
    envVars: Record<string, string>;
    port: number; // external port
    internalPort: number;
    network?: string;
  }
  
export interface MongoReplicaSetConfig {
  primaryPort: number;
  secondaryPorts: number[];
  keyfilePath: string;
  networkName: string;
  username: string;
  password: string;
  instanceId: string;
}