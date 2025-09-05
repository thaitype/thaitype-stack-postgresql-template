'use client';

import { 
  AppShell, 
  Group, 
  Title, 
  Button, 
  Avatar,
  Menu,
  Text,
  UnstyledButton,
  Loader
} from '@mantine/core';
import { IconChevronDown, IconLogout, IconUser, IconChecklist } from '@tabler/icons-react';
import { useSession, signOut } from '~/lib/auth-client';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      notifications.show({
        title: 'Success',
        message: 'Logged out successfully!',
        color: 'green',
      });
      router.push('/');
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to log out',
        color: 'red',
      });
    }
  };

  return (
    <AppShell.Header px="md">
      <Group h="100%" justify="space-between">
        <Group>
          <IconChecklist size="1.5rem" color="var(--mantine-color-blue-6)" />
          <Title order={2} size="h3">
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Todo App
            </Link>
          </Title>
        </Group>

        <Group>
          {isPending ? (
            <Loader size="sm" />
          ) : session?.user ? (
            <Menu width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" color="blue">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {session.user.name}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {session.user.email}
                      </Text>
                    </div>
                    <IconChevronDown size="0.9rem" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconUser size="0.9rem" />}
                  component={Link}
                  href="/profile"
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  leftSection={<IconLogout size="0.9rem" />}
                  onClick={handleLogout}
                  color="red"
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Group>
              <Button variant="outline" component={Link} href="/login">
                Sign In
              </Button>
              <Button component={Link} href="/register">
                Get Started
              </Button>
            </Group>
          )}
        </Group>
      </Group>
    </AppShell.Header>
  );
}