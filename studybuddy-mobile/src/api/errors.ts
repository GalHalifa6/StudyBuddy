import { AxiosError } from 'axios';
import { ApiError } from './types';

export const mapApiError = (error: unknown): ApiError => {
  if (isAxiosError<ApiError>(error)) {
    const fallbackMessage = error.response?.data?.message ?? error.message ?? 'Something went wrong';
    return {
      message: fallbackMessage,
      success: error.response?.data?.success ?? false,
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unexpected error',
    success: false,
  };
};

const isAxiosError = <T = unknown>(value: unknown): value is AxiosError<T> => {
  return typeof value === 'object' && value !== null && 'isAxiosError' in value;
};
