import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.txt');
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    
    const [version, schemaContent] = await Promise.all([
      fs.readFile(versionPath, 'utf-8').catch(() => 'dev'),
      fs.readFile(schemaPath, 'utf-8')
    ]);

    const schemaHash = createHash('sha256').update(schemaContent).digest('hex');

    return NextResponse.json({
      version: version.trim(),
      schemaHash
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch version information' },
      { status: 500 }
    );
  }
}
