import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
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
  return (
    <div>
      <p>{randomJoke.name}</p>
      <p>{randomJoke.content}</p>
      <Link to={randomJoke.id}>"{randomJoke.name}" Permalink</Link>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      {'There was an error loading the random joke. Sorry.'}
    </div>
  );
}
