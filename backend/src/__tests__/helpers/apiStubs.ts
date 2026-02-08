/**
 * Shared helpers for stubbing external APIs in tests
 * Prevents accidental live API calls and enables deterministic testing
 */

/**
 * Stub for SendGrid email service
 * Returns a mock function that can be used to verify email calls
 */
export function createSendGridStub() {
  const sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    from?: string;
  }> = [];

  const sendEmail = async (emailData: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) => {
    sentEmails.push(emailData);
    return { success: true };
  };

  const clear = () => {
    sentEmails.length = 0;
  };

  const getSentEmails = () => [...sentEmails];

  return {
    sendEmail,
    clear,
    getSentEmails,
  };
}

/**
 * Stub for Google Sheets API
 * Returns a mock fetch that can be configured to return specific data
 */
export function createGoogleSheetsStub() {
  let mockResponse: any = null;
  let mockError: Error | null = null;

  const setMockResponse = (response: any) => {
    mockResponse = response;
    mockError = null;
  };

  const setMockError = (error: Error) => {
    mockError = error;
    mockResponse = null;
  };

  const reset = () => {
    mockResponse = null;
    mockError = null;
  };

  const mockFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    if (mockError) {
      throw mockError;
    }

    if (mockResponse) {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default: return empty response
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return {
    mockFetch,
    setMockResponse,
    setMockError,
    reset,
  };
}

/**
 * Stub for Google Gemini API
 * Returns a mock function that can simulate AI responses
 */
export function createGeminiStub() {
  let mockResponse: string | null = null;
  let mockError: Error | null = null;
  let callCount = 0;

  const setMockResponse = (response: string) => {
    mockResponse = response;
    mockError = null;
  };

  const setMockError = (error: Error) => {
    mockError = error;
    mockResponse = null;
  };

  const reset = () => {
    mockResponse = null;
    mockError = null;
    callCount = 0;
  };

  const generateContent = async (prompt: string): Promise<string> => {
    callCount++;
    
    if (mockError) {
      throw mockError;
    }

    if (mockResponse) {
      return mockResponse;
    }

    // Default: return a generic response
    return 'Mock AI response';
  };

  const getCallCount = () => callCount;

  return {
    generateContent,
    setMockResponse,
    setMockError,
    reset,
    getCallCount,
  };
}

/**
 * Helper to restore all global mocks after tests
 */
export function restoreAllMocks() {
  // Restore fetch if it was mocked
  if (global.fetch && (global.fetch as any).mockRestore) {
    (global.fetch as any).mockRestore();
  }
}
