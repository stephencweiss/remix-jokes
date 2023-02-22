// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { Auth0Strategy } from "remix-auth-auth0";
import type { Auth0StrategyOptions } from "remix-auth-auth0";
import { login, register, storage } from "~/utils/session.server";
import { db } from "./db.server";
import { FormStrategy } from "remix-auth-form";
import { invariant } from "@remix-run/router";
import { badRequest } from "./request.server";

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
   * This will become the unique email.
   *
   * If they have not, we will create the profile and store all of the extra params
   *   associated with the profile.
  * */
  async ({ profile }) => {
    const email: string = profile?.emails?.[0].value ?? ''
    if (!email) {
      throw new Error('No email found, cannot proceed with Authentication')
    }

    const user = await db.user.upsert({
      where: { email },
      update: {},
      create:
      {
        email: email,
        emailVerified: false,
        oAuthId: profile.id,
        // TODO: Figure out the right way to do json blobs
        oAuthProfile: profile._json as any,
      }
    })
    return { userId: user.id }
  }
);


const validateUrl = (url: FormDataEntryValue | null): string => {
  const strUrl = String(url);
  let urls = ['/jokes', '/jokes/new', '/', 'https://remix.run'];
  if (urls.includes(strUrl)) {
    return strUrl;
  }
  return '/jokes';
};

const formStrategy = new FormStrategy<UserId>(async ({ context }) => {
  const { formData } = context as any;

  const loginType = formData.get('loginType');
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = validateUrl(formData.get('redirectTo'));

  // You can validate the inputs however you want
  invariant(typeof email === "string", "email must be a string");
  invariant(email.length > 0, "email must not be empty");

  invariant(typeof password === "string", "password must be a string");
  invariant(password.length > 0, "password must not be empty");
  const fields = { loginType, email, password };
  switch (loginType) {
    case 'login': {
      const user = await login(fields);
      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: 'email/Password combination is incorrect',
        });
      }
      return { userId: user.id }
    }
    case 'register': {
      const userExists = await db.user.findUnique({
        where: { email },
      });
      if (userExists) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: `email is already taken; please choose a different one`,
        });
      }
      const { id } = await register(fields);
      if (id == null) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: `Something went wrong while creating a new user; please try again`,
        });
      }
      return { userId: id }

    }
    default:
      return badRequest({
        fields,
        fieldErrors: null,
        formError: `Invalid login type`,
      });




  }
})

authenticator.use(auth0Strategy, 'auth0');
authenticator.use(formStrategy, 'form');