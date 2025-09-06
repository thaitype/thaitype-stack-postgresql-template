'use client';

import { useState } from 'react';
import {
  Card,
  Text,
  Checkbox,
  Group,
  ActionIcon,
  Menu,
  TextInput,
  Textarea,
  Button,
  Stack,
} from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '~/trpc/react';

interface Todo {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TodoItemProps {
  todo: Todo;
  onUpdate?: () => void;
}

export function TodoItem({ todo, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description ?? '');

  const utils = api.useUtils();

  const toggleMutation = api.todo.toggle.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: `Todo marked as ${!todo.completed ? 'completed' : 'pending'}`,
        color: 'green',
      });
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onUpdate?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update todo',
        color: 'red',
      });
    },
  });

  const updateMutation = api.todo.update.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Todo updated successfully',
        color: 'green',
      });
      setIsEditing(false);
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onUpdate?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update todo',
        color: 'red',
      });
    },
  });

  const deleteMutation = api.todo.delete.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Todo deleted successfully',
        color: 'green',
      });
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onUpdate?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete todo',
        color: 'red',
      });
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate({ id: todo.id });
  };

  const handleEdit = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Title is required',
        color: 'red',
      });
      return;
    }

    updateMutation.mutate({
      id: todo.id,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: todo.id });
  };

  if (isEditing) {
    return (
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="sm">
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            error={!editTitle.trim() ? 'Title is required' : undefined}
          />
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Optional description..."
            autosize
            minRows={2}
            maxRows={4}
          />
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCancel}
              leftSection={<IconX size="1rem" />}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
              loading={updateMutation.isPending}
              leftSection={<IconCheck size="1rem" />}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Group align="flex-start" gap="sm" style={{ flex: 1 }}>
          <Checkbox
            checked={todo.completed}
            onChange={handleToggle}
            disabled={toggleMutation.isPending}
            mt={2}
          />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Text
              fw={500}
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
                opacity: todo.completed ? 0.6 : 1,
              }}
            >
              {todo.title}
            </Text>
            {todo.description && (
              <Text
                size="sm"
                c="dimmed"
                style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  opacity: todo.completed ? 0.6 : 1,
                }}
              >
                {todo.description}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              Created: {new Date(todo.createdAt).toLocaleDateString()}
            </Text>
          </Stack>
        </Group>

        <Menu shadow="md" width={120}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDots size="1rem" />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item 
              leftSection={<IconEdit size="1rem" />}
              onClick={handleEdit}
            >
              Edit
            </Menu.Item>
            <Menu.Item 
              leftSection={<IconTrash size="1rem" />}
              color="red"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}