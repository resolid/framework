import { data, type UNSAFE_DataWithResponseInit } from "react-router";

export function httpProblem<E>(errors: E): UNSAFE_DataWithResponseInit<{
  errors: E;
}> {
  return data({ errors: errors }, 422);
}

export function httpNotFound(message = "页面未找到"): never {
  throw new Response(message, { status: 404 });
}

export function httpRedirect(url: string, cookie: string | null = null, status = 302): never {
  const headers = new Headers();

  headers.set("Location", url);

  if (cookie) {
    headers.set("Set-Cookie", cookie);
  }

  throw new Response(null, {
    status,
    headers,
  });
}
