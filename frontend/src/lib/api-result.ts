// hey-api 生成SDKの { data, error } レスポンスを共通処理するヘルパー。
// 旧・各 feature api.ts の `if (error || !data) throw new Error(...)` ボイラープレートを置き換える。

/** サーバの {code, message} エラーを保持する Error。 */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// unwrap extracts a domain error from a hey-api error payload, or a generic
// network/deserialization error. fallbackMessage はサーバがメッセージを
// 返さなかった場合に使う。
export function unwrap(err: unknown, fallbackMessage?: string): ApiError {
  if (typeof err === "object" && err !== null) {
    const code =
      "code" in err && typeof err.code === "string" ? err.code : "UNKNOWN";
    const message =
      "message" in err && typeof err.message === "string" && err.message !== ""
        ? err.message
        : (fallbackMessage ?? String(err));
    return new ApiError(code, message);
  }
  return new ApiError("UNKNOWN", fallbackMessage ?? String(err));
}

/**
 * SDK 呼び出しを実行し、エラーなら ApiError を throw、成功なら data を返す。
 * データなし（204等）のレスポンスは undefined を返す（throw しない）。
 *
 * 例: `return run(companyScoutsSendScout({ body }), "Failed to send scout");`
 */
export async function run<T>(
  p: Promise<{ data?: T; error?: unknown }>,
  fallbackMessage?: string,
): Promise<T> {
  const { data, error } = await p;
  if (error) throw unwrap(error, fallbackMessage);
  return data as T;
}
