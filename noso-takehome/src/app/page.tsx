export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <main className="flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-2xl"></div>
          <h1 className="relative text-6xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
            Coming Soon
          </h1>
        </div>

        <p className="max-w-md text-lg text-zinc-400 sm:text-xl">
          Something exciting is in the works. Stay tuned.
        </p>

        <div className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
      </main>
    </div>
  );
}
