// Runtime environment configuration
// This allows environment variables to be accessed at runtime, not just build time

interface EnvConfig {
  DEEPSEEK_V3_API_KEY: string;
  DEEPSEEK_R1_API_KEY: string;
}

// Try to load from import.meta.env first (for local dev)
// Then fall back to window.__ENV__ which will be injected at runtime in production
const getEnvConfig = (): EnvConfig => {
  // Default values (empty)
  const defaultConfig: EnvConfig = {
    DEEPSEEK_V3_API_KEY: '',
    DEEPSEEK_R1_API_KEY: '',
  };

  // Try import.meta.env (Vite build-time env vars)
  if (import.meta.env) {
    const buildTimeConfig = {
      DEEPSEEK_V3_API_KEY: import.meta.env.VITE_DEEPSEEK_V3_API_KEY || '',
      DEEPSEEK_R1_API_KEY: import.meta.env.VITE_DEEPSEEK_R1_API_KEY || '',
    };

    // If keys are available at build time, use them
    if (buildTimeConfig.DEEPSEEK_V3_API_KEY && buildTimeConfig.DEEPSEEK_R1_API_KEY) {
      return buildTimeConfig;
    }
  }

  // For production: inject environment variables at runtime through window object
  // This will be set by our runtime-env.js script
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return {
      DEEPSEEK_V3_API_KEY: (window as any).__ENV__.VITE_DEEPSEEK_V3_API_KEY || '',
      DEEPSEEK_R1_API_KEY: (window as any).__ENV__.VITE_DEEPSEEK_R1_API_KEY || '',
    };
  }

  // Fallback to default (empty config)
  return defaultConfig;
};

export const config = getEnvConfig();

// Export individual vars for easier access
export const DEEPSEEK_V3_API_KEY = config.DEEPSEEK_V3_API_KEY;
export const DEEPSEEK_R1_API_KEY = config.DEEPSEEK_R1_API_KEY;
