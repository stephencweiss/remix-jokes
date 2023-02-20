import type { ActionArgs, LoaderArgs, V2_MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useCatch, useLoaderData, useParams } from '@remix-run/react';
import { Joke } from '~/components/joke';
import { db } from '~/utils/db.server';
import { getUser, getUserId } from '~/utils/session.server';

export const action = async ({ request, params }: ActionArgs) => {
  const data = await request.formData();
  const intent = data.get('intent');
  if (intent !== 'delete') {
    throw new Response('Unsupported intent', { status: 400 });
  }
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('You must be logged in to delete a joke!', {
      status: 403,
    });
  }

  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (joke.jokesterId !== userId) {
    throw new Response("Psh, nice try! That's not your joke!", { status: 403 });
  }
  await db.joke.delete({ where: { id: params.jokeId } });
  return redirect('/jokes');
};

export const loader = async ({ params, request }: LoaderArgs) => {
  const user = await getUser(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
    select: { name: true, content: true, jokesterId: true, jokester: true },
  });
  if (!joke) {
    throw new Response("What a Joke! We couldn't find it though 😿", {
      status: 404,
    });
  }
  return json({
    joke,
    isOwner: user?.id === joke.jokesterId,
    jokester: joke.jokester,
  });
};

export const meta: V2_MetaFunction<typeof loader> = ({ matches, data }) => {
  let [parentMeta] = matches.map((match) => match.meta ?? []);

  if (!data) {
    return [
      ...parentMeta,
      { title: 'No Joke' },
      {
        name: 'description',
        content: 'No joke found',
      },
    ];
  }

  const description = `Enjoy the "${data.joke.name}" joke and much more`
  return [
    ...parentMeta,
    { title: `"${data.joke.name}" joke` },
    {
      name: 'description',
      content: description,
    },
    { property: 'twitter:description', content: description },
  ];
};

export default function JokeRoute() {
  const { joke, isOwner } = useLoaderData<typeof loader>();
  return (
    <div>
      <Joke  name={joke?.name} content={joke?.content} owner={joke.jokester.username}/>
      <Form method="post">
        <button
          name="intent"
          value="delete"
          type="submit"
          aria-disabled={!isOwner}
          disabled={!isOwner}
        >
          Delete
        </button>
      </Form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 400:
      return <div className="error-container">We can't do that.</div>;
    case 403:
      return (
        <div className="error-container">
          Sorry, you're not allowed to do that. Are you sure that's your joke?
        </div>
      );
    case 404:
      return (
        <div className="error-container">
          Huh? What the heck is "{params.jokeId}"?
        </div>
      );
    default:
      throw new Error(`Unhandled error: ${caught.status}`);
  }
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
