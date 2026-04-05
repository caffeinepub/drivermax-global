import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product, Sale, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

// Extended actor type to include newly-added backend methods
interface ActorWithDeleteOps {
  deleteProduct(productId: string): Promise<void>;
  deleteSale(saleId: string): Promise<void>;
}

interface SalesPageProps {
  profile: UserProfile | null | undefined;
  tier: number;
}

export default function SalesPage({ profile }: SalesPageProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(
    undefined,
  );
  const [addSaleOpen, setAddSaleOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const currency = profile?.currencyCode ?? "ZAR";

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => actor!.getProducts(),
    enabled: !!actor,
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => actor!.getSales(),
    enabled: !!actor,
  });

  const { data: lowStock } = useQuery({
    queryKey: ["lowStock"],
    queryFn: () => actor!.getLowStockProducts(),
    enabled: !!actor,
  });

  const deleteProductMut = useMutation({
    mutationFn: (productId: string) =>
      (actor as unknown as ActorWithDeleteOps).deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      setProductToDelete(null);
      toast.success("Product deleted");
    },
    onError: () => {
      setProductToDelete(null);
      toast.error("Failed to delete product");
    },
  });

  const deleteSaleMut = useMutation({
    mutationFn: (saleId: string) =>
      (actor as unknown as ActorWithDeleteOps).deleteSale(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setSaleToDelete(null);
      toast.success("Sale removed");
    },
    onError: () => {
      setSaleToDelete(null);
      toast.error("Failed to remove sale");
    },
  });

  const totalRevenue = (sales ?? []).reduce(
    (s, sale) => s + sale.totalAmount,
    0,
  );
  const totalUnits = (sales ?? []).reduce(
    (s, sale) => s + Number(sale.quantity),
    0,
  );
  const sortedSales = [...(sales ?? [])].sort(
    (a, b) => Number(b.date) - Number(a.date),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">In-Car Sales</h1>
          <p className="text-muted-foreground text-sm">
            Track products sold to passengers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditProduct(undefined);
              setAddProductOpen(true);
            }}
            className="gap-2"
            data-ocid="sales.add_product.button"
          >
            <Package className="w-4 h-4" /> Product
          </Button>
          <Button
            onClick={() => setAddSaleOpen(true)}
            className="gap-2"
            data-ocid="sales.add_sale.button"
          >
            <Plus className="w-4 h-4" /> Log Sale
          </Button>
        </div>
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            Low stock:{" "}
            {lowStock
              .map((p) => `${p.name} (${p.currentStock} left)`)
              .join(", ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Total Revenue
            </p>
            <p className="text-2xl font-display font-bold mt-1">
              {currency} {totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Units Sold
            </p>
            <p className="text-2xl font-display font-bold mt-1">{totalUnits}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (products ?? []).length === 0 ? (
              <div
                className="text-center py-6"
                data-ocid="sales.products.empty_state"
              >
                <p className="text-muted-foreground text-sm">
                  No products yet.
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setEditProduct(undefined);
                    setAddProductOpen(true);
                  }}
                >
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {(products ?? []).map((p, idx) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-ocid={`sales.products.item.${idx + 1}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {currency} {p.sellingPrice.toFixed(2)}/unit
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={
                          Number(p.currentStock) < 5
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }
                      >
                        {Number(p.currentStock)} left
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setEditProduct(p);
                          setAddProductOpen(true);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors text-xs"
                        aria-label="Edit product"
                        data-ocid={`sales.products.edit_button.${idx + 1}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductToDelete(p)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete product"
                        data-ocid={`sales.products.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : sortedSales.length === 0 ? (
              <div
                className="text-center py-6"
                data-ocid="sales.sales.empty_state"
              >
                <p className="text-muted-foreground text-sm">No sales yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedSales.map((s, idx) => (
                  <div
                    key={s.saleId}
                    className="flex items-center justify-between py-2.5"
                    data-ocid={`sales.sales.item.${idx + 1}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{s.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        x{Number(s.quantity)} •{" "}
                        {new Date(Number(s.date)).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {currency} {s.totalAmount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSaleToDelete(s)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete sale"
                        data-ocid={`sales.sales.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        currency={currency}
        editProduct={editProduct}
      />
      <AddSaleDialog
        open={addSaleOpen}
        onOpenChange={setAddSaleOpen}
        products={products ?? []}
        currency={currency}
      />

      {/* Delete product confirmation */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="sales.delete_product.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              "{productToDelete?.name}" will be permanently removed from your
              inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sales.delete_product.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                productToDelete &&
                deleteProductMut.mutate(productToDelete.productId)
              }
              data-ocid="sales.delete_product.confirm_button"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete sale confirmation */}
      <AlertDialog
        open={!!saleToDelete}
        onOpenChange={(open) => {
          if (!open) setSaleToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="sales.delete_sale.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This sale record will be permanently removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sales.delete_sale.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                saleToDelete && deleteSaleMut.mutate(saleToDelete.saleId)
              }
              data-ocid="sales.delete_sale.confirm_button"
            >
              Remove Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  currency,
  editProduct,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: string;
  editProduct?: Product;
}) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [name, setName] = useState(editProduct?.name ?? "");
  const [price, setPrice] = useState(
    editProduct ? String(editProduct.sellingPrice) : "",
  );
  const [stock, setStock] = useState(
    editProduct ? String(Number(editProduct.currentStock)) : "",
  );

  // Sync form when editProduct changes (dialog reopens)
  const prevEditRef = { current: editProduct };
  if (prevEditRef.current !== editProduct) {
    prevEditRef.current = editProduct;
  }

  const isEdit = !!editProduct;

  const mut = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.addOrUpdateProduct({
        productId: editProduct ? editProduct.productId : crypto.randomUUID(),
        name,
        sellingPrice: Number.parseFloat(price),
        currentStock: BigInt(Number.parseInt(stock)),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      toast.success(isEdit ? "Product updated" : "Product added");
      onOpenChange(false);
      setName("");
      setPrice("");
      setStock("");
    },
    onError: () => toast.error("Failed to save product"),
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(editProduct?.name ?? "");
      setPrice(editProduct ? String(editProduct.sellingPrice) : "");
      setStock(editProduct ? String(Number(editProduct.currentStock)) : "");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Product Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Water bottle"
              className="mt-1"
              data-ocid="sales.product_form.name.input"
            />
          </div>
          <div>
            <Label>Selling Price ({currency})</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15.00"
              className="mt-1"
              data-ocid="sales.product_form.price.input"
            />
          </div>
          <div>
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="20"
              className="mt-1"
              data-ocid="sales.product_form.stock.input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={!name || !price || !stock || mut.isPending}
            data-ocid="sales.product_form.submit_button"
          >
            {mut.isPending
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSaleDialog({
  open,
  onOpenChange,
  products,
  currency,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
  currency: string;
}) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");

  const selectedProduct = products.find((p) => p.productId === productId);
  const maxStock = Number(selectedProduct?.currentStock ?? 999);
  const total = selectedProduct
    ? selectedProduct.sellingPrice * Number.parseInt(qty || "1")
    : 0;

  const mut = useMutation({
    mutationFn: async () => {
      if (!actor || !selectedProduct) throw new Error("Missing data");
      const qtyNum = Number.parseInt(qty);
      if (qtyNum > maxStock) {
        throw new Error(
          `Only ${maxStock} unit${maxStock !== 1 ? "s" : ""} in stock`,
        );
      }
      await actor.addSale({
        saleId: crypto.randomUUID(),
        productName: selectedProduct.name,
        quantity: BigInt(qtyNum),
        totalAmount: total,
        date: BigInt(Date.now()),
      });
      // Decrement stock
      await actor.addOrUpdateProduct({
        ...selectedProduct,
        currentStock: BigInt(
          Math.max(0, Number(selectedProduct.currentStock) - qtyNum),
        ),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      toast.success("Sale logged");
      onOpenChange(false);
      setProductId("");
      setQty("1");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to log sale"),
  });

  const handleSubmit = () => {
    const qtyNum = Number.parseInt(qty);
    if (qtyNum > maxStock) {
      toast.error(`Only ${maxStock} unit${maxStock !== 1 ? "s" : ""} in stock`);
      return;
    }
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Log Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger
                className="mt-1"
                data-ocid="sales.sale_form.product.select"
              >
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter((p) => Number(p.currentStock) > 0)
                  .map((p) => (
                    <SelectItem key={p.productId} value={p.productId}>
                      {p.name} ({currency} {p.sellingPrice.toFixed(2)}) —{" "}
                      {Number(p.currentStock)} left
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              max={maxStock}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1"
              data-ocid="sales.sale_form.quantity.input"
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-1">
                {maxStock} in stock
              </p>
            )}
          </div>
          {selectedProduct && (
            <p className="text-sm font-semibold">
              Total: {currency} {total.toFixed(2)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!productId || mut.isPending}
            data-ocid="sales.sale_form.submit_button"
          >
            {mut.isPending ? "Saving..." : "Log Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
