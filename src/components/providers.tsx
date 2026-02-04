
'use client';

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Toaster } from "./ui/toaster";
import { Header } from "./header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
      <Toaster />
    </FirebaseClientProvider>
  );
}
