import type { CookieOptions, SessionData } from '@remix-run/node';
import { createSessionStorage, redirect } from '@remix-run/node';
import * as bcrypt from 'bcryptjs'
import { db } from "./db.server"

// Read variables from process.env
const AUTH0_LOGOUT_URL = process.env.AUTH0_LOGOUT_URL
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID
const AUTH0_RETURN_TO_URL = process.env.AUTH0_RETURN_TO_URL

// Ensure they are defined and throw error if not
if (!AUTH0_LOGOUT_URL) throw new Error("Missing Auth0 logout url.");
if (!AUTH0_CLIENT_ID) throw new Error("Missing Auth0 client id.");
if (!AUTH0_RETURN_TO_URL) throw new Error("Missing Auth0 return url.");
const auth0 = {
  logoutUrl: AUTH0_LOGOUT_URL,
  clientId: AUTH0_CLIENT_ID,
  returnToUrl: AUTH0_RETURN_TO_URL
}
type LoginForm = {
  username: string;
  password: string;
}

export async function register({ username, password }: LoginForm) {
  const passwordHash = await bcrypt.hash(password, 10)
  const { id } = await db.user.create({ data: { username, passwordHash } });
  return { id, username }
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

      const { "oauth2:state": oauth2state, userId, expires: expiresAt } = data;
      const session = await db.session.create({
        data: {
          userId,
          expiresAt,
          oauth2state,
        }
      });
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

      const { "oauth2:state": oauth2state, ...rest } = data;
      await db.session.update({
        where: { id },
        data: {
          ...(expires ? { expiresAt: expires } : {}),
          ...rest,
          oauth2state
        }
      })
    },
    async deleteData(id) {
      await db.session.delete({ where: { id } });
    },
  })
};

export const storage = createDatabaseSessionStorage({ cookie });

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

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === null) return null;
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
    return user
  } catch {
    throw logout(request)
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect('/login', {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    }
  })
}

export async function logoutAuth0(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  const logoutURL = new URL(auth0.logoutUrl);
  logoutURL.searchParams.set("client_id", auth0.clientId);
  logoutURL.searchParams.set("returnTo", auth0.returnToUrl);

  return redirect(logoutURL.toString(), {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
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