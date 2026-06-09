import { NextRequest, NextResponse } from 'next/server';
import { getFunctionUrl } from '../../../shared/lib/functionsUrl';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  const body = await request.json();

  const res = await fetch(getFunctionUrl('updateEmployeeCalendarLink'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
