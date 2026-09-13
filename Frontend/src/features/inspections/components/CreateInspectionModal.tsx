import { useState, useEffect, useRef, useMemo, type FormEvent, type ChangeEvent, type DragEvent } from 'react';
import {
  ScanSearch,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useProducts } from '@/features/products/hooks/useProducts';
import { useCreateInspection } from '../hooks/useCreateInspection';
import { compressImageForUpload } from '../utils/imageCompressor';
import type { InspectionDetail } from '../types';

export interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scan: InspectionDetail) => void;
}

interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
}

export type InspectionScanStageId = 'prepare' | 'upload' | 'ocr' | 'verify' | 'ready';

interface InspectionScanStage {
  id: InspectionScanStageId;
  label: string;
  detail: string;
}

const SCAN_STAGES: InspectionScanStage[] = [
  {
    id: 'prepare',
    label: 'Preparing package evidence',
    detail: 'Downscaling and validating high-resolution packaging panels',
  },
  {
    id: 'upload',
    label: 'Uploading inspection evidence',
    detail: 'Securely uploading package evidence to statutory repository',
  },
  {
    id: 'ocr',
    label: 'AI/OCR analysis',
    detail: 'Performing optical character recognition and field localization',
  },
  {
    id: 'verify',
    label: 'Compliance verification',
    detail: 'Auditing declarations against Legal Metrology Rules, 2011',
  },
  {
    id: 'ready',
    label: 'Result ready',
    detail: 'Finalizing compliance verdict and preparing inspection dossier',
  },
];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB statutory limit

