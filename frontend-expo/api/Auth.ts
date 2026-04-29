import * as SecureStore from 'expo-secure-store';

export async function getJwt() {
    return await SecureStore.getItemAsync("jwt");
}

export async function saveJwt(token) {
    return await SecureStore.setItemAsync("jwt", token);
}