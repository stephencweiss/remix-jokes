import { Form } from '@remix-run/react';

type Joke = {
  name: string;
  content: string;
  jokester: { username: string };
};

type JokeProps = {
  joke: Joke;
  isOwner: boolean;
};

export function JokeUi(props: JokeProps) {
  const {
    joke: { name, content, jokester },
    isOwner,
  } = props;
  return (
    <>
      <p>{name}</p>
      <p>{content}</p>
      <p>Submitted by: {jokester.username}</p>
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
    </>
  );
}
