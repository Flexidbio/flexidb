import net from 'net';

const checkPortAvailability = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
  
      server.once('error', () => resolve(false)); // Port is in use
      server.once('listening', () => {
        server.close(); // Port is available
        resolve(true);
      });
  
      server.listen(port);
    });
  };
  
  /**
   * Finds the next 5 available ports starting near a specified port.
   */
  export const getAvailablePorts = async (startPort: number): Promise<number[]> => {
    const availablePorts: number[] = [];
    let port = startPort;
  
    while (availablePorts.length < 5) {
      const isAvailable = await checkPortAvailability(port);
      if (isAvailable) {
        availablePorts.push(port);
      }
      port += 1; // Move to the next port
    }
  
    return availablePorts;
  };
