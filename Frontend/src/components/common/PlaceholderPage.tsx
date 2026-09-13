import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon?: ReactNode;
}

export function PlaceholderPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
}: PlaceholderPageProps) {
  return (
    <PageContainer title={title} description={description}>
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    </PageContainer>
  );
}

export default PlaceholderPage;
