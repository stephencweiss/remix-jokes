import type { LoaderArgs, V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useCatch, useLoaderData } from '@remix-run/react';
import { JokeUi } from '~/components/joke';
import { db } from '~/utils/db.server';
import { getUser } from '~/utils/session.server';

export const loader = async ({ request }: LoaderArgs) => {
  const count = await db.joke.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomJoke] = await db.joke.findMany({
    take: 1,
    skip: randomRowNumber,
    select: {
      name: true,
      id: true,
      content: true,
      jokester: true,
      jokesterId: true,
    },
  });
  const user = await getUser(request);
  const isOwner = user?.id === randomJoke.jokesterId;
  return json({ randomJoke, isOwner });
};

export const meta: V2_MetaFunction = ({ matches }) => {
  let [parentMeta] = matches.map((match) => match.meta ?? []);
  const description =
    'Remix jokes app. Learn Remix and laugh at the same time!';
  return [
    ...parentMeta,
    { title: "Remix: So great, it's funny!" },
    {
      name: 'description',
      content: description,
    },
    { property: 'twitter:description', content: description },
  ];
};

export default function JokesIndexRoute() {
  const { randomJoke, isOwner } = useLoaderData<typeof loader>();
  if (!randomJoke) {
    throw new Response('Welp, this is embarrassing!', { status: 404 });
  }

  return (
    <div>
      <JokeUi
        isOwner={isOwner}
        joke={randomJoke}
      />
      <Link to={randomJoke.id}>"{randomJoke.name}" Permalink</Link>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">There are no jokes to display.</div>
    );
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      {'There was an error loading the random joke. Sorry.'}
    </div>
  );
}
