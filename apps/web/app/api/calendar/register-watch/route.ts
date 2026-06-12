import { NextRequest, NextResponse } from 'next/server';
import { getFunctionUrl } from '../../../shared/lib/functionsUrl';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');

  const res = await fetch(getFunctionUrl('registerCalendarWatch'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
