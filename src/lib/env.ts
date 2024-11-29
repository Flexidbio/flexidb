export const env = {
    serverIp: process.env.NODE_ENV === 'development' 
      ? 'localhost'
      : (process.env.NEXT_PUBLIC_SERVER_IP || process.env.SERVER_IP || 'localhost')
  }