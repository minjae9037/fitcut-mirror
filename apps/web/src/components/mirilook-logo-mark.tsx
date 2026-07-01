import Image from "next/image";

type MirilookLogoMarkProps = {
  className?: string;
  decorative?: boolean;
  title?: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoMarkSrc = `${basePath}/brand/mirilook-web-mark.png`;

export function MirilookLogoMark({
  className,
  decorative = false,
  title = "Miri Look",
}: MirilookLogoMarkProps) {
  return (
    <Image
      alt={decorative ? "" : title}
      aria-hidden={decorative ? "true" : undefined}
      className={className}
      height={512}
      priority
      role={decorative ? undefined : "img"}
      src={logoMarkSrc}
      width={512}
    />
  );
}
