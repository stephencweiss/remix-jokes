import type { LinksFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Form,
  Link,
  Outlet,
  useCatch,
  useLoaderData,
  useParams,
} from '@remix-run/react';

import { db } from '~/utils/db.server';
import { getUser } from '~/utils/session.server';
import stylesUrl from '~/styles/jokes.css';

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesUrl }];
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request)
  const jokeListItems = await db.joke.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });
  return json({
    jokeListItems,
    user,
  });
};

export default function JokesRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="jokes-layout">
      <header className="jokes-header">
        <div className="container">
          <h1 className="home-link">
            <Link to="/" title="Remix Jokes" aria-label="Remix Jokes">
              <span className="logo">🤪</span>
              <span className="logo-medium">J🤪KES</span>
            </Link>
          </h1>
          {data.user ? (
            <div className="user-info">
              <span>{`Hi ${data.user.email}`}</span>
              <Form action="/logout" method="post">
                <button type="submit" className="button">
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>
      <main className="jokes-main">
        <div className="container">
          <div className="jokes-list">
            <Link to=".">Get a random joke</Link>
            <p>Here are a few more jokes to check out:</p>
            <ul>
              {data.jokeListItems.map((joke) => (
                <li key={joke.id}>
                  <Link prefetch="intent" to={joke.id}>
                    {joke.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="buttons-list">
              <Link to="new" className="button">
                Add your own
              </Link>
              <Link className="button" to="../jokes.rss" reloadDocument>
                RSS Feed
              </Link>
            </div>
          </div>
          <div className="jokes-outlet">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  if (caught.status === 404) {
    return (
      <div className="error-container">
        Huh? What the heck is "{params.jokeId}"?
      </div>
    );
  }
  throw new Error(`Unhandled error: ${caught.status}`);
}
