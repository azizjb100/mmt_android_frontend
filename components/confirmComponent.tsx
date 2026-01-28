/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
} from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type ConfirmVariant = "danger" | "warning" | "info" | "success";

type ConfirmDialogProps = {
    visible: boolean;
    title?: string;
    message?: string;
    detail?: string;

    confirmText?: string;
    cancelText?: string;

    variant?: ConfirmVariant;

    loading?: boolean;
    disableBackdropClose?: boolean;
    disableCancel?: boolean;

    onConfirm: () => void;
    onCancel: () => void;
};

const COLORS = {
    bg: "#0B1220",
    card: "#FFFFFF",
    border: "#E5E7EB",
    text: "#111827",
    muted: "#6B7280",
    overlay: "rgba(0,0,0,0.45)",
    danger: "#DC2626",
    warning: "#F59E0B",
    info: "#2563EB",
    success: "#16A34A",
};

function pickAccent(variant: ConfirmVariant) {
    switch (variant) {
        case "danger":
        return COLORS.danger;
        case "warning":
        return COLORS.warning;
        case "success":
        return COLORS.success;
        default:
        return COLORS.info;
    }
}

function pickIcon(variant: ConfirmVariant) {
    switch (variant) {
        case "danger": return <MaterialIcons name="restore-from-trash" size={22} color={COLORS.danger} />
        case "warning": return <MaterialIcons name="alert" size={22} color={COLORS.warning} />
        case "success": return <MaterialIcons name="checklist" size={22} color={COLORS.success} />
        default: return <MaterialIcons name="info-outline" size={22} color={COLORS.info} />
    }
}

export default function ConfirmDialog({
    visible,
    title = "Konfirmasi",
    message = "Apakah kamu yakin?",
    detail,
    confirmText = "Ya",
    cancelText = "Batal",
    variant = "danger",
    loading = false,
    disableBackdropClose = false,
    disableCancel = false,
    onConfirm,
    onCancel,
    }: ConfirmDialogProps) {
    const accent = useMemo(() => pickAccent(variant), [variant]);
    const icon = useMemo(() => pickIcon(variant), [variant]);

    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.96)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        if (visible) {
        opacity.setValue(0);
        scale.setValue(0.96);
        translateY.setValue(10);
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 10, tension: 140, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
        ]).start();
        } else {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.98, duration: 120, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 6, duration: 120, useNativeDriver: true }),
        ]).start();
        }
    }, [visible, opacity, scale, translateY]);

    const handleCancel = () => {
        if (loading) return;
        onCancel();
    };

    const handleBackdrop = () => {
        if (disableBackdropClose) return;
        handleCancel();
    };

    const handleConfirm = () => {
        if (loading) return;
        onConfirm();
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
        <Pressable style={styles.backdrop} onPress={handleBackdrop}>
            <Animated.View style={[styles.backdropInner, { opacity }]} />
        </Pressable>

        <View style={styles.centerWrap} pointerEvents="box-none">
            <Animated.View
            style={[
                styles.card,
                {
                opacity,
                transform: [{ translateY }, { scale }],
                borderTopColor: accent,
                },
            ]}
            >
            <View style={styles.headerRow}>
                <View style={[styles.iconPill, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
                <Text style={styles.iconText}>{icon}</Text>
                </View>

                <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
                {!!detail && <Text style={styles.detail} numberOfLines={4}>{detail}</Text>}
                </View>
            </View>

            <View style={styles.actions}>
                <Pressable
                onPress={handleCancel}
                disabled={loading || disableCancel}
                style={({ pressed }) => [
                    styles.btn,
                    styles.btnGhost,
                    (pressed && !loading && !disableCancel) ? { opacity: 0.85 } : null,
                    (loading || disableCancel) ? { opacity: 0.55 } : null,
                ]}
                >
                <Text style={styles.btnGhostText}>{cancelText}</Text>
                </Pressable>

                <Pressable
                onPress={handleConfirm}
                disabled={loading}
                style={({ pressed }) => [
                    styles.btn,
                    { backgroundColor: accent },
                    pressed && !loading ? { opacity: 0.88 } : null,
                    loading ? { opacity: 0.7 } : null,
                ]}
                >
                {loading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.btnSolidText}>Memproses...</Text>
                    </View>
                ) : (
                    <Text style={styles.btnSolidText}>{confirmText}</Text>
                )}
                </Pressable>
            </View>
            </Animated.View>
        </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    backdropInner: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
    },
    centerWrap: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderTopWidth: 4,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    headerRow: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    iconPill: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    iconText: { fontSize: 20 },
    title: {
        fontSize: 16,
        fontWeight: "900",
        color: COLORS.text,
    },
    message: {
        marginTop: 6,
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.muted,
        lineHeight: 18,
    },
    detail: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.text,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 10,
        borderRadius: 12,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    btn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    btnGhost: {
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    btnGhostText: {
        fontWeight: "900",
        color: COLORS.text,
    },
    btnSolidText: {
        fontWeight: "900",
        color: "#fff",
    },
    hint: {
        marginTop: 10,
        textAlign: "center",
        color: COLORS.muted,
        fontWeight: "700",
        fontSize: 11,
    },
});
