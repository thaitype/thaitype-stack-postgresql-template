'use client';

import { useState } from 'react';
import {
  Card,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Title,
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '~/trpc/react';

interface AddTodoFormProps {
  onSuccess?: () => void;
}

export function AddTodoForm({ onSuccess }: AddTodoFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const utils = api.useUtils();

  const createMutation = api.todo.create.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Todo created successfully',
        color: 'green',
      });
      setTitle('');
      setDescription('');
      setIsExpanded(false);
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create todo',
        color: 'red',
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Title is required',
        color: 'red',
      });
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setIsExpanded(false);
  };

  const handleTitleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.metaKey) {
      handleSubmit();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <Card 
        shadow="sm" 
        padding="md" 
        radius="md" 
        withBorder 
        style={{ cursor: 'pointer' }}
        onClick={handleTitleClick}
      >
        <Group gap="sm">
          <IconPlus size="1.2rem" color="var(--mantine-color-blue-6)" />
          <Title order={5} c="dimmed">
            Add a new todo...
          </Title>
        </Group>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <Title order={4}>Add New Todo</Title>
        
        <TextInput
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          error={!title.trim() ? 'Title is required' : undefined}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        
        <Textarea
          label="Description"
          placeholder="Optional description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autosize
          minRows={2}
          maxRows={4}
          onKeyDown={handleKeyDown}
        />
        
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            leftSection={<IconX size="1rem" />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            loading={createMutation.isPending}
            leftSection={<IconPlus size="1rem" />}
          >
            Add Todo
          </Button>
        </Group>
        
        <div style={{ fontSize: '0.75rem', color: 'var(--mantine-color-dimmed)', textAlign: 'center' }}>
          Press <kbd>⌘ + Enter</kbd> to save, <kbd>Esc</kbd> to cancel
        </div>
      </Stack>
    </Card>
  );
}