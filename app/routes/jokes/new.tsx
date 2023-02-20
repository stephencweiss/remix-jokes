import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import {
  Form,
  Link,
  useActionData,
  useCatch,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { JokeUi } from '~/components/joke';

import { db } from '~/utils/db.server';
import { badRequest } from '~/utils/request.server';
import { getUser } from '~/utils/session.server';

const validateJokeContent = (content: string) => {
  const MIN_JOKE_LENGTH = 10;
  if (content.length < MIN_JOKE_LENGTH) {
    return `Hmm, that joke seems pretty short. Please provide one at least ${MIN_JOKE_LENGTH} characters long`;
  }
};
const validateJokeName = (name: string) => {
  const MIN_NAME_LENGTH = 3;
  if (name.length < MIN_NAME_LENGTH) {
    return `Hmm, that name seems pretty short. Please provide one at least ${MIN_NAME_LENGTH} characters long`;
  }
};

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const userId = String(body.get('userId'));
  console.log({userId})
  const name = String(body.get('name'));
  const content = String(body.get('content'));
  if (!name || !content || !userId) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form not submitted correctly',
    });
  }
  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };

  const fields = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields: fields,
      formError: null,
    });
  }

  const joke = await db.joke.create({
    data: {
      jokesterId: userId,
      ...fields,
    },
  });
  return redirect(`/jokes/${joke.id}`);
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return json({ user });
};

export default function NewJokeRoute() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  if (navigation.formData) {
    // TODO: Add zod validation
    const { name, content } = Object.fromEntries(navigation.formData) as {
      name: string;
      content: string;
    };
    const joke= {name, content, jokester: user}
    return <JokeUi isOwner={false} joke={joke} />;
  }
  return (
    <>
      <div>
        <p>Add your own hilarious joke</p>
        <Form method="post">
          <input hidden name="userId" defaultValue={user.id}/>
          <div>
            <label>
              Name:{' '}
              <input
                type="text"
                defaultValue={actionData?.fields?.name}
                name="name"
                aria-invalid={
                  Boolean(actionData?.fieldErrors?.name) || undefined
                }
                aria-errormessage={
                  actionData?.fieldErrors?.name ? 'name-error' : undefined
                }
              />
            </label>
            {actionData?.fieldErrors?.name ? (
              <p className="form-validation-error" role="alert" id="name-error">
                {actionData.fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div>
            <label>
              Content:{' '}
              <textarea
                defaultValue={actionData?.fields?.content}
                name="content"
                aria-invalid={
                  Boolean(actionData?.fieldErrors?.content) || undefined
                }
                aria-errormessage={
                  actionData?.fieldErrors?.content ? 'content-error' : undefined
                }
              />
            </label>
            {actionData?.fieldErrors?.content ? (
              <p
                className="form-validation-error"
                role="alert"
                id="content-error"
              >
                {actionData.fieldErrors.content}
              </p>
            ) : null}
          </div>
          <div>
            {actionData?.formError ? (
              <p className="form-validation-error" role="alert">
                {actionData.formError}
              </p>
            ) : null}
            <button type="submit" className="button">
              Add
            </button>
          </div>
        </Form>
      </div>
    </>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }
}
export function ErrorBoundary() {
  return (
    <div className="error-container">
      {'There was an error loading the new joke form. Sorry.'}
    </div>
  );
}
