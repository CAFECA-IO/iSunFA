"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Camera, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IDocumentScannerProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export default function DocumentScanner({
  onCapture,
  disabled = false,
}: IDocumentScannerProps) {
  const { t } = useTranslation();

  const [cvReady, setCvReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);

  // Info: (20260419 - Luphia) Cooldown mechanism to prevent rapid duplicate captures
  const cooldownUntilRef = useRef<number>(0);

  // Info: (20260402 - Luphia) States for stabilization
  const stabilityRef = useRef({
    count: 0,
    lastArea: 0,
    lastPoints: [] as { x: number; y: number }[],
  });

  useEffect(() => {
    const w = window as typeof window & { cv: ReturnType<typeof JSON.parse> };
    if (typeof window !== "undefined" && w.cv && typeof w.cv.Mat === "function") {
      setCvReady(true);
    }
  }, []);

  const initCamera = async (isMounted: { current: boolean }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });

      if (!isMounted.current) {
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

  const processFrame = useCallback(function process() {
    if (
      !cvReady ||
      !streamReady ||
      isProcessing ||
      disabled ||
      !videoRef.current ||
      !canvasRef.current ||
      !hiddenCanvasRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const cv = (window as typeof window & { cv: ReturnType<typeof JSON.parse> }).cv;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameId.current = requestAnimationFrame(process);
      return;
    }

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    const hiddenCtx = hiddenCanvas.getContext("2d", { willReadFrequently: true });

    if (!ctx || !hiddenCtx) return;

    hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Info: (20260419 - Luphia) Check cooldown
    if (Date.now() < cooldownUntilRef.current) {
      stabilityRef.current.count = 0;
      if (isDetectingRef.current) {
        isDetectingRef.current = false;
        setIsDetecting(false);
      }
      animationFrameId.current = requestAnimationFrame(process);
      return;
    }

    const src = new cv.Mat();
    const dst = new cv.Mat();
    const cap = new cv.Mat(hiddenCanvas.height, hiddenCanvas.width, cv.CV_8UC4);

    try {
      const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      cap.data.set(imageData.data);
      cv.cvtColor(cap, src, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(src, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      cv.Canny(dst, dst, 50, 150);

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
        cv.RETR_LIST,
        cv.CHAIN_APPROX_SIMPLE,
      );

      let maxArea = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let maxContour: any = null;

      const minDocArea = hiddenCanvas.width * hiddenCanvas.height * 0.02;

      const debugContours = [];
      const cw = canvas.width;
      const ch = canvas.height;
      const vw = hiddenCanvas.width;
      const vh = hiddenCanvas.height;

      const renderScale = Math.max(cw / vw, ch / vh);
      const offsetX = (cw - vw * renderScale) / 2;
      const offsetY = (ch - vh * renderScale) / 2;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);

        if (area > minDocArea) {
          const approx = new cv.Mat();
          const hull = new cv.Mat();
          cv.convexHull(cnt, hull, false, true);
          const hullPeri = cv.arcLength(hull, true);

          let found4 = false;

          for (let eps = 0.02; eps <= 0.06; eps += 0.01) {
            cv.approxPolyDP(hull, approx, eps * hullPeri, true);
            if (approx.rows === 4) {
              found4 = true;
              break;
            }
          }

          if (!found4) {
            cv.approxPolyDP(hull, approx, 0.05 * hullPeri, true);
          }

          const polyPoints = [];
          for (let j = 0; j < approx.rows; j++) {
            polyPoints.push({
              x: approx.intPtr(j, 0)[0] * renderScale + offsetX,
              y: approx.intPtr(j, 0)[1] * renderScale + offsetY,
            });
          }
          debugContours.push(polyPoints);

          if (found4 && cv.isContourConvex(approx)) {
            const pts = [];
            for (let j = 0; j < 4; j++) {
              pts.push({
                x: approx.intPtr(j, 0)[0],
                y: approx.intPtr(j, 0)[1],
              });
            }

            const sideLengths = [];
            for (let j = 0; j < 4; j++) {
              const p1 = pts[j];
              const p2 = pts[(j + 1) % 4];
              sideLengths.push(Math.hypot(p1.x - p2.x, p1.y - p2.y));
            }

            const minOpp1 = Math.min(sideLengths[0], sideLengths[2]);
            const maxOpp1 = Math.max(sideLengths[0], sideLengths[2]);
            const minOpp2 = Math.min(sideLengths[1], sideLengths[3]);
            const maxOpp2 = Math.max(sideLengths[1], sideLengths[3]);

            const ratio1 = maxOpp1 > 0 ? minOpp1 / maxOpp1 : 0;
            const ratio2 = maxOpp2 > 0 ? minOpp2 / maxOpp2 : 0;

            const isValidPerspective = ratio1 > 0.4 && ratio2 > 0.4;

            if (isValidPerspective) {
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

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
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
        const points = [];
        for (let i = 0; i < 4; i++) {
          points.push({
            x: maxContour.intPtr(i, 0)[0] * renderScale + offsetX,
            y: maxContour.intPtr(i, 0)[1] * renderScale + offsetY,
          });
        }

        let isStabilizing = false;
        const areaDiff = Math.abs(prev.lastArea - maxArea) / maxArea;

        if (areaDiff < 0.2 && prev.lastPoints.length === 4) {
          let totalDisp = 0;
          for (let i = 0; i < 4; i++) {
            const p1 = prev.lastPoints[i];
            const p2 = points[i];
            totalDisp += Math.hypot(p1.x - p2.x, p1.y - p2.y);
          }
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
        ctx.strokeStyle = isStabilizing ? "#10b981" : "#f97316";
        ctx.stroke();
        ctx.fillStyle = isStabilizing
          ? "rgba(16, 185, 129, 0.2)"
          : "rgba(249, 115, 22, 0.2)";
        ctx.fill();

        if (isStabilizing) {
          prev.count += 1;
        } else {
          prev.count = Math.max(0, prev.count - 2);
        }

        prev.lastArea = maxArea;
        prev.lastPoints = points;

        if (!isDetectingRef.current) {
          isDetectingRef.current = true;
          setIsDetecting(true);
        }

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
            tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
          ]);
          const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1,
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

          const outCanvas = document.createElement("canvas");
          outCanvas.width = maxWidth;
          outCanvas.height = maxHeight;
          cv.imshow(outCanvas, warped);

          outCanvas.toBlob(
            (blob) => {
              if (blob) {
                onCapture(blob);
                cooldownUntilRef.current = Date.now() + 2000;
              }
              setIsProcessing(false);

              srcCoords.delete();
              dstCoords.delete();
              transformMat.delete();
              warped.delete();
            },
            "image/jpeg",
            0.95,
          );

          prev.count = 0;
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

    if (!isProcessing && !disabled) {
      animationFrameId.current = requestAnimationFrame(process);
    }
  }, [cvReady, streamReady, isProcessing, disabled, onCapture]);

  useEffect(() => {
    if (cvReady && streamReady && !isProcessing && !disabled) {
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [cvReady, streamReady, isProcessing, disabled, processFrame]);

  return (
    <>
      <Script
        src="https://docs.opencv.org/4.8.0/opencv.js"
        strategy="lazyOnload"
        onLoad={() => {
          let iters = 0;
          const checkReady = setInterval(() => {
            const w = window as typeof window & { cv: ReturnType<typeof JSON.parse> };
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
          <h2 className="mb-2 text-xl font-bold">{t("ocr.camera_denied_title")}</h2>
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

          <div className="pointers-events-none absolute inset-0 z-10">
            <div
              className={`absolute top-10 right-10 bottom-40 left-10 rounded-2xl border-4 border-dashed transition-all duration-300 ${isDetecting ? "border-green-400 bg-green-500/10" : "border-white/50"
                }`}
            >
              <div
                className={`absolute right-0 -bottom-10 left-0 text-center text-lg font-bold tracking-wide drop-shadow-md transition-colors ${isDetecting ? "text-green-400" : "text-white"
                  }`}
              >
                {isDetecting ? t("ocr.hold_still") : t("ocr.place_document_in_frame")}
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

          <div
            className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-300 ${showFlash ? "opacity-100" : "opacity-0"
              }`}
          />

          {(!cvReady || !streamReady) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 text-white backdrop-blur-sm">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
              <p className="text-lg font-bold tracking-wide">{t("ocr.initializing")}</p>
            </div>
          )}

          {(isProcessing || (disabled && streamReady)) && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-md">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-emerald-500" />
              <p className="text-2xl font-bold tracking-wide">{t("ocr.processing")}</p>
            </div>
          )}

          <div className="absolute right-0 bottom-0 left-0 z-30 flex min-h-[120px] flex-col justify-end bg-linear-to-t from-black/80 to-transparent p-4 pb-6 pointer-events-none">
            <div className="flex items-center justify-between px-2 pointer-events-auto">
              <div className="w-1/3"></div>
              <div className="flex w-1/3 justify-center">
                <button
                  aria-label="Capture document"
                  className="rounded-full border-4 border-white bg-white/20 p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:bg-white/40 disabled:opacity-50"
                  disabled={disabled || isProcessing}
                  onClick={() => {
                    if (!hiddenCanvasRef.current || isProcessing || disabled) return;
                    setShowFlash(true);
                    setTimeout(() => setShowFlash(false), 300);
                    setIsProcessing(true);
                    hiddenCanvasRef.current.toBlob(
                      (blob) => {
                        if (blob) {
                          onCapture(blob);
                          cooldownUntilRef.current = Date.now() + 2000;
                        }
                        setIsProcessing(false);
                      },
                      "image/jpeg",
                      0.95,
                    );
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-white transition hover:scale-95 sm:h-12 sm:w-12" />
                </button>
              </div>
              <div className="flex w-1/3 justify-end"></div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
