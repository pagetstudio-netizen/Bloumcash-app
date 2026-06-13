import pageUnavailableImg from "@assets/istockphoto-1483030008-612x612_1780820131115.jpg";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm">
        <img
          src={pageUnavailableImg}
          alt=""
          className="w-64 max-w-[80vw] rounded-2xl"
        />
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
