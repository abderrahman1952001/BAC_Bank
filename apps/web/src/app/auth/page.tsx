import { AuthGateway } from "@/components/auth-gateway";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function AuthPage() {
  await redirectAuthenticatedUser();

  return <AuthGateway />;
}
