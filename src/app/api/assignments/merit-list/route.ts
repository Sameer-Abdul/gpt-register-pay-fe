import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token =
      (session as any)?.accessToken ||
      (session.user as any)?.accessToken;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 401 }
      );
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = `${backend}/assignments/merit-list`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Server Error', details: `${err}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
