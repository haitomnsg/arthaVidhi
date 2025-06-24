import { HandCoins } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-2xl font-bold text-primary">
      <HandCoins className="h-8 w-8" />
      <h1 className="font-headline">ArthaVidhi</h1>
    </div>
  );
}
