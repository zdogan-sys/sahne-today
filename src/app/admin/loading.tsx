export default function AdminLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-6 bg-accent rounded-full" />
        <h1 className="font-bebas text-4xl text-text-primary">Admin Paneli</h1>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[0,1,2,3].map(i => (
          <div key={i} className="card p-4 text-center animate-pulse">
            <div className="h-8 w-12 bg-[rgba(228,224,216,0.08)] rounded mx-auto mb-1" />
            <div className="h-3 w-10 bg-[rgba(228,224,216,0.05)] rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="card p-3 h-14 animate-pulse bg-[rgba(228,224,216,0.03)]" />
        ))}
      </div>
    </div>
  )
}
