"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DeleteListingResult } from "@/app/actions/listings";

interface DeleteListingButtonProps {
  listingId: string;
  listingTitle: string;
  deleteAction: (formData: FormData) => Promise<DeleteListingResult>;
}

export function DeleteListingButton({
  listingId,
  listingTitle,
  deleteAction,
}: DeleteListingButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(
      `Delete "${listingTitle}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    const formData = new FormData();
    formData.set("id", listingId);

    startTransition(async () => {
      const result = await deleteAction(formData);
      if (result.success) {
        router.refresh();
        router.push("/listings");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600" title={error}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </span>
  );
}
