import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, QrCode, ShoppingBag } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

export default function QRMenuPage({ profile }: Props) {
  const { actor } = useActor();
  const imgRef = useRef<HTMLImageElement>(null);
  const driverName = encodeURIComponent(profile?.displayName ?? "driver");
  const menuUrl = `${window.location.origin}/menu/${driverName}`;

  // Use Google Charts QR API — no npm package required
  const qrSrc = `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(menuUrl)}&choe=UTF-8`;

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => actor!.getProducts(),
    enabled: !!actor,
  });

  // Only show in-stock products on the menu
  const inStockProducts = (products ?? []).filter(
    (p) => Number(p.currentStock) > 0,
  );

  const downloadQR = () => {
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "drivermax-menu-qr.png";
    a.target = "_blank";
    a.click();
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(menuUrl)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">QR Code Menu</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Passengers scan this code to browse your in-car menu
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" /> Your Menu QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img
                ref={imgRef}
                src={qrSrc}
                alt="QR Code for your menu"
                width={256}
                height={256}
                className="rounded"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all">
              {menuUrl}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                onClick={downloadQR}
                className="gap-2 flex-1"
                data-ocid="qr_menu.download.button"
              >
                <Download className="w-4 h-4" /> Download QR
              </Button>
              <Button
                variant="outline"
                onClick={copyLink}
                className="gap-2 flex-1"
                data-ocid="qr_menu.copy_link.button"
              >
                <Copy className="w-4 h-4" /> Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : inStockProducts.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="qr_menu.items.empty_state"
              >
                <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {(products ?? []).length === 0
                    ? "No products yet. Add products in the Sales tab to show them on your menu."
                    : "All products are currently out of stock."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {inStockProducts.map((p, idx) => (
                  <div
                    key={p.productId}
                    className="py-3 flex items-center justify-between"
                    data-ocid={`qr_menu.items.item.${idx + 1}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {Number(p.currentStock)}
                      </p>
                    </div>
                    <span className="font-bold text-primary">
                      {profile?.currencyCode ?? "ZAR"}{" "}
                      {p.sellingPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card mt-4">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How to use:</strong> Print or
            display this QR code on your dashboard or seat-back. Passengers scan
            it with their phone to see your menu and make selections without
            distracting you while driving.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
