import { serviceHelper } from '@acpl/simulation/src/lib/helpers/service.helper';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { agentId: string } },
) {
  try {
    /* @next-codemod-ignore */
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 },
      );
    }

    const state = await serviceHelper.agent.getState(agentId);
    return NextResponse.json({ state });
  } catch (error) {
    console.error('Error fetching agent state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent state' },
      { status: 500 },
    );
  }
}
