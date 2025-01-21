export const env = {
    serverIp: process.env.NODE_ENV === 'development' 
      ? 'localhost'
      :  process.env.SERVER_IP || ""
  }