'use client';

import * as Toast from '@radix-ui/react-toast';
import { create } from 'zustand';
import { ReactNode, useState } from 'react';

interface ToastItem {
    id: string;
    title: string;
    description?: string;
}

interface ToastStore {
    toasts: ToastItem[];
    push: (toast: Omit<ToastItem, 'id'>) => void;
    dismiss: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
    toasts: [],
    push: (toast) =>
        set((state) => ({
            toasts: [...state.toasts, { id: crypto.randomUUID(), ...toast }],
        })),
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function Toaster(): ReactNode {
    const [open, setOpen] = useState(true);
    const toasts = useToast((state) => state.toasts);
    const dismiss = useToast((state) => state.dismiss);

    return (
        <Toast.Provider swipeDirection="right">
            {toasts.map((toast) => (
                <Toast.Root
                    key={toast.id}
                    open={open}
                    onOpenChange={(state) => {
                        setOpen(state);
                        if (!state) dismiss(toast.id);
                    }}
                    className="fixed right-4 top-4 z-50 w-80 rounded-lg border border-white/20 bg-panel p-4 shadow-panel"
                >
                    <Toast.Title className="font-semibold text-textPrimary">{toast.title}</Toast.Title>
                    {toast.description ? (
                        <Toast.Description className="mt-1 text-sm text-textMuted">{toast.description}</Toast.Description>
                    ) : null}
                </Toast.Root>
            ))}
            <Toast.Viewport className="fixed right-2 top-2 z-50" />
        </Toast.Provider>
    );
}
