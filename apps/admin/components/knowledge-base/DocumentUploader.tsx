"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Button from "@/components/ui/button/Button";

type Props = {
  onUploaded?: () => void;
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
};

export function DocumentUploader({ onUploaded }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: ACCEPT,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setStatus("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      setStatus("success");
      setSelectedFile(null);
      onUploaded?.();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Supported: PDF, DOCX, TXT. Max size {Math.round(MAX_SIZE / (1024 * 1024))}MB.
      </p>
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragActive
            ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
            : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        }`}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drag & drop a file here, or click to select
          </p>
        )}
      </div>

      {status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200">
          Upload complete.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleUpload} disabled={!selectedFile || status === "uploading"}>
          {status === "uploading" ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}

