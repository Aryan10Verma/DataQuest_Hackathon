import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState title="This page doesn't exist" body="The link may be old or mistyped." action={<Link to="/" className="btn-quiet">Go to the home page</Link>} />
    </div>
  );
}
