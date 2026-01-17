import { useEffect, useState } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import { authenticate } from '@tauri-apps/plugin-biometric';

import App from './App.tsx';
import { isTauri } from './utils/tauri.ts';

import './styles/App.css';

function AppGate() {

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [failedAuthentication, setFailedAuthentication] = useState<boolean>(false);

    useEffect(() => {
        if (!isAuthenticated && isTauri) {
            authenticateUser();
        }
    }, [isAuthenticated]);

    function authenticateUser() {
        if (platform() === 'android') {
            // ANDROID
            // biometric authentication is handled by the OS
            authenticate('In order to access your financial data, please authenticate.', {
                allowDeviceCredential: true,
                cancelTitle: 'Cancel',
                title: 'Secure Login',
                subtitle: 'Authenticate with biometrics or device credentials',
                confirmationRequired: true,
            })
                .then(() => {
                    setIsAuthenticated(true);
                    setFailedAuthentication(false);
                })
                .catch((err) => {
                    setIsAuthenticated(false);
                    setFailedAuthentication(true);
                    console.error('Biometric authentication failed:', err?.message ?? err);
                });
        }
    }

    if (isTauri) {
        if (platform() === 'android' && !isAuthenticated) {
            return (
                <div id='app'>
                    <div className='column' style={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        marginTop: '2.5rem',
                        padding: '1rem',
                    }}>
                        <img
                            src={failedAuthentication ? './ConfusedBagel-alt.png' : './MasterBagel.png'}
                            alt='Authentication Required'
                            style={{ width: '100px', height: '100px', marginBottom: '1rem' }}
                        />
                        <h2>Authentication Required</h2>
                        <p className='small centre'>
                            Your financial data is encrypted and stored securely on your device.
                            Only you can unlock it — Bagel just needs to check it’s really you.
                        </p>
                        <button onClick={authenticateUser} style={{ marginTop: '1rem' }}>
                            Authenticate
                        </button>
                        {failedAuthentication && (
                            <p className='small centre' style={{ color: '#e42c2c', marginTop: '0.5rem' }}>
                                Authentication failed. Please try again.
                            </p>
                        )}
                    </div>
                </div>
            );
        }
    }

    return (
        <App />
    );
}

export default AppGate;
