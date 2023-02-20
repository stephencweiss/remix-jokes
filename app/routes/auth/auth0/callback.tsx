import type { LoaderArgs } from "@remix-run/node";

import { authenticator } from "~/utils/auth.server";

export let loader = ({ request }: LoaderArgs) => {
  console.log(`am i hitting here ever?`)
  return authenticator.authenticate("auth0", request, {
    successRedirect: "/jokes",
    failureRedirect: "/",
  });
};