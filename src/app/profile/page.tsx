'use client';

import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Avatar,
  Text,
  Badge,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useSession } from '~/lib/auth-client';
import { ProtectedRoute } from '~/components/auth/ProtectedRoute';
import { api } from '~/trpc/react';

function ProfileContent() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  
  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully!',
        color: 'green',
        icon: <IconCheck size="1rem" />,
      });
      setLoading(false);
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconAlertCircle size="1rem" />,
      });
      setLoading(false);
    },
  });

  const form = useForm({
    initialValues: {
      name: session?.user?.name ?? '',
      bio: (session?.user as { bio?: string })?.bio ?? '',
      website: (session?.user as { website?: string })?.website ?? '',
    },
    validate: {
      name: (value: string) => (value.length >= 2 ? null : 'Name must be at least 2 characters'),
      website: (value: string) => 
        !value || /^https?:\/\/.+\..+/.test(value) ? null : 'Invalid website URL',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    updateProfileMutation.mutate(values);
  };

  if (!session?.user) {
    return (
      <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
        Unable to load user data
      </Alert>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Group mb="xl">
            <Avatar 
              src={(session.user as { avatar?: string }).avatar ?? session.user.image} 
              alt={session.user.name} 
              size="xl" 
            />
            <div>
              <Title order={2}>{session.user.name}</Title>
              <Text c="dimmed">{session.user.email}</Text>
              <Group gap="xs" mt="xs">
                {(session.user as { roles?: string[] }).roles?.map((role: string) => (
                  <Badge key={role} variant="light" color="blue">
                    {role}
                  </Badge>
                ))}
              </Group>
            </div>
          </Group>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="Full Name"
                placeholder="Your full name"
                required
                {...form.getInputProps('name')}
              />

              <Textarea
                label="Bio"
                placeholder="Tell us about yourself"
                minRows={3}
                {...form.getInputProps('bio')}
              />

              <TextInput
                label="Website"
                placeholder="https://yourwebsite.com"
                {...form.getInputProps('website')}
              />

              <Group justify="flex-end" mt="md">
                <Button 
                  type="submit" 
                  loading={loading}
                  disabled={!form.isDirty()}
                >
                  Update Profile
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>

        <Paper withBorder shadow="md" p="xl" radius="md">
          <Title order={3} mb="md">Account Information</Title>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>Email:</Text>
              <Text c="dimmed">{session.user.email}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Account Created:</Text>
              <Text c="dimmed">
                {session.user.createdAt 
                  ? new Date(session.user.createdAt).toLocaleDateString()
                  : 'Unknown'
                }
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Last Updated:</Text>
              <Text c="dimmed">
                {session.user.updatedAt 
                  ? new Date(session.user.updatedAt).toLocaleDateString()
                  : 'Unknown'
                }
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}