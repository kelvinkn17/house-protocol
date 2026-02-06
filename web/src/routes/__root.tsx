import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import HeroUIProvider from '../providers/HeroUIProvider'
import LenisSmoothScrollProvider from '../providers/LenisSmoothScrollProvider'
import { ThemeProvider } from '../providers/ThemeProvider'
import PrivyProvider from '../providers/PrivyProvider'
import { AuthProvider } from '../providers/AuthProvider'
import { SoundProvider } from '../providers/SoundProvider'
import { ToastProvider } from '../components/Toast'
import ErrorPage from '../components/ErrorPage'
import MobileOverlay from '../components/MobileOverlay'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'House Protocol',
      },
      {
        name: 'description',
        content: 'Everyone can be the house. Shared liquidity for on-chain gambling.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/assets/logos/hp-favicon.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    theme = JSON.parse(theme);
                  }
                  document.documentElement.classList.add(theme || 'dark');
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 antialiased transition-colors duration-300">
        <MobileOverlay />
        <ThemeProvider>
          <HeroUIProvider>
            <PrivyProvider>
              <AuthProvider>
                <SoundProvider>
                <ToastProvider>
                <LenisSmoothScrollProvider />
                {children}
                <TanStackDevtools
                  config={{
                    position: 'bottom-right',
                  }}
                  plugins={[
                    {
                      name: 'Tanstack Router',
                      render: <TanStackRouterDevtoolsPanel />,
                    },
                    TanStackQueryDevtools,
                  ]}
                />
                </ToastProvider>
                </SoundProvider>
              </AuthProvider>
            </PrivyProvider>
          </HeroUIProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
