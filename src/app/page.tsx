export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full">
          Binnenkort beschikbaar
        </div>

        <h1 className="text-5xl font-bold tracking-tight">
          Market<span className="text-blue-500">Pulse</span> AI
        </h1>

        <p className="text-lg text-gray-400 leading-relaxed">
          Realtime marktinzichten, aangedreven door AI. Volg aandelen,
          analyseer trends en neem betere beslissingen — allemaal op één plek.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-lg font-medium">
            Vroeg toegang aanvragen
          </button>
          <button className="border border-gray-700 hover:border-gray-500 transition-colors px-6 py-3 rounded-lg font-medium text-gray-300">
            Meer informatie
          </button>
        </div>
      </div>
    </main>
  )
}
