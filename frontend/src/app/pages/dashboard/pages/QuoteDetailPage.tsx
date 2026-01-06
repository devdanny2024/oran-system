'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Separator } from '../../../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { toast } from 'sonner';

type QuoteItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type Quote = {
  id: string;
  projectId: string;
  tier: 'ECONOMY' | 'STANDARD' | 'LUXURY';
  title?: string | null;
  currency: string;
  subtotal: number;
  installationFee: number;
  integrationFee: number;
  logisticsCost: number;
  miscellaneousFee: number;
  taxAmount: number;
  total: number;
  isSelected: boolean;
  items: QuoteItem[];
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const quoteId = params?.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<
    {
      id: string;
      name: string;
      category: string;
      description?: string | null;
      imageUrl?: string | null;
      videoUrl?: string | null;
    }[]
  >([]);
  const [dirtyQuantities, setDirtyQuantities] = useState<Record<string, number>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const [addProductId, setAddProductId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [adding, setAdding] = useState(false);

  const loadQuote = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/${quoteId}`);
      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to load quote.';
        toast.error(message);
        router.push('/dashboard/projects');
        return;
      }

      setQuote(body as Quote);
      setDirtyQuantities({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load quote. Please try again.';
      toast.error(message);
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuote();
  }, [quoteId]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          return;
        }

        const items = (body?.items ?? []) as {
          id: string;
          name: string;
          category: string;
          description?: string | null;
          imageUrl?: string | null;
          videoUrl?: string | null;
        }[];
        setProducts(items);
      } catch {
        // ignore silently for now
      }
    };

    void loadProducts();
  }, []);

  const handleQuantityChange = (itemId: string, value: number) => {
    if (!quote) return;
    const nextItems = quote.items.map((item) =>
      item.id === itemId ? { ...item, quantity: value } : item,
    );
    setQuote({ ...quote, items: nextItems });
    setDirtyQuantities({ ...dirtyQuantities, [itemId]: value });
  };

  const handleSaveChanges = async () => {
    if (!quoteId || !Object.keys(dirtyQuantities).length) return;

    try {
      setSaving(true);

      await Promise.all(
        Object.entries(dirtyQuantities).map(([itemId, quantity]) =>
          fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
          }),
        ),
      );

      toast.success('Quote updated.');
      await loadQuote();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save changes. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!quoteId) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message ?? 'Unable to remove item.');
        return;
      }
      toast.success('Item removed.');
      await loadQuote();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to remove item. Please try again.';
      toast.error(message);
    }
  };

  const handleAddItem = async () => {
    if (!quoteId || !addProductId || addQuantity <= 0) return;
    try {
      setAdding(true);
      const res = await fetch(`/api/quotes/${quoteId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          productId: addProductId,
          quantity: addQuantity,
        }),
      });

      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to add item.';
        toast.error(message);
        return;
      }

      toast.success('Item added to quote.');
      setAddProductId('');
      setAddQuantity(1);
      await loadQuote();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to add item. Please try again.';
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const handleSelectQuote = async () => {
    if (!quoteId || !quote) return;

    try {
      setSelecting(true);
      const res = await fetch(`/api/quotes/${quoteId}/select`, {
        method: 'PATCH',
      });

      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to select quote.';
        toast.error(message);
        return;
      }

      toast.success('This quote is now your selected package.');

      // After selecting a quote, automatically take the customer
      // back to the project so they can continue with documents,
      // payment plan and next steps.
      router.push(`/dashboard/projects/${quote.projectId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to select quote. Please try again.';
      toast.error(message);
    } finally {
      setSelecting(false);
    }
  };

  if (loading || !quote) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {quote.title || 'Quote details'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {quote.tier.toLowerCase()} package · {quote.items.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quote.isSelected && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/projects')}
          >
            Back to projects
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1 text-xs w-full max-w-md">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Pricing summary
            </p>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Devices subtotal</span>
                <span className="font-medium">
                  ₦{quote.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Installation fee</span>
                <span>₦{quote.installationFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Integration fee</span>
                <span>₦{quote.integrationFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Logistics</span>
                <span>₦{quote.logisticsCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Miscellaneous</span>
                <span>₦{quote.miscellaneousFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax</span>
                <span>₦{quote.taxAmount.toLocaleString()}</span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-xs font-semibold">Grand total</span>
              <span className="text-lg font-semibold">
                ₦{quote.total.toLocaleString()}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSelectQuote}
            disabled={selecting}
          >
            {selecting
              ? 'Updating...'
              : quote.isSelected
                ? 'Selected quote'
                : 'Choose this quote'}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quote items</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={!Object.keys(dirtyQuantities).length || saving}
            onClick={handleSaveChanges}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
        <Separator />

        {quote.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This quote has no items yet. Use the form below to add products.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Quantity</th>
                  <th className="py-2 pr-4">Unit price</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => {
                  const product = products.find((p) => p.name === item.name);
                  const hasVideo = !!product?.videoUrl;
                  const hasImage = !!product?.imageUrl;
                  const hasMedia = hasVideo || hasImage;

                  return (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 pr-4">
                        {hasMedia || product?.description ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-left underline-offset-2 hover:underline">
                                {item.name}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="max-w-xs space-y-2">
                                <p className="font-semibold text-[11px]">
                                  {product?.name ?? item.name}
                                </p>
                                {hasVideo && (
                                  <video
                                    src={product!.videoUrl!}
                                    className="w-full max-h-40 rounded-md"
                                    controls
                                  />
                                )}
                                {!hasVideo && hasImage && (
                                  <img
                                    src={product!.imageUrl!}
                                    alt={product?.name ?? item.name}
                                    className="w-full max-h-40 rounded-md object-cover"
                                  />
                                )}
                                {product?.description && (
                                  <p className="text-[11px] leading-snug">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="py-2 pr-4 capitalize">
                        {item.category.toLowerCase()}
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={1}
                          className="w-16 rounded-md border border-input bg-background px-1 py-0.5 text-xs"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              Number(e.target.value) || 1,
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-4">
                        ₦{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        ₦{item.totalPrice.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add product to this quote</h2>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground">Product</label>
            <select
              className="min-w-[200px] rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={addProductId}
              onChange={(e) => setAddProductId(e.target.value)}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground">Quantity</label>
            <input
              type="number"
              min={1}
              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={addQuantity}
              onChange={(e) => setAddQuantity(Number(e.target.value) || 1)}
            />
          </div>
          <Button
            size="sm"
            disabled={!addProductId || addQuantity <= 0 || adding}
            onClick={handleAddItem}
          >
            {adding ? 'Adding...' : 'Add to quote'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
