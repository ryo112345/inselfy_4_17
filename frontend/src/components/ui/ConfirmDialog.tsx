"use client";

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Modal, PrimaryButton, SecondaryButton } from "./Modal";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 削除等の破壊的操作は true にすると確認ボタンが赤になる */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // 既に開いているダイアログがあればキャンセル扱いで閉じる
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => close(false)}
        title={options?.title ?? ""}
        size="md"
        footer={
          <>
            <SecondaryButton onClick={() => close(false)}>
              {options?.cancelLabel ?? "キャンセル"}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => close(true)}
              className={options?.destructive ? "!bg-rose-600 hover:!bg-rose-700" : ""}
            >
              {options?.confirmLabel ?? "OK"}
            </PrimaryButton>
          </>
        }
      >
        {options?.message ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {options.message}
          </p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/**
 * `confirm()` 代替。`const ok = await confirmDialog({ title, message, destructive })`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return ctx;
}
