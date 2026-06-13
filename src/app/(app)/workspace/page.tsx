import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import WorkspaceClient from "@/components/chat/WorkspaceClient";

export default function WorkspacePage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  let user;
  try {
    user = verifyToken(token);
  } catch {
    redirect("/login");
  }

  return <WorkspaceClient user={user} token={token} />;
}
