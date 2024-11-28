'use server'

import { DockerClient } from '@/lib/docker/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import fs,{mkdir} from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';


const dockerClient = DockerClient.getInstance();

// Simplified schema for just domain configuration
const DomainConfigSchema = z.object({
  domain: z.string().min(1),
  enableSsl: z.boolean().default(false),
});

export type DomainConfigInput = z.infer<typeof DomainConfigSchema>;

const TRAEFIK_CONFIG_DIR = process.env.TRAEFIK_CONFIG_DIR || '/etc/traefik';

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    try {
      // Try to create directory with recursive option
      await mkdir(dirPath, { recursive: true, mode: 0o777 });
    } catch (error) {
      if ((error as any).code === 'EACCES') {
        // If permission denied, try using sudo (only in production)
        if (process.env.NODE_ENV === 'production') {
          const { execSync } = require('child_process');
          execSync(`mkdir -p ${dirPath} && chmod -R 777 ${dirPath}`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}

export async function configureDomain(input: DomainConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  const serverIp = process.env.SERVER_IP;
  if (!serverIp) {
    throw new Error('Server IP not configured. Please check your environment variables.');
  }

  try {
    const validated = DomainConfigSchema.parse(input);
    
    // Updated domain validation regex to handle subdomains
    const domainRegex = /^(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
    if (!domainRegex.test(validated.domain)) {
      throw new Error('Invalid domain format. Please enter a valid domain name (e.g., example.com or sub.example.com)');
    }

    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', 'website.yml');
    await ensureDirectoryExists(path.dirname(configPath));

    const routeConfig = {
      http: {
        routers: {
          website: {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website-service",
            tls: validated.enableSsl ? {
              certResolver: "letsencrypt"
            } : undefined,
            entryPoints: ["websecure"]
          },
          "website-http": {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website-service",
            entryPoints: ["web"]
          }
        },
        services: {
          "website-service": {
            loadBalancer: {
              servers: [{
                url: "http://app:3000"
              }]
            }
          }
        }
      }
    };

    await fs.writeFile(configPath, JSON.stringify(routeConfig, null, 2), { mode: 0o666 });

    // Update database settings
    await prisma.settings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        domain: validated.domain,
        allowSignups: false
      },
      update: {
        domain: validated.domain
      }
    });

    // Restart Traefik to apply changes
    const traefikContainer = dockerClient.docker.getContainer('flexidb_traefik');
    await traefikContainer.restart();

    revalidatePath('/dashboard/settings');
    return { success: true, domain: validated.domain };
  } catch (error) {
    console.error('Failed to configure domain:', error);
    throw error instanceof Error ? error : new Error('Failed to configure domain');
  }
}

export async function getCurrentDomain() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const settings = await prisma.settings.findFirst({
      where: { id: "default" }
    });
    return settings?.domain || null;
  } catch (error) {
    console.error('Failed to get current domain:', error);
    throw new Error('Failed to get current domain configuration');
  }
}