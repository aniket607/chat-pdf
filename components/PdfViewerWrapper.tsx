"use client";

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import { PdfViewerRef } from './PdfViewer';

type PdfViewerProps = {
  docId: string;
};

// Dynamically import PdfViewer to avoid SSR issues with react-pdf
const PdfViewerDynamic = dynamic(
  () => import('./PdfViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading PDF viewer...</span>
        </div>
      </div>
    ),
  }
);

const PdfViewerWrapper = forwardRef<PdfViewerRef, PdfViewerProps>((props, ref) => {
  return <PdfViewerDynamic {...props} ref={ref} />;
});

PdfViewerWrapper.displayName = 'PdfViewerWrapper';

export default PdfViewerWrapper;
export type { PdfViewerRef };
