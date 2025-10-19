import { AuthProvider } from '@/components/dealer/AuthProvider';

export const metadata = {
  title: 'Dealer Workspace',
  description: 'Manage financial offers and customer interactions.',
};

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
