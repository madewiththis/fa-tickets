export function logEmail(event: string, context?: any) {
  try {
    // eslint-disable-next-line no-console
    console.info('[email]', event, context ?? '')
  } catch {}
}

