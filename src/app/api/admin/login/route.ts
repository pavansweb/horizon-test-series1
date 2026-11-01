import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    const isHttps = request.url.startsWith('https://');
    const token = createSessionToken();
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal login error' },
      { status: 500 }
    );
  }
}
