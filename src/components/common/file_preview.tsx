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

// Info: (20260302 - Julian) 實作下載等候室：儲存目前正在被遠端抓取的 fileId，如果同一時間有多個元件需要抓取同一 fileId 的檔案，可以避免重複抓取
const inProgressDownloads = new Map<string, {
  progressListeners: ((p: number) => void)[];
  successListeners: ((blob: Blob, filename?: string) => void)[];
  errorListeners: ((err: string) => void)[];
}>();

// Info: (20260302 - Julian) 實作 HEIC 轉檔快取：避免同一時間有多個元件需要轉檔同一個 HEIC 檔案，避免重複轉檔
const heicCache = new Map<string, Blob | null>();
const heicPromises = new Map<string, Promise<Blob | null>>();

// Info: (20260302 - Julian) 實作 HEIC 轉檔：將 HEIC 檔案轉檔為 JPEG 檔案
const convertHeicToJpeg = async (sourceBlob: Blob, cacheKey: string): Promise<Blob | null> => {
  if (heicCache.has(cacheKey)) return heicCache.get(cacheKey)!;
  if (heicPromises.has(cacheKey)) return heicPromises.get(cacheKey)!;
  
  const promise = (async () => {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: sourceBlob,
        toType: 'image/jpeg',
      });
      let finalBlob: Blob | undefined;
      if (convertedBlob) {
        finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      }
      heicCache.set(cacheKey, finalBlob || null);
      heicPromises.delete(cacheKey);
      return finalBlob || null;
    } catch (e) {
      console.error("Failed to convert HEIC:", e);
      heicCache.set(cacheKey, null);
      heicPromises.delete(cacheKey);
      return null;
    }
  })();
  
  heicPromises.set(cacheKey, promise);
  return promise;
};

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
    let isCancelled = false;
    const checkInitialHeic = async () => {
      const isHeic = initialFile.mimeType === 'image/heic' || initialFile.mimeType === 'image/heif' || 
                      initialFile.filename.toLowerCase().endsWith('.heic') || initialFile.filename.toLowerCase().endsWith('.heif');
      
      const sourceUrl = initialBase64 
        ? (initialBase64.startsWith('data:') ? initialBase64 : `data:image/heic;base64,${initialBase64}`) 
        : url;

      if (sourceUrl && isHeic) {
        setIsDownloading(true);
        try {
          // Fetch the object URL or reconstruct a blob from base64
          const res = await fetch(sourceUrl);
          const inputBlob = await res.blob();
          
          // Use checksum or url proxy as cache key (approx) 
          // (for base64 we can use a hash or just the string length + first few chars)
          const cacheKey = sourceUrl.length > 500 ? `b64-${sourceUrl.length}-${sourceUrl.slice(sourceUrl.length - 20)}` : sourceUrl;
          
          const finalBlob = await convertHeicToJpeg(inputBlob, cacheKey);
          
          if (isCancelled) return;
          
          if (finalBlob) {
             const objectUrl = URL.createObjectURL(finalBlob);
             setLocalUrl(objectUrl);
             setLocalBase64(undefined);
             setIsDownloading(false);
          } else {
             setLocalUrl(url);
             setLocalBase64(initialBase64);
             setIsDownloading(false);
          }
        } catch (e) {
          if (isCancelled) return;
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
    return () => { isCancelled = true; };
  }, [initialBase64, initialFile.mimeType, initialFile.filename, url]);

  useEffect(() => {
    let isCancelled = false;
    
    const initDownload = async () => {
      if (fileId && !localBase64 && !url) {
        setIsDownloading(true);
        
        const onProg = (p: number) => { if (!isCancelled) setDownloadProgress(p); };
        const onSucc = (blob: Blob, filename?: string) => {
          if (isCancelled) return;
          if (filename) {
            setMeta(prev => {
              if (!prev.filename || prev.filename === fileId) {
                return { ...prev, filename, mimeType: blob.type };
              }
              return prev;
            });
          }
          
          const processBlob = async (inputBlob: Blob) => {
            try {
              let finalBlob = inputBlob;
              const isHeic = inputBlob.type === 'image/heic' || inputBlob.type === 'image/heif' || 
                             filename?.toLowerCase().endsWith('.heic') || filename?.toLowerCase().endsWith('.heif');
                             
              if (isHeic) {
                const res = await convertHeicToJpeg(inputBlob, fileId);
                if (res) finalBlob = res;
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
        };
        const onErr = (err: string) => { 
          console.error("Failed to download file:", err);
          if (!isCancelled) setIsDownloading(false); 
        };

        if (inProgressDownloads.has(fileId)) {
          const handlers = inProgressDownloads.get(fileId)!;
          handlers.progressListeners.push(onProg);
          handlers.successListeners.push(onSucc);
          handlers.errorListeners.push(onErr);
        } else {
          const handlers = {
            progressListeners: [onProg],
            successListeners: [onSucc],
            errorListeners: [onErr]
          };
          inProgressDownloads.set(fileId, handlers);
          
          downloadFile(fileId, {
            onProgress: (p) => {
              inProgressDownloads.get(fileId)?.progressListeners.forEach(cb => cb(p));
            },
            onSuccess: (blob, filename) => {
              // Must cache immediately just in case
              const hl = inProgressDownloads.get(fileId)?.successListeners || [];
              inProgressDownloads.delete(fileId);
              hl.forEach(cb => cb(blob, filename));
            },
            onError: (err: string) => {
              const hl = inProgressDownloads.get(fileId)?.errorListeners || [];
              inProgressDownloads.delete(fileId);
              hl.forEach(cb => cb(err));
            }
          });
        }
      }
    };

    initDownload();
    
    return () => {
      isCancelled = true;
    };
  }, [fileId, localBase64, url]);

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

