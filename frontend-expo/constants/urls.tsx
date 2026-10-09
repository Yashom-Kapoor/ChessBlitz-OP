import Constants from 'expo-constants';

const apiUrl = new URL('http://127.0.0.1:5000');
const devServerAddress = Constants.expoConfig?.hostUri;

if (__DEV__ && devServerAddress) {
    apiUrl.hostname = new URL(`http://${devServerAddress}`).hostname;
}

export const API_URL = apiUrl.origin;
// export const API_URL = 'https://chessblitzbackend-caz1.onrender.com'
