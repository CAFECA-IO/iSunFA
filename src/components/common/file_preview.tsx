import React from 'react';
import { ILariaMetadata } from '@/lib/file_operator';

export const getExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImage = (filename: string) => {
  const ext = getExtension(filename);
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
};

export const isVideo = (filename: string) => {
  const ext = getExtension(filename);
  return ['mp4', 'mov', 'webm', 'ogg'].includes(ext);
};

export const isAudio = (filename: string) => {
  const ext = getExtension(filename);
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
};

export const isPdf = (filename: string) => {
  const ext = getExtension(filename);
  return ext === 'pdf';
};

export interface IFilePreviewProps {
  file: ILariaMetadata;
  url?: string;
  base64?: string;
  progress?: number;
  loadPreview?: (file: ILariaMetadata) => void;
}

export const FilePreview: React.FC<IFilePreviewProps> = ({ file, url, base64, progress, loadPreview }) => {
  const previewUrl = base64
    ? (base64.startsWith('data:') ? base64 : `data:${file.mimeType || 'application/octet-stream'};base64,${base64}`)
    : url;

  if (!previewUrl) {
    if (progress !== undefined) {
      return (
        <div className="w-full mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Loading preview...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    }

    const ext = getExtension(file.filename);
    const supported = ['png', 'jpg', 'jpeg', 'mp4', 'mov', 'mp3', 'm3u8', 'pdf'].includes(ext);
    if (supported && loadPreview) {
      return (
        <button
          onClick={() => loadPreview(file)}
          className="text-xs text-blue-500 mt-2 hover:underline font-medium flex items-center gap-1"
        >
          <span className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[10px]">▶</span>
          Load Preview
        </button>
      );
    }
    return null;
  }

  const preventContext = (e: React.MouseEvent) => e.preventDefault();

  if (isImage(file.filename)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={file.filename}
        className="mt-2 rounded-lg max-h-[400px] w-auto object-contain bg-black/5 shadow-sm"
        onContextMenu={preventContext}
      />
    );
  }
  if (isVideo(file.filename)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        controls
        controlsList="nodownload"
        src={previewUrl}
        className="mt-2 rounded-lg max-h-[400px] w-full max-w-[600px] bg-black shadow-sm"
        aria-label={`Video preview for ${file.filename}`}
        onContextMenu={preventContext}
      />
    );
  }
  if (isAudio(file.filename)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        controls
        controlsList="nodownload"
        src={previewUrl}
        className="mt-2 w-full max-w-[400px]"
        aria-label={`Audio preview for ${file.filename}`}
        onContextMenu={preventContext}
      />
    );
  }
  if (isPdf(file.filename)) {
    return (
      <iframe
        src={`${previewUrl}#toolbar=0`}
        className="mt-2 rounded-lg w-full h-[600px] bg-white border border-white/10"
        title={`PDF preview for ${file.filename}`}
      />
    );
  }
  return null;
};
