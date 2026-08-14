import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function isTokenValid(token: string | null): boolean {
    if (!token || typeof token !== "string") return false;
    const cleanToken = token.replace(/^"|"$/g, "").trim();
    try {
        const parts = cleanToken.split(".");
        if (parts.length !== 3) return false;

        let base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4 !== 0) {
            base64 += "=";
        }

        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        const payload = JSON.parse(jsonPayload);
        if (!payload.exp) return true; // No expiration claim, treat as valid

        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp > currentTime;
    } catch (e) {
        console.warn("[AuthContext] Token parsing warning:", e);
        // Fallback for valid 3-part JWT structure: allow session to persist and let backend validate on API calls
        const parts = cleanToken.split(".");
        return parts.length === 3;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const clearAuth = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    useEffect(() => {
        const storedToken = localStorage.getItem("access_token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
            const cleanToken = storedToken.replace(/^"|"$/g, "").trim();
            if (isTokenValid(cleanToken)) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setToken(cleanToken);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                } catch {
                    clearAuth();
                }
            } else {
                console.warn("[AuthContext] Expired or invalid token found on init. Clearing session.");
                clearAuth();
            }
        } else {
            clearAuth();
        }

        setIsLoading(false);

        const handleUnauthorized = () => {
            console.warn("[AuthContext] Received 401 unauthorized event. Logging out.");
            clearAuth();
        };

        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => {
            window.removeEventListener("auth:unauthorized", handleUnauthorized);
        };
    }, []);

    const login = (newToken: string, newUser: User) => {
        const cleanToken = newToken.replace(/^"|"$/g, "").trim();
        localStorage.setItem("access_token", cleanToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        setToken(cleanToken);
        setUser(newUser);
        setIsAuthenticated(true);
    };

    const logout = () => {
        clearAuth();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
