import type { ActionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';

import { logout, logoutAuth0 } from '~/utils/session.server';

export const action = async ({ request }: ActionArgs) => {
  // TODO: figure out how to determine which logout is requested? does it matter?
  await logoutAuth0(request);
  return logout(request);
};




export default function LogoutRoute() {
  // TODO: Add logic to determine if you're logged in and change the language if you're not logged in.
  return (
    <div className="user-info">
      <Form action="/logout" method="post">
        <button type="submit" className="button">
          Logout
        </button>
      </Form>
    </div>
  );
}

