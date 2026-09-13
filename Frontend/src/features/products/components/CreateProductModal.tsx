import { useState, type FormEvent } from 'react';
import { PackagePlus, AlertCircle, Package, Building2, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { productsService } from '../services/productsService';
import type { ApiError } from '@/types/api';

export interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setProductName('');
    setBrandName('');
    setGenericName('');
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const trimmedProductName = productName.trim();
    const trimmedBrandName = brandName.trim();
    const trimmedGenericName = genericName.trim();

    if (!trimmedProductName || !trimmedBrandName || !trimmedGenericName) {
      setError('Commodity name, brand identity, and generic classification are all required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await productsService.createProduct({
        product_name: trimmedProductName,
        brand_name: trimmedBrandName,
        generic_name: trimmedGenericName,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to register product. Please check your network and inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <span>Register Regulated Commodity</span>
        </div>
      }
      description="Register a new packaged commodity in the Legal Metrology compliance catalog"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-product-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Register Commodity
          </Button>
        </div>
      }
    >
      <form id="create-product-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start gap-2 shadow-2xs animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Input
          id="product_name"
          name="product_name"
          label="Commodity / Product Name"
          placeholder="e.g. Basmati Rice 5kg Premium Pack"
          value={productName}
          onChange={(e) => {
            setProductName(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          autoComplete="off"
          leftElement={<Package className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          helperText="The standard commercial name appearing on outer packaging."
        />

        <Input
          id="brand_name"
          name="brand_name"
          label="Brand Manufacturer / Trade Name"
          placeholder="e.g. Royal Heritage"
          value={brandName}
          onChange={(e) => {
            setBrandName(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          autoComplete="off"
          leftElement={<Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          helperText="Brand identity or registered manufacturing trademark."
        />

        <Input
          id="generic_name"
          name="generic_name"
          label="Generic Commodity Classification"
          placeholder="e.g. Rice (Packaged Food Grain)"
          value={genericName}
          onChange={(e) => {
            setGenericName(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          autoComplete="off"
          leftElement={<Tag className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          helperText="Statutory generic name mandated under Legal Metrology Rules."
        />
      </form>
    </Modal>
  );
}

export default CreateProductModal;
