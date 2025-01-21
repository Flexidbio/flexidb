export const env = {
    serverIp: process.env.NODE_ENV === 'development' 
      ? 'localhost'
      :  process.env.SERVER_IP || process.env.PUBLIC_SERVER_IP || "localhost"
  }