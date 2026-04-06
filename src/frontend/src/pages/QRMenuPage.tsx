import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bitcoin,
  Building2,
  Copy,
  Download,
  Loader2,
  QrCode,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type {
  DriverPaymentConfig,
  backendInterface as FullBackend,
  UserProfile,
} from "../backend.d";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

const PAYMENT_FIELDS: Array<{
  key: keyof DriverPaymentConfig;
  label: string;
  placeholder: string;
  icon: string;
}> = [
  {
    key: "btcAddress",
    label: "Bitcoin (BTC) Address",
    placeholder: "bc1q...",
    icon: "\u20BF",
  },
  {
    key: "ethAddress",
    label: "Ethereum (ETH) Address",
    placeholder: "0x...",
    icon: "\u039E",
  },
  {
    key: "solAddress",
    label: "Solana (SOL) Address",
    placeholder: "...",
    icon: "\u25CE",
  },
  {
    key: "bnbAddress",
    label: "BNB Address",
    placeholder: "0x...",
    icon: "\u2B21",
  },
  {
    key: "usdcAddress",
    label: "USDC Address",
    placeholder: "0x...",
    icon: "$",
  },
  {
    key: "baseAddress",
    label: "Base (BASE) Address",
    placeholder: "0x...",
    icon: "BASE",
  },
  {
    key: "usdtAddress",
    label: "USDT Address",
    placeholder: "0x...",
    icon: "\u20AE",
  },
  {
    key: "bankName",
    label: "Bank Name",
    placeholder: "FNB, Standard Bank...",
    icon: "BNK",
  },
  {
    key: "bankAccount",
    label: "Bank Account Number",
    placeholder: "1234567890",
    icon: "#",
  },
  {
    key: "bankReference",
    label: "Payment Reference",
    placeholder: "Your name or ID...",
    icon: "REF",
  },
];

const EMPTY_CONFIG: DriverPaymentConfig = {
  btcAddress: "",
  ethAddress: "",
  solAddress: "",
  bnbAddress: "",
  usdcAddress: "",
  baseAddress: "",
  usdtAddress: "",
  bankName: "",
  bankAccount: "",
  bankReference: "",
};

function formatOrderDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function QRMenuPage({ profile }: Props) {
  const { actor: _actor } = useActor();
  const actor = _actor as unknown as FullBackend | null;
  const queryClient = useQueryClient();
  const imgRef = useRef<HTMLImageElement>(null);
  const driverName = encodeURIComponent(profile?.displayName ?? "driver");
  const menuUrl = `${window.location.origin}/menu/${driverName}`;

  const qrSrc = `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(menuUrl)}&choe=UTF-8`;

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => actor!.getProducts(),
    enabled: !!actor,
  });

  const { data: existingConfig, isLoading: configLoading } = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => actor!.getMyPaymentConfig(),
    enabled: !!actor,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["passenger-orders"],
    queryFn: () => actor!.getPassengerOrders(),
    enabled: !!actor,
  });

  const [payConfig, setPayConfig] = useState<DriverPaymentConfig>(EMPTY_CONFIG);
  const [configInitialized, setConfigInitialized] = useState(false);

  // Pre-fill form once data loads
  if (existingConfig !== undefined && !configInitialized) {
    setPayConfig(existingConfig ?? EMPTY_CONFIG);
    setConfigInitialized(true);
  }

  const saveConfigMutation = useMutation({
    mutationFn: async (config: DriverPaymentConfig) => {
      if (!actor) throw new Error("No actor");
      await actor.saveDriverPaymentConfig(config);
    },
    onSuccess: () => {
      toast.success("Payment settings saved!");
      queryClient.invalidateQueries({ queryKey: ["payment-config"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error("No actor");
      await actor.deletePassengerOrder(orderId);
    },
    onSuccess: () => {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ["passenger-orders"] });
    },
    onError: () => toast.error("Failed to delete order"),
  });

  const inStockProducts = (products ?? []).filter(
    (p) => Number(p.currentStock) > 0,
  );

  const downloadQR = () => {
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "moneydrive-menu-qr.png";
    a.target = "_blank";
    a.click();
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(menuUrl)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  function handleConfigChange(key: keyof DriverPaymentConfig, value: string) {
    setPayConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">QR Code Menu</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Passengers scan this code to browse your in-car menu
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code */}
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

        {/* Menu Items */}
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

      {/* Payment Settings */}
      <Card className="shadow-card mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> Payment Settings
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add your wallet addresses and bank details so passengers can pay you
            directly.
          </p>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Crypto section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Bitcoin className="w-3.5 h-3.5 text-primary" /> Crypto
                  Wallets
                </p>
                <div className="space-y-3">
                  {PAYMENT_FIELDS.filter((f) =>
                    [
                      "btcAddress",
                      "ethAddress",
                      "solAddress",
                      "bnbAddress",
                      "usdcAddress",
                      "baseAddress",
                      "usdtAddress",
                    ].includes(f.key),
                  ).map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={`pay-${field.key}`} className="text-xs">
                        <span className="mr-1">{field.icon}</span>
                        {field.label}
                      </Label>
                      <Input
                        id={`pay-${field.key}`}
                        value={payConfig[field.key]}
                        onChange={(e) =>
                          handleConfigChange(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className="mt-1 font-mono text-xs"
                        data-ocid={`qr_menu.payment.${field.key}.input`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Bank
                  Details
                </p>
                <div className="space-y-3">
                  {PAYMENT_FIELDS.filter((f) =>
                    ["bankName", "bankAccount", "bankReference"].includes(
                      f.key,
                    ),
                  ).map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={`pay-${field.key}`} className="text-xs">
                        <span className="mr-1">{field.icon}</span>
                        {field.label}
                      </Label>
                      <Input
                        id={`pay-${field.key}`}
                        value={payConfig[field.key]}
                        onChange={(e) =>
                          handleConfigChange(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className="mt-1"
                        data-ocid={`qr_menu.payment.${field.key}.input`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => saveConfigMutation.mutate(payConfig)}
                disabled={saveConfigMutation.isPending}
                className="w-full mt-2"
                data-ocid="qr_menu.payment_settings.save_button"
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Payment Settings"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passenger Orders */}
      <Card className="shadow-card mt-6 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Passenger Orders
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orders submitted by passengers after scanning your QR code.
          </p>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div
              className="text-center py-8"
              data-ocid="qr_menu.orders.empty_state"
            >
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No passenger orders yet. Share your QR code to start receiving
                orders.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, idx) => (
                <div
                  key={order.orderId}
                  className="rounded-xl border border-border p-4"
                  data-ocid={`qr_menu.orders.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatOrderDate(order.timestamp)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {order.paymentMethod.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-bold text-primary text-sm mt-1">
                        R{order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:bg-destructive/10 h-8 w-8"
                          data-ocid={`qr_menu.orders.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-ocid="qr_menu.orders.delete.dialog">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this passenger order.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-ocid="qr_menu.orders.delete.cancel_button">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              deleteOrderMutation.mutate(order.orderId)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-ocid="qr_menu.orders.delete.confirm_button"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div
                        key={`${item.productName}-${item.unitPrice}`}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {item.productName} x {Number(item.quantity)}
                        </span>
                        <span className="font-medium text-foreground">
                          R{(item.unitPrice * Number(item.quantity)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.passengerNote && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                      Note: {order.passengerNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
