'use client';

import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { useContentGenerator } from '../hooks/useContentGenerator';
import type { GenerationType } from '../types/index';

export interface ContentGeneratorProps {
  type: GenerationType;
  context: Record<string, unknown>;
  onGenerated?: (content: string) => void;
  className?: string;
}

export function ContentGenerator({ type, context, onGenerated, className }: ContentGeneratorProps) {
  const { generate, isGenerating, error } = useContentGenerator();
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      const res = await generate(type, context);
      setResult(res.content);
      onGenerated?.(res.content);
    } catch {
      // Error handled by hook
    }
  };

  const labels: Record<GenerationType, string> = { title: 'Title', description: 'Description', summary: 'Summary', tags: 'Tags', seo: 'SEO Meta' };

  return (
    <div className={cn('rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Generate {labels[type]}</span>
        <button onClick={handleGenerate} disabled={isGenerating} className={cn('rounded bg-purple-600 px-3 py-1 text-sm text-white', isGenerating ? 'opacity-50' : 'hover:bg-purple-700')}>
          {isGenerating ? '✨ Generating...' : '✨ Generate'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {result && (
        <div className="rounded bg-gray-50 p-3 text-sm">
          <p>{result}</p>
          <button onClick={() => onGenerated?.(result)} className="mt-2 text-xs text-blue-600 hover:underline">Use this</button>
        </div>
      )}
    </div>
  );
}
