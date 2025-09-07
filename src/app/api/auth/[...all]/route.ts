import { getAuth } from "~/server/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Create async handlers for Better Auth
export async function GET(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
}

export async function POST(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
}