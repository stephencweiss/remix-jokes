import type { ActionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { authenticator } from '~/utils/auth.server';

export let loader = () => redirect('/login');

export let action = ({ request }: ActionArgs) => {
  console.log(`my url -> `, request.url)
  return authenticator.authenticate('auth0', request);
};

