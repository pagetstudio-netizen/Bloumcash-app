export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        <img
          src="/page-unavailable.jpg"
          alt="Page non disponible"
          style={{
            width: 220,
            maxWidth: "80vw",
            borderRadius: 20,
            objectFit: "cover",
          }}
        />
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: 8,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Cette page n'est pas disponible
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "#6b7280",
              lineHeight: 1.6,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Il est possible que le lien soit rompu ou que la page ait été supprimée.
          </p>
        </div>
      </div>
    </div>
  );
}
