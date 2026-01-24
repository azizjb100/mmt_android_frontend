import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../api/api.services'; // Sesuaikan path-nya

export const login = async (username, password) => {
    // Memanggil service API
    const result = await authService.login(username, password);

    if (result.success) {
        try {
            const { token, user } = result.data;

            // Simpan data ke storage HP
            if (token) await AsyncStorage.setItem('userToken', token);
            if (user) await AsyncStorage.setItem('userData', JSON.stringify(user));

            return { success: true, user };
        } catch (storageError) {
            return { success: false, message: 'Gagal menyimpan sesi login' };
        }
    } else {
        // Mengembalikan pesan error dari service
        return { success: false, message: result.message };
    }
};