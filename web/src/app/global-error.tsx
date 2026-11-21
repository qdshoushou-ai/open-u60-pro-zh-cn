"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="grain-overlay flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 font-mono text-5xl font-bold text-accent">
          500
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold">页面出错了</h1>
        <p className="mb-8 text-sm text-text-dim">
          发生意外错误，请稍后重试。
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          重试
        </button>
      </body>
    </html>
  );
}
