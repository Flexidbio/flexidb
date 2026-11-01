import { NextResponse } from 'next/server'
import { getBackupFile } from '@/lib/actions/backup'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getBackupFile(id)

    if (!result) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    return new Response(new Uint8Array(result.data), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to download backup:', error)
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    )
  }
}
