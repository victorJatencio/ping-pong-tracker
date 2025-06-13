import React, { createContext, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success', autoHide = true) => {
    const id = Date.now();

        setToasts(prevToasts => [
            ...prevToasts,
            { id, message, type, autoHide }
        ]);
        return id;
    };

    const removeToast = (id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    };

    const showSuccess = (message) => addToast(message, 'success');
    const showError = (message) => addToast(message, 'danger', false);
    const showInfo = (message) => addToast(message, 'info');
    const showWarning = (message) => addToast(message, 'warning');

    return(
        <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
            {children}
            <ToastContainer position="top-end" className="p-3">
                {toasts.map(toast => (
                    <Toast 
                        key={toast.id} 
                        bg={toast.type}
                        onClose={() => removeToast(toast.id)}
                        autohide={toast.autoHide}
                        delay={5000}
                        show={true}
                    >
                        <Toast.Header closeButton={true}>
                            <strong className="me-auto">
                                {toast.type === 'success' && 'Success'}
                                {toast.type === 'danger' && 'Error'}
                                {toast.type === 'info' && 'Information'}
                                {toast.type === 'warning' && 'Warning'}
                            </strong>
                        </Toast.Header>
                        <Toast.Body className={toast.type === 'danger' ? 'text-white' : ''}>
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    )
}