export function CreateInspectionModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInspectionModalProps) {
  const {
    products,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [imageFiles, setImageFiles] = useState<ImageFileItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [scanStage, setScanStage] = useState<InspectionScanStageId | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track all created object URLs to guarantee zero memory leaks
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isSubmitting, error: submitError, submitScan, clearError } = useCreateInspection();

  const isBusy = isSubmitting || isCompressing;

  // Refresh products list whenever modal opens
  useEffect(() => {
    if (isOpen) {
      refetchProducts();
    }
  }, [isOpen, refetchProducts]);

  // Clean up object URLs on component unmount
  // Clean up object URLs and timer on component unmount
  useEffect(() => {
    const activeUrls = objectUrlsRef.current;
    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
      activeUrls.clear();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const resetForm = () => {
    // Revoke all preview URLs in state
    for (const item of imageFiles) {
      URL.revokeObjectURL(item.previewUrl);
      objectUrlsRef.current.delete(item.previewUrl);
    }
    setImageFiles([]);
    setSelectedProductId('');
    setValidationError(null);
    clearError();
    setScanStage(null);
    setElapsedSeconds(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isBusy) return;
    resetForm();
    onClose();
  };

  const handleAddFiles = (incomingFiles: FileList | File[]) => {
    setValidationError(null);
    clearError();

    const validNewFiles: ImageFileItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP images.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds the 10MB statutory limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);

      validNewFiles.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
      });
    }

    if (errors.length > 0) {
      setValidationError(errors[0]);
    }

    if (validNewFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validNewFiles]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isBusy) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isBusy) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    setImageFiles((prev) => {
      const itemToRemove = prev.find((item) => item.id === idToRemove);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
        objectUrlsRef.current.delete(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isBusy) return;

    if (!selectedProductId) {
      setValidationError('Please select a registered regulated commodity from the catalog.');
      return;
    }

    if (imageFiles.length === 0) {
      setValidationError('At least one package evidence image is required for compliance verification.');
      return;
    }

    setValidationError(null);
    clearError();
    setIsCompressing(true);
    setScanStage('prepare');
    setElapsedSeconds(0);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      setScanStage((prev) => {
        if (prev === 'ready' || prev === 'prepare') return prev;
        if (elapsed < 5) return 'upload';
        if (elapsed < 23) return 'ocr';
        return 'verify';
      });
    }, 1000);

    try {
      // Compress and resize images to max 1920px JPEG before upload
      const processedImages = await Promise.all(
        imageFiles.map(async (item) => {
          try {
            return await compressImageForUpload(item.file);
          } catch (err) {
            console.warn('[CreateInspectionModal] Image compression error, using original file:', item.file.name, err);
            return item.file;
          }
        })
      );

      setScanStage('upload');

      const createdScan = await submitScan({
        product_id: selectedProductId,
        images: processedImages,
      });

      setScanStage('ready');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Allow brief moment for inspector to see completed status
      setTimeout(() => {
        resetForm();
        onSuccess(createdScan);
      }, 700);
    } catch {
      setScanStage(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Handled in useCreateInspection state, surfaces in activeError
    } finally {
      setIsCompressing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.product_name} (${p.brand_name})${p.generic_name ? ` • ${p.generic_name}` : ''}`,
      })),
    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const disabledReason = useMemo(() => {
    if (isLoadingProducts) return 'Loading registered commodity catalog...';
    if (products.length === 0) return 'No registered commodities found in catalog.';
    if (!selectedProductId && imageFiles.length === 0)
      return 'Select a commodity and upload at least one evidence image to start screening.';
    if (!selectedProductId) return 'Select a regulated commodity to inspect.';
    if (imageFiles.length === 0) return 'Upload at least one package evidence image.';
    return '';
  }, [isLoadingProducts, products.length, selectedProductId, imageFiles.length]);

  const isReadyToScreen = Boolean(selectedProductId && imageFiles.length > 0 && !isBusy);

  const activeError = validationError || submitError || productsError;
  const isSubmitDisabled =
    isBusy ||
    isLoadingProducts ||
    products.length === 0 ||
    !selectedProductId ||
    imageFiles.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnEsc={!isBusy}
      closeOnBackdrop={!isBusy}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5 text-blue-700" />
          <span>New Commodity Inspection</span>
        </div>
      }
      description="Initiate statutory compliance screening under Legal Metrology Rules, 2011 by selecting a commodity and uploading package evidence."
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              {imageFiles.length === 0
                ? 'No evidence images selected'
                : `${imageFiles.length} evidence ${imageFiles.length === 1 ? 'image' : 'images'} selected`}
            </span>
            {selectedProduct && (
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            )}
            {selectedProduct && (
              <span
                className="text-xs text-slate-600 font-medium truncate max-w-[200px] hidden sm:inline"
                title={selectedProduct.product_name}
              >
                {selectedProduct.product_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isBusy}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-inspection-form"
              variant="primary"
              size="sm"
              isLoading={isBusy || scanStage === 'ready'}
              disabled={isSubmitDisabled}
              title={isSubmitDisabled && !isBusy ? disabledReason : undefined}
              leftIcon={isBusy || scanStage === 'ready' ? undefined : <ScanSearch className="h-4 w-4" />}
            >
              {scanStage === 'ready'
                ? 'Result Ready'
                : isCompressing
                ? 'Preparing Evidence...'
                : scanStage === 'upload'
                ? 'Uploading Evidence...'
                : scanStage === 'ocr'
                ? 'AI / OCR Scanning...'
                : scanStage === 'verify'
                ? 'Verifying Rules...'
                : isSubmitting
                ? 'Analyzing Compliance...'
                : 'Start AI Screening'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="create-inspection-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Error Notification Banner */}
        {activeError && !isBusy && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <div className="flex-1 space-y-0.5">
              <span className="font-bold block text-rose-950">Inspection Submission Error</span>
              <p className="text-rose-800 leading-relaxed">{activeError}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setValidationError(null);
                clearError();
              }}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition-colors"
              aria-label="Dismiss error notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4-Stage Professional Progress Experience */}
        {(isBusy || scanStage === 'ready') && (
          <div
            role="status"
            aria-live="polite"
            className="p-5 bg-gradient-to-b from-blue-50/80 to-slate-50 border border-blue-200/90 rounded-xl text-xs text-blue-950 shadow-xs space-y-4 animate-in fade-in duration-200"
          >
            {/* Header with Title and Elapsed Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/70">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Statutory Packaging Verification
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automated screening under Legal Metrology (Packaged Commodities) Rules, 2011
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border border-blue-200 shadow-2xs font-mono text-[11px] text-blue-800 font-semibold">
                <Clock className="h-3 w-3 text-blue-600" />
                <span>Elapsed: {elapsedSeconds}s</span>
              </div>
            </div>

            {/* Vertical Stage Stepper */}
            <div className="space-y-3 pl-1">
              {SCAN_STAGES.map((stage, idx) => {
                const stageIndex = SCAN_STAGES.findIndex((s) => s.id === scanStage);
                const isCurrent = stage.id === scanStage;
                const isCompleted = scanStage === 'ready' || (stageIndex > -1 && stageIndex > idx);

                return (
                  <div key={stage.id} className="flex items-start gap-3 relative">
                    {/* Step Icon / Indicator */}
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-semibold">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Step Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs font-semibold ${
                            isCompleted
                              ? 'text-emerald-900'
                              : isCurrent
                              ? 'text-blue-900 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </p>
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-600 font-medium font-mono">
                            Complete
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider animate-pulse">
                            Processing...
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isCurrent ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {stage.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guidance & Regulatory Disclaimer Footer */}
            <div className="pt-3 border-t border-blue-200/60 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-amber-900 bg-amber-50/90 px-3 py-2 rounded-lg border border-amber-200/80 font-medium">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Please do not close this window or navigate away while compliance verification completes.</span>
              </div>
              <p className="text-[10px] text-slate-500 italic pl-1">
                AI-assisted compliance screening. Final regulatory verification remains with the authorized inspecting officer.
              </p>
            </div>
          </div>
        )}

        {/* 1. Regulated Commodity Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
                1
              </span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Commodity
              </span>
            </div>
            {selectedProduct && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Selected
              </span>
            )}
          </div>
          <Select
            id="inspection-product-select"
            label="Commodity / Product"
            required
            placeholder={
              isLoadingProducts
                ? 'Loading registered products catalog...'
                : products.length === 0
                ? 'No registered products found'
                : 'Select commodity to inspect...'
            }
            options={productOptions}
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setValidationError(null);
            }}
            disabled={isSubmitting || isLoadingProducts || products.length === 0}
            helperText="Select the registered packaged commodity against which statutory packaging declarations will be validated."
          />
          {products.length === 0 && !isLoadingProducts && !productsError && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Package className="h-3.5 w-3.5" />
              <span>No commodities in catalog. Please register a product first in the Products catalog.</span>
            </div>
          )}
        </div>

        {/* 2. Package Evidence Images Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
                2
              </span>
              <label
                htmlFor="inspection-image-file-input"
                className="block text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer"
              >
                Package Evidence <span className="text-rose-600">*</span>
              </label>
            </div>
            <Badge variant="neutral" size="sm">
              JPEG, PNG, WebP (Max 10MB per file)
            </Badge>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="hidden"
            id="inspection-image-file-input"
            aria-label="Upload package evidence images"
          />

          {/* Drag and Drop Zone */}
          <div
            tabIndex={0}
            role="button"
            aria-label="Click or press enter to upload package evidence images, or drag and drop files here"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isSubmitting) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-lg p-5 text-center transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDragOver
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            } ${
              isSubmitting
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer hover:bg-slate-100/60'
            }`}
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 mb-2">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              {isSubmitting
                ? 'Uploading & analyzing images...'
                : 'Click to browse or drag & drop package evidence here'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Upload clear images of the packaged commodity and its declarations.
            </p>
          </div>

          {/* Selected Images Gallery Preview */}
          {imageFiles.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Queued Evidence Files ({imageFiles.length})
                </span>
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Evidence attached
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {imageFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg shadow-2xs group hover:border-slate-300 transition-colors"
                  >
                    <div className="relative h-11 w-11 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                    {!isBusy && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        title="Remove image"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Inspection Screening Readiness */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
                3
              </span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Screening Readiness
              </span>
            </div>
            {isReadyToScreen ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Ready to Screen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Pending Requirements
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 text-xs">
            {/* Commodity condition */}
            <div className="flex items-center gap-2">
              {selectedProduct ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
              )}
              <span className={selectedProduct ? 'text-slate-800 font-medium truncate' : 'text-slate-500'}>
                {selectedProduct
                  ? `Commodity: ${selectedProduct.product_name}`
                  : 'Commodity: Not selected'}
              </span>
            </div>

            {/* Evidence condition */}
            <div className="flex items-center gap-2">
              {imageFiles.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
              )}
              <span className={imageFiles.length > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                {imageFiles.length > 0
                  ? `Evidence: ${imageFiles.length} ${imageFiles.length === 1 ? 'file' : 'files'} attached`
                  : 'Evidence: 0 files attached'}
              </span>
            </div>
          </div>

          {/* Explicit reason if disabled */}
          {!isReadyToScreen && !isBusy && disabledReason && (
            <p className="text-[11px] text-amber-800 bg-amber-50/60 px-2.5 py-1.5 rounded border border-amber-200/60 font-medium flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>{disabledReason}</span>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default CreateInspectionModal;
