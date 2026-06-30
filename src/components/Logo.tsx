/* eslint-disable @next/next/no-img-element */

/** App brand mark — the exact logo artwork from /public/logo.png.
 *  `size` sets the rendered height; width scales to keep the source ratio. */
export function Logo({
  size = 32,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src="/logo.png"
      alt="Real Project Manager logo"
      height={size}
      style={{ height: size, width: "auto", ...style }}
      className={className}
    />
  );
}
