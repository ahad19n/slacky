import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default function Home() {
  const token = cookies().get("token")?.value;
  if (token) {
    try {
      verifyToken(token);
      redirect("/workspace");
    } catch {}
  }
  redirect("/login");
}
