import { NextResponse } from 'next/server'
import { getBackupFile } from '@/lib/actions/backup'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getBackupFile(params.id)

    if (!result) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    return new Response(result.data, {
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
