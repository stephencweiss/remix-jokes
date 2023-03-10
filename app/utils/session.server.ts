import { CookieOptions, createCookieSessionStorage, json, SessionData } from '@remix-run/node';
import { createSessionStorage, redirect } from '@remix-run/node';
import * as bcrypt from 'bcryptjs'
import { authenticator } from './auth.server';
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
  email: string;
  password: string;
}

export async function register({ email, password }: LoginForm) {
  const passwordHash = await bcrypt.hash(password, 10)
  const { id } = await db.user.create({
    data: {
      email,
      emailVerified: false,
      passwordHash
    }
  });
  return { id, email }
}

export async function login({ email, password }: LoginForm) {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return null;
  }

  const foundPassword = user.passwordHash;
  if (!foundPassword) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, foundPassword);
  if (!passwordMatch) {
    return null;
  }

  return { id: user.id, email };
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

// function createDatabaseSessionStorage({
//   cookie,
// }: { cookie: CookieOptions }) {
//   // Configure your database client...

//   return createSessionStorage({
//     cookie,
//     async createData(data: SessionData, expires?: Date) {
//       const { "oauth2:state": oauth2state, ...rest } = data
//       const session = await db.session.create({
//         data: {
//           oauth2state, state: oauth2state, json: rest
//         }
//       });
//       return session.id;
//     },
//     async readData(id) {
//       console.log({ id })
//       const session = await db.session.findUnique({
//         where: { id },
//         select: { userId: true }
//       });
//       return session;
//     },
//     async updateData(id, data, expires) {
//       const { "oauth2:state": oauth2state, ...rest } = data
//       console.log(`updating`, { data })
//       await db.session.update({
//         where: { id },
//         data: {
//           state: oauth2state,
//           oauth2state,
//           json: rest
//         }
//       })
//     },
//     async deleteData(id) {
//       await db.session.delete({ where: { id } });
//     },
//   })
// };

// export const storage = createDatabaseSessionStorage({ cookie });
export const storage = createCookieSessionStorage({ cookie, });
export async function createUserSession(userId: string, redirectTo: string) {
  console.log(`createUserSession`, { userId })
  const session = await storage.getSession();
  session.set('userId', userId)
  const uid = await session.get('userId')
  console.log({ uid })
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    }
  })
}

export async function getUserSession(request: Request) {
  return await storage.getSession(request.headers.get("cookie"))
}

export async function getUserId(request: Request) {
  const {userId} = await authenticator.isAuthenticated(request) ?? {}
  if (!userId || typeof userId !== 'string') return null;
  return userId
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId == null) return null;
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
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
  const session = await storage.getSession(request.headers.get("cookie"));
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