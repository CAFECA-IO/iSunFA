import vision from '@google-cloud/vision';
import GoogleVisionClientSingleton from '../google_vision_singleton';

// Mocking the vision.ImageAnnotatorClient correctly
jest.mock('@google-cloud/vision', () => {
  return {
    ImageAnnotatorClient: jest.fn().mockImplementation(() => {
      return {};
    }),
  };
});

describe('GoogleVisionClientSingleton', () => {
  const mockGoogleCredentials = JSON.stringify({
    type: 'service_account',
    project_id: 'mock-project-id',
    private_key_id: 'mock-private-key-id',
    private_key: 'mock-private-key',
    client_email: 'mock-email@mock-project-id.iam.gserviceaccount.com',
    client_id: 'mock-client-id',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      'https://www.googleapis.com/robot/v1/metadata/x509/mock-email%40mock-project-id.iam.gserviceaccount.com',
  });

  // Info Murky (20240422) Set the environment variables before running the tests
  beforeAll(() => {
    process.env.GOOGLE_PROJECT_ID = 'mock-project-id';
    process.env.GOOGLE_CREDENTIALS_BASE64 = Buffer.from(mockGoogleCredentials).toString('base64');
  });

  afterAll(() => {
    delete process.env.GOOGLE_PROJECT_ID;
    delete process.env.GOOGLE_CREDENTIALS_BASE64;
  });

  beforeEach(() => {
    // Info Murky (20240422) Clear instance before each test to ensure isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleVisionClientSingleton as any).instance = undefined;
  });

  it('should create a new instance on first call', () => {
    const instance = GoogleVisionClientSingleton.getInstance();
    expect(instance).toBeDefined();
    expect(vision.ImageAnnotatorClient).toHaveBeenCalledTimes(1);
  });

  it('should return the same instance on subsequent calls', () => {
    const firstInstance = GoogleVisionClientSingleton.getInstance();
    const secondInstance = GoogleVisionClientSingleton.getInstance();

    expect(firstInstance).toBeDefined();
    expect(secondInstance).toBeDefined();
    expect(firstInstance).toBe(secondInstance);
    expect(vision.ImageAnnotatorClient).toHaveBeenCalledTimes(1); // Constructor should only have been called once
  });

  it('should configure the instance correctly', () => {
    // Info Murky (20240422) Test that the instance is configured correctly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const instance = GoogleVisionClientSingleton.getInstance();
    expect(vision.ImageAnnotatorClient).toHaveBeenCalledWith({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString('ascii')
      ),
    });
  });
});
