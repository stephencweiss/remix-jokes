import type { ActionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useActionData } from '@remix-run/react';

import { db } from '~/utils/db.server';
import { badRequest } from '~/utils/request.server';
import { requireUserId } from '~/utils/session.server';

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
  const userId = await requireUserId(request);
  const body = await request.formData();
  const name = String(body.get('name'));
  const content = String(body.get('content'));
  if (!name || !content) {
    // TODO: error handle?
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

  const joke = await db.joke.create({ data: {
    jokesterId: userId,
    ...fields} });
  return redirect(`/jokes/${joke.id}`);
}

export default function NewJokeRoute() {
  const actionData = useActionData<typeof action>();

  return (
    <body>
      <div>
        <p>Add your own hilarious joke</p>
        <form method="post">
          <div>
            <label>
              Name:{' '}
              <input
                type="text"
                defaultValue={actionData?.fields?.name}
                name="name"
                aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
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
        </form>
      </div>
    </body>
  );
}
