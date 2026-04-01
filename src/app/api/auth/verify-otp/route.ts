export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyOtp } from '@/lib/otp';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (typeof email !== 'string' || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.otp || !user.otpExpiry) {
      return NextResponse.json({ error: 'OTP not requested' }, { status: 400 });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    const [salt, hash] = user.otp.split(':');
    if (!salt || !hash || !verifyOtp(otp, `${salt}:${hash}`)) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null },
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Include the user's name in the JWT token if available
    const token = jwt.sign({ 
      sub: updated.id, 
      email: updated.email,
      name: updated.name || updated.email.split('@')[0] // Use name if available, otherwise use email username
    }, jwtSecret, { expiresIn: '7d' });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log('Setting session cookie for user:', updated.email);
    console.log('JWT_SECRET configured:', !!jwtSecret);

    return NextResponse.json({ ok: true, userId: updated.id });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}


