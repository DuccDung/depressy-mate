import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Đổi thành IP thực của máy dev khi test trên thiết bị thật
// Android Emulator: http://10.0.2.2:3000/api
// Physical Device (Wifi): http://<YOUR_LAN_IP>:3000/api
// Physical Device (USB): http://127.0.0.1:3000/api (run 'adb reverse tcp:3000 tcp:3000' first)
// Fly.io Server: https://depressy-mate.fly.dev/api
export const API_ORIGIN = "http://192.168.1.103:5210";
const API_BASE_URL = `${API_ORIGIN}/api`; // ASP.NET Core API

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor tự động gắn token vào mỗi request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor xử lý lỗi response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      AsyncStorage.multiRemove(["userToken", "userData"]);
    }
    return Promise.reject(error);
  },
);

export default api;
