'use client';

import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack, 
  Card, 
  Grid,
} from '@mantine/core';
import { IconUser, IconShieldCheck, IconSettings } from '@tabler/icons-react';
import { useSession } from '~/lib/auth-client';
import { useDisclosure } from '@mantine/hooks';
import { AuthModal } from '~/components/auth/AuthModal';
import { TodoList } from './_components/TodoList';
import Link from 'next/link';

export default function Home() {
  const { data: session, isPending } = useSession();
  const [authModalOpened, { open: openAuthModal, close: closeAuthModal }] = useDisclosure(false);

  if (isPending) {
    return (
      <Container size="md" py="xl">
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }

  if (session?.user) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="md" mb="xl">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1} mb="xs">
                Welcome back, {session.user.name}!
              </Title>
              <Text c="dimmed" size="sm">
                Logged in as: {session.user.email}
              </Text>
            </div>
            <Button 
              component={Link} 
              href="/profile" 
              variant="outline"
              leftSection={<IconUser size="1rem" />}
            >
              Profile
            </Button>
          </Group>
        </Stack>
        
        <TodoList />
      </Container>
    );
  }

  return (
    <>
      <Container size="md" py="xl">
        <Stack gap="xl" align="center">
          <div style={{ textAlign: 'center' }}>
            <Title order={1} size="3rem" mb="md">
              Todo App
            </Title>
            <Text size="xl" c="dimmed" mb="xl">
              A simple and secure task management app
            </Text>
          </div>

          <Group>
            <Button size="lg" onClick={openAuthModal}>
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </Group>

          <Grid mt="xl">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <IconShieldCheck size="2rem" color="var(--mantine-color-blue-6)" />
                <Title order={4} mt="md" mb="xs">
                  Secure & Private
                </Title>
                <Text size="sm" c="dimmed">
                  Your tasks are stored securely with enterprise-grade authentication
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <IconUser size="2rem" color="var(--mantine-color-green-6)" />
                <Title order={4} mt="md" mb="xs">
                  Task Management
                </Title>
                <Text size="sm" c="dimmed">
                  Create, organize, and track your tasks with an intuitive interface
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <IconSettings size="2rem" color="var(--mantine-color-violet-6)" />
                <Title order={4} mt="md" mb="xs">
                  Simple & Clean
                </Title>
                <Text size="sm" c="dimmed">
                  Beautiful and responsive interface designed for productivity
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>

      <AuthModal 
        opened={authModalOpened} 
        onClose={closeAuthModal}
        defaultTab="register"
      />
    </>
  );
}
