import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
      <div className="mb-4 font-mono text-6xl font-bold text-accent">404</div>
      <h1 className="mb-3 font-display text-2xl font-bold">页面不存在</h1>
      <p className="mb-8 text-sm text-text-dim">
        你访问的页面可能已被移动或删除。
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:-translate-y-0.5"
      >
        返回首页
      </Link>
    </div>
  );
}
