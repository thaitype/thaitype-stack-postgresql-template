import { Container, Center, Box } from '@mantine/core';
import { RegisterForm } from '~/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <Container size="sm" h="100vh">
      <Center h="100%">
        <Box w="100%" maw={400}>
          <RegisterForm />
        </Box>
      </Center>
    </Container>
  );
}