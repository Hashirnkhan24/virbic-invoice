import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logClientActivity } from '@/lib/db/client-analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    const notes = await prisma.clientNote.findMany({
      where: { clientId: id, userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (err: any) {
    console.error('[CLIENT NOTES GET]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    const note = await prisma.clientNote.create({
      data: {
        clientId: id,
        userId: user.id,
        content: content.trim(),
      },
    });

    // Log activity
    await logClientActivity({
      clientId: id,
      userId: user.id,
      action: 'NOTE_ADDED',
      details: `Added note: "${content.trim().substring(0, 60)}${content.trim().length > 60 ? '...' : ''}"`,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err: any) {
    console.error('[CLIENT NOTES POST]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const note = await prisma.clientNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.clientId !== id || note.userId !== user.id) {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }

    await prisma.clientNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (err: any) {
    console.error('[CLIENT NOTES DELETE]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
