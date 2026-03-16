import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">BotFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
            Now supporting WhatsApp, SMS & Instagram DM
          </div>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
            Build AI-Powered Business Bots{" "}
            <span className="text-primary">Without Code</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Create intelligent conversational bots for WhatsApp, SMS, and
            Instagram DM. Drag-and-drop flow builder, AI-powered responses, and
            pre-built templates for every industry.
          </p>
          <div className="flex gap-4">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Start Building Free
            </Link>
            <Link
              href="#demo"
              className="inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium shadow-sm hover:bg-accent"
            >
              Watch Demo
            </Link>
          </div>
        </section>

        <section className="container mx-auto grid gap-8 px-4 py-16 md:grid-cols-3">
          {[
            {
              title: "Visual Flow Builder",
              desc: "Drag-and-drop conversation flows with our React Flow-powered builder. No coding required.",
            },
            {
              title: "AI-Powered Responses",
              desc: "Claude AI generates natural, contextual replies from your knowledge base automatically.",
            },
            {
              title: "Multi-Channel",
              desc: "One bot, multiple channels. Deploy to WhatsApp, SMS, and Instagram DM simultaneously.",
            },
            {
              title: "Pre-Built Templates",
              desc: "Restaurant ordering, appointment booking, e-commerce support, and lead qualification templates.",
            },
            {
              title: "Live Inbox",
              desc: "Monitor conversations in real-time. Jump in for human handoff when needed.",
            },
            {
              title: "Analytics & Broadcasts",
              desc: "Track conversion rates, send bulk campaigns, and grow your contact list.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BotFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
