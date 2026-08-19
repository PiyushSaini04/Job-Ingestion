import { ApiJob } from '../lib/api';
import { JobCard } from './JobCard';

interface Props {
  jobs: ApiJob[];
  loading?: boolean;
  skeletonCount?: number;
}

function JobSkeleton() {
  return (
    <div className="ui-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-3.5 w-32 rounded-full skeleton" />
            <div className="h-8 w-3/4 rounded-2xl skeleton" />
            <div className="h-4 w-40 rounded-full skeleton" />
          </div>
          <div className="h-14 w-24 rounded-2xl skeleton" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-24 rounded-full skeleton" />
          <div className="h-8 w-28 rounded-full skeleton" />
          <div className="h-8 w-20 rounded-full skeleton" />
        </div>
      </div>
      <span className="sr-only">Loading latest jobs...</span>
    </div>
  );
}

export function JobList({ jobs, loading = false, skeletonCount = 5 }: Props) {
  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <JobSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <JobCard key={job.id} job={job} index={index} />
      ))}
    </div>
  );
}
