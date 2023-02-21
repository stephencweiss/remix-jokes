// app/services/auth.server.ts
import { Authenticator, StrategyVerifyCallback } from "remix-auth";
import { Auth0Strategy } from "remix-auth-auth0";
import type { Auth0StrategyOptions } from "remix-auth-auth0";
import { storage } from "~/utils/session.server";
import { db } from "./db.server";
import { User } from "@prisma/client";
import { OAuth2StrategyVerifyParams } from "remix-auth-oauth2";

// Read variables from process.env
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_CALLBACK_URL = process.env.AUTH0_CALLBACK_URL

// Ensure they are defined and throw error if not
if (!AUTH0_DOMAIN) throw new Error("Missing Auth0 domain.");
if (!AUTH0_CLIENT_ID) throw new Error("Missing Auth0 client id.");
if (!AUTH0_CLIENT_SECRET) throw new Error("Missing Auth0 client secret.");
if (!AUTH0_CALLBACK_URL) throw new Error("Missing Auth0 redirect uri.");

// This object is just so we can do `auth0.clientId` or another attribute instead of using the all uppercase variables
let auth0: Auth0StrategyOptions = {
  clientID: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  domain: AUTH0_DOMAIN,
  callbackURL: AUTH0_CALLBACK_URL,
};

type UserId = {
  userId: string
}
// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<UserId>(storage);

const auth0Strategy = new Auth0Strategy(
  auth0,
  /**
   * The Callback will determine whether or not the user has previously authenticated
   *   with Auth0.
   * We will know this based on the primary email address provided on the profile.
   * This will become the unique username.
   *
   * If they have not, we will create the profile and store all of the extra params
   *   associated with the profile.
  * */
  async ({ accessToken, refreshToken, extraParams, profile, context }) => {
    console.log(JSON.stringify({ accessToken, refreshToken, extraParams, profile }, null, 4))

    const email: string = profile?.emails?.[0].value ?? ''
    console.log({ emails: profile.emails })
    if (!email) {
      throw new Error('No email found, cannot proceed with Authentication')
    }
    const user = await db.user.findUnique({ where: { username: email } })
    if (!user) {
      const user = await db.user.create({ data:
        {
           username: email,
           oAuthId: profile.id,
           oAuthProfile: profile._json,
          } })
      return { userId: user.id }
    }
    return { userId: user.id }
  }
);

authenticator.use(auth0Strategy);