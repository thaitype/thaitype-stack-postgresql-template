'use client';

import { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Anchor,
  Stack,
  Checkbox,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { signIn } from '~/lib/auth-client';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  redirectTo?: string;
  onLoginSuccess?: () => void;
}

export function LoginForm({ onSwitchToRegister, redirectTo = '/', onLoginSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (result.error) {
        setError(result.error.message ?? 'Login failed');
        return;
      }

      notifications.show({
        title: 'Success',
        message: 'Logged in successfully!',
        color: 'green',
      });

      // Call success callback to close modal (if provided)
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md">
      <Title ta="center" order={2} mb="md">
        Welcome back!
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            required
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...form.getInputProps('password')}
          />

          <Checkbox
            label="Remember me"
            {...form.getInputProps('rememberMe', { type: 'checkbox' })}
          />

          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Sign in
          </Button>
        </Stack>
      </form>

      {onSwitchToRegister && (
        <Text ta="center" mt="md">
          Don&apos;t have an account?{' '}
          <Anchor component="button" type="button" onClick={onSwitchToRegister}>
            Register
          </Anchor>
        </Text>
      )}
    </Paper>
  );
}