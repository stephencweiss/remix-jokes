import { createCookieSessionStorage, redirect } from '@remix-run/node';
import * as bcrypt from 'bcryptjs'
import { db } from "./db.server"

type LoginForm = {
  username: string;
  password: string;
}
export async function login({ username, password }: LoginForm) {

  const user = await db.user.findUnique({ where: { username } })
  if (!user) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return null;
  }

  return { id: user.id, username };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,

  }
})

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    }
  })
}

export async function getUserSession(request: Request) {
  return await storage.getSession(request.headers.get("Cookie"))
}
export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get('userId')
  if (!userId || typeof userId !== 'string') return null;
  return userId
}
export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname) {
  const session = await getUserSession(request);
  const userId = session.get('userId')
  if (!userId || typeof userId !== 'string') {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo]
    ])
    throw redirect(`/login?${searchParams}`);
  }
  return userId


}