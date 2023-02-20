import {
  ActionArgs,
  LinksFunction,
  redirect,
  V2_MetaFunction,
} from '@remix-run/node';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';

import { db } from '~/utils/db.server';

import stylesUrl from '~/styles/login.css';
import { badRequest } from '~/utils/request.server';
import { createUserSession, login, register } from '~/utils/session.server';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesUrl },
];

const validatePassword = (password: string) => {
  const MIN_PASSWORD_LENGTH = 4;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
};

const validateUsername = (username: string) => {
  const MIN_USERNAME_LENGTH = 4;
  if (username.length < MIN_USERNAME_LENGTH) {
    return `Passwords must be at least ${MIN_USERNAME_LENGTH} characters long`;
  }
  // TODO: add Zod or something to validate that this is an email?
};

const validateUrl = (url: FormDataEntryValue | null): string => {
  const strUrl = String(url);
  let urls = ['/jokes', '/jokes/new', '/', 'https://remix.run'];
  if (urls.includes(strUrl)) {
    return strUrl;
  }
  return '/jokes';
};

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const loginType = body.get('loginType');
  const username = body.get('username');
  const password = body.get('password');
  const redirectTo = validateUrl(body.get('redirectTo'));
  if (
    typeof loginType !== 'string' ||
    typeof username !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form missing required fields',
    });
  }
  const fields = { loginType, username, password };
  const fieldErrors = {
    username: validateUsername(username),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fields,
      fieldErrors,
      formError: null,
    });
  }
  switch (loginType) {
    case 'login': {
      const user = await login(fields);
      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: 'Username/Password combination is incorrect',
        });
      }
      return await createUserSession(user.id, redirectTo);
    }
    case 'register': {
      const userExists = await db.user.findUnique({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: `Username is already taken; please choose a different one`,
        });
      }
      const { id } = await register({ username, password });
      if (id == null) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: `Something went wrong while creating a new user; please try again`,
        });
      }

      return await createUserSession(id, redirectTo);
    }
    default:
      return badRequest({
        fields,
        fieldErrors: null,
        formError: `Invalid login type`,
      });
  }
}

export const meta: V2_MetaFunction = () => {
  return [
    {
      name: 'description',
      content: 'Login to submit your own jokes to Remix Jokes!',
    },
    { title: 'Remix Jokes | Login' },
  ];
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redir = searchParams.get('redirectTo');
  console.log({ searchParams, redir });
  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <Form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get('redirectTo') ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData.fields.loginType === 'login'
                }
              />{' '}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={actionData?.fields?.loginType === 'register'}
              />{' '}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(actionData?.fieldErrors?.username)}
              aria-errormessage={
                actionData?.fieldErrors?.username ? 'username-error' : undefined
              }
            />
            {actionData?.fieldErrors?.username ? (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
              defaultValue={actionData?.fields?.password}
              aria-invalid={Boolean(actionData?.fieldErrors?.password)}
              aria-errormessage={
                actionData?.fieldErrors?.password ? 'password-error' : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p className="form-validation-error" role="alert">
                {actionData.formError}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </Form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
