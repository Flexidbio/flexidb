export interface DatabaseConfig {
    image: string;
    internal_port: number;
    required_env_vars: string[];
    optional_env_vars: string[];
    cmd: string[];
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
    status: string;
    container_id:string;
    envVars: Record<string, string>;
    internalPort: number;
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
  