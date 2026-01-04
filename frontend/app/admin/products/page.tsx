'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../src/app/components/ui/card';
import { Button } from '../../../src/app/components/ui/button';
import { Separator } from '../../../src/app/components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  priceTier: string;
  unitPrice: number;
  marketPrice?: number | null;
  ourPrice?: number | null;
  installTechnicianFee?: number | null;
  installClientFee?: number | null;
  integrationTechnicianFee?: number | null;
  integrationClientFee?: number | null;
  active: boolean;
};

type ServiceFee = {
  id: string;
  name: string;
  type: 'INSTALLATION' | 'INTEGRATION' | 'TRANSPORT' | 'OTHER';
  technicianAmount: number;
  clientAmount: number;
  active: boolean;
};

const ALLOWED_ROLES = ['ADMIN'];

export default function AdminProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null,
  );

  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [updatingFeeId, setUpdatingFeeId] = useState<string | null>(null);

  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeType, setNewFeeType] = useState<ServiceFee['type']>('OTHER');
  const [newFeeTechnicianAmount, setNewFeeTechnicianAmount] = useState('0');
  const [newFeeClientAmount, setNewFeeClientAmount] = useState('0');
  const [creatingFee, setCreatingFee] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');
    if (!stored) {
      toast.error('Please log in to access admin tools.');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;
      if (!ALLOWED_ROLES.includes(parsed.role)) {
        toast.error('You do not have access to this area.');
        router.replace('/dashboard');
        return;
      }

      setUser(parsed);
    } catch {
      toast.error('Unable to read your session. Please log in again.');
      router.replace('/login');
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch('/api/products');
        const isJson =
          response.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load products.';
          toast.error(message);
          return;
        }

        setProducts((body?.items ?? []) as Product[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load products. Please try again.';
        toast.error(message);
      } finally {
        setLoadingProducts(false);
      }
    };

    const loadFees = async () => {
      try {
        setLoadingFees(true);
        const response = await fetch('/api/service-fees');
        const isJson =
          response.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load service fees.';
          toast.error(message);
          return;
        }

        setFees((body?.items ?? []) as ServiceFee[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load service fees. Please try again.';
        toast.error(message);
      } finally {
        setLoadingFees(false);
      }
    };

    void loadProducts();
    void loadFees();
  }, [user]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Checking access...
        </p>
      </div>
    );
  }

  const handleProductFieldChange = (
    id: string,
    field:
      | 'marketPrice'
      | 'ourPrice'
      | 'installTechnicianFee'
      | 'installClientFee'
      | 'integrationTechnicianFee'
      | 'integrationClientFee',
    value: string,
  ) => {
    const numeric = value === '' ? null : Number(value);
    setProducts((previous) =>
      previous.map((p) =>
        p.id === id ? { ...p, [field]: Number.isNaN(numeric) ? null : numeric } : p,
      ),
    );
  };

  const saveProduct = async (product: Product) => {
    try {
      setUpdatingProductId(product.id);
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketPrice: product.marketPrice ?? null,
          ourPrice: product.ourPrice ?? null,
          installTechnicianFee: product.installTechnicianFee ?? null,
          installClientFee: product.installClientFee ?? null,
          integrationTechnicianFee: product.integrationTechnicianFee ?? null,
          integrationClientFee: product.integrationClientFee ?? null,
        }),
      });

      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to update product.';
        toast.error(message);
        return;
      }

      toast.success('Product pricing updated.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update product. Please try again.';
      toast.error(message);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setUpdatingProductId(id);
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to remove product.';
        toast.error(message);
        return;
      }

      setProducts((previous) => previous.filter((p) => p.id !== id));
      toast.success('Product removed from catalog.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to remove product. Please try again.';
      toast.error(message);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const saveNewFee = async () => {
    const name = newFeeName.trim();
    if (!name) {
      toast.error('Please enter a name for the fee.');
      return;
    }

    const technicianAmount = Number(newFeeTechnicianAmount || '0');
    const clientAmount = Number(newFeeClientAmount || '0');

    try {
      setCreatingFee(true);
      const response = await fetch('/api/service-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: newFeeType,
          technicianAmount,
          clientAmount,
        }),
      });

      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to create service fee.';
        toast.error(message);
        return;
      }

      setFees((previous) => [...previous, body as ServiceFee]);
      setNewFeeName('');
      setNewFeeTechnicianAmount('0');
      setNewFeeClientAmount('0');
      setNewFeeType('OTHER');
      toast.success('Service fee created.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create service fee. Please try again.';
      toast.error(message);
    } finally {
      setCreatingFee(false);
    }
  };

  const updateFee = async (fee: ServiceFee, updates: Partial<ServiceFee>) => {
    try {
      setUpdatingFeeId(fee.id);
      const response = await fetch(`/api/service-fees/${fee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to update service fee.';
        toast.error(message);
        return;
      }

      setFees((previous) =>
        previous.map((f) => (f.id === fee.id ? (body as ServiceFee) : f)),
      );
      toast.success('Service fee updated.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update service fee. Please try again.';
      toast.error(message);
    } finally {
      setUpdatingFeeId(null);
    }
  };

  const deleteFee = async (fee: ServiceFee) => {
    try {
      setUpdatingFeeId(fee.id);
      const response = await fetch(`/api/service-fees/${fee.id}`, {
        method: 'DELETE',
      });

      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to delete service fee.';
        toast.error(message);
        return;
      }

      setFees((previous) => previous.filter((f) => f.id !== fee.id));
      toast.success('Service fee removed.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to delete service fee. Please try again.';
      toast.error(message);
    } finally {
      setUpdatingFeeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Products & pricing
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage device catalog, installation/integration fees and global
              service fees used for profit calculations.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
          >
            Back to admin dashboard
          </Button>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Devices</h2>
          <Card className="p-4 space-y-3 text-xs">
            {loadingProducts ? (
              <p className="text-muted-foreground">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-muted-foreground">
                No products in the catalog yet. You can create products from the
                backend for now; this screen focuses on pricing and fees.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-[11px] text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">
                        Device
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Market price
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Our device price
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Tech install / client
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Tech integration / client
                      </th>
                      <th className="text-right py-2 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="py-2 pr-3">
                          <p className="font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {product.category.toLowerCase()} ·{' '}
                            {product.priceTier.toLowerCase()}
                          </p>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <input
                            type="number"
                            className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                            value={
                              product.marketPrice != null
                                ? String(product.marketPrice)
                                : ''
                            }
                            onChange={(event) =>
                              handleProductFieldChange(
                                product.id,
                                'marketPrice',
                                event.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <input
                            type="number"
                            className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                            value={
                              product.ourPrice != null
                                ? String(product.ourPrice)
                                : ''
                            }
                            onChange={(event) =>
                              handleProductFieldChange(
                                product.id,
                                'ourPrice',
                                event.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex flex-col gap-1 items-end">
                            <input
                              type="number"
                              className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                              placeholder="Tech install"
                              value={
                                product.installTechnicianFee != null
                                  ? String(product.installTechnicianFee)
                                  : ''
                              }
                              onChange={(event) =>
                                handleProductFieldChange(
                                  product.id,
                                  'installTechnicianFee',
                                  event.target.value,
                                )
                              }
                            />
                            <input
                              type="number"
                              className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                              placeholder="Client install"
                              value={
                                product.installClientFee != null
                                  ? String(product.installClientFee)
                                  : ''
                              }
                              onChange={(event) =>
                                handleProductFieldChange(
                                  product.id,
                                  'installClientFee',
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex flex-col gap-1 items-end">
                            <input
                              type="number"
                              className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                              placeholder="Tech integration"
                              value={
                                product.integrationTechnicianFee != null
                                  ? String(product.integrationTechnicianFee)
                                  : ''
                              }
                              onChange={(event) =>
                                handleProductFieldChange(
                                  product.id,
                                  'integrationTechnicianFee',
                                  event.target.value,
                                )
                              }
                            />
                            <input
                              type="number"
                              className="w-24 border rounded px-1 py-0.5 text-right text-[11px]"
                              placeholder="Client integration"
                              value={
                                product.integrationClientFee != null
                                  ? String(product.integrationClientFee)
                                  : ''
                              }
                              onChange={(event) =>
                                handleProductFieldChange(
                                  product.id,
                                  'integrationClientFee',
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingProductId === product.id}
                              onClick={() => saveProduct(product)}
                            >
                              {updatingProductId === product.id
                                ? 'Saving...'
                                : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updatingProductId === product.id}
                              onClick={() => deleteProduct(product.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Service fees</h2>
          <Card className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Use service fees for project-level costs like transport or
                additional services that apply per project rather than per
                device.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    Name
                  </span>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-xs"
                    value={newFeeName}
                    onChange={(event) => setNewFeeName(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    Type
                  </span>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={newFeeType}
                    onChange={(event) =>
                      setNewFeeType(
                        event.target.value as ServiceFee['type'],
                      )
                    }
                  >
                    <option value="INSTALLATION">Installation</option>
                    <option value="INTEGRATION">Integration</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    Technician amount
                  </span>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-xs w-24"
                    value={newFeeTechnicianAmount}
                    onChange={(event) =>
                      setNewFeeTechnicianAmount(event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    Client amount
                  </span>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-xs w-24"
                    value={newFeeClientAmount}
                    onChange={(event) =>
                      setNewFeeClientAmount(event.target.value)
                    }
                  />
                </div>
                <Button
                  size="sm"
                  disabled={creatingFee}
                  onClick={saveNewFee}
                >
                  {creatingFee ? 'Adding...' : 'Add fee'}
                </Button>
              </div>
            </div>

            <Separator />

            {loadingFees ? (
              <p className="text-muted-foreground">Loading service fees...</p>
            ) : fees.length === 0 ? (
              <p className="text-muted-foreground">
                No service fees configured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {fees.map((fee) => (
                  <div
                    key={fee.id}
                    className="flex flex-wrap items-center justify-between gap-2 border rounded px-3 py-2"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-xs">
                        {fee.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {fee.type.toLowerCase()} · technician{' '}
                        {fee.technicianAmount.toLocaleString()} · client{' '}
                        {fee.clientAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingFeeId === fee.id}
                        onClick={() =>
                          updateFee(fee, { active: !fee.active })
                        }
                      >
                        {fee.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updatingFeeId === fee.id}
                        onClick={() => deleteFee(fee)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

