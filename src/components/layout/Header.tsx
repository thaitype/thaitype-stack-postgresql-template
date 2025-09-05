'use client';

import { useState } from 'react';
import {
  Group,
  Button,
  UnstyledButton,
  Avatar,
  Menu,
  Text,
  Container,
  Burger,
  Drawer,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconUser, 
  IconLogout, 
  IconSettings,
  IconChevronDown 
} from '@tabler/icons-react';
import { useSession, signOut } from '~/lib/auth-client';
import { AuthModal } from '~/components/auth/AuthModal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Header() {
  const { data: session, isPending } = useSession();
  const [authModalOpened, { open: openAuthModal, close: closeAuthModal }] = useDisclosure(false);
  const [mobileMenuOpened, { toggle: toggleMobileMenu, close: closeMobileMenu }] = useDisclosure(false);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'login' | 'register'>('login');
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      notifications.show({
        title: 'Success',
        message: 'Logged out successfully',
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

  const openLoginModal = () => {
    setDefaultAuthTab('login');
    openAuthModal();
  };

  const openRegisterModal = () => {
    setDefaultAuthTab('register');
    openAuthModal();
  };

  const UserMenu = () => {
    if (!session?.user) return null;

    return (
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <UnstyledButton>
            <Group gap="sm">
              <Avatar 
                src={(session?.user as { avatar?: string; image?: string })?.avatar ?? (session?.user as { avatar?: string; image?: string })?.image} 
                alt={(session?.user as { name?: string })?.name ?? 'User'} 
                size="sm" 
              />
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {(session?.user as { name?: string })?.name ?? 'User'}
                </Text>
                <Text c="dimmed" size="xs">
                  {(session?.user as { email?: string })?.email ?? 'user@example.com'}
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
          
          <Menu.Item 
            leftSection={<IconSettings size="0.9rem" />}
            component={Link}
            href="/settings"
          >
            Settings
          </Menu.Item>
          
          <Menu.Divider />
          
          <Menu.Item 
            leftSection={<IconLogout size="0.9rem" />}
            color="red"
            onClick={handleSignOut}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  };

  const AuthButtons = () => {
    if (isPending) {
      return <Button loading variant="light">Loading...</Button>;
    }

    if (session?.user) {
      return <UserMenu />;
    }

    return (
      <>
        <Button variant="subtle" onClick={openLoginModal}>
          Sign In
        </Button>
        <Button onClick={openRegisterModal}>
          Register
        </Button>
      </>
    );
  };

  const MobileAuthButtons = () => {
    if (isPending) {
      return <Button loading variant="light">Loading...</Button>;
    }

    if (session?.user) {
      return (
        <Stack gap="sm">
          <Button 
            variant="light" 
            leftSection={<IconUser size="1rem" />}
            component={Link}
            href="/profile"
            onClick={closeMobileMenu}
          >
            Profile
          </Button>
          <Button 
            variant="light" 
            leftSection={<IconSettings size="1rem" />}
            component={Link}
            href="/settings"
            onClick={closeMobileMenu}
          >
            Settings
          </Button>
          <Button 
            color="red" 
            leftSection={<IconLogout size="1rem" />}
            onClick={() => {
              void handleSignOut();
              closeMobileMenu();
            }}
          >
            Sign out
          </Button>
        </Stack>
      );
    }

    return (
      <Stack gap="sm">
        <Button 
          variant="light" 
          onClick={() => {
            openLoginModal();
            closeMobileMenu();
          }}
        >
          Sign In
        </Button>
        <Button 
          onClick={() => {
            openRegisterModal();
            closeMobileMenu();
          }}
        >
          Register
        </Button>
      </Stack>
    );
  };

  return (
    <>
      <div style={{ height: 60, padding: '0 16px' }}>
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Group>
              <Text 
                size="xl" 
                fw={700} 
                component={Link} 
                href="/"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                Todo App
              </Text>
            </Group>

            <Group visibleFrom="sm">
              <AuthButtons />
            </Group>

            <Burger
              opened={mobileMenuOpened}
              onClick={toggleMobileMenu}
              hiddenFrom="sm"
              size="sm"
            />
          </Group>
        </Container>
      </div>

      <Drawer
        opened={mobileMenuOpened}
        onClose={closeMobileMenu}
        title="Menu"
        padding="md"
        size="sm"
        position="right"
        hiddenFrom="sm"
      >
        <Stack gap="md">
          <MobileAuthButtons />
        </Stack>
      </Drawer>

      <AuthModal
        opened={authModalOpened}
        onClose={closeAuthModal}
        defaultTab={defaultAuthTab}
      />
    </>
  );
}