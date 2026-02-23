export interface User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    salt: string;
}
