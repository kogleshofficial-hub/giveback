import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"GiveBack", short_name:"GiveBack", description:"Give useful things a second home.", start_url:"/", display:"standalone", background_color:"#f6f1e8", theme_color:"#496b4b", icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]}; }
