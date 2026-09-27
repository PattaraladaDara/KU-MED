export const assetFiles = {
  banner: "a8cf2.png", poster: "c3be7.png", avatar: "9d52b.svg",
  menuMask: "cfe7c.svg", menu: "6f91b.svg", headerDivider: "6767e.svg",
  sidebarDivider: "096d2.svg", accountActions: "9d2ae.svg", dashboard: "2a22a.svg",
  search: "8a847.svg", registration: "321b5.svg", reports: "4122c.svg", evaluation: "1b910.svg",
} as const;
export type DesignAssetName = keyof typeof assetFiles;
