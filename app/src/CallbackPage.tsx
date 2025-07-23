import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from '@tauri-apps/api/core';
import { TrueLayerAccessTokenResponse } from "./types/TrueLayer";

function CallbackPage() {

    const navigate = useNavigate();

    useEffect(() => {
        const handleTokenExchange = async () => {

            const code = new URLSearchParams(location.search).get('code');
            const verifier = sessionStorage.getItem('code_verifier');

            const tokens: TrueLayerAccessTokenResponse = JSON.parse(
                await invoke('exchangeToken', { code, verifier })
            );

            // store/access tokens as needed
            sessionStorage.setItem('accessToken', tokens.access_token);

            navigate('/martyn-llewelyn/');
        };

        handleTokenExchange();
    }, [navigate]);

    return (
        <p>Authorising...</p>
    );
}

export default CallbackPage;
