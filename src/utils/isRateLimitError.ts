const isRateLimitError = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error.message as string).includes('Too Many Requests');
  }

  return false;
};

export { isRateLimitError };
