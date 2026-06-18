import { PageSkeleton } from "@weopen/ui";

export default function AdminLoading() {
  return <PageSkeleton cardCount={2} metricCount={4} rowCount={5} title="Loading admin page" />;
}
