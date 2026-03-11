import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
      <SignUp />
    </main>
  );
}
