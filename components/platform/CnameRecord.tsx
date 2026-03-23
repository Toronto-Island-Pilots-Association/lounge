interface Props {
  host: string
  label?: string
}

export function CnameRecord({ host, label = 'Add this DNS record to activate your custom domain:' }: Props) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
      <div className="bg-gray-50 border rounded-lg px-4 py-3 font-mono text-xs space-y-1.5">
        <div className="flex gap-3"><span className="text-gray-400 w-12">Type</span><span>CNAME</span></div>
        <div className="flex gap-3"><span className="text-gray-400 w-12">Host</span><span className="break-all">{host}</span></div>
        <div className="flex gap-3"><span className="text-gray-400 w-12">Value</span><span>cname.vercel-dns.com</span></div>
        <div className="flex gap-3"><span className="text-gray-400 w-12">TTL</span><span>Auto</span></div>
      </div>
      <p className="text-xs text-gray-400">DNS propagation can take up to 48 hours.</p>
    </div>
  )
}
