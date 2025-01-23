import { NextResponse } from 'next/server';
import { UpdateService } from '@/lib/services/update-service';
import { auth } from '@/lib/auth/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateService = UpdateService.getInstance();
    const updateInfo = await updateService.checkForUpdates();

    return NextResponse.json(updateInfo);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check for updates' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateService = UpdateService.getInstance();
    await updateService.performUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to perform update' },
      { status: 500 }
    );
  }
} 