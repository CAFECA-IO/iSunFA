"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Camera, RefreshCw, AlertCircle } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useTranslation } from "@/i18n/i18n_context";

interface IQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "",
}: IQrScannerModalProps) {
  const { t } = useTranslation();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "qr-reader";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId: string) => {
      if (!scannerRef.current) return;

      setIsInitializing(true);
      setCameraError(null);

      try {
        await stopScanner();

        await scannerRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            onClose();
          },
          () => {
            // Info: (20260702 - Julian) 靜默失敗，不用處理
          },
        );
        setIsInitializing(false);
      } catch (err) {
        console.error("Failed to start scanner", err);
        setCameraError(t("team_management.camera_error"));
        setIsInitializing(false);
      }
    },
    [onScanSuccess, onClose, stopScanner, t],
  );

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(
              devices.map((d: { id: string; label: string }) => ({
                id: d.id,
                label: d.label,
              })),
            );

            // Info: (20260702 - Julian) 預設使用後鏡頭
            const backCamera = devices.find(
              (d: { id: string; label: string }) =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear") ||
                d.label.toLowerCase().includes("environment"),
            );

            const initialCameraId = backCamera ? backCamera.id : devices[0].id;
            setSelectedCameraId(initialCameraId);

            scannerRef.current = new Html5Qrcode(regionId, {
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
              verbose: false,
            });

            await startScanner(initialCameraId);
          } else {
            setCameraError(t("team_management.camera_error"));
            setIsInitializing(false);
          }
        } catch (err) {
          console.error("Error getting cameras", err);
          setCameraError(t("team_management.camera_error"));
          setIsInitializing(false);
        }
      };

      init();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner, t]);

  const handleSwitchCamera = () => {
    if (cameras.length < 2 || !selectedCameraId) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;
    setSelectedCameraId(nextCameraId);
    startScanner(nextCameraId);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-100">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-bold text-gray-900">
                    {title || t("team_management.scan_qr_code")}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-900">
                  <div id={regionId} className="h-full w-full" />

                  {isInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
                      <RefreshCw className="mb-2 size-8 animate-spin text-orange-500" />
                      <p className="text-sm">{t("team_management.scanning")}</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center text-white">
                      <AlertCircle className="mb-2 size-12 text-red-500" />
                      <p className="text-sm">{cameraError}</p>
                      <button
                        onClick={onClose}
                        className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
                      >
                        {t("team_management.cancel")}
                      </button>
                    </div>
                  )}

                  {!isInitializing && !cameraError && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="size-64 rounded-2xl border-2 border-orange-500/50 ring-1 ring-orange-500" />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Camera className="size-4" />
                    <span className="max-w-[200px] truncate">
                      {cameras.find((c) => c.id === selectedCameraId)?.label ||
                        "Camera"}
                    </span>
                  </div>

                  {cameras.length > 1 && (
                    <button
                      onClick={handleSwitchCamera}
                      className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100"
                    >
                      <RefreshCw className="size-4" />
                      Switch
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
