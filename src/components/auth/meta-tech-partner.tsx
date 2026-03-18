import Image from 'next/image';

export function MetaTechPartner() {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs text-white/90 backdrop-blur-xl">
      <Image
        src="/meta-logo.png"
        alt="Meta logo"
        width={22}
        height={22}
        className="h-[22px] w-[22px] object-contain"
      />
      <span className="text-sm">Official Meta Tech Partner</span>
    </div>
  );
}
