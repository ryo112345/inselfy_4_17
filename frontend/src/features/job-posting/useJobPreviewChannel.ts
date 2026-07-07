import { useEffect, useRef } from "react";
import {
  JOB_PREVIEW_CHANNEL,
  type JobFormPreviewPayload,
  type JobPreviewMessage,
} from "./preview-channel";

/**
 * 編集タブ側のプレビュー同期。ペイロードの変化をブロードキャストし、
 * プレビュータブからの pull 要求（後から開かれた場合）にも最新状態で応える。
 */
export function useJobPreviewChannel(payload: JobFormPreviewPayload) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const payloadRef = useRef<JobFormPreviewPayload | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel(JOB_PREVIEW_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data as JobPreviewMessage;
      if (msg?.type === "request" && payloadRef.current) {
        const reply: JobPreviewMessage = {
          type: "data",
          payload: payloadRef.current,
        };
        ch.postMessage(reply);
      }
    };
    return () => {
      ch.close();
    };
  }, []);

  useEffect(() => {
    payloadRef.current = payload;
    const msg: JobPreviewMessage = { type: "data", payload };
    channelRef.current?.postMessage(msg);
  }, [payload]);
}
