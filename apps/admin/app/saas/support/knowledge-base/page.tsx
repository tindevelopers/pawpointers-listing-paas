"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { PlusIcon, PencilIcon, MagnifyingGlassIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { TrashBinIcon as TrashIcon } from "@/icons";
import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { DocumentUploader } from "@/components/knowledge-base/DocumentUploader";

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  source_type: "manual" | "listing" | "faq" | "article" | "upload";
  source_url?: string | null;
  source_id?: string | null;
  metadata?: Record<string, unknown> | null;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.error?.message || error.message || "Request failed");
  }

  const data = await response.json();
  return data.data || data;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
    sourceType: "manual" as const,
    isActive: true,
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "100",
        ...(search && { search }),
        ...(sourceTypeFilter && { sourceType: sourceTypeFilter }),
      });
      const data = await apiRequest<{ data: KnowledgeDocument[]; pagination?: unknown }>(
        `/api/knowledge-base?${queryParams}`
      );
      setDocuments(Array.isArray(data) ? data : data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, sourceTypeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        sourceType: formData.sourceType,
        isActive: formData.isActive,
      };

      if (editingId) {
        await apiRequest(`/api/knowledge-base/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/knowledge-base", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        category: "",
        tags: "",
        sourceType: "manual",
        isActive: true,
      });
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document");
      console.error("Save error:", err);
    }
  };

  const handleEdit = (doc: KnowledgeDocument) => {
    setEditingId(doc.id);
    setFormData({
      title: doc.title,
      content: doc.content,
      excerpt: doc.excerpt || "",
      category: doc.category || "",
      tags: doc.tags?.join(", ") || "",
      sourceType: doc.source_type,
      isActive: doc.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      setError(null);
      await apiRequest(`/api/knowledge-base/${id}`, {
        method: "DELETE",
      });
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
      console.error("Delete error:", err);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      setError(null);
      await apiRequest(`/api/knowledge-base/${id}/toggle-active`, {
        method: "POST",
      });
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle status");
      console.error("Toggle error:", err);
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.category?.toLowerCase().includes(search.toLowerCase()) ||
      doc.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageBreadcrumb pageTitle="Knowledge Base" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Create and manage help articles for customers
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({
                title: "",
                content: "",
                excerpt: "",
                category: "",
                tags: "",
                sourceType: "manual",
                isActive: true,
              });
              setShowUpload(false);
              setShowForm(!showForm);
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Create Article
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant={showUpload ? "outline" : "solid"}
            onClick={() => {
              setShowUpload(true);
              setShowForm(false);
            }}
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            Upload File
          </Button>
          <Button
            variant={!showUpload ? "outline" : "ghost"}
            onClick={() => {
              setShowUpload(false);
              setShowForm(true);
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Manual Entry
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
          />
          <div className="mt-3 flex gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Source</span>
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                <option value="manual">Manual</option>
                <option value="upload">Upload</option>
                <option value="listing">Listing</option>
                <option value="faq">FAQ</option>
                <option value="article">Article</option>
              </select>
            </label>
          </div>
        </div>

        {showUpload && (
          <DocumentUploader
            onUploaded={() => {
              setShowUpload(false);
              fetchDocuments();
            }}
          />
        )}

        {showForm && !showUpload && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? "Edit Article" : "Create Article"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="article-title">Article Title *</Label>
                <Input
                  id="article-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Getting Started Guide"
                  required
                />
              </div>
              <div>
                <Label htmlFor="article-category">Category</Label>
                <Input
                  id="article-category"
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Getting Started"
                />
              </div>
              <div>
                <Label htmlFor="article-tags">Tags (comma-separated)</Label>
                <Input
                  id="article-tags"
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., guide, tutorial, help"
                />
              </div>
              <div>
                <Label htmlFor="article-content">Content *</Label>
                <TextArea
                  id="article-content"
                  rows={10}
                  value={formData.content}
                  onChange={(value) =>
                    setFormData({ ...formData, content: value })
                  }
                  placeholder="Article content..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="article-excerpt">Excerpt</Label>
                <TextArea
                  id="article-excerpt"
                  rows={3}
                  value={formData.excerpt}
                  onChange={(value) =>
                    setFormData({ ...formData, excerpt: value })
                  }
                  placeholder="Short summary (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="article-active"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="article-active" className="mb-0">
                  Active (visible to public)
                </Label>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? "Update Article" : "Save Article"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              No documents found. Create your first article to get started.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Helpful
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <a
                          href={`/saas/support/knowledge-base/${doc.id}`}
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {doc.title}
                        </a>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {doc.metadata && typeof doc.metadata === "object" && "source_file_name" in doc.metadata
                          ? String((doc.metadata as Record<string, unknown>).source_file_name)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {doc.category || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <span className="text-xs capitalize">{doc.source_type}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {doc.view_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {doc.helpful_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(doc.id)}
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            doc.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {doc.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(doc)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
