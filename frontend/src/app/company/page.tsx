import Link from "next/link";

const pipelineStages = [
  { label: "マッチ候補者", count: 12, unit: "人", href: "/company/talents", action: "候補者を見る" },
  { label: "スカウト送信", count: 5, unit: "件", href: "/company/scout", action: "スカウト管理" },
  { label: "応募受付", count: 8, unit: "件", href: "/company/applications", action: "応募を確認" },
  { label: "面談確定", count: 3, unit: "件", href: "/company/applications?status=interview", action: "面談一覧" },
  { label: "内定者 / 採用目標", count: "7/10", unit: "人", href: "/company/applications?status=offer", action: "内定者一覧" },
];

function Divider() {
  return <div className="h-18 w-px shrink-0 bg-gray-200" />;
}

export default function CompanyPage() {
  return (
    <div>
      <p className="text-sm font-medium text-gray-400">採用パイプライン</p>
      <div className="mt-4 rounded-3xl border border-gray-200 bg-white">
        <div className="flex items-center">
          {pipelineStages.map((stage, i) => (
            <div key={stage.label} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-1 py-5">
                <span className="text-[13px] font-medium text-gray-500">{stage.label}</span>
                <span className="text-3xl font-bold text-gray-900">
                  {stage.count}<span className="ml-1 text-sm font-normal text-gray-400">{stage.unit}</span>
                </span>
                <Link
                  href={stage.href}
                  className="mt-2 rounded border border-[#2979ff] px-3 py-1 text-xs font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
                >
                  {stage.action}
                </Link>
              </div>
              {i < pipelineStages.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
