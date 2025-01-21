const CdpCardSkeleton: React.FC = () => (
  <div className="p-6 rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse">
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50">
              <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
              <div className="h-6 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export { CdpCardSkeleton };
