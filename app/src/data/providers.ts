import { TrueLayerProvider } from "../types/TrueLayer";

export const closedProviders: TrueLayerProvider[] = [
    {
        provider_id: "bagel-kingdom-bank",
        display_name: "Kingdom Bank",
        country: "uk",
        logo_url: "/Finance/Banks/KingdomBank.png",
        scopes: [],
        availability: {
            recommended_status: "",
            updated_at: ""
        },
    },
    {
        provider_id: "bagel-ns&i",
        display_name: "National Savings and Investments",
        country: "uk",
        logo_url: "/Finance/Banks/NS&I.png",
        scopes: [],
        availability: {
            recommended_status: "",
            updated_at: ""
        },
    },
    {
        provider_id: "bagel-cahoot",
        display_name: "Cahoot",
        country: "uk",
        logo_url: "/Finance/Banks/Cahoot.png",
        accountLogo: "/Finance/Banks/CahootSquare.png",
        scopes: [],
        availability: {
            recommended_status: "",
            updated_at: ""
        },
    },
    // YBS always has sort code 60-92-04
];
