'use client';

import { useEffect } from 'react';
import { Loader, Center, Stack, Text } from '@mantine/core';
import { useSession } from '~/lib/auth-client';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        router.push(redirectTo);
        return;
      }

      if (requireAdmin && !(session.user as { roles?: string[] }).roles?.includes('admin')) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [session, isPending, router, redirectTo, requireAdmin]);

  if (isPending) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Text c="red">Authentication Error</Text>
          <Text c="dimmed" size="sm">{error.message}</Text>
        </Stack>
      </Center>
    );
  }

  if (!session?.user) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Redirecting to login...</Text>
        </Stack>
      </Center>
    );
  }

  if (requireAdmin && !(session.user as { roles?: string[] }).roles?.includes('admin')) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Text c="red">Access Denied</Text>
          <Text c="dimmed" size="sm">Admin access required</Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}