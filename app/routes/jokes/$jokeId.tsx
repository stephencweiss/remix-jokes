import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';

export const loader = async ({ params }: LoaderArgs) => {
  return json({
    joke: await db.joke.findUnique({
      where: { id: params.jokeId },
      select: { name: true, content: true },
    }),
  });
};

export default function JokeRoute() {
  const { joke } = useLoaderData<typeof loader>();

  return (
    <div>
      <p>{joke?.name}</p>
      <p>{joke?.content}</p>
    </div>
  );
}
