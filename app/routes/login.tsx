import type { ActionArgs, LinksFunction, V2_MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';

import { db } from '~/utils/db.server';

import stylesUrl from '~/styles/login.css';
import { badRequest } from '~/utils/request.server';
import { createUserSession, login, register } from '~/utils/session.server';
import { authenticator } from '~/utils/auth.server';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesUrl },
];

const validatePassword = (password: string) => {
  const MIN_PASSWORD_LENGTH = 4;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
};

const validateEmail = (email: string) => {
  const MIN_email_LENGTH = 4;
  if (email.length < MIN_email_LENGTH) {
    return `Passwords must be at least ${MIN_email_LENGTH} characters long`;
  }
  // TODO: add Zod or something to validate that this is an email?
};

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const loginType = formData.get('loginType');
  const email = formData.get('email');
  const password = formData.get('password');

  if (
    typeof loginType !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form missing required fields',
    });
  }
  const fields = { loginType, email, password };
  const fieldErrors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fields,
      fieldErrors,
      formError: null,
    });
  }

  return authenticator.authenticate('form', request, {
    successRedirect: '/',
    failureRedirect: '/logout',
    throwOnError: true,
    context: {formData}
  })

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
            <label htmlFor="email-input">email</label>
            <input
              type="text"
              id="email-input"
              name="email"
              defaultValue={actionData?.fields?.email}
              aria-invalid={Boolean(actionData?.fieldErrors?.email)}
              aria-errormessage={
                actionData?.fieldErrors?.email ? 'email-error' : undefined
              }
            />
            {actionData?.fieldErrors?.email ? (
              <p
                className="form-validation-error"
                role="alert"
                id="email-error"
              >
                {actionData.fieldErrors.email}
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
      <Form action="/auth/auth0" method="post">
        <input
          type="hidden"
          name="redirectTo"
          value={searchParams.get('redirectTo') ?? undefined}
        />
        <button type="submit" className="button">
          Login with Auth0
        </button>
      </Form>
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
