import { ApiJob } from '../lib/api';
import { JobCard } from './JobCard';

interface Props {
  jobs: ApiJob[];
}

export function JobList({ jobs }: Props) {
  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
