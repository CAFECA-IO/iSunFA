import { useState, useEffect, FC, MouseEvent } from "react";
import { ILariaMetadata, downloadFile } from "@/lib/file_operator";

export const getExtension = (filename: string) => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

export const isImage = (filename: string) => {
  const ext = getExtension(filename);
  return ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
};

export const isVideo = (filename: string) => {
  const ext = getExtension(filename);
  return ["mp4", "mov", "webm", "ogg"].includes(ext);
};

export const isAudio = (filename: string) => {
  const ext = getExtension(filename);
  return ["mp3", "wav", "ogg", "m4a"].includes(ext);
};

export const isPdf = (filename: string) => {
  const ext = getExtension(filename);
  return ext === "pdf";
};

export interface IFilePreviewProps {
  file: ILariaMetadata | { filename: string; mimeType?: string };
  className?: string;
  fileId?: string;
  url?: string;
  base64?: string;
  progress?: number;
  loadPreview?: (
    file: ILariaMetadata | { filename: string; mimeType?: string },
  ) => void;
}

// Info: (20260302 - Julian) 實作下載等候室：儲存目前正在被遠端抓取的 fileId，如果同一時間有多個元件需要抓取同一 fileId 的檔案，可以避免重複抓取
const inProgressDownloads = new Map<
  string,
  {
    progressListeners: ((p: number) => void)[];
    successListeners: ((blob: Blob, filename?: string) => void)[];
    errorListeners: ((err: string) => void)[];
  }
>();

export const FilePreview: FC<IFilePreviewProps> = ({
  file: initialFile,
  fileId = undefined,
  url = undefined,
  base64: initialBase64 = undefined,
  progress = undefined,
  loadPreview = undefined,
  className = undefined,
}) => {
  const [downloadedBase64, setDownloadedBase64] = useState<string | undefined>(
    undefined,
  );
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [meta, setMeta] = useState<{ filename: string; mimeType?: string }>({
    filename: initialFile.filename,
    mimeType: initialFile.mimeType,
  });

  const [prevProps, setPrevProps] = useState({ fileId, initialBase64, url });
  if (
    prevProps.fileId !== fileId ||
    prevProps.initialBase64 !== initialBase64 ||
    prevProps.url !== url
  ) {
    setPrevProps({ fileId, initialBase64, url });
    setDownloadedBase64(undefined);
    setMeta({
      filename: initialFile.filename,
      mimeType: initialFile.mimeType,
    });
  }

  const localBase64 = initialBase64 || downloadedBase64;
  const localUrl = url;

  useEffect(() => {
    let isCancelled = false;

    const initDownload = async () => {
      if (fileId && !localBase64 && !url) {
        setIsDownloading(true);

        const onProg = (p: number) => {
          if (!isCancelled) setDownloadProgress(p);
        };
        const onSucc = (blob: Blob, filename?: string) => {
          if (isCancelled) return;
          if (filename) {
            setMeta((prev) => {
              const hasNoExt = prev.filename && !prev.filename.includes(".");
              const newHasExt = filename.includes(".");
              if (
                !prev.filename ||
                prev.filename === fileId ||
                prev.filename === "Unknown" ||
                (hasNoExt && newHasExt)
              ) {
                return { ...prev, filename, mimeType: blob.type };
              }
              // Info: (20260320 - Julian) 即使檔名存在，也保留正確的 mimeType
              return { ...prev, mimeType: blob.type };
            });
          }

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            if (!isCancelled) {
              setDownloadedBase64(reader.result as string);
              setIsDownloading(false);
            }
          };
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
            errorListeners: [onErr],
          };
          inProgressDownloads.set(fileId, handlers);

          downloadFile(fileId, {
            onProgress: (p) => {
              inProgressDownloads
                .get(fileId)
                ?.progressListeners.forEach((cb) => cb(p));
            },
            onSuccess: (blob, filename) => {
              // Info: (20260302 - Julian) Must cache immediately just in case
              const hl =
                inProgressDownloads.get(fileId)?.successListeners || [];
              inProgressDownloads.delete(fileId);
              hl.forEach((cb) => cb(blob, filename));
            },
            onError: (err: string) => {
              const hl = inProgressDownloads.get(fileId)?.errorListeners || [];
              inProgressDownloads.delete(fileId);
              hl.forEach((cb) => cb(err));
            },
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
    ? localBase64.startsWith("data:")
      ? localBase64
      : `data:${meta.mimeType || "application/octet-stream"};base64,${localBase64}`
    : localUrl;

  const currentProgress =
    progress !== undefined
      ? progress
      : isDownloading
        ? downloadProgress
        : undefined;

  if (isDownloading && !previewUrl) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center bg-gray-50/50 ${className}`}
      >
        <div className="relative flex h-8 w-8 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-orange-100"></div>
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
            style={{
              clipPath: `polygon(0 0, 100% 0, 100% ${currentProgress || 0}%, 0 ${currentProgress || 0}%)`,
            }}
          ></div>
          <span className="text-[10px] font-bold text-orange-600">
            {Math.round(currentProgress || 0)}%
          </span>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    if (currentProgress !== undefined) {
      return (
        <div className={`w-full ${className || "mt-2"}`}>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Loading preview...</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      );
    }

    const ext = getExtension(meta.filename);
    const supported =
      ["png", "jpg", "jpeg", "mp4", "mov", "mp3", "m3u8", "pdf"].includes(
        ext,
      ) || !!meta.mimeType;
    if (supported && loadPreview) {
      return (
        <button
          onClick={() => loadPreview(meta)}
          className={`flex items-center gap-1 text-xs font-medium text-blue-500 hover:underline ${className || "mt-2"}`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-blue-500 text-[10px]">
            ▶
          </span>
          Load Preview
        </button>
      );
    }

    // Info: (20260302 - Julian) Fallback Icon for non-previewable or not-yet-loaded
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </div>
    );
  }

  const preventContext = (e: MouseEvent) => e.preventDefault();
  const isImg = isImage(meta.filename) || meta.mimeType?.startsWith("image/");
  const isVid = isVideo(meta.filename) || meta.mimeType?.startsWith("video/");
  const isAud = isAudio(meta.filename) || meta.mimeType?.startsWith("audio/");
  const isPDF = isPdf(meta.filename) || meta.mimeType === "application/pdf";

  if (isImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={meta.filename}
        className={
          className ||
          "mt-2 max-h-[400px] w-auto rounded-lg bg-black/5 object-contain shadow-sm"
        }
        onContextMenu={preventContext}
      />
    );
  }
  if (isVid) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        controls
        controlsList="nodownload"
        src={previewUrl}
        className={
          className ||
          "mt-2 max-h-[400px] w-full max-w-[600px] rounded-lg bg-black shadow-sm"
        }
        aria-label={`Video preview for ${meta.filename}`}
        onContextMenu={preventContext}
      />
    );
  }
  if (isAud) {
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
  if (isPDF) {
    return (
      <iframe
        src={`${previewUrl}#toolbar=0`}
        className={
          className ||
          "mt-2 h-[600px] w-full rounded-lg border border-white/10 bg-white"
        }
        title={`PDF preview for ${meta.filename}`}
      />
    );
  }

  // Info: (20260302 - Julian) Final fallback
  return (
    <div
      className={`flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
    </div>
  );
};
