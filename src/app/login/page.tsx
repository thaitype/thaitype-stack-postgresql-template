import { Container, Center, Box } from '@mantine/core';
import { LoginForm } from '~/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Container size="sm" h="100vh">
      <Center h="100%">
        <Box w="100%" maw={400}>
          <LoginForm />
        </Box>
      </Center>
    </Container>
  );
}