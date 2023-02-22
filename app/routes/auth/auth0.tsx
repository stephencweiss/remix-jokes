import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { authenticator } from '~/utils/auth.server';
import { getUserSession } from '~/utils/session.server';

export let loader = async ({request}: LoaderArgs) => {
  return await getUserSession(request)
};

export let action = async ({ request }: ActionArgs) => {
  return await authenticator.authenticate('auth0', request);
};

