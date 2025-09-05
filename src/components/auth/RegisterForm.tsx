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
  Progress,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { signUp } from '~/lib/auth-client';
import { useRouter } from 'next/navigation';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  redirectTo?: string;
  onRegisterSuccess?: () => void;
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (/[a-z]/.test(password)) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 15;
  return Math.min(strength, 100);
}

function getPasswordColor(strength: number): string {
  if (strength < 40) return 'red';
  if (strength < 70) return 'yellow';
  return 'green';
}

export function RegisterForm({ onSwitchToLogin, redirectTo = '/', onRegisterSuccess }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    validate: {
      name: (value) => (value.length >= 2 ? null : 'Name must be at least 2 characters'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => {
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (getPasswordStrength(value) < 40) return 'Password is too weak';
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords do not match' : null,
      acceptTerms: (value) => (value ? null : 'You must accept the terms and conditions'),
    },
  });

  const passwordStrength = getPasswordStrength(form.values.password);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });

      if (result.error) {
        setError(result.error.message ?? 'Registration failed');
        return;
      }

      notifications.show({
        title: 'Success',
        message: 'Account created successfully!',
        color: 'green',
        icon: <IconCheck size="1rem" />,
      });

      // Call success callback to close modal (if provided)
      if (onRegisterSuccess) {
        onRegisterSuccess();
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
        Create Account
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Full Name"
            placeholder="John Doe"
            required
            {...form.getInputProps('name')}
          />

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

          {form.values.password && (
            <div>
              <Text size="sm" c="dimmed" mb={5}>
                Password strength: {passwordStrength}%
              </Text>
              <Progress value={passwordStrength} color={getPasswordColor(passwordStrength)} size="sm" />
            </div>
          )}

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            {...form.getInputProps('confirmPassword')}
          />

          <Checkbox
            label={
              <Text size="sm">
                I accept{' '}
                <Anchor href="/terms" target="_blank" size="sm">
                  terms and conditions
                </Anchor>
              </Text>
            }
            required
            {...form.getInputProps('acceptTerms', { type: 'checkbox' })}
          />

          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Create Account
          </Button>
        </Stack>
      </form>

      {onSwitchToLogin && (
        <Text ta="center" mt="md">
          Already have an account?{' '}
          <Anchor component="button" type="button" onClick={onSwitchToLogin}>
            Sign in
          </Anchor>
        </Text>
      )}
    </Paper>
  );
}