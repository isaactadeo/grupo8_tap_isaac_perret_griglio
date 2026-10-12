import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const protegerClerk = clerkMiddleware();

export default function intermediarioClerk(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const clerkConfigurado =
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkConfigurado) {
    if (request.method === "GET" || request.method === "HEAD") {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "La autenticacion no esta configurada en el servidor" },
      { status: 503 },
    );
  }

  return protegerClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
