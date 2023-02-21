import type { LoaderArgs } from '@remix-run/node';

import { authenticator } from '~/utils/auth.server';

export let loader = async ({ request }: LoaderArgs) => {
  const auth = await authenticator.authenticate('auth0', request, {
    successRedirect: '/jokes',
    failureRedirect: '/',
  });
  console.log({ auth });
  return auth;
};
