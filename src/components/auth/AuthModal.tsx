'use client';

import { useState } from 'react';
import { Modal, Tabs } from '@mantine/core';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  redirectTo?: string;
}

export function AuthModal({ 
  opened, 
  onClose, 
  defaultTab = 'login',
  redirectTo = '/'
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>(defaultTab);

  const handleClose = () => {
    onClose();
    // Reset to default tab when modal closes
    setTimeout(() => setActiveTab(defaultTab), 200);
  };

  const handleLoginSuccess = () => {
    // Close modal on successful login
    handleClose();
  };

  const handleRegisterSuccess = () => {
    // Close modal on successful registration
    handleClose();
  };

  const switchToLogin = () => setActiveTab('login');
  const switchToRegister = () => setActiveTab('register');

  return (
    <Modal 
      opened={opened} 
      onClose={handleClose}
      title={null}
      centered
      size="md"
      padding={0}
    >
      <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="login">Sign In</Tabs.Tab>
          <Tabs.Tab value="register">Register</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" p="md">
          <LoginForm 
            onSwitchToRegister={switchToRegister}
            redirectTo={redirectTo}
            onLoginSuccess={handleLoginSuccess}
          />
        </Tabs.Panel>

        <Tabs.Panel value="register" p="md">
          <RegisterForm 
            onSwitchToLogin={switchToLogin}
            redirectTo={redirectTo}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}