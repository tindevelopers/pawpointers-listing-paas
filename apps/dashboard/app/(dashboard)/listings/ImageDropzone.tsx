"use client";

import { useRef, useState } from "react";

const inputId = "featuredImageFile";

export function ImageDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const setFile = (file: File | null) => {
    const input = inputRef.current;
    if (!input) return;
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      setFileName(file.name);
    } else {
      input.value = "";
      setFileName(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Featured image (optional)
      </label>
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`
          flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6
          transition-colors
          ${isDragActive ? "border-orange-500 bg-orange-50/50" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"}
        `}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="featuredImageFile"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleChange}
        />
        {fileName ? (
          <>
            <p className="text-sm font-medium text-gray-700">{fileName}</p>
            <p className="mt-1 text-xs text-gray-500">Click or drag to replace</p>
          </>
        ) : (
          <>
            <p className="text-center text-sm font-medium text-gray-600">
              Drag & drop image here or upload file
            </p>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
          </>
        )}
      </div>
    </div>
  );
}
