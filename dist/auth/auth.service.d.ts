export declare class AuthService {
    private lastRegistrationAttempt;
    private readonly REGISTRATION_COOLDOWN;
    login(email: string, password: string): Promise<{
        user: import("@supabase/auth-js").User;
        session: import("@supabase/auth-js").Session;
        weakPassword?: import("@supabase/auth-js").WeakPassword;
    } | {
        user: null;
        session: null;
        weakPassword?: null;
    }>;
    register(email: string, password: string): Promise<{
        user: import("@supabase/auth-js").User | null;
        session: import("@supabase/auth-js").Session | null;
    } | {
        user: null;
        session: null;
    }>;
    logout(): Promise<{
        message: string;
    }>;
}
