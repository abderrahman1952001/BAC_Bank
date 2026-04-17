import { PostAuthRedirect } from "@/components/post-auth-redirect";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function PostAuthPage() {
  await redirectAuthenticatedUser();

  return <PostAuthRedirect />;
}
