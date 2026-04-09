"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import Image from "next/image";
import {
  Loader2,
  Camera,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { uploadFile, fileToBase64 } from "@/lib/file_operator";
import {
  useOrderTransaction,
  IOrderPayload,
} from "@/hooks/use_order_transaction";
import { getAnalysisCost } from "@/lib/analysis/pricing";

type UploadedFileData = {
  id: string;
  file: File;
  previewUrl: string | null;
  hash: string;
  base64: string;
};

export default function JournalScanView({
  onScanComplete,
}: {
  onScanComplete: () => void;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [cvReady, setCvReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [capturedFiles, setCapturedFiles] = useState<UploadedFileData[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);

  // Info: (20260408 - Luphia) Payment workflow states
  const {
    workflowStatus,
    errorMessage,
    txHash,
    resetTransaction,
    executeOrderTransaction,
  } = useOrderTransaction();
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Info: (20260402 - Luphia) States for stabilization
  const stabilityRef = useRef({
    count: 0,
    lastArea: 0,
    lastPoints: [] as { x: number; y: number }[],
  });

  useEffect(() => {
    // Info: (20260402 - Luphia) Check if OpenCV is already loaded globally from a previous mount
    const w = window as typeof window & { cv: ReturnType<typeof JSON.parse> };
    if (
      typeof window !== "undefined" &&
      w.cv &&
      typeof w.cv.Mat === "function"
    ) {
      setCvReady(true);
    }
  }, []);

  const capturedFilesRef = useRef<UploadedFileData[]>([]);
  useEffect(() => {
    capturedFilesRef.current = capturedFiles;
  }, [capturedFiles]);

  useEffect(() => {
    return () => {
      // Info: (20260402 - Luphia) Only revoke on component unmount, not on every re-render
      capturedFilesRef.current.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const uploadCapturedImage = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      const hash = await new Promise<string>((resolve, reject) => {
        uploadFile(file, {
          onSuccess: (h) => resolve(h),
          onError: (e) => reject(e),
        });
      });
      const base64 = await fileToBase64(file);
      const fileData: UploadedFileData = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file), // Info: (20260402 - Luphia) Will be handled internally
        hash,
        base64,
      };

      setCapturedFiles((prev) => [...prev, fileData]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleAnalyzeAll = async () => {
    if (capturedFiles.length === 0) return;

    const costPerFile = getAnalysisCost({
      category: "journal_upload",
      periodType: "daily",
      year: new Date().getFullYear(),
      periodValue: "",
    });
    const totalCost = costPerFile * capturedFiles.length;

    const payload: IOrderPayload = {
      category: "journal_upload",
      periodType: "daily",
      periodValue: new Date().toISOString().split("T")[0],
      year: new Date().getFullYear(),
      items: [
        {
          name: "AI Journal OCR scan",
          unitPrice: costPerFile,
          quantity: capturedFiles.length,
        },
      ],
    };

    await executeOrderTransaction(payload, totalCost, async (authData) => {
      setShowConfirmModal(false);
      setIsAnalyzing(true);
      setAnalyzedCount(0);
      for (let i = 0; i < capturedFiles.length; i++) {
        const fileData = capturedFiles[i];
        const response = await request<IApiResponse<object>>(
          `/api/v1/user/account_book/${accountBookId}/ai_analysis`,
          {
            method: "POST",
            body: JSON.stringify({
              file: {
                id: fileData.id,
                file: { name: fileData.file.name, type: fileData.file.type },
                previewUrl: fileData.previewUrl,
                hash: fileData.hash,
                base64: fileData.base64,
              },
              authentication: authData,
            }),
          },
        );
        if (response.code === ApiCode.SUCCESS) {
          setAnalyzedCount((prev) => prev + 1);
        }
      }
      onScanComplete?.();
    });

    setIsAnalyzing(false);
  };

  const removeFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCapturedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      // Info: (20260402 - Luphia) Revoke blob url to free up memory when explicitly deleted
      if (file && file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const initCamera = async (isMounted: { current: boolean }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });

      if (!isMounted.current) {
        // Info: (20260402 - Luphia) Component unmounted while waiting for user media
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamReady(true);
        };
      } else {
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      if (isMounted.current) {
        console.error("Error accessing camera: ", error);
        setPermissionDenied(true);
      }
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    initCamera(isMounted);

    const currentVideoRef = videoRef.current;

    return () => {
      isMounted.current = false;
      // Info: (20260402 - Luphia) Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (currentVideoRef) {
        currentVideoRef.srcObject = null;
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const processFrame = useCallback(() => {
    if (
      !cvReady ||
      !streamReady ||
      isProcessing ||
      isAnalyzing ||
      capturedFiles.length >= 100 ||
      !videoRef.current ||
      !canvasRef.current ||
      !hiddenCanvasRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const cv = (window as typeof window & { cv: ReturnType<typeof JSON.parse> })
      .cv;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    // Info: (20260402 - Luphia) Match dimensions
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    const hiddenCtx = hiddenCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx || !hiddenCtx) return;

    // Info: (20260402 - Luphia) Draw the current video frame to hidden canvas for CV processing
    hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    // Info: (20260402 - Luphia) Clear overlay canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const src = new cv.Mat();
    const dst = new cv.Mat();
    const cap = new cv.Mat(hiddenCanvas.height, hiddenCanvas.width, cv.CV_8UC4);

    try {
      const imageData = hiddenCtx.getImageData(
        0,
        0,
        hiddenCanvas.width,
        hiddenCanvas.height,
      );
      cap.data.set(imageData.data);
      cv.cvtColor(cap, src, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(src, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      // Info: (20260402 - Luphia) Standard Canny thresholds to prevent picking up faint wall shadows
      cv.Canny(dst, dst, 50, 150);

      // Info: (20260402 - Luphia) Use a smaller 3x3 Dilate kernel to prevent merging document edges with background lines
      const M = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(
        dst,
        dst,
        M,
        new cv.Point(-1, -1),
        1,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue(),
      );
      M.delete();

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        dst,
        contours,
        hierarchy,
        cv.RETR_LIST, // Info: (20260404 - Luphia) RETR_LIST finds inner contours in case hand/shadow merges with paper edge
        cv.CHAIN_APPROX_SIMPLE,
      );

      let maxArea = 0;
      let maxContour = null;
      // Info: (20260402 - Luphia) Filter out small artifacts (reduce to 2% screen area minimum)
      const minDocArea = hiddenCanvas.width * hiddenCanvas.height * 0.02;

      const debugContours = [];
      const cw = canvas.width;
      const ch = canvas.height;
      const vw = hiddenCanvas.width;
      const vh = hiddenCanvas.height;

      const renderScale = Math.max(cw / vw, ch / vh);
      const offsetX = (cw - vw * renderScale) / 2;
      const offsetY = (ch - vh * renderScale) / 2;

      // Info: (20260402 - Luphia) Find largest quadrilateral
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);

        if (area > minDocArea) {
          const approx = new cv.Mat();
          const hull = new cv.Mat();
          cv.convexHull(cnt, hull, false, true);
          const hullPeri = cv.arcLength(hull, true);

          let found4 = false;

          // Info: (20260404 - Luphia) Sweeping over the convex hull prevents hand intrusions from breaking the 4 corners
          for (let eps = 0.02; eps <= 0.06; eps += 0.01) {
            cv.approxPolyDP(hull, approx, eps * hullPeri, true);
            if (approx.rows === 4) {
              found4 = true;
              break;
            }
          }

          // Info: (20260402 - Luphia) If it isn't 4 points, render it as a debug line anyway
          if (!found4) {
            cv.approxPolyDP(hull, approx, 0.05 * hullPeri, true);
          }

          // Info: (20260402 - Luphia) Save point geometry for debugging layer
          const polyPoints = [];
          for (let j = 0; j < approx.rows; j++) {
            polyPoints.push({
              x: approx.intPtr(j, 0)[0] * renderScale + offsetX,
              y: approx.intPtr(j, 0)[1] * renderScale + offsetY,
            });
          }
          debugContours.push(polyPoints);

          if (found4 && cv.isContourConvex(approx)) {
            // Info: (20260404 - Luphia) Extract the 4 corners
            const pts = [];
            for (let j = 0; j < 4; j++) {
              pts.push({
                x: approx.intPtr(j, 0)[0],
                y: approx.intPtr(j, 0)[1],
              });
            }

            // Info: (20260404 - Luphia) Calculate lengths of the 4 sides to prevent absurd perspective distortion (like one edge being tiny)
            const sideLengths = [];
            for (let j = 0; j < 4; j++) {
              const p1 = pts[j];
              const p2 = pts[(j + 1) % 4];
              sideLengths.push(Math.hypot(p1.x - p2.x, p1.y - p2.y));
            }

            // Info: (20260404 - Luphia) Opposite sides should be at least 40% of each other. If lower, the angle is too extreme.
            const minOpp1 = Math.min(sideLengths[0], sideLengths[2]);
            const maxOpp1 = Math.max(sideLengths[0], sideLengths[2]);
            const minOpp2 = Math.min(sideLengths[1], sideLengths[3]);
            const maxOpp2 = Math.max(sideLengths[1], sideLengths[3]);

            const ratio1 = maxOpp1 > 0 ? minOpp1 / maxOpp1 : 0;
            const ratio2 = maxOpp2 > 0 ? minOpp2 / maxOpp2 : 0;

            const isValidPerspective = ratio1 > 0.4 && ratio2 > 0.4;

            if (isValidPerspective) {
              // Info: (20260404 - Luphia) Evaluate maximum inner angle sharpness
              let maxCos = 0;
              for (let j = 0; j < 4; j++) {
                const p1 = pts[j];
                const p2 = pts[(j + 1) % 4];
                const p0 = pts[(j + 3) % 4];
                const dx1 = p1.x - p0.x;
                const dy1 = p1.y - p0.y;
                const dx2 = p1.x - p2.x;
                const dy2 = p1.y - p2.y;
                const cosine = Math.abs(
                  (dx1 * dx2 + dy1 * dy2) /
                    Math.sqrt(
                      (dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2) + 1e-6,
                    ),
                );
                maxCos = Math.max(maxCos, cosine);
              }

              // Info: (20260404 - Luphia) Relaxed max angle distortion to ~36 deg (0.8) since opposite lengths are strictly checked
              if (maxCos < 0.8 && area > maxArea) {
                maxArea = area;
                if (maxContour) maxContour.delete();
                maxContour = approx.clone();
              }
            }
          }

          approx.delete();
          hull.delete();
        }
        cnt.delete();
      }

      // Info: (20260402 - Luphia) Draw all candidate shapes in faint blue for debug observation
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)"; // Info: (20260402 - Luphia) blue-500
      debugContours.forEach((pts) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      });

      const prev = stabilityRef.current;

      if (maxContour) {
        // Info: (20260402 - Luphia) Draw the bounding box on the visible canvas wrapper scaling appropriately
        const points = [];
        for (let i = 0; i < 4; i++) {
          points.push({
            x: maxContour.intPtr(i, 0)[0] * renderScale + offsetX,
            y: maxContour.intPtr(i, 0)[1] * renderScale + offsetY,
          });
        }

        // Info: (20260402 - Luphia) Check for stability first to determine colors
        let isStabilizing = false;
        const areaDiff = Math.abs(prev.lastArea - maxArea) / maxArea;

        // Info: (20260404 - Luphia) Increased areaDiff tolerance to 0.20 for unsteady hands
        if (areaDiff < 0.2 && prev.lastPoints.length === 4) {
          // Info: (20260402 - Luphia) Calculate displacement of corners
          let totalDisp = 0;
          for (let i = 0; i < 4; i++) {
            const p1 = prev.lastPoints[i];
            const p2 = points[i];
            totalDisp += Math.hypot(p1.x - p2.x, p1.y - p2.y);
          }
          // Info: (20260404 - Luphia) Increased displacement tolerance to 400px to handle shaky hands
          if (totalDisp < 400) {
            isStabilizing = true;
          }
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = isStabilizing ? "#10b981" : "#f97316"; // Info: (20260402 - Luphia) Green if stable, Orange otherwise
        ctx.stroke();
        ctx.fillStyle = isStabilizing
          ? "rgba(16, 185, 129, 0.2)"
          : "rgba(249, 115, 22, 0.2)";
        ctx.fill();

        if (isStabilizing) {
          prev.count += 1;
        } else {
          // Info: (20260404 - Luphia) Leaky bucket drop instead of hard reset to handle occasional jitters
          prev.count = Math.max(0, prev.count - 2);
        }

        prev.lastArea = maxArea;
        prev.lastPoints = points;

        if (!isDetectingRef.current) {
          isDetectingRef.current = true;
          setIsDetecting(true);
        }

        // Info: (20260404 - Luphia) Auto capture after stable for roughly 15 frames (0.5 seconds)
        if (prev.count > 15) {
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 300);
          setIsProcessing(true);
          const origPoints = [];
          for (let i = 0; i < 4; i++) {
            origPoints.push({
              x: maxContour.intPtr(i, 0)[0],
              y: maxContour.intPtr(i, 0)[1],
            });
          }

          // Info: (20260402 - Luphia) Order points: top-left, top-right, bottom-right, bottom-left

          const topPoints = origPoints
            .sort((a, b) => a.y - b.y)
            .slice(0, 2)
            .sort((a, b) => a.x - b.x);
          const bottomPoints = origPoints
            .sort((a, b) => a.y - b.y)
            .slice(2, 4)
            .sort((a, b) => a.x - b.x);
          const tl = topPoints[0];
          const tr = topPoints[1];
          const bl = bottomPoints[0];
          const br = bottomPoints[1];

          const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
          const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
          const maxWidth = Math.max(widthA, widthB);

          const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
          const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
          const maxHeight = Math.max(heightA, heightB);

          const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
            tl.x,
            tl.y,
            tr.x,
            tr.y,
            br.x,
            br.y,
            bl.x,
            bl.y,
          ]);
          const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,
            maxWidth - 1,
            0,
            maxWidth - 1,
            maxHeight - 1,
            0,
            maxHeight - 1,
          ]);

          const dsize = new cv.Size(maxWidth, maxHeight);
          const transformMat = cv.getPerspectiveTransform(srcCoords, dstCoords);

          const warped = new cv.Mat();
          cv.warpPerspective(
            cap,
            warped,
            transformMat,
            dsize,
            cv.INTER_LINEAR,
            cv.BORDER_CONSTANT,
            new cv.Scalar(),
          );

          // Info: (20260402 - Luphia) Render deskewed image to canvas and extract blob
          const outCanvas = document.createElement("canvas");
          outCanvas.width = maxWidth;
          outCanvas.height = maxHeight;
          cv.imshow(outCanvas, warped);

          outCanvas.toBlob(
            (blob) => {
              if (blob) {
                // Info: (20260402 - Luphia) Remove previewUrl to avoid memory leaks
                uploadCapturedImage(blob);
              }
              // Info: (20260402 - Luphia) cleanup OpenCV objects early
              srcCoords.delete();
              dstCoords.delete();
              transformMat.delete();
              warped.delete();
            },
            "image/jpeg",
            0.95,
          );

          prev.count = 0; // Info: (20260402 - Luphia) reset
        }

        maxContour.delete();
      } else {
        if (isDetectingRef.current) {
          isDetectingRef.current = false;
          setIsDetecting(false);
        }
        prev.count = 0;
      }

      contours.delete();
      hierarchy.delete();
    } catch (err) {
      console.warn("OpenCV Error", err);
    } finally {
      src.delete();
      dst.delete();
      cap.delete();
    }

    if (!isProcessing && !isAnalyzing && capturedFiles.length < 100) {
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
  }, [
    cvReady,
    streamReady,
    isProcessing,
    isAnalyzing,
    capturedFiles.length,
    uploadCapturedImage,
  ]);

  useEffect(() => {
    if (
      cvReady &&
      streamReady &&
      !isProcessing &&
      !isAnalyzing &&
      capturedFiles.length < 100
    ) {
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [
    cvReady,
    streamReady,
    isProcessing,
    isAnalyzing,
    capturedFiles.length,
    processFrame,
  ]);

  return (
    <div className="relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-2xl bg-black lg:h-[calc(100vh-250px)]">
      <Script
        src="https://docs.opencv.org/4.8.0/opencv.js"
        strategy="lazyOnload"
        onLoad={() => {
          let iters = 0;
          const checkReady = setInterval(() => {
            const w = window as typeof window & {
              cv: ReturnType<typeof JSON.parse>;
            };
            if (w.cv && typeof w.cv.Mat === "function") {
              clearInterval(checkReady);
              setCvReady(true);
            }
            if (++iters > 100) clearInterval(checkReady);
          }, 100);
        }}
      />

      {permissionDenied ? (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
          <Camera className="mb-4 h-12 w-12 text-slate-500" />
          <h2 className="mb-2 text-xl font-bold">
            {t("ocr.camera_denied_title")}
          </h2>
          <p className="text-slate-400">{t("ocr.camera_denied_desc")}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            aria-label="Camera feed"
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Info: (20260402 - Luphia) Guiding UI Overlay */}
          <div className="pointers-events-none absolute inset-0 z-10">
            <div
              className={`absolute top-10 right-10 bottom-40 left-10 rounded-2xl border-4 border-dashed transition-all duration-300 ${
                isDetecting
                  ? "border-green-400 bg-green-500/10"
                  : "border-white/50"
              }`}
            >
              <div
                className={`absolute right-0 -bottom-10 left-0 text-center text-lg font-bold tracking-wide drop-shadow-md transition-colors ${
                  isDetecting ? "text-green-400" : "text-white"
                }`}
              >
                {isDetecting
                  ? t("ocr.hold_still")
                  : t("ocr.place_document_in_frame")}
              </div>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            aria-label="Detection overlay"
            className="pointers-events-none absolute inset-0 z-20 h-full w-full"
          />
          <canvas
            ref={hiddenCanvasRef}
            className="hidden"
            aria-label="Hidden processing canvas"
          />

          {/* Info: (20260402 - Luphia) Capture Flash Overlay */}
          <div
            className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-300 ${
              showFlash ? "opacity-100" : "opacity-0"
            }`}
          />

          {(!cvReady || !streamReady) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 text-white backdrop-blur-sm">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
              <p className="text-lg font-bold tracking-wide">
                {t("ocr.initializing")}
              </p>
            </div>
          )}

          {isProcessing && !isAnalyzing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-md">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-emerald-500" />
              <p className="text-2xl font-bold tracking-wide">
                {t("ocr.processing")}
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 z-100 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md backdrop-saturate-150 transition-all duration-300">
              <Loader2 className="mb-6 h-16 w-16 animate-spin text-orange-500 drop-shadow-md" />
              <p className="text-2xl font-bold tracking-wide text-slate-800 drop-shadow-sm">
                {t("ocr.analyzing")}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-2xl font-black tracking-tight text-orange-600">
                  {analyzedCount}
                </span>
                <span className="text-xl font-bold text-slate-400">/</span>
                <span className="text-2xl font-bold tracking-tight text-slate-600">
                  {capturedFiles.length}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-500">
                {t("ocr.please_wait")}
              </p>
            </div>
          )}

          <div className="absolute right-0 bottom-0 left-0 z-30 flex min-h-[120px] flex-col justify-end bg-linear-to-t from-black/80 to-transparent p-4 pb-6">
            {capturedFiles.length > 0 && (
              <div className="scrollbar-none mb-4 flex gap-3 overflow-x-auto pb-2">
                {capturedFiles.map((fileData, index) => (
                  <div
                    key={fileData.id}
                    className="relative h-16 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md ring-2 ring-white/50 transition-all hover:ring-white"
                    onClick={() => setPreviewIndex(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setPreviewIndex(index);
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={(e) => removeFile(fileData.id, e)}
                      className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Image
                      src={fileData.previewUrl || ""}
                      alt="Scan"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-2">
              <div className="w-1/3"></div>
              {/* Info: (20260402 - Luphia) Provide manual capture fallback */}
              <div className="flex w-1/3 justify-center">
                <button
                  aria-label="Capture document"
                  className="rounded-full border-4 border-white bg-white/20 p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:bg-white/40 disabled:opacity-50"
                  disabled={
                    capturedFiles.length >= 100 || isProcessing || isAnalyzing
                  }
                  onClick={() => {
                    if (
                      !hiddenCanvasRef.current ||
                      isProcessing ||
                      isAnalyzing ||
                      capturedFiles.length >= 100
                    )
                      return;
                    setShowFlash(true);
                    setTimeout(() => setShowFlash(false), 300);
                    setIsProcessing(true);
                    hiddenCanvasRef.current.toBlob(
                      (blob) => {
                        if (blob) uploadCapturedImage(blob);
                      },
                      "image/jpeg",
                      0.95,
                    );
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-white transition hover:scale-95 sm:h-12 sm:w-12" />
                </button>
              </div>

              <div className="flex w-1/3 justify-end">
                {capturedFiles.length > 0 && (
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmModal(true);
                    }}
                    disabled={isAnalyzing}
                  >
                    <span>
                      {t("ocr.analyze_btn_with_count", {
                        count: capturedFiles.length,
                      })}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info: (20260402 - Luphia) Image Preview Modal */}
          {previewIndex !== null && capturedFiles[previewIndex] && (
            <div
              role="presentation"
              className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md"
              onClick={() => setPreviewIndex(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setPreviewIndex(null);
              }}
              onTouchStart={(e) => {
                touchStartX.current = e.targetTouches[0].clientX;
              }}
              onTouchMove={(e) => {
                touchEndX.current = e.targetTouches[0].clientX;
              }}
              onTouchEnd={() => {
                const diff = touchStartX.current - touchEndX.current;
                // Info: (20260402 - Luphia) Require at least 50px swipe
                if (diff > 50 && previewIndex < capturedFiles.length - 1) {
                  setPreviewIndex(previewIndex + 1); // Info: (20260402 - Luphia) Swipe left -> Next
                } else if (diff < -50 && previewIndex > 0) {
                  setPreviewIndex(previewIndex - 1); // Info: (20260402 - Luphia) Swipe right -> Prev
                }
                // Info: (20260402 - Luphia) Reset touch ref
                touchStartX.current = 0;
                touchEndX.current = 0;
              }}
            >
              {/* Info: (20260402 - Luphia) Header actions */}
              <div
                role="presentation"
                className="absolute top-4 right-4 flex gap-4"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  className="rounded-full bg-red-500/80 p-2 text-white transition hover:bg-red-500"
                  onClick={() => {
                    const currentId = capturedFiles[previewIndex].id;
                    removeFile(currentId);
                    if (capturedFiles.length <= 1) {
                      setPreviewIndex(null);
                    } else if (previewIndex === capturedFiles.length - 1) {
                      setPreviewIndex(previewIndex - 1);
                    }
                  }}
                >
                  <Trash2 className="h-6 w-6" />
                </button>
                <button
                  className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
                  onClick={() => setPreviewIndex(null)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Info: (20260402 - Luphia) Navigation Indicators */}
              <div
                role="presentation"
                className="absolute top-6 left-6 rounded-md bg-black/50 px-3 py-1 font-mono text-sm font-bold text-white shadow-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {previewIndex + 1} / {capturedFiles.length}
              </div>

              <div
                role="presentation"
                className="relative flex h-full max-h-[85vh] w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {/* Info: (20260402 - Luphia) Desktop Nav Buttons */}
                {previewIndex > 0 && (
                  <button
                    className="absolute left-4 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80 sm:flex"
                    onClick={() => setPreviewIndex(previewIndex - 1)}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                )}

                <Image
                  key={capturedFiles[previewIndex].id}
                  src={capturedFiles[previewIndex].previewUrl || ""}
                  alt="Enlarged preview"
                  fill
                  unoptimized
                  className="animate-in fade-in object-contain duration-300"
                  draggable={false}
                />

                {previewIndex < capturedFiles.length - 1 && (
                  <button
                    className="absolute right-4 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80 sm:flex"
                    onClick={() => setPreviewIndex(previewIndex + 1)}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <PaymentConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          if (
            workflowStatus === "error" ||
            workflowStatus === "payment_success"
          ) {
            resetTransaction();
            setShowConfirmModal(false);
          } else if (workflowStatus === "idle") {
            setShowConfirmModal(false);
          }
        }}
        onConfirm={handleAnalyzeAll}
        cost={capturedFiles.length}
        title={t("ocr.confirm_analyze_title")}
        description={t("ocr.confirm_analyze_desc")}
        confirmBtnText={t("ocr.confirm_btn")}
        items={[
          { label: t("ocr.analysis_type"), value: t("ocr.multiple_page_scan") },
          {
            label: t("ocr.page_count"),
            value: `${capturedFiles.length} ${t("ocr.page_unit")}`,
          },
        ]}
        isLoading={
          workflowStatus !== "idle" &&
          workflowStatus !== "payment_success" &&
          workflowStatus !== "error"
        }
        status={workflowStatus}
        errorMessage={errorMessage}
        txHash={txHash}
      />
    </div>
  );
}
