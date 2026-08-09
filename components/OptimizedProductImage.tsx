import type { ImgHTMLAttributes } from "react";

type OptimizedProductImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string;
};

const TREVO_IMAGE_PREFIX =
  "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/";

function webpVersion(src: string) {
  if (!src.startsWith(TREVO_IMAGE_PREFIX)) return src;
  return src.replace(/\.(?:png|jpe?g)(?=$|[?#])/i, ".webp");
}

export function OptimizedProductImage({
  src,
  alt = "",
  onError,
  loading = "lazy",
  decoding = "async",
  ...props
}: OptimizedProductImageProps) {
  const webpSrc = webpVersion(src);

  if (webpSrc === src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        {...props}
      />
    );
  }

  return (
    <picture style={{ display: "contents" }}>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onError={(event) => {
          const source = event.currentTarget.parentElement?.querySelector("source");
          if (source) {
            source.remove();
            event.currentTarget.src = src;
            return;
          }
          onError?.(event);
        }}
        {...props}
      />
    </picture>
  );
}
