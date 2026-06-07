export default function Landing() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm">
        <div className="w-28 h-28 rounded-2xl bg-white shadow-md flex items-center justify-center">
          <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 8L68 24V56L40 72L12 56V24L40 8Z" fill="#e5e7eb" />
            <path d="M40 20L56 29V47L40 56L24 47V29L40 20Z" fill="#d1d5db" />
            <circle cx="40" cy="38" r="6" fill="#9ca3af" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Cette page n'est pas disponible</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Il est possible que le lien soit rompu ou que la page ait été supprimée.
          </p>
        </div>
      </div>
    </div>
  );
}
