import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertCircle,
  Bitcoin,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Minus,
  Plus,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend.d";
import type {
  DriverPaymentConfig,
  OrderItem,
  PassengerOrder,
  Product,
} from "../backend.d";
import { createActorWithConfig } from "../config";

type PaymentMethod =
  | "fiat"
  | "btc"
  | "eth"
  | "sol"
  | "bnb"
  | "usdc"
  | "base"
  | "usdt";

type CartItem = { product: Product; quantity: number };

type PageStep = "menu" | "payment-select" | "payment-detail" | "confirmed";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: string;
  emoji: string;
  color: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "fiat",
    label: "Bank Transfer",
    icon: "🏦",
    emoji: "🏦",
    color: "#4CAF50",
  },
  {
    id: "btc",
    label: "Bitcoin (BTC)",
    icon: "₿",
    emoji: "₿",
    color: "#F7931A",
  },
  {
    id: "eth",
    label: "Ethereum (ETH)",
    icon: "Ξ",
    emoji: "Ξ",
    color: "#627EEA",
  },
  { id: "sol", label: "Solana (SOL)", icon: "◎", emoji: "◎", color: "#9945FF" },
  { id: "bnb", label: "BNB", icon: "⬡", emoji: "⬡", color: "#F3BA2F" },
  { id: "usdc", label: "USDC", icon: "$", emoji: "$", color: "#2775CA" },
  {
    id: "base",
    label: "Base (BASE)",
    icon: "🔵",
    emoji: "🔵",
    color: "#0052FF",
  },
  { id: "usdt", label: "USDT", icon: "₮", emoji: "₮", color: "#26A17B" },
];

function getAddressForMethod(
  method: PaymentMethod,
  config: DriverPaymentConfig,
): string {
  switch (method) {
    case "btc":
      return config.btcAddress;
    case "eth":
      return config.ethAddress;
    case "sol":
      return config.solAddress;
    case "bnb":
      return config.bnbAddress;
    case "usdc":
      return config.usdcAddress;
    case "base":
      return config.baseAddress;
    case "usdt":
      return config.usdtAddress;
    default:
      return "";
  }
}

function generateOrderId(): string {
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  driverName: string;
}

