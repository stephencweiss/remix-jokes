import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useCatch, useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';

export const loader = async ({ params }: LoaderArgs) => {
  const count = await db.joke.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomJoke] = await db.joke.findMany({
    take: 1,
    skip: randomRowNumber,
    select: { name: true, id: true, content: true },
  });
  return json({ randomJoke });
};

export default function JokesIndexRoute() {
  const { randomJoke } = useLoaderData<typeof loader>();
  if (!randomJoke) {
    throw new Response('Welp, this is embarrassing!', { status: 404 });
  }
  return (
    <div>
      <p>{randomJoke.name}</p>
      <p>{randomJoke.content}</p>
      <Link to={randomJoke.id}>"{randomJoke.name}" Permalink</Link>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">
        There are no jokes to display.
      </div>
    );
  }
  throw new Error(
    `Unexpected caught response with status: ${caught.status}`
  );
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      {'There was an error loading the random joke. Sorry.'}
    </div>
  );
}
