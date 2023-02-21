import type { ActionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { authenticator } from '~/utils/auth.server';

export let loader = () => {
  return redirect('/jokes')};

export let action = async ({ request }: ActionArgs) => {
  const authn =  await authenticator.authenticate('auth0', request);
  console.log({authn})
  return authn;
};