export default function PassengerMenuPage({ driverName }: Props) {
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentConfig, setPaymentConfig] =
    useState<DriverPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<PageStep>("menu");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [passengerNote, setPassengerNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Load public actor + data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const _a = await createActorWithConfig();
        const a = _a as unknown as backendInterface;
        if (cancelled) return;
        setActor(a);
        const [prods, config] = await Promise.all([
          a.getPublicDriverMenu(driverName),
          a.getPublicDriverPaymentConfig(driverName),
        ]);
        if (cancelled) return;
        setProducts(prods.filter((p) => Number(p.currentStock) > 0));
        setPaymentConfig(config);
      } catch {
        if (!cancelled)
          setError("Could not load this driver's menu. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [driverName]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function setQty(product: Product, qty: number) {
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter((c) => c.product.productId !== product.productId),
      );
    } else {
      setCart((prev) => {
        const existing = prev.find(
          (c) => c.product.productId === product.productId,
        );
        if (existing) {
          return prev.map((c) =>
            c.product.productId === product.productId
              ? { ...c, quantity: qty }
              : c,
          );
        }
        return [...prev, { product, quantity: qty }];
      });
    }
  }

  function getQty(productId: string) {
    return cart.find((c) => c.product.productId === productId)?.quantity ?? 0;
  }

  async function handleConfirmPayment() {
    if (!actor || !selectedMethod || cart.length === 0) return;
    setConfirming(true);
    try {
      const orderId = generateOrderId();
      const items: OrderItem[] = cart.map((c) => ({
        productName: c.product.name,
        quantity: BigInt(c.quantity),
        unitPrice: c.product.sellingPrice,
      }));
      const order: PassengerOrder = {
        orderId,
        driverName,
        items,
        totalAmount: cartTotal,
        paymentMethod: selectedMethod,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        passengerNote,
      };
      await actor.logPassengerOrder(driverName, order);
      setStep("confirmed");
    } catch {
      toast.error("Failed to send order. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  const selectedOption = PAYMENT_OPTIONS.find((o) => o.id === selectedMethod);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1117" }}>
        <PassengerHeader driverName={driverName} />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-24 rounded-2xl"
              style={{ background: "#1A1D26" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#0F1117" }}
      >
        <PassengerHeader driverName={driverName} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "#D4AF37" }}
            />
            <p className="text-white text-lg font-semibold mb-1">
              Menu Unavailable
            </p>
            <p style={{ color: "#9CA3AF" }} className="text-sm">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirmed") {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#0F1117" }}
      >
        <PassengerHeader driverName={driverName} />
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-xs w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{
                background: "rgba(212,175,55,0.15)",
                border: "2px solid #D4AF37",
              }}
            >
              <CheckCircle2
                className="w-10 h-10"
                style={{ color: "#D4AF37" }}
              />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Order Sent!</h2>
            <p style={{ color: "#9CA3AF" }} className="text-sm mb-6">
              Your order has been sent to the driver. Thank you!
            </p>
            <div
              className="rounded-2xl p-4 text-left space-y-2 mb-6"
              style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
            >
              {cart.map((item) => (
                <div
                  key={item.product.productId}
                  className="flex justify-between text-sm"
                >
                  <span style={{ color: "#D1D5DB" }}>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span style={{ color: "#D4AF37" }} className="font-semibold">
                    R{(item.product.sellingPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator style={{ background: "#2A2D36" }} />
              <div className="flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span style={{ color: "#D4AF37" }}>
                  R{cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  style={{
                    background: "rgba(212,175,55,0.15)",
                    color: "#D4AF37",
                    border: "1px solid rgba(212,175,55,0.3)",
                  }}
                >
                  {selectedOption?.label ?? selectedMethod}
                </Badge>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setStep("menu");
                setSelectedMethod(null);
                setPassengerNote("");
              }}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: "#D4AF37", color: "#0F1117" }}
            >
              Start New Order
            </button>
          </motion.div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0F1117" }}
    >
      <PassengerHeader driverName={driverName} />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-40">
        <AnimatePresence mode="wait">
          {step === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {products.length === 0 ? (
                <div
                  className="text-center py-16"
                  data-ocid="passenger_menu.items.empty_state"
                >
                  <ShoppingCart
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: "#4B5563" }}
                  />
                  <p className="text-white font-semibold mb-1">
                    No items available
                  </p>
                  <p style={{ color: "#9CA3AF" }} className="text-sm">
                    This driver hasn't added any menu items yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p
                    style={{ color: "#9CA3AF" }}
                    className="text-xs uppercase tracking-widest mb-4"
                  >
                    {products.length} item{products.length !== 1 ? "s" : ""}{" "}
                    available
                  </p>
                  {products.map((product, idx) => {
                    const qty = getQty(product.productId);
                    return (
                      <motion.div
                        key={product.productId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        data-ocid={`passenger_menu.items.item.${idx + 1}`}
                      >
                        <div
                          className="rounded-2xl p-4 flex items-center justify-between"
                          style={{
                            background:
                              qty > 0 ? "rgba(212,175,55,0.08)" : "#1A1D26",
                            border:
                              qty > 0
                                ? "1.5px solid rgba(212,175,55,0.35)"
                                : "1px solid #2A2D36",
                            transition: "all 0.2s",
                          }}
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="font-semibold text-white text-base truncate">
                              {product.name}
                            </p>
                            <p
                              className="text-lg font-bold mt-0.5"
                              style={{ color: "#D4AF37" }}
                            >
                              R{product.sellingPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setQty(product, qty - 1)}
                              disabled={qty === 0}
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                              style={{
                                background: "#2A2D36",
                                color: "#D4AF37",
                              }}
                              data-ocid={`passenger_menu.item.${idx + 1}.secondary_button`}
                              aria-label={`Decrease ${product.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-bold text-base w-6 text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(product, qty + 1)}
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: "#D4AF37",
                                color: "#0F1117",
                              }}
                              data-ocid={`passenger_menu.item.${idx + 1}.primary_button`}
                              aria-label={`Add ${product.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {step === "payment-select" && (
            <motion.div
              key="payment-select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("menu")}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "#1A1D26", color: "#9CA3AF" }}
                  data-ocid="passenger_menu.payment_select.cancel_button"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-white font-bold text-lg">
                    Choose Payment
                  </h2>
                  <p style={{ color: "#9CA3AF" }} className="text-xs">
                    Total:{" "}
                    <span style={{ color: "#D4AF37" }} className="font-bold">
                      R{cartTotal.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_OPTIONS.map((option, idx) => (
                  <motion.button
                    key={option.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedMethod(option.id);
                      setStep("payment-detail");
                    }}
                    className="rounded-2xl p-4 text-left flex flex-col gap-2 transition-all hover:opacity-90 active:scale-95 min-h-[80px]"
                    style={{
                      background: "#1A1D26",
                      border: "1px solid #2A2D36",
                    }}
                    data-ocid={`passenger_menu.payment.${option.id}.button`}
                  >
                    <span className="text-3xl leading-none">
                      {option.emoji}
                    </span>
                    <span className="text-white font-semibold text-sm leading-tight">
                      {option.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "payment-detail" && selectedMethod && (
            <motion.div
              key="payment-detail"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("payment-select")}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "#1A1D26", color: "#9CA3AF" }}
                  data-ocid="passenger_menu.payment_detail.cancel_button"
                >
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-white font-bold text-lg">
                  Pay via {selectedOption?.label}
                </h2>
              </div>

              {/* Order summary */}
              <div
                className="rounded-2xl p-4 mb-4 space-y-2"
                style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
              >
                <p
                  style={{ color: "#9CA3AF" }}
                  className="text-xs uppercase tracking-widest mb-3"
                >
                  Order Summary
                </p>
                {cart.map((item) => (
                  <div
                    key={item.product.productId}
                    className="flex justify-between text-sm"
                  >
                    <span style={{ color: "#D1D5DB" }}>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span
                      style={{ color: "#D4AF37" }}
                      className="font-semibold"
                    >
                      R{(item.product.sellingPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <Separator style={{ background: "#2A2D36" }} />
                <div className="flex justify-between font-bold">
                  <span className="text-white">Total</span>
                  <span style={{ color: "#D4AF37" }}>
                    R{cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment details */}
              {selectedMethod === "fiat" ? (
                <FiatPaymentDetail config={paymentConfig} />
              ) : (
                <CryptoPaymentDetail
                  method={selectedMethod}
                  config={paymentConfig}
                  totalAmount={cartTotal}
                />
              )}

              {/* Note */}
              <div className="mt-4">
                <label
                  htmlFor="passenger-note"
                  className="block text-xs mb-1.5"
                  style={{ color: "#9CA3AF" }}
                >
                  Note to driver (optional)
                </label>
                <textarea
                  id="passenger-note"
                  value={passengerNote}
                  onChange={(e) => setPassengerNote(e.target.value)}
                  placeholder="e.g. seat number, special request..."
                  rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{
                    background: "#1A1D26",
                    border: "1px solid #2A2D36",
                    color: "#F3F4F6",
                  }}
                  data-ocid="passenger_menu.note.textarea"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirming}
                className="w-full mt-5 py-4 rounded-2xl font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#D4AF37", color: "#0F1117" }}
                data-ocid="passenger_menu.confirm_payment.primary_button"
              >
                {confirming ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {confirming ? "Sending..." : "I've sent the payment"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cart drawer — only on menu step */}
      <AnimatePresence>
        {step === "menu" && cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ background: "#0F1117", borderTop: "1px solid #2A2D36" }}
          >
            <div className="max-w-lg mx-auto px-4 py-3">
              <button
                type="button"
                onClick={() => setCartOpen((v) => !v)}
                className="w-full flex items-center justify-between mb-2"
                data-ocid="passenger_menu.cart.toggle"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart
                    className="w-4 h-4"
                    style={{ color: "#D4AF37" }}
                  />
                  <span className="text-white font-semibold text-sm">
                    {cartCount} item{cartCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: "#D4AF37" }} className="font-bold">
                    R{cartTotal.toFixed(2)}
                  </span>
                  {cartOpen ? (
                    <ChevronDown
                      className="w-4 h-4"
                      style={{ color: "#9CA3AF" }}
                    />
                  ) : (
                    <ChevronUp
                      className="w-4 h-4"
                      style={{ color: "#9CA3AF" }}
                    />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {cartOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="space-y-1.5 py-1">
                      {cart.map((item) => (
                        <div
                          key={item.product.productId}
                          className="flex justify-between text-sm"
                        >
                          <span style={{ color: "#D1D5DB" }}>
                            {item.product.name} × {item.quantity}
                          </span>
                          <span
                            style={{ color: "#D4AF37" }}
                            className="font-semibold"
                          >
                            R
                            {(
                              item.product.sellingPrice * item.quantity
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => setStep("payment-select")}
                className="w-full py-3.5 rounded-2xl font-bold text-base transition-opacity hover:opacity-90"
                style={{ background: "#D4AF37", color: "#0F1117" }}
                data-ocid="passenger_menu.cart.primary_button"
              >
                Proceed to Pay — R{cartTotal.toFixed(2)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster />
    </div>
  );
}

function PassengerHeader({ driverName }: { driverName: string }) {
  return (
    <header
      className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
      style={{
        background: "rgba(15,17,23,0.95)",
        borderBottom: "1px solid #1A1D26",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{ background: "#D4AF37", color: "#0F1117" }}
        >
          M
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: "#D4AF37" }}>
            MoneyDrive
          </p>
          <p style={{ color: "#9CA3AF" }} className="text-xs leading-none">
            {driverName}'s Menu
          </p>
        </div>
      </div>
      <span
        className="text-xs px-2 py-1 rounded-full"
        style={{
          background: "rgba(212,175,55,0.1)",
          color: "#D4AF37",
          border: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        powered by MoneyDrive
      </span>
    </header>
  );
}

function FiatPaymentDetail({ config }: { config: DriverPaymentConfig | null }) {
  if (!config || (!config.bankName && !config.bankAccount)) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
        data-ocid="passenger_menu.fiat_payment.card"
      >
        <Building2
          className="w-8 h-8 mx-auto mb-2"
          style={{ color: "#4B5563" }}
        />
        <p style={{ color: "#9CA3AF" }} className="text-sm">
          Driver hasn't configured bank transfer yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
      data-ocid="passenger_menu.fiat_payment.card"
    >
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4" style={{ color: "#D4AF37" }} />
        <p className="text-white font-semibold text-sm">
          Bank Transfer Details
        </p>
      </div>
      {config.bankName && (
        <div>
          <p style={{ color: "#9CA3AF" }} className="text-xs mb-0.5">
            Bank
          </p>
          <p className="text-white font-medium text-sm">{config.bankName}</p>
        </div>
      )}
      {config.bankAccount && (
        <CopyField label="Account Number" value={config.bankAccount} />
      )}
      {config.bankReference && (
        <CopyField label="Reference" value={config.bankReference} />
      )}
    </div>
  );
}

function CryptoPaymentDetail({
  method,
  config,
  totalAmount,
}: {
  method: PaymentMethod;
  config: DriverPaymentConfig | null;
  totalAmount: number;
}) {
  const address = config ? getAddressForMethod(method, config) : "";
  const option = PAYMENT_OPTIONS.find((o) => o.id === method);

  if (!address) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
        data-ocid="passenger_menu.crypto_payment.card"
      >
        <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: "#4B5563" }} />
        <p style={{ color: "#9CA3AF" }} className="text-sm">
          Driver hasn't configured {option?.label ?? method} yet
        </p>
      </div>
    );
  }

  const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(address)}&choe=UTF-8`;

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "#1A1D26", border: "1px solid #2A2D36" }}
      data-ocid="passenger_menu.crypto_payment.card"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{option?.emoji}</span>
        <p className="text-white font-semibold text-sm">Send {option?.label}</p>
      </div>

      <div className="flex items-center justify-center">
        <div className="bg-white rounded-xl p-3">
          <img
            src={qrUrl}
            alt={`${option?.label} QR Code`}
            width={160}
            height={160}
            className="rounded"
          />
        </div>
      </div>

      <CopyField label="Wallet Address" value={address} mono />

      <div
        className="rounded-xl px-3 py-2 text-center"
        style={{
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        <p style={{ color: "#9CA3AF" }} className="text-xs mb-0.5">
          Amount to send
        </p>
        <p style={{ color: "#D4AF37" }} className="font-bold">
          R{totalAmount.toFixed(2)} equivalent
        </p>
      </div>
    </div>
  );
}

function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  function handleCopy() {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Copied!"))
      .catch(() => toast.error("Copy failed"));
  }

  return (
    <div>
      <p style={{ color: "#9CA3AF" }} className="text-xs mb-1">
        {label}
      </p>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: "#252830", border: "1px solid #2A2D36" }}
      >
        <p
          className={`flex-1 text-sm text-white break-all ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "#2A2D36", color: "#D4AF37" }}
          data-ocid="passenger_menu.copy.button"
          aria-label={`Copy ${label}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
