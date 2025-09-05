'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xl">
        <Alert 
          icon={<IconAlertCircle size="1rem" />} 
          title="Something went wrong" 
          color="red"
          variant="light"
          ta="center"
        >
          An unexpected error occurred. Please try again.
        </Alert>

        <div style={{ textAlign: 'center' }}>
          <Title order={1} mb="md">Application Error</Title>
          <Text c="dimmed" size="lg" mb="xl">
            {error.message || 'An unexpected error occurred'}
          </Text>
        </div>

        <Button onClick={reset} size="lg">
          Try Again
        </Button>
      </Stack>
    </Container>
  );
}