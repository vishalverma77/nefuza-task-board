/**
 * Standardized API Error Formatter
 * Extracts status code and detailed error message from Axios, Fetch, or backend response objects.
 */
export function formatApiError(error: unknown, fallbackMessage: string = 'An unexpected error occurred.'): string {
  if (!error) return fallbackMessage;

  if (typeof error === 'string') {
    return error.trim() || fallbackMessage;
  }

  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    response?: {
      status?: number;
      statusText?: string;
      data?: {
        message?: string;
        error?: string | { message?: string };
        details?: string;
      } | string;
    };
    message?: string;
  };

  // Determine HTTP status code
  const status =
    errObj.response?.status ||
    errObj.status ||
    errObj.statusCode ||
    (typeof errObj.code === 'number' ? errObj.code : undefined);

  let extractedMsg = '';

  if (errObj.response?.data) {
    const data = errObj.response.data;
    if (typeof data === 'string') {
      const trimmed = data.trim();
      // Parse HTML error pages like Express <pre>Cannot POST /route</pre>
      if (trimmed.includes('<pre>') && trimmed.includes('</pre>')) {
        const match = trimmed.match(/<pre>(.*?)<\/pre>/s);
        if (match && match[1]) {
          extractedMsg = match[1].trim();
        }
      } else if (trimmed.length < 300 && !trimmed.startsWith('<!DOCTYPE') && !trimmed.startsWith('<html')) {
        extractedMsg = trimmed;
      }
    } else if (typeof data === 'object' && data !== null) {
      if (typeof data.message === 'string' && data.message.trim()) {
        extractedMsg = data.message.trim();
      } else if (typeof data.error === 'string' && data.error.trim()) {
        extractedMsg = data.error.trim();
      } else if (typeof data.error === 'object' && data.error !== null && typeof data.error.message === 'string') {
        extractedMsg = data.error.message.trim();
      } else if (typeof data.details === 'string' && data.details.trim()) {
        extractedMsg = data.details.trim();
      }
    }
  }

  if (!extractedMsg && errObj.message) {
    extractedMsg = errObj.message.trim();
  }

  const finalMsg = extractedMsg || fallbackMessage;

  // Prepend HTTP Status Code if available and not already formatted
  if (status && !finalMsg.includes(`HTTP ${status}`) && !finalMsg.includes(`status ${status}`)) {
    return `[HTTP ${status}] ${finalMsg}`;
  }

  return finalMsg;
}
