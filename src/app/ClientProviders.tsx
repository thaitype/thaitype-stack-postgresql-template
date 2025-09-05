'use client';

import { MantineProvider, AppShell, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { Header } from '~/components/layout/Header';
import Head from 'next/head';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <>
      <Head>
        <ColorSchemeScript />
      </Head>
      <MantineProvider>
        <ModalsProvider>
          <Notifications />
          <AppShell
            header={{ height: 60 }}
            padding="md"
          >
            <AppShell.Header>
              <Header />
            </AppShell.Header>
            <AppShell.Main>
              {children}
            </AppShell.Main>
          </AppShell>
        </ModalsProvider>
      </MantineProvider>
    </>
  );
}