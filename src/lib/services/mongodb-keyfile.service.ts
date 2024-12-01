// src/lib/services/mongodb-keyfile.service.ts

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export class MongoKeyfileService {
  private static instance: MongoKeyfileService;
  private keyfilePath: string;

  private constructor() {
    this.keyfilePath = path.join(process.cwd(), 'data', 'mongodb-keyfiles');
  }

  public static getInstance(): MongoKeyfileService {
    if (!MongoKeyfileService.instance) {
      MongoKeyfileService.instance = new MongoKeyfileService();
    }
    return MongoKeyfileService.instance;
  }

  private async ensureKeyfileDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.keyfilePath, { recursive: true });
      // Set directory permissions to 700
      await fs.chmod(this.keyfilePath, 0o700);
    } catch (error) {
      console.error('Failed to create keyfile directory:', error);
      throw error;
    }
  }

  public async generateKeyfile(replicaSetName: string): Promise<string> {
    await this.ensureKeyfileDirectory();
    
    const keyContent = randomBytes(756).toString('base64');
    const keyfilePath = path.join(this.keyfilePath, `${replicaSetName}.key`);

    try {
      // Write keyfile with newline
      await fs.writeFile(keyfilePath, keyContent + '\n');
      // Set keyfile permissions to 400 (read-only for owner)
      await fs.chmod(keyfilePath, 0o400);
      
      return keyfilePath;
    } catch (error) {
      console.error('Failed to generate keyfile:', error);
      throw error;
    }
  }

  public async getKeyfilePath(replicaSetName: string): Promise<string> {
    return path.join(this.keyfilePath, `${replicaSetName}.key`);
  }

  public async cleanup(replicaSetName: string): Promise<void> {
    try {
      const keyfilePath = await this.getKeyfilePath(replicaSetName);
      await fs.unlink(keyfilePath);
    } catch (error) {
      console.error('Failed to cleanup keyfile:', error);
      // Don't throw here as this is cleanup
    }
  }
}