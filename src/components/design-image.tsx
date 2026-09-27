/* eslint-disable @next/next/no-img-element -- Preserve exported SVG geometry. */
import { assetFiles, type DesignAssetName } from "@/lib/design-manifest";

export function DesignImage({ name, assets, alt = "" }: { name: DesignAssetName; assets: DesignAssetName[]; alt?: string }) {
  if (!assets.includes(name)) {
    return alt ? <span className="missing-asset" role="img" aria-label={`${alt} — รอไฟล์ภาพต้นฉบับ`}>รอไฟล์ภาพต้นฉบับ</span> : null;
  }
  return <img src={`/figma/${assetFiles[name]}`} alt={alt} />;
}
