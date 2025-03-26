import { messageQueries } from '@acpl/db/queries';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const messages = await messageQueries.getByChatId(chatId);

    return NextResponse.json({
      messages: messages
        .map((message) => ({
          id: message.id,
          authorId: message.authorId,
          message: message.message,
          createdAt: message.createdAt,
        }))
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}
