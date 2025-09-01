import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  api_domain: string;
}

class ZohoAuthService {
  private static instance: ZohoAuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;

  private constructor() {
    // Load tokens from electron-store if available
    this.loadTokens();
  }

  static getInstance(): ZohoAuthService {
    if (!ZohoAuthService.instance) {
      ZohoAuthService.instance = new ZohoAuthService();
    }
    return ZohoAuthService.instance;
  }

  private loadTokens() {
    // TODO: Load from electron-store
    const storedTokens = localStorage.getItem('zoho_tokens');
    if (storedTokens) {
      const { accessToken, refreshToken, expiresAt } = JSON.parse(storedTokens);
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.expiresAt = expiresAt;
    }
  }

  private saveTokens() {
    localStorage.setItem('zoho_tokens', JSON.stringify({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    }));
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post<TokenResponse>(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
          params: {
            refresh_token: this.refreshToken,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + (response.data.expires_in * 1000);
      this.saveTokens();
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error);
      throw new Error('Failed to refresh Zoho access token');
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error('Zoho authentication not initialized');
    }

    // Refresh token if expired or about to expire (within 5 minutes)
    if (Date.now() >= this.expiresAt - 300000) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  async initialize(authorizationCode: string): Promise<void> {
    try {
      const response = await axios.post<TokenResponse>(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
          params: {
            code: authorizationCode,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.ZOHO_REDIRECT_URI,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.expiresAt = Date.now() + (response.data.expires_in * 1000);
      this.saveTokens();
    } catch (error) {
      console.error('Error initializing Zoho authentication:', error);
      throw new Error('Failed to initialize Zoho authentication');
    }
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.ZOHO_CLIENT_ID || '',
      response_type: 'code',
      redirect_uri: process.env.ZOHO_REDIRECT_URI || '',
      scope: 'ZohoBooks.fullaccess.all',
      access_type: 'offline',
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  isAuthenticated(): boolean {
    return !!(this.accessToken && this.refreshToken);
  }
}

export const zohoAuthService = ZohoAuthService.getInstance();
