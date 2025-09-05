'use client';

import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  SegmentedControl,
  Alert,
  Loader,
  Center,
  Badge,
  Paper,
} from '@mantine/core';
import { IconInfoCircle, IconCheckupList, IconCircleCheck, IconClock } from '@tabler/icons-react';
import { api } from '~/trpc/react';
import { TodoItem } from './TodoItem';
import { AddTodoForm } from './AddTodoForm';

type FilterType = 'all' | 'pending' | 'completed';

export function TodoList() {
  const [filter, setFilter] = useState<FilterType>('all');

  const { 
    data: todosData, 
    isLoading: todosLoading, 
    error: todosError,
    refetch: refetchTodos 
  } = api.todo.getAll.useQuery({
    includeCompleted: true,
  });

  const { 
    data: statsData,
    isLoading: statsLoading 
  } = api.todo.getStats.useQuery();

  const todos = todosData?.todos || [];
  const stats = statsData?.stats || { total: 0, completed: 0, pending: 0 };

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'pending':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  const handleRefresh = () => {
    refetchTodos();
  };

  if (todosLoading || statsLoading) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text c="dimmed">Loading your todos...</Text>
        </Stack>
      </Center>
    );
  }

  if (todosError) {
    return (
      <Alert
        icon={<IconInfoCircle size="1rem" />}
        title="Error loading todos"
        color="red"
        variant="light"
      >
        {todosError.message || 'Failed to load todos. Please try again.'}
        <Button variant="outline" size="xs" mt="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header with stats */}
      <div>
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Title order={2} mb="xs">
              My Todos
            </Title>
            <Text c="dimmed" size="sm">
              Stay organized and get things done
            </Text>
          </div>
          <Button 
            variant="outline" 
            size="xs"
            onClick={handleRefresh}
            loading={todosLoading}
          >
            Refresh
          </Button>
        </Group>

        {/* Stats */}
        <Group gap="sm" mb="md">
          <Paper p="xs" radius="sm" bg="blue.0" c="blue.8">
            <Group gap="xs">
              <IconCheckupList size="1rem" />
              <Text size="sm" fw={500}>
                Total: {stats.total}
              </Text>
            </Group>
          </Paper>
          <Paper p="xs" radius="sm" bg="orange.0" c="orange.8">
            <Group gap="xs">
              <IconClock size="1rem" />
              <Text size="sm" fw={500}>
                Pending: {stats.pending}
              </Text>
            </Group>
          </Paper>
          <Paper p="xs" radius="sm" bg="green.0" c="green.8">
            <Group gap="xs">
              <IconCircleCheck size="1rem" />
              <Text size="sm" fw={500}>
                Completed: {stats.completed}
              </Text>
            </Group>
          </Paper>
        </Group>
      </div>

      {/* Add Todo Form */}
      <AddTodoForm onSuccess={() => refetchTodos()} />

      {/* Filter Controls */}
      {todos.length > 0 && (
        <Group justify="space-between" align="center">
          <Title order={4}>
            Your Tasks
            <Badge size="sm" variant="light" color="blue" ml="xs">
              {filteredTodos.length}
            </Badge>
          </Title>
          
          <SegmentedControl
            size="sm"
            value={filter}
            onChange={(value) => setFilter(value as FilterType)}
            data={[
              {
                label: (
                  <Group gap="xs">
                    <IconCheckupList size="0.9rem" />
                    <Text size="sm">All</Text>
                    <Badge size="xs" variant="light" color="blue">
                      {todos.length}
                    </Badge>
                  </Group>
                ),
                value: 'all',
              },
              {
                label: (
                  <Group gap="xs">
                    <IconClock size="0.9rem" />
                    <Text size="sm">Pending</Text>
                    <Badge size="xs" variant="light" color="orange">
                      {stats.pending}
                    </Badge>
                  </Group>
                ),
                value: 'pending',
              },
              {
                label: (
                  <Group gap="xs">
                    <IconCircleCheck size="0.9rem" />
                    <Text size="sm">Done</Text>
                    <Badge size="xs" variant="light" color="green">
                      {stats.completed}
                    </Badge>
                  </Group>
                ),
                value: 'completed',
              },
            ]}
          />
        </Group>
      )}

      {/* Todo Items */}
      {filteredTodos.length > 0 ? (
        <Stack gap="sm">
          {filteredTodos.map((todo) => (
            <TodoItem 
              key={todo.id} 
              todo={todo} 
              onUpdate={() => refetchTodos()}
            />
          ))}
        </Stack>
      ) : todos.length === 0 ? (
        <Paper p="xl" radius="md" bg="gray.0" ta="center">
          <Stack align="center" gap="sm">
            <IconCheckupList size="3rem" color="var(--mantine-color-gray-5)" />
            <Title order={4} c="dimmed">No todos yet</Title>
            <Text c="dimmed" size="sm">
              Create your first todo to get started!
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Paper p="xl" radius="md" bg="gray.0" ta="center">
          <Stack align="center" gap="sm">
            <IconCheckupList size="3rem" color="var(--mantine-color-gray-5)" />
            <Title order={4} c="dimmed">No {filter} todos</Title>
            <Text c="dimmed" size="sm">
              {filter === 'pending' 
                ? 'Great! You\'ve completed all your tasks.' 
                : 'No completed todos yet. Keep working!'}
            </Text>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilter('all')}
            >
              View All Todos
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}