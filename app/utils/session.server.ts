import type { CookieOptions, SessionData } from '@remix-run/node';
import { createSessionStorage, redirect } from '@remix-run/node';
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

const cookie: CookieOptions & { name: string } = {
  name: '__session',
  secure: process.env.NODE_ENV === 'production',
  secrets: [sessionSecret],
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  httpOnly: true,
}

function createDatabaseSessionStorage({
  cookie,
}: { cookie: CookieOptions }) {
  // Configure your database client...

  return createSessionStorage({
    cookie,
    async createData(data: SessionData, expires?: Date) {
      console.log({data})
      const session = await db.session.create({ data: { userId: data.userId, expiresAt: expires } });
      return session.id;
    },
    async readData(id) {
      const session = await db.session.findUnique({
        where: { id },
        select: { userId: true }
      });
      return session;
    },
    async updateData(id, data, expires) {
      await db.session.update({
        where: { id },
        data: {
          ...(expires ? { expiresAt: expires } : {}),
          ...data
        }
      })
    },
    async deleteData(id) {
      await db.session.delete({ where: { id } });
    },
  })
};
const storage = createDatabaseSessionStorage({ cookie });

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
  const userId = await getUserId(request);

  if (!userId || typeof userId !== 'string') {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo]
    ])
    throw redirect(`/login?${searchParams}`);
  }
  return userId
}