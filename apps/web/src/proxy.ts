import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function testAuthProxy() {
  return NextResponse.next();
}

export default process.env.PLAYWRIGHT_TEST_AUTH === "true"
  ? testAuthProxy
  : clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
