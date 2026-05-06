import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen bg-background flex-col items-center justify-center p-4">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Lex<span className="text-accent">AI</span></h1>
        <p className="text-muted-foreground text-lg">Justice, Simplified by AI.</p>
      </div>
      <SignUp />
    </div>
  );
}
