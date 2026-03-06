"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationField } from "./LocationField";

const DESC_MAX = 500;
const FORM_ID = "create-listing-form";

type CreateListingFormProps = {
  createListing: (formData: FormData) => Promise<void>;
};

export function CreateListingForm({ createListing }: CreateListingFormProps) {
  const router = useRouter();
  const [descLength, setDescLength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData, status: "draft" | "published") {
    setIsSubmitting(true);
    formData.set("status", status);
    try {
      await createListing(formData);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      id={FORM_ID}
      className="mt-4 grid gap-4 md:grid-cols-2"
      action={createListing}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const status = (submitter?.getAttribute("value") as "draft" | "published") || "draft";
        const formData = submitter ? new FormData(form, submitter) : new FormData(form);
        handleSubmit(formData, status);
      }}
    >
      <div className="md:col-span-2 space-y-2">
        <label className="text-sm font-medium text-gray-700" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. Happy Paws Grooming"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500">This name will appear publicly.</p>
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-sm font-medium text-gray-700" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={DESC_MAX}
          placeholder="Short description of your service."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          onChange={(e) => setDescLength(e.target.value.length)}
        />
        <p className="text-right text-xs text-gray-500">
          {descLength}/{DESC_MAX}
        </p>
      </div>

      <div className="md:col-span-2">
        <LocationField formId={FORM_ID} />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          name="status"
          value="draft"
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          Save Draft
        </button>
        <button
          type="submit"
          name="status"
          value="published"
          disabled={isSubmitting}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium !text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
        >
          Publish
        </button>
      </div>
    </form>
  );
}
