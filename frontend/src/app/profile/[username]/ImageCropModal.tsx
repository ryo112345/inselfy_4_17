"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { XIcon } from "./Icons";
import { PrimaryButton, SecondaryButton } from "./Modal";

type Props = {
  open: boolean;
  imageSrc: string;
  aspect: number;
  title: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

export function ImageCropModal({ open, imageSrc, aspect, title, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const onCropComplete = useCallback((_: Area, px: Area) => {
    setCroppedArea(px);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await cropImage(imageSrc, croppedArea);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          minZoom={0.5}
          maxZoom={3}
          objectFit="contain"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape={aspect === 1 ? "round" : "rect"}
          showGrid={aspect !== 1}
        />
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">−</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
          />
          <span className="text-xs text-white/60">+</span>
        </div>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton loading={processing} onClick={handleConfirm}>
            適用
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function cropImage(src: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const x = Math.round(area.x);
      const y = Math.round(area.y);
      const w = Math.round(area.width);
      const h = Math.round(area.height);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
