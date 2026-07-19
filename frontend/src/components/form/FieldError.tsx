// フィールド直下のインラインエラー表示（docs/form-inline-validation-design.md §3-1）。
// 入力要素には fieldAriaProps を展開し、id / aria-invalid / aria-describedby を揃える。

export function fieldErrorId(name: string): string {
  return `${name}-error`;
}

/** 入力要素に展開する props。エラー時のみ aria-invalid / aria-describedby が付く */
export function fieldAriaProps(name: string, error: string | undefined) {
  return {
    id: name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? fieldErrorId(name) : undefined,
  };
}

export function FieldError({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={fieldErrorId(name)} role="alert" className="mt-1.5 text-sm text-red-600">
      {error}
    </p>
  );
}
