const accessTokenKey = 'react-boilerplate:access-token';

export const tokenStorage = {
  getAccessToken: () => window.localStorage.getItem(accessTokenKey),
  setAccessToken: (token: string) => window.localStorage.setItem(accessTokenKey, token),
  clear: () => window.localStorage.removeItem(accessTokenKey),
};
