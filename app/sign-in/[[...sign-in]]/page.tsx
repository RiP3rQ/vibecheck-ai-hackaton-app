import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
      <SignIn />
    </main>
  );
}
