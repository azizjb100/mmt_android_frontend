import { showMessage } from "react-native-flash-message";

type ToastOptions = {
    duration?: number;
};

export const toast = {
    success: (message: string, description?: string, opts?: ToastOptions) =>
        showMessage({
        message,
        description,
        type: "success",
        duration: opts?.duration ?? 2200,
        floating: true,
        icon: "success",
        }),

    error: (message: string, description?: string, opts?: ToastOptions) =>
        showMessage({
        message,
        description,
        type: "danger",
        duration: opts?.duration ?? 3200,
        floating: true,
        icon: "danger",
        }),

    info: (message: string, description?: string, opts?: ToastOptions) =>
        showMessage({
        message,
        description,
        type: "info",
        duration: opts?.duration ?? 2200,
        floating: true,
        icon: "info",
        }),

    warn: (message: string, description?: string, opts?: ToastOptions) =>
        showMessage({
        message,
        description,
        type: "warning",
        duration: opts?.duration ?? 2600,
        floating: true,
        icon: "warning",
        }),
};
