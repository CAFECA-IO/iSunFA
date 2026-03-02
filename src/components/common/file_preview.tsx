import React, { useState, useEffect } from 'react';
import { ILariaMetadata, downloadFile } from '@/lib/file_operator';

export const getExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImage = (filename: string) => {
  const ext = getExtension(filename);
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp','heic'].includes(ext);
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
  file: ILariaMetadata | { filename: string; mimeType?: string };
  className?: string;
  fileId?: string;
  url?: string;
  base64?: string;
  progress?: number;
  loadPreview?: (file: ILariaMetadata | { filename: string; mimeType?: string }) => void;
}

export const FilePreview: React.FC<IFilePreviewProps> = ({ file: initialFile, fileId, url, base64: initialBase64, progress, loadPreview, className }) => {
  const [localBase64, setLocalBase64] = useState<string | undefined>(initialBase64);
  const [localUrl, setLocalUrl] = useState<string | undefined>(url);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [meta, setMeta] = useState<{ filename: string; mimeType?: string }>({
    filename: initialFile.filename,
    mimeType: initialFile.mimeType,
  });

  useEffect(() => {
    // Info: (20260302 - Julian) Convert incoming base64 or URL if it's HEIC so local previews work
    const checkInitialHeic = async () => {
      const isHeic = initialFile.mimeType === 'image/heic' || initialFile.mimeType === 'image/heif' || 
                      initialFile.filename.toLowerCase().endsWith('.heic') || initialFile.filename.toLowerCase().endsWith('.heif');
      
      const sourceUrl = initialBase64 
        ? (initialBase64.startsWith('data:') ? initialBase64 : `data:image/heic;base64,${initialBase64}`) 
        : url;

      if (sourceUrl && isHeic) {
        setIsDownloading(true);
        try {
          const heic2any = (await import('heic2any')).default;
          // Fetch the object URL or reconstruct a blob from base64
          const res = await fetch(sourceUrl);
          const inputBlob = await res.blob();
          const convertedBlob = await heic2any({
            blob: inputBlob,
            toType: 'image/jpeg',
          });
          
          let finalBlob: Blob | undefined;
          if (convertedBlob) {
             finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          }
          
          if (finalBlob) {
             const objectUrl = URL.createObjectURL(finalBlob);
             setLocalUrl(objectUrl);
             setIsDownloading(false);
          } else {
             setLocalUrl(url);
             setLocalBase64(initialBase64);
             setIsDownloading(false);
          }
        } catch (e) {
          console.error("Failed to convert initial HEIC:", e);
          setLocalUrl(url);
          setLocalBase64(initialBase64);
          setIsDownloading(false);
        }
      } else {
        setLocalUrl(url);
        setLocalBase64(initialBase64);
      }
    };
    
    checkInitialHeic();
  }, [initialBase64, initialFile.mimeType, initialFile.filename, url]);

  useEffect(() => {
    let isCancelled = false;
    
    if (fileId && !localBase64 && !url) {
      setIsDownloading(true);
      downloadFile(fileId, {
        onProgress: (p) => {
          if (!isCancelled) setDownloadProgress(p);
        },
        onSuccess: (blob, filename) => {
          if (isCancelled) return;
          
          // Info: (20260226 - Julian) Update metadata if discovered from download
          if (filename && (!meta.filename || meta.filename === fileId)) {
            setMeta({ filename, mimeType: blob.type });
          }
          
          const processBlob = async (inputBlob: Blob) => {
            try {
              let finalBlob = inputBlob;
              const isHeic = inputBlob.type === 'image/heic' || inputBlob.type === 'image/heif' || 
                             filename.toLowerCase().endsWith('.heic') || filename.toLowerCase().endsWith('.heif');
                             
              if (isHeic) {
                const heic2any = (await import('heic2any')).default;
                
                const convertedBlob = await heic2any({
                  blob: inputBlob,
                  toType: 'image/jpeg',
                });
                // heic2any can return Blob | Blob[]. Handle both.
                if (convertedBlob) {
                   finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                }
              }
              
              if (isCancelled) return;
              
              const reader = new FileReader();
              reader.readAsDataURL(finalBlob);
              reader.onloadend = () => {
                if (!isCancelled) {
                  setLocalBase64(reader.result as string);
                  setIsDownloading(false);
                }
              };
            } catch (err) {
              console.error("Failed to process HEIC image:", err);
              if (!isCancelled) setIsDownloading(false);
            }
          };

          processBlob(blob);
        },
        onError: (err) => {
          console.error("Failed to download file:", err);
          if (!isCancelled) setIsDownloading(false);
        }
      });
    }
    
    return () => {
      isCancelled = true;
    };
  }, [fileId, localBase64, url, meta.filename]);

  const previewUrl = localBase64
    ? (localBase64.startsWith('data:') ? localBase64 : `data:${meta.mimeType || 'application/octet-stream'};base64,${localBase64}`)
    : localUrl;

  const currentProgress = progress !== undefined ? progress : (isDownloading ? downloadProgress : undefined);

  if (isDownloading && !previewUrl) {
    return (
      <div className={`flex flex-col items-center justify-center w-full h-full bg-gray-50/50 ${className}`}>
        <div className="relative w-8 h-8 flex items-center justify-center">
             <div className="absolute inset-0 border-2 border-orange-100 rounded-full"></div>
             <div 
               className="absolute inset-0 border-2 border-orange-500 rounded-full border-t-transparent animate-spin"
               style={{ clipPath: `polygon(0 0, 100% 0, 100% ${currentProgress || 0}%, 0 ${currentProgress || 0}%)` }}
             ></div>
             <span className="text-[10px] font-bold text-orange-600">{Math.round(currentProgress || 0)}%</span>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    if (currentProgress !== undefined) {
      return (
        <div className={`w-full ${className || 'mt-2'}`}>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Loading preview...</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      );
    }

    const ext = getExtension(meta.filename);
    const supported = ['png', 'jpg', 'jpeg', 'mp4', 'mov', 'mp3', 'm3u8', 'pdf','heic'].includes(ext);
    if (supported && loadPreview) {
      return (
        <button
          onClick={() => loadPreview(meta)}
          className={`text-xs text-blue-500 hover:underline font-medium flex items-center gap-1 ${className || 'mt-2'}`}
        >
          <span className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[10px]">▶</span>
          Load Preview
        </button>
      );
    }
    
    // Fallback Icon for non-previewable or not-yet-loaded
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </div>
    );
  }

  const preventContext = (e: React.MouseEvent) => e.preventDefault();

    if (isImage(meta.filename)) {
      // If it's HEIC locally passed in via base64, usually that doesn't work in src either. 
      // But in this implementation `localBase64` will be the JPEG we just computed in `processBlob`.
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={meta.filename}
          className={className || "mt-2 rounded-lg max-h-[400px] w-auto object-contain bg-black/5 shadow-sm"}
          onContextMenu={preventContext}
        />
      );
    }
  if (isVideo(meta.filename)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        controls
        controlsList="nodownload"
        src={previewUrl}
        className={className || "mt-2 rounded-lg max-h-[400px] w-full max-w-[600px] bg-black shadow-sm"}
        aria-label={`Video preview for ${meta.filename}`}
        onContextMenu={preventContext}
      />
    );
  }
  if (isAudio(meta.filename)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        controls
        controlsList="nodownload"
        src={previewUrl}
        className={className || "mt-2 w-full max-w-[400px]"}
        aria-label={`Audio preview for ${meta.filename}`}
        onContextMenu={preventContext}
      />
    );
  }
  if (isPdf(meta.filename)) {
    return (
      <iframe
        src={`${previewUrl}#toolbar=0`}
        className={className || "mt-2 rounded-lg w-full h-[600px] bg-white border border-white/10"}
        title={`PDF preview for ${meta.filename}`}
      />
    );
  }
  
  // Final fallback
  return (
    <div className={`flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
    </div>
  );
};

