import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../api/api.services';

export const login = async (username, password) => {
    const result = await authService.login(username, password);

    if (result.success) {
        try {
            const { token, user } = result.data;

            if (token) await AsyncStorage.setItem('userToken', token);
            if (user) await AsyncStorage.setItem('userData', JSON.stringify(user));

            return { success: true, user };
        } catch (storageError) {
            return { success: false, message: 'Gagal menyimpan sesi login' };
        }
    } else {
        return { success: false, message: result.message };
    }
};