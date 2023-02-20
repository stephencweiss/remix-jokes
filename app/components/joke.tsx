type JokeProps = {
  name: string;
  content: string;
  owner: string;
};

export function Joke(props: JokeProps) {
  return (
    <>
      <p>{props.name}</p>
      <p>{props.content}</p>
      <p>Submitted by: {props.owner}</p>
    </>
  );
}
