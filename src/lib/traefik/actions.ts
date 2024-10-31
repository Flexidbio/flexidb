'use server'

import { DockerClient } from '@/lib/docker/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';

const dockerClient = DockerClient.getInstance();

// Validation schemas
const TraefikRouteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  targetPort: z.number().int().positive(),
  targetContainer: z.string().min(1),
  tlsEnabled: z.boolean().default(false),
  middlewares: z.array(z.string()).optional(),
});

const TraefikConfigSchema = z.object({
  entryPoints: z.object({
    web: z.object({
      address: z.string(),
    }),
    websecure: z.object({
      address: z.string(),
    }).optional(),
  }),
  certificatesResolvers: z.object({
    letsencrypt: z.object({
      acme: z.object({
        email: z.string().email(),
        storage: z.string(),
        httpChallenge: z.object({
          entryPoint: z.string(),
        }),
      }),
    }),
  }).optional(),
});

export type TraefikRouteInput = z.infer<typeof TraefikRouteSchema>;
export type TraefikConfigInput = z.infer<typeof TraefikConfigSchema>;

const TRAEFIK_CONFIG_DIR = process.env.TRAEFIK_CONFIG_DIR || '/etc/traefik';

export async function createTraefikRoute(input: TraefikRouteInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const validated = TraefikRouteSchema.parse(input);
    
    const routeConfig = {
      http: {
        routers: {
          [validated.name]: {
            rule: `Host(\`${validated.domain}\`)`,
            service: validated.name,
            tls: validated.tlsEnabled,
            middlewares: validated.middlewares || [],
          },
        },
        services: {
          [validated.name]: {
            loadBalancer: {
              servers: [{
                url: `http://${validated.targetContainer}:${validated.targetPort}`,
              }],
            },
          },
        },
      },
    };

    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', `${validated.name}.yml`);
    await fs.writeFile(configPath, JSON.stringify(routeConfig, null, 2));
    
    // Store route in database for management
    await prisma.traefikRoute.create({
      data: {
        name: validated.name,
        domain: validated.domain,
        targetPort: validated.targetPort,
        targetContainer: validated.targetContainer,
        tlsEnabled: validated.tlsEnabled,
        middlewares: validated.middlewares || [],
      },
    });

    revalidatePath('/dashboard/traefik');
    return { success: true, name: validated.name };
  } catch (error) {
    console.error('Failed to create Traefik route:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create Traefik route');
  }
}

export async function updateTraefikConfig(input: TraefikConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const validated = TraefikConfigSchema.parse(input);
    
    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'traefik.yml');
    await fs.writeFile(configPath, JSON.stringify(validated, null, 2));

    // Reload Traefik container
    const traefikContainer = dockerClient.docker.getContainer('traefik');
    await traefikContainer.restart();

    revalidatePath('/dashboard/traefik');
    return { success: true };
  } catch (error) {
    console.error('Failed to update Traefik config:', error);
    throw new Error('Failed to update Traefik configuration');
  }
}

export async function deleteTraefikRoute(name: string) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', `${name}.yml`);
    await fs.unlink(configPath);
    
    // Remove from database
    await prisma.traefikRoute.delete({
      where: { name },
    });

    revalidatePath('/dashboard/traefik');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete Traefik route:', error);
    throw new Error('Failed to delete Traefik route');
  }
}

export async function getTraefikRoutes() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    return prisma.traefikRoute.findMany();
  } catch (error) {
    console.error('Failed to get Traefik routes:', error);
    throw new Error('Failed to get Traefik routes');
  }
}
