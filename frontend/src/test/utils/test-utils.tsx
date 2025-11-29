import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';

/**
 * Custom render function that includes all providers
 * This makes it easy to test components that depend on context
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
  initialAuthState?: {
    user?: any;
    isAuthenticated?: boolean;
    isLoading?: boolean;
  };
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  initialAuthState 
}) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: {
    user?: any;
    isAuthenticated?: boolean;
    isLoading?: boolean;
  };
}

/**
 * Custom render function for testing
 * Usage: const { ... } = renderWithProviders(<Component />, { initialAuthState: {...} })
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialAuthState, ...renderOptions } = options;
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders initialAuthState={initialAuthState}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

