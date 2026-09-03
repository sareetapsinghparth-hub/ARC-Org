import React, { useRef, useState } from 'react';
import { SelectedImageInfo } from '../types';
import { Upload, X, Image as ImageIcon, AlertTriangle, Eye, Check } from 'lucide-react';

interface ImageUploadProps {
  selectedImage: SelectedImageInfo | null;
  onImageSelected: (image: SelectedImageInfo | null) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export function ImageUpload({ selectedImage, onImageSelected, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const processFile = (file: File) => {
    setErrorMsg(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('Invalid format. Please upload only PNG, JPG, JPEG, or WEBP images.');
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`File size (${sizeMB} MB) exceeds the 5 MB limit. Please select a smaller photo.`);
      return;
    }

    // Read file as Data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImageSelected({
        dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelected(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        id="handwritten-image-input"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* When an image is already selected */}
      {selectedImage ? (
        <div className="relative rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => setPreviewModalOpen(true)}
              className="relative w-14 h-14 rounded-lg overflow-hidden border border-indigo-200 cursor-pointer group shrink-0 bg-slate-100"
            >
              <img
                src={selectedImage.dataUrl}
                alt="Handwritten solution preview"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{selectedImage.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                <span>{(selectedImage.size / 1024).toFixed(0)} KB</span>
                <span>•</span>
                <span className="text-indigo-600 font-sans">Multimodal Vision active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="view-image-preview-btn"
              onClick={() => setPreviewModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Expand preview"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              id="remove-image-btn"
              onClick={handleRemove}
              disabled={disabled}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Remove image"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Dropzone / Upload trigger */
        <div
          id="image-dropzone"
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`group relative rounded-xl border-2 border-dashed transition-all duration-200 p-3.5 text-center cursor-pointer ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-300 hover:border-indigo-300 bg-white hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                Attach Handwritten Work <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Drag photo of working or click to browse (PNG, JPG, WEBP &lt; 5MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {errorMsg && (
        <div className="mt-2 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewModalOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-800">{selectedImage.name}</span>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 overflow-auto flex-1 flex items-center justify-center bg-slate-100 rounded-xl p-2">
              <img
                src={selectedImage.dataUrl}
                alt="Handwritten solution preview"
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
