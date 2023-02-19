import type { ActionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { db } from '~/utils/db.server';

export async function action({ request }: ActionArgs) {
  const body = await request.formData();
  const name = String(body.get('name'));
  const content = String(body.get('content'));
  if (!name || !content) {
    // TODO: error handle?
    throw new Error('Form not submitted correctly!');
  }
  const data = { name, content };
  const joke = await db.joke.create({ data });
  return redirect(`/jokes/${joke.id}`);
}

export default function NewJokeRoute() {
  return (
    <body>
      <div>
        <p>Add your own hilarious joke</p>
        <form method="post">
          <div>
            <label>
              Name: <input type="text" name="name" />
            </label>
          </div>
          <div>
            <label>
              Content: <textarea name="content" />
            </label>
          </div>
          <div>
            <button type="submit" className="button">
              Add
            </button>
          </div>
        </form>
      </div>
    </body>
  );
}
