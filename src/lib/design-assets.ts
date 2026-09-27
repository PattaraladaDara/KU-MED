import "server-only";
import { statSync } from "node:fs";
import { join } from "node:path";
import { assetFiles, type DesignAssetName } from "./design-manifest";

// Missing Figma exports remain explicit; never substitute unrelated artwork.
export function availableAssets(): DesignAssetName[] {
  return (Object.keys(assetFiles) as DesignAssetName[]).filter((name) => {
    try { return statSync(join(process.cwd(), "public", "figma", assetFiles[name])).size > 0; }
    catch { return false; }
  });
}
