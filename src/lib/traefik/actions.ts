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
    await mkdir(dirPath, { recursive: true });
  }
}

export async function configureDomain(input: DomainConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const validated = DomainConfigSchema.parse(input);
    
    // Enhanced domain validation
    const domainRegex = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
    if (!domainRegex.test(validated.domain)) {
      throw new Error('Invalid domain format. Please enter a valid domain name (e.g., example.com)');
    }

    // Define config path once
    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', 'website.yml');

    // Backup current config
    try {
      await fs.copyFile(configPath, `${configPath}.backup`);
    } catch (e) {
      // Ignore if backup fails due to non-existent file
    }

    // Ensure directories exist
    await ensureDirectoryExists(path.join(TRAEFIK_CONFIG_DIR, 'dynamic'));
    
    // Create main router configuration for the website
    const routeConfig = {
      http: {
        routers: {
          website: {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website",
            tls: validated.enableSsl ? {
              certResolver: "letsencrypt"
            } : undefined,
            entryPoints: ["web", "websecure"]
          }
        },
        services: {
          website: {
            loadBalancer: {
              servers: [{
                url: "http://app:3000"
              }]
            }
          }
        }
      }
    };

    // Write the configuration
    await fs.writeFile(configPath, JSON.stringify(routeConfig, null, 2));

    // Update settings in database
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

    // Reload Traefik to apply changes
    try {
      const traefikContainer = dockerClient.docker.getContainer('flexidb_traefik');
      await traefikContainer.restart();
    } catch (error) {
      console.error('Failed to restart Traefik:', error);
      // Continue anyway as config is updated
    }

    revalidatePath('/dashboard/settings');
    return { success: true, domain: validated.domain };
  } catch (error) {
    console.error('Failed to configure domain:', error);
    throw error instanceof Error ? error : new Error('Failed to configure domain');
  } finally {
    // Ignore cleanup errors
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