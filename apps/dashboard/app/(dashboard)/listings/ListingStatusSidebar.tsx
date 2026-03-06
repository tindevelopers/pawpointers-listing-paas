"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, BoltIcon } from "@/icons";

const FORM_ID = "create-listing-form";
const DESC_MAX = 500;

function useListingProgress() {
  const [progress, setProgress] = useState({ title: false, description: false, address: false });

  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!form) return;

    const check = () => {
      const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement | null;
      const descInput = form.querySelector("#description") as HTMLTextAreaElement | null;
      const addressInput = form.querySelector('input[name="address"]') as HTMLInputElement | null;

      setProgress({
        title: !!(titleInput?.value?.trim()),
        description: !!(descInput?.value?.trim()),
        address: !!(addressInput?.value?.trim()),
      });
    };

    check();
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    return () => {
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
    };
  }, []);

  const done = [progress.title, progress.description, progress.address].filter(Boolean).length;
  const percent = Math.round((done / 3) * 100);

  return { progress, percent };
}

export function ListingStatusSidebar() {
  const { progress, percent } = useListingProgress();

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Listing Status</h3>
        <p className="mt-2 text-2xl font-semibold text-gray-900">{percent}% Complete</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-sm text-gray-700">
            {progress.title ? (
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
            )}
            Add a title
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-700">
            {progress.description ? (
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
            )}
            Add a description
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-700">
            {progress.address ? (
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
            )}
            Add an address
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-700">
            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
            <Link href="/media" className="text-orange-600 hover:text-orange-700 hover:underline">
              Upload images
            </Link>
          </li>
        </ul>
      </div>

      <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <BoltIcon className="h-5 w-5 text-orange-500" />
          Tips for better visibility
        </h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-gray-600">
          <li>Add at least 3 photos</li>
          <li>Write a 150+ character description</li>
          <li>Keep your business hours updated</li>
        </ul>
      </div>
    </div>
  );
}
