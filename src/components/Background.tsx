"use client";

/** Three large, blurred radial "blobs" fixed behind everything so the glass
 *  surfaces have something warm to refract. Purely decorative. */
export function Background() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        style={{
          position: "fixed",
          top: -160,
          left: -120,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--blob1), transparent 68%)",
          filter: "blur(40px)",
          animation: "blobFloat 18s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "30%",
          right: -180,
          width: 620,
          height: 620,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--blob2), transparent 68%)",
          filter: "blur(50px)",
          animation: "blobFloat 22s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -220,
          left: "30%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--blob3), transparent 68%)",
          filter: "blur(50px)",
          animation: "blobFloat 26s ease-in-out infinite",
        }}
      />
    </div>
  );
}